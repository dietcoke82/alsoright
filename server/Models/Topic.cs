using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class Topic
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    public int Heat { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Room> Rooms { get; set; } = new();
}
