using System.Collections.Concurrent;
using Alsoright.Server.Models;

namespace Alsoright.Server.Services;

public class RoomConnectionInfo
{
    public int PlayerId { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public Role Role { get; set; }
    public string? Uid { get; set; }
}

public class RoomGameState
{
    public ConcurrentDictionary<string, RoomConnectionInfo> Connections { get; } = new();
    public ConcurrentDictionary<string, byte> ReadyConnections { get; } = new();
    public ConcurrentDictionary<string, Role> Votes { get; } = new();
    public RoomStatus Phase { get; set; } = RoomStatus.Waiting;
    public CancellationTokenSource? PhaseCts { get; set; }
    public int MinPlayers { get; set; } = 2;
    private int _gameStarted = 0;

    public bool TryStartGame()
    {
        if (Phase != RoomStatus.Waiting) return false;
        if (ReadyConnections.Count < MinPlayers) return false;

        if (Interlocked.CompareExchange(ref _gameStarted, 1, 0) == 0)
        {
            Phase = RoomStatus.Debate;
            return true;
        }
        return false;
    }
}

public class GameStateService
{
    private readonly ConcurrentDictionary<int, RoomGameState> _states = new();
    private readonly ConcurrentDictionary<string, int> _connectionRooms = new();

    public RoomGameState Get(int roomId) => _states.GetOrAdd(roomId, _ => new RoomGameState());

    public void RegisterConnection(string connectionId, int roomId)
        => _connectionRooms[connectionId] = roomId;

    public int? GetRoomForConnection(string connectionId)
        => _connectionRooms.TryGetValue(connectionId, out var roomId) ? roomId : null;

    public void RemoveConnection(string connectionId)
    {
        if (_connectionRooms.TryRemove(connectionId, out var roomId))
        {
            if (_states.TryGetValue(roomId, out var state))
            {
                state.Connections.TryRemove(connectionId, out _);
                state.ReadyConnections.TryRemove(connectionId, out _);
            }
        }
    }
}
