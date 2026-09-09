using System.ComponentModel.DataAnnotations;

namespace VaccinationSystem.Core.Entities;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty; // Store hashed passwords
    
    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = string.Empty; // "Admin" or "Staff"
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}