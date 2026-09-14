using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

public class InviteStaffDto
{
    [Required]
    [MaxLength(50)]
    public string RegistrationNumber { get; set; } = string.Empty;
}

public class AffiliationDecisionDto
{
    [Required]
    public string Decision { get; set; } = string.Empty; // "Accept" or "Reject"
}

public class UpdateDutyStatusDto
{
    [Required]
    public string DutyStatus { get; set; } = string.Empty; // "Off", "OnDuty", "OnBreak"
}

public class CreateStaffShiftDto
{
    [Required]
    public Guid AffiliationId { get; set; }

    [Required]
    public DateOnly ShiftDate { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    [MaxLength(100)]
    public string? BoothOrStation { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class UpdateStaffShiftDto
{
    [Required]
    public DateOnly ShiftDate { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    [MaxLength(100)]
    public string? BoothOrStation { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class StaffAffiliationDto
{
    public Guid AffiliationId { get; set; }
    public Guid HospitalUserId { get; set; }
    public string? HospitalName { get; set; }
    public Guid StaffUserId { get; set; }
    public string StaffRegistrationNumber { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string Status { get; set; } = string.Empty;
    public string DutyStatus { get; set; } = string.Empty;
    public DateTime? DutyUpdatedAt { get; set; }
    public DateTime InvitedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}

public class StaffShiftDto
{
    public Guid ShiftId { get; set; }
    public Guid AffiliationId { get; set; }
    public Guid StaffUserId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
    public DateOnly ShiftDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? BoothOrStation { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
