using System.ComponentModel.DataAnnotations;

namespace Alsoright.Server.Models;

public class Vote
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public int Round { get; set; }

    [Required]
    [MaxLength(50)]
    public string Alias { get; set; } = string.Empty;

    public Role Side { get; set; }

    public Room? Room { get; set; }
}
