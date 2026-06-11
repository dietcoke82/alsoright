using Alsoright.Server.Data;
using Alsoright.Server.Models;
using Alsoright.Server.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Alsoright.Server.Hubs;

public class GameHub : Hub
{
    private readonly AppDbContext _db;
    private readonly GameStateService _gameState;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly IHubContext<LobbyHub> _lobbyHub;
    private readonly OnlineCountService _online;
    private readonly IServiceScopeFactory _scopeFactory;

    public GameHub(AppDbContext db, GameStateService gameState,
        IHubContext<GameHub> hubContext, IHubContext<LobbyHub> lobbyHub,
        OnlineCountService online, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _gameState = gameState;
        _hubContext = hubContext;
        _lobbyHub = lobbyHub;
        _online = online;
        _scopeFactory = scopeFactory;
    }

    // 방 입장: group + GameState 등록만, DB 쓰기 없음
    // 중복 실행돼도 안전 — Player는 준비완료 시 생성
    public async Task JoinRoom(int roomId, string alias, string role, string? uid = null)
    {
        if (_gameState.GetRoomForConnection(Context.ConnectionId).HasValue) return;

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null) throw new HubException("Room not found.");

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());

        var state = _gameState.Get(roomId);
        state.MinPlayers = room.MinPlayers;
        var roleEnum = role == "찬성" ? Role.Pro : Role.Con;

        // 같은 alias의 이전 연결 제거 (재접속 시 좀비 연결 방지)
        var stale = state.Connections
            .Where(kv => kv.Value.Nickname == alias && kv.Key != Context.ConnectionId)
            .Select(kv => kv.Key)
            .ToList();
        foreach (var staleId in stale)
        {
            state.Connections.TryRemove(staleId, out _);
            state.ReadyConnections.TryRemove(staleId, out _);
            _gameState.RemoveConnection(staleId);
        }

        state.Connections[Context.ConnectionId] = new RoomConnectionInfo
        {
            PlayerId = 0,
            Nickname = alias,
            Role = roleEnum,
            Uid = uid
        };
        _gameState.RegisterConnection(Context.ConnectionId, roomId);

        var onlineKey = Context.GetHttpContext()?.Request.Query["uid"].FirstOrDefault() ?? Context.ConnectionId;
        _online.Add(onlineKey, Context.ConnectionId);

        // 다른 참가자들에게 입장 알림
        await Clients.OthersInGroup(roomId.ToString()).SendAsync("UserJoined", new { Alias = alias });
    }

    // Client calls this when clicking "준비완료"
    public async Task PlayerReady(int roomId)
    {
        var state = _gameState.Get(roomId);
        state.ReadyConnections.TryAdd(Context.ConnectionId, 0);

        // 준비완료 시점에 Player DB 생성 (중복 방지)
        if (state.Connections.TryGetValue(Context.ConnectionId, out var readyConn) && readyConn.PlayerId == 0)
        {
            var existing = await _db.Players.FirstOrDefaultAsync(
                p => p.RoomId == roomId && p.Alias == readyConn.Nickname);

            if (existing == null)
            {
                var newPlayer = new Player
                {
                    RoomId = roomId,
                    Alias = readyConn.Nickname,
                    Role = readyConn.Role,
                    IsReady = true,
                    IsAlive = true,
                    Uid = readyConn.Uid
                };
                _db.Players.Add(newPlayer);

                var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress;
                _db.AccessLogs.Add(new Models.AccessLog
                {
                    Ip = ip?.MapToIPv4().ToString() ?? ip?.ToString() ?? "unknown",
                    RoomId = roomId,
                    Alias = readyConn.Nickname
                });

                await _db.SaveChangesAsync();
                readyConn.PlayerId = newPlayer.Id;
            }
            else
            {
                existing.IsReady = true;
                await _db.SaveChangesAsync();
                readyConn.PlayerId = existing.Id;
            }
        }

        var readyAlias = state.Connections.TryGetValue(Context.ConnectionId, out var readyInfo)
            ? readyInfo.Nickname : "";

        await Clients.Group(roomId.ToString()).SendAsync("PlayerReadyUpdate", new
        {
            ReadyCount = state.ReadyConnections.Count,
            TotalCount = state.Connections.Count,
            Alias = readyAlias
        });

        await NotifyLobbyAsync();

        if (!state.TryStartGame()) return;

        var players = state.Connections
            .Where(kv => state.ReadyConnections.ContainsKey(kv.Key))
            .GroupBy(kv => kv.Value.Nickname)
            .Select(g => new
            {
                Alias = g.Key,
                Role = g.First().Value.Role == Role.Pro ? "찬성" : "반대"
            })
            .ToList();

        var room = await _db.Rooms.FindAsync(roomId);
        if (room != null) { room.Status = RoomStatus.Debate; await _db.SaveChangesAsync(); }

        await Clients.Group(roomId.ToString()).SendAsync("GameStarted", new { Players = players });

        var cts = new CancellationTokenSource();
        state.PhaseCts = cts;
        _ = RunPhaseTimerAsync(roomId, state, cts.Token);
    }

    // Client sends a chat message during debate
    public async Task SendMessage(int roomId, string content)
    {
        if (!TryGetConnection(roomId, out var info))
            throw new HubException("Not in this room.");

        var message = new Message
        {
            RoomId = roomId,
            Alias = info.Nickname,
            Role = info.Role,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        await Clients.Group(roomId.ToString()).SendAsync("ReceiveMessage", new
        {
            Author = info.Nickname,
            Role = info.Role == Role.Pro ? "찬성" : "반대",
            Content = content,
            T = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }

    // Client casts a vote ("찬성" or "반대") during vote phase
    public async Task CastVote(int roomId, string side)
    {
        if (!TryGetConnection(roomId, out var info)) return;

        var state = _gameState.Get(roomId);
        var roleEnum = side == "찬성" ? Role.Pro : Role.Con;
        state.Votes.TryAdd(Context.ConnectionId, roleEnum);

        _db.Votes.Add(new Vote
        {
            RoomId = roomId,
            Round = 1,
            Alias = info.Nickname,
            Side = roleEnum
        });
        await _db.SaveChangesAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var roomId = _gameState.GetRoomForConnection(Context.ConnectionId);
        if (roomId.HasValue)
        {
            var state = _gameState.Get(roomId.Value);
            if (state.Connections.TryGetValue(Context.ConnectionId, out var info))
            {
                if (state.Phase == RoomStatus.Waiting && info.PlayerId > 0)
                {
                    var player = await _db.Players.FindAsync(info.PlayerId);
                    if (player != null) { _db.Players.Remove(player); await _db.SaveChangesAsync(); }
                }

                await Clients.OthersInGroup(roomId.Value.ToString())
                    .SendAsync("UserLeft", new { Alias = info.Nickname });
            }
            _gameState.RemoveConnection(Context.ConnectionId);
            var onlineKey = Context.GetHttpContext()?.Request.Query["uid"].FirstOrDefault() ?? Context.ConnectionId;
            _online.Remove(onlineKey, Context.ConnectionId);
            await NotifyLobbyAsync();
        }
        await base.OnDisconnectedAsync(exception);
    }

    private async Task NotifyLobbyAsync()
    {
        var rooms = await _db.Rooms.Include(r => r.Players).AsNoTracking().ToListAsync();
        var activeGames = rooms.Count(r => r.Status == RoomStatus.Debate || r.Status == RoomStatus.Vote);

        await _lobbyHub.Clients.Group("lobby").SendAsync("StatsUpdated", new
        {
            OnlineCount = _online.Count,
            ActiveGames = activeGames
        });
        await _lobbyHub.Clients.Group("lobby").SendAsync("RoomsUpdated",
            rooms.Select(Dtos.RoomSummaryDto.From));
    }

    private bool TryGetConnection(int roomId, out RoomConnectionInfo info)
    {
        var state = _gameState.Get(roomId);
        return state.Connections.TryGetValue(Context.ConnectionId, out info!);
    }

    private async Task RunPhaseTimerAsync(int roomId, RoomGameState state, CancellationToken ct)
    {
        try
        {
            // Debate: 3 minutes
            await Task.Delay(TimeSpan.FromSeconds(180), ct);
            if (ct.IsCancellationRequested) return;

            state.Phase = RoomStatus.Vote;
            await _hubContext.Clients.Group(roomId.ToString())
                .SendAsync("PhaseChanged", new { Phase = "vote" }, ct);

            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var room = await db.Rooms.FindAsync(roomId);
                if (room != null) { room.Status = RoomStatus.Vote; await db.SaveChangesAsync(); }
            }

            // Vote: 30 seconds
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
            if (ct.IsCancellationRequested) return;

            state.Phase = RoomStatus.Completed;

            var proCount = state.Votes.Values.Count(v => v == Role.Pro);
            var conCount = state.Votes.Values.Count(v => v == Role.Con);
            var winner = proCount > conCount ? "찬성" : conCount > proCount ? "반대" : "무승부";

            var playerList = state.Connections
                .GroupBy(kv => kv.Value.Nickname)
                .Select(g => new
                {
                    Alias = g.Key,
                    Role = g.First().Value.Role == Role.Pro ? "찬성" : "반대"
                })
                .ToList();

            await _hubContext.Clients.Group(roomId.ToString())
                .SendAsync("VoteResult", new
                {
                    Pro = proCount,
                    Con = conCount,
                    Winner = winner,
                    Players = playerList
                }, ct);

            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var room = await db.Rooms.FindAsync(roomId);
                if (room != null) { room.Status = RoomStatus.Completed; await db.SaveChangesAsync(); }

                // 게임 완료 → Player 정리 (Message/Vote에 alias 직접 저장됐으니 불필요)
                await db.Players.Where(p => p.RoomId == roomId).ExecuteDeleteAsync();
            }
        }
        catch (OperationCanceledException) { }
    }
}
