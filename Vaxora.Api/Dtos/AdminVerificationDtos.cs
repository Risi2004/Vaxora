using System.ComponentModel.DataAnnotations;
using Vaxora.Api.Models;

namespace Vaxora.Api.Dtos;

public class PendingVerificationUserDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LicenseOrRegNumber { get; set; }
    public string? HospitalAffiliationOrType { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ProfilePhotoOrLogoUrl { get; set; }
    public string? PrimaryDocUrl { get; set; }
    public string? SupportingDocUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class VerificationDecisionDto
{
    [Required]
    public string Decision { get; set; } = string.Empty; // "Approve" or "Reject"

    public string? Reason { get; set; }
}

public class UserStatusUpdateDto
{
    [Required]
    public string Status { get; set; } = string.Empty; // "Active", "Suspended"
}
