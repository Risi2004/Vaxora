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
    public string? RegistrationNumber { get; set; }
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

public class AdminDashboardStatsDto
{
    public AdminUsersCountDto UsersCount { get; set; } = new();
    public AdminVaccinationStatsDto VaccinationStats { get; set; } = new();
    public int PendingVerificationsCount { get; set; }
    public int ActiveHospitalsCount { get; set; }
    public List<AdminHospitalTelemetryDto> Hospitals { get; set; } = new();
    public List<AdminVaccineReserveDto> VaccineReserves { get; set; } = new();
    public List<PendingVerificationUserDto> RecentPendingVerifications { get; set; } = new();
}

public class AdminUsersCountDto
{
    public int Total { get; set; }
    public int Patients { get; set; }
    public int Doctors { get; set; }
    public int Nurses { get; set; }
    public int Hospitals { get; set; }
    public int Admins { get; set; }
}

public class AdminVaccinationStatsDto
{
    public int TotalDosesAdministered { get; set; }
    public int TodayDosesAdministered { get; set; }
    public double OnTimeSecondDoseRate { get; set; } = 94.2;
    public double NationalWastageRate { get; set; } = 0.48;
}

public class AdminHospitalTelemetryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string HospitalType { get; set; } = string.Empty;
    public int ActiveBooths { get; set; }
    public int DosesToday { get; set; }
    public string Temp { get; set; } = string.Empty;
    public string Status { get; set; } = "Optimal";
}

public class AdminVaccineReserveDto
{
    public Guid VaccineId { get; set; }
    public string Vaccine { get; set; } = string.Empty;
    public string InStock { get; set; } = string.Empty;
    public string Allocated { get; set; } = string.Empty;
    public string TempRange { get; set; } = string.Empty;
}
