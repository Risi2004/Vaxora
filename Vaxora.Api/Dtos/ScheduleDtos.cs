using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

public class CreateVaccineScheduleDto
{
    public Guid? DoctorUserId { get; set; }

    [Required]
    public string DoctorName { get; set; } = string.Empty;

    public Guid? NurseUserId { get; set; }

    [Required]
    public string NurseName { get; set; } = string.Empty;

    public Guid? VaccineId { get; set; }

    [Required]
    public string VaccineName { get; set; } = string.Empty;

    [Required]
    public string ScheduleType { get; set; } = "OneTime"; // "OneTime" or "Weekly"

    public DateOnly? SpecificDate { get; set; }

    public List<string>? DaysOfWeek { get; set; } = new();

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    [Required]
    public string StartTime { get; set; } = "09:00";

    [Required]
    public string EndTime { get; set; } = "11:00";
}

public class VaccineScheduleDto
{
    public Guid Id { get; set; }
    public Guid HospitalUserId { get; set; }
    public string HospitalName { get; set; } = string.Empty;
    public Guid? DoctorUserId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public Guid? NurseUserId { get; set; }
    public string NurseName { get; set; } = string.Empty;
    public Guid? VaccineId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string ScheduleType { get; set; } = "OneTime";
    public DateOnly? SpecificDate { get; set; }
    public List<string> DaysOfWeek { get; set; } = new();
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string FormattedTime { get; set; } = string.Empty;
    public string DisplayRecurrence { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; }
}
