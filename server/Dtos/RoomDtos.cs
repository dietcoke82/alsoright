using Alsoright.Server.Models;

namespace Alsoright.Server.Dtos;

public class TopicDto
{
    public string Id { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Heat { get; init; }

    public static TopicDto From(Topic topic) => new()
    {
        Id = topic.Id.ToString(),
        Label = topic.Label,
        Heat = topic.Heat
    };
}

public class RoomSummaryDto
{
    public string Id { get; init; } = string.Empty;
    public string Topic { get; init; } = string.Empty;
    public string Tags { get; init; } = string.Empty;
    public string Phase { get; init; } = "대기";
    public int Players { get; init; }
    public int Capacity { get; init; } = 10;

    public static RoomSummaryDto From(Room room) => new()
    {
        Id = room.Id.ToString(),
        Topic = room.Topic,
        Tags = room.Tags,
        Phase = room.Status switch
        {
            RoomStatus.Waiting => "대기",
            RoomStatus.Debate => "토론",
            RoomStatus.Vote => "투표",
            RoomStatus.Completed => "종료",
            _ => "대기"
        },
        Players = room.Players.Count(p => p.IsReady),
        Capacity = room.MaxPlayers
    };
}

public sealed class PlayerDto
{
    public int Id { get; init; }
    public string Alias { get; init; } = string.Empty;
    public string Role { get; init; } = "찬성";
    public bool IsAlive { get; init; }
    public bool IsReady { get; init; }

    public static PlayerDto From(Player player) => new()
    {
        Id = player.Id,
        Alias = player.Alias,
        Role = player.Role == Alsoright.Server.Models.Role.Pro ? "찬성" : "반대",
        IsAlive = player.IsAlive,
        IsReady = player.IsReady
    };
}

public sealed class MessageDto
{
    public int Id { get; init; }
    public int RoomId { get; init; }
    public string Alias { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string Role { get; init; } = "찬성";
    public DateTime CreatedAt { get; init; }

    public static MessageDto From(Message message) => new()
    {
        Id = message.Id,
        RoomId = message.RoomId,
        Alias = message.Alias,
        Content = message.Content,
        Role = message.Role == Alsoright.Server.Models.Role.Pro ? "찬성" : "반대",
        CreatedAt = message.CreatedAt
    };
}

public sealed class VoteDto
{
    public int Id { get; init; }
    public int RoomId { get; init; }
    public int Round { get; init; }
    public string Alias { get; init; } = string.Empty;
    public string Side { get; init; } = "찬성";

    public static VoteDto From(Vote vote) => new()
    {
        Id = vote.Id,
        RoomId = vote.RoomId,
        Round = vote.Round,
        Alias = vote.Alias,
        Side = vote.Side == Role.Pro ? "찬성" : "반대"
    };
}

public sealed class RoomDetailDto
{
    public string Id { get; init; } = string.Empty;
    public string Topic { get; init; } = string.Empty;
    public string Phase { get; init; } = "대기";
    public int Capacity { get; init; } = 10;
    public int MinPlayers { get; init; } = 2;
    public List<PlayerDto> Players { get; init; } = new();
    public List<MessageDto> Messages { get; init; } = new();
    public List<VoteDto> Votes { get; init; } = new();

    public static RoomDetailDto From(Room room) => new()
    {
        Id = room.Id.ToString(),
        Topic = room.Topic,
        Phase = room.Status switch
        {
            RoomStatus.Waiting => "대기",
            RoomStatus.Debate => "토론",
            RoomStatus.Vote => "투표",
            RoomStatus.Completed => "종료",
            _ => "대기"
        },
        Capacity = room.MaxPlayers,
        MinPlayers = room.MinPlayers,
        Players = room.Players.Select(PlayerDto.From).ToList(),
        Messages = room.Messages.Select(MessageDto.From).ToList(),
        Votes = room.Votes.Select(VoteDto.From).ToList()
    };
}

public sealed class RecentDebateDto
{
    public string Topic { get; init; } = string.Empty;
    public int Pro { get; init; }
    public int Con { get; init; }
    public string Winner { get; init; } = string.Empty;
}

public sealed class StatsDto
{
    public int ActiveGames { get; init; }
    public int TodayRooms { get; init; }
    public RecentDebateDto? RecentDebate { get; init; }
}

public sealed record CreateRoomRequestDto(string Title, string Topic, string Tags = "", int MaxPlayers = 10, int MinPlayers = 2);
public sealed record JoinRoomRequestDto(string? Uid = null);
public sealed record VoteRequestDto(int Round, string Side);
public sealed record JoinRoomResponseDto(int RoomId, int PlayerId, string Role, string Alias);
