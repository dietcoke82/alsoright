using Alsoright.Server.Data;
using Alsoright.Server.Dtos;
using Alsoright.Server.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Alsoright.Server.Hubs;

public class LobbyHub : Hub
{
    private readonly OnlineCountService _online;
    private readonly AppDbContext _db;

    public LobbyHub(OnlineCountService online, AppDbContext db)
    {
        _online = online;
        _db = db;
    }

    private string GetUid() =>
        Context.GetHttpContext()?.Request.Query["uid"].FirstOrDefault() ?? Context.ConnectionId;

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "lobby");
        _online.Add(GetUid(), Context.ConnectionId);

        await BroadcastStatsAsync(_online.Count);
        await SendRoomsAsync();

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _online.Remove(GetUid(), Context.ConnectionId);
        await BroadcastStatsAsync(_online.Count);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastStatsAsync(int onlineCount)
    {
        var activeGames = await _db.Rooms
            .CountAsync(r => r.Status == Models.RoomStatus.Debate || r.Status == Models.RoomStatus.Vote);

        var todayStart = DateTime.UtcNow.Date;
        var todayRooms = await _db.Rooms.CountAsync(r => r.CreatedAt >= todayStart);

        await Clients.Group("lobby").SendAsync("StatsUpdated", new
        {
            ActiveGames = activeGames,
            TodayRooms = todayRooms
        });
    }

    private async Task SendRoomsAsync()
    {
        var rooms = await _db.Rooms.Include(r => r.Players).AsNoTracking().ToListAsync();
        await Clients.Caller.SendAsync("RoomsUpdated", rooms.Select(RoomSummaryDto.From));
    }
}
