using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class AccessLog
{
    public int Id { get; set; }

    [Required]
    [MaxLength(45)]
    public string Ip { get; set; } = string.Empty;

    public int RoomId { get; set; }

    [MaxLength(50)]
    public string Alias { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
