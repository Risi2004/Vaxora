using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("Appointments")]
public class Appointment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid PatientUserId { get; set; }

    public Guid? PatientProfileId { get; set; }

    [Required]
    [MaxLength(200)]
    public string PatientName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? PatientNic { get; set; }

    [MaxLength(50)]
    public string? PatientPhone { get; set; }

    [MaxLength(256)]
    public string? PatientEmail { get; set; }

    [Required]
    public Guid HospitalUserId { get; set; }

    public Guid? HospitalProfileId { get; set; }

    [Required]
    [MaxLength(200)]
    public string HospitalName { get; set; } = string.Empty;

    public Guid? VaccineScheduleId { get; set; }

    public Guid? VaccineId { get; set; }

    [Required]
    [MaxLength(200)]
    public string VaccineName { get; set; } = string.Empty;

    public Guid? DoctorUserId { get; set; }

    [MaxLength(200)]
    public string? DoctorName { get; set; }

    public Guid? NurseUserId { get; set; }

    [MaxLength(200)]
    public string? NurseName { get; set; }

    [Required]
    public DateOnly AppointmentDate { get; set; }

    [Required]
    [MaxLength(100)]
    public string TimeSlot { get; set; } = string.Empty; // e.g. "09:00 AM - 09:20 AM"

    [MaxLength(20)]
    public string? StartTime { get; set; } // "09:00"

    [MaxLength(20)]
    public string? EndTime { get; set; } // "09:20"

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Confirmed"; // "Pending", "Confirmed", "Completed", "Cancelled"

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(PatientUserId))]
    public virtual User? PatientUser { get; set; }

    [ForeignKey(nameof(HospitalUserId))]
    public virtual User? HospitalUser { get; set; }

    [ForeignKey(nameof(VaccineScheduleId))]
    public virtual VaccineSchedule? VaccineSchedule { get; set; }
}
