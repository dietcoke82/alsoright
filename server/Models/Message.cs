using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class Message
{
    public int Id { get; set; }
    public int RoomId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Alias { get; set; } = string.Empty;

    public Role Role { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Room? Room { get; set; }
}
