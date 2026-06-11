using System.Collections.Concurrent;

namespace Alsoright.Server.Services;

// uid 기준으로 고유 사용자 집계 (같은 uid로 탭 여러 개 열어도 1명)
public class OnlineCountService
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _uidConnections = new();

    public int Count => _uidConnections.Count;

    public void Add(string uid, string connectionId)
    {
        var conns = _uidConnections.GetOrAdd(uid, _ => new ConcurrentDictionary<string, byte>());
        conns.TryAdd(connectionId, 0);
    }

    public void Remove(string uid, string connectionId)
    {
        if (_uidConnections.TryGetValue(uid, out var conns))
        {
            conns.TryRemove(connectionId, out _);
            if (conns.IsEmpty) _uidConnections.TryRemove(uid, out _);
        }
    }
}
