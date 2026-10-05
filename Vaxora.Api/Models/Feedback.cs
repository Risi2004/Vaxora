using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

public enum FeedbackStatus
{
    New = 0,
    InReview = 1,
    Resolved = 2,
    Escalated = 3
}

public class Feedback
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Always stored, even when the submission is anonymous.
    /// Used to filter "my feedbacks" and for admin audit.
    /// </summary>
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    /// <summary>
    /// When true, SubmitterName/Email/Phone are nulled at write time
    /// so the admin can never see who submitted the feedback.
    /// </summary>
    public bool IsAnonymous { get; set; } = false;

    [MaxLength(120)]
    public string? SubmitterName { get; set; }

    [MaxLength(200)]
    public string? SubmitterEmail { get; set; }

    [MaxLength(30)]
    public string? SubmitterPhone { get; set; }

    /// <summary>Optional — populated if the form collects a hospital/centre.</summary>
    [MaxLength(200)]
    public string? HospitalName { get; set; }

    [MaxLength(80)]
    public string Category { get; set; } = "General Feedback";

    /// <summary>Auto-derived from the first ~80 chars of Message if not supplied.</summary>
    [MaxLength(200)]
    public string? Subject { get; set; }

    [Required]
    [MaxLength(4000)]
    public string Message { get; set; } = string.Empty;

    /// <summary>1–5 stars.</summary>
    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    public FeedbackStatus Status { get; set; } = FeedbackStatus.New;

    [MaxLength(4000)]
    public string? AdminResponse { get; set; }

    public DateTime? RepliedAt { get; set; }

    [MaxLength(2000)]
    public string? InternalNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
