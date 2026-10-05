using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

// ==================== RESPONSE DTOs ====================

public class FeedbackDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public bool IsAnonymous { get; set; }
    public string? SubmitterName { get; set; }
    public string? SubmitterEmail { get; set; }
    public string? SubmitterPhone { get; set; }
    public string? HospitalName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AdminResponse { get; set; }
    public DateTime? RepliedAt { get; set; }
    public string? InternalNotes { get; set; }

    /// <summary>Populated for admin responses only — role of the submitter.</summary>
    public string? UserRole { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PublicFeedbackDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "Anonymous";
    public int Rating { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ==================== REQUEST DTOs ====================

public class CreateFeedbackDto
{
    [Required]
    [MaxLength(4000)]
    public string Message { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    public bool IsAnonymous { get; set; } = false;

    [MaxLength(120)]
    public string? SubmitterName { get; set; }

    [MaxLength(200)]
    [EmailAddress]
    public string? SubmitterEmail { get; set; }

    [MaxLength(30)]
    public string? SubmitterPhone { get; set; }

    [MaxLength(200)]
    public string? HospitalName { get; set; }

    [MaxLength(80)]
    public string? Category { get; set; }
}

public class UpdateFeedbackDto
{
    [Required]
    [MaxLength(4000)]
    public string Message { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    public bool IsAnonymous { get; set; } = false;

    [MaxLength(120)]
    public string? SubmitterName { get; set; }

    [MaxLength(200)]
    [EmailAddress]
    public string? SubmitterEmail { get; set; }

    [MaxLength(30)]
    public string? SubmitterPhone { get; set; }
}

public class FeedbackResolutionDto
{
    [Required]
    public string Status { get; set; } = "New";

    [MaxLength(4000)]
    public string? AdminResponse { get; set; }

    [MaxLength(2000)]
    public string? InternalNotes { get; set; }
}
