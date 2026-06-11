using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class Room
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Topic { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Tags { get; set; } = string.Empty;

    public RoomStatus Status { get; set; } = RoomStatus.Waiting;

    public int MaxPlayers { get; set; } = 10;
    public int MinPlayers { get; set; } = 2;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Player> Players { get; set; } = new();
    public List<Message> Messages { get; set; } = new();
    public List<Vote> Votes { get; set; } = new();
}
