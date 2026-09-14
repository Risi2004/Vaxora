using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

public class AvailableDateDto
{
    public string Date { get; set; } = string.Empty; // "2026-09-16"
    public string DayOfWeek { get; set; } = string.Empty; // "Wednesday"
    public string DisplayText { get; set; } = string.Empty; // "2026-09-16 (Wednesday) - 09:00 AM to 11:00 AM"
    public string? DoctorName { get; set; }
    public string? NurseName { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public Guid ScheduleId { get; set; }
}

public class TimeSlotDto
{
    public string Slot { get; set; } = string.Empty; // "09:00 AM - 09:20 AM"
    public string StartTime { get; set; } = string.Empty; // "09:00"
    public string EndTime { get; set; } = string.Empty; // "09:20"
    public bool IsBooked { get; set; }
    public string DisplayStatus => IsBooked ? "Booked (Unavailable)" : "Available";
}

public class BookAppointmentRequestDto
{
    [Required]
    public Guid HospitalUserId { get; set; }

    [Required]
    public string VaccineName { get; set; } = string.Empty;

    public Guid? VaccineId { get; set; }

    public Guid? VaccineScheduleId { get; set; }

    [Required]
    public DateOnly AppointmentDate { get; set; }

    [Required]
    public string TimeSlot { get; set; } = string.Empty; // e.g., "09:00 AM - 09:20 AM"

    public string? Notes { get; set; }
}

public class AppointmentResponseDto
{
    public Guid Id { get; set; }
    public Guid PatientUserId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientNic { get; set; }
    public string? PatientPhone { get; set; }
    public string? PatientEmail { get; set; }
    public Guid HospitalUserId { get; set; }
    public string HospitalName { get; set; } = string.Empty;
    public Guid? VaccineScheduleId { get; set; }
    public Guid? VaccineId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? NurseName { get; set; }
    public string AppointmentDate { get; set; } = string.Empty; // "yyyy-MM-dd"
    public string TimeSlot { get; set; } = string.Empty;
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public string Status { get; set; } = "Confirmed";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateAppointmentStatusDto
{
    [Required]
    public string Status { get; set; } = "Confirmed"; // "Confirmed", "Rejected", "Completed", "Cancelled"

    public string? Remarks { get; set; }
}
