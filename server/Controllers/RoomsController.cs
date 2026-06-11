using Alsoright.Server.Data;
using Alsoright.Server.Dtos;
using Alsoright.Server.Hubs;
using Alsoright.Server.Models;
using Alsoright.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Alsoright.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<LobbyHub> _lobbyHub;

    public RoomsController(AppDbContext db, IHubContext<LobbyHub> lobbyHub)
    {
        _db = db;
        _lobbyHub = lobbyHub;
    }

    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .Include(r => r.Players)
            .AsNoTracking()
            .ToListAsync();

        return Ok(rooms.Select(RoomSummaryDto.From));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRoom(int id)
    {
        var room = await _db.Rooms
            .Include(r => r.Players)
            .Include(r => r.Messages)
            .Include(r => r.Votes)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null) return NotFound();
        return Ok(RoomDetailDto.From(room));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequestDto request)
    {
        var room = new Room
        {
            Title = request.Title,
            Topic = request.Topic,
            Tags = NormalizeTags(request.Tags),
            MaxPlayers = request.MaxPlayers,
            MinPlayers = Math.Clamp(request.MinPlayers, 2, request.MaxPlayers),
            Status = RoomStatus.Waiting,
            CreatedAt = DateTime.UtcNow
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        // Upsert topic tags into Topics table (increment heat per use)
        foreach (var tag in ParseTags(request.Tags))
        {
            var existing = await _db.Topics.FirstOrDefaultAsync(t => t.Label == tag);
            if (existing != null)
                existing.Heat++;
            else
                _db.Topics.Add(new Topic { Label = tag, Heat = 1 });
        }
        await _db.SaveChangesAsync();

        // 로비에 새 방 알림
        var allRooms = await _db.Rooms.Include(r => r.Players).AsNoTracking().ToListAsync();
        await _lobbyHub.Clients.Group("lobby").SendAsync("RoomsUpdated", allRooms.Select(RoomSummaryDto.From));

        return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, RoomSummaryDto.From(room));
    }

    // alias + role 반환 — uid가 있으면 기존 Player 조회해서 재사용
    // Player DB 쓰기는 준비완료 시에만
    [HttpPost("{id}/join")]
    public async Task<IActionResult> JoinRoom(int id, [FromBody] JoinRoomRequestDto? request)
    {
        var room = await _db.Rooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (room == null) return NotFound();

        // uid로 기존 Player 조회 (재접속 시 동일 alias 재사용)
        if (!string.IsNullOrEmpty(request?.Uid))
        {
            var existing = await _db.Players.FirstOrDefaultAsync(
                p => p.RoomId == id && p.Uid == request.Uid);
            if (existing != null)
                return Ok(new { alias = existing.Alias, role = existing.Role == Role.Pro ? "찬성" : "반대" });
        }

        if (room.Players.Count >= room.MaxPlayers) return BadRequest("Room is full.");

        var alias = AliasService.Pick(room.Players.Select(p => p.Alias));
        var proCount = room.Players.Count(p => p.Role == Role.Pro);
        var conCount = room.Players.Count(p => p.Role == Role.Con);
        var role = proCount <= conCount ? Role.Pro : Role.Con;

        return Ok(new { alias, role = role == Role.Pro ? "찬성" : "반대" });
    }


    // "#AI #규제" → ["AI", "규제"]
    private static IEnumerable<string> ParseTags(string raw) =>
        (raw ?? "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.StartsWith('#'))
            .Select(t => t.TrimStart('#').Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase);

    // Ensure each tag starts with # and normalize spacing
    private static string NormalizeTags(string raw) =>
        string.Join(' ', ParseTags(raw).Select(t => "#" + t));
}

[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var activeGames = await _db.Rooms
            .CountAsync(r => r.Status == RoomStatus.Debate || r.Status == RoomStatus.Vote);

        var todayStart = DateTime.UtcNow.Date;
        var todayRooms = await _db.Rooms.CountAsync(r => r.CreatedAt >= todayStart);

        var recentRoom = await _db.Rooms
            .Include(r => r.Votes)
            .Where(r => r.Status == RoomStatus.Completed && r.Votes.Any())
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        RecentDebateDto? recentDebate = null;
        if (recentRoom != null)
        {
            var pro = recentRoom.Votes.Count(v => v.Side == Role.Pro);
            var con = recentRoom.Votes.Count(v => v.Side == Role.Con);
            var total = Math.Max(pro + con, 1);
            recentDebate = new RecentDebateDto
            {
                Topic = recentRoom.Topic,
                Pro = (int)Math.Round((double)pro / total * 100),
                Con = (int)Math.Round((double)con / total * 100),
                Winner = pro > con ? "찬성" : con > pro ? "반대" : "무승부"
            };
        }

        return Ok(new StatsDto
        {
            ActiveGames = activeGames,
            TodayRooms = todayRooms,
            RecentDebate = recentDebate
        });
    }
}
