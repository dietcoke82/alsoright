using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class Player
{
    public int Id { get; set; }
    public int RoomId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Alias { get; set; } = string.Empty;

    public Role Role { get; set; }
    public bool IsReady { get; set; } = false;
    public bool IsAlive { get; set; } = true;

    [MaxLength(100)]
    public string? Uid { get; set; }

    public Room? Room { get; set; }
}
