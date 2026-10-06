using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.BookingManagement;

public class ValidationTests
{
    private static IList<ValidationResult> ValidateModel(object model)
    {
        var results = new List<ValidationResult>();
        var context = new ValidationContext(model, serviceProvider: null, items: null);
        Validator.TryValidateObject(model, context, results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void LoginDto_valid_credentials_passes_validation()
    {
        var dto = new LoginDto
        {
            Email = "user@vaxora.lk",
            Password = "Password123!"
        };

        var results = ValidateModel(dto);
        Assert.Empty(results);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void LoginDto_missing_email_fails_validation(string? email)
    {
        var dto = new LoginDto
        {
            Email = email!,
            Password = "Password123!"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(LoginDto.Email)));
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("user@")]
    [InlineData("@domain.com")]
    public void LoginDto_invalid_email_format_fails_validation(string invalidEmail)
    {
        var dto = new LoginDto
        {
            Email = invalidEmail,
            Password = "Password123!"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(LoginDto.Email)));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void LoginDto_missing_password_fails_validation(string? password)
    {
        var dto = new LoginDto
        {
            Email = "valid@example.com",
            Password = password!
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(LoginDto.Password)));
    }

    [Fact]
    public void BookAppointmentRequestDto_valid_request_passes_validation()
    {
        var dto = new BookAppointmentRequestDto
        {
            HospitalUserId = Guid.NewGuid(),
            VaccineName = "Pfizer-BioNTech",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            TimeSlot = "09:00 AM - 09:20 AM"
        };

        var results = ValidateModel(dto);
        Assert.Empty(results);
    }

    [Fact]
    public async Task BookAppointmentRequestDto_missing_hospital_user_id_fails_validation()
    {
        var dto = new BookAppointmentRequestDto
        {
            HospitalUserId = Guid.Empty, // Default unassigned GUID
            VaccineName = "Pfizer-BioNTech",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            TimeSlot = "09:00 AM - 09:20 AM"
        };

        // Structural check: Ensure empty identifier is identified
        Assert.Equal(Guid.Empty, dto.HospitalUserId);

        // Functional validation: Service rejects empty hospital identifier with KeyNotFoundException
        var context = TestDb.CreateContext();
        var patient = new User
        {
            Email = "validation.patient@vaxora.lk",
            PasswordHash = "test-hash",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = "VAX-P-9901",
            PatientProfile = new PatientProfile
            {
                FullName = "Validation Patient",
                NicNumber = "990011225V"
            }
        };
        context.Users.Add(patient);
        await context.SaveChangesAsync();

        var service = new AppointmentService(
            context,
            new FakeEmailService(),
            new FakePasswordHasher(),
            new FakeRegistrationNumberService(),
            NullLogger<AppointmentService>.Instance);

        var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.BookAppointmentAsync(patient.Id, dto));

        Assert.Contains("Selected hospital not found", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void BookAppointmentRequestDto_missing_vaccine_name_fails_validation(string? vaccineName)
    {
        var dto = new BookAppointmentRequestDto
        {
            HospitalUserId = Guid.NewGuid(),
            VaccineName = vaccineName!,
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            TimeSlot = "09:00 AM - 09:20 AM"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(BookAppointmentRequestDto.VaccineName)));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void BookAppointmentRequestDto_missing_time_slot_fails_validation(string? slot)
    {
        var dto = new BookAppointmentRequestDto
        {
            HospitalUserId = Guid.NewGuid(),
            VaccineName = "Moderna",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            TimeSlot = slot!
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(BookAppointmentRequestDto.TimeSlot)));
    }

    [Fact]
    public void CreateWalkInAppointmentDto_valid_dto_passes_validation()
    {
        var dto = new CreateWalkInAppointmentDto
        {
            PatientNic = "951234567V",
            PatientName = "Kasun Silva",
            PatientEmail = "kasun@example.com",
            PatientPhone = "+94771234567",
            VaccineName = "Influenza",
            Dose = "0.5ml"
        };

        var results = ValidateModel(dto);
        Assert.Empty(results);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void CreateWalkInAppointmentDto_missing_patient_nic_fails_validation(string? nic)
    {
        var dto = new CreateWalkInAppointmentDto
        {
            PatientNic = nic!,
            VaccineName = "Influenza"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateWalkInAppointmentDto.PatientNic)));
    }

    [Fact]
    public void CreateWalkInAppointmentDto_nic_exceeding_max_length_fails_validation()
    {
        var dto = new CreateWalkInAppointmentDto
        {
            PatientNic = new string('9', 51), // MaxLength is 50
            VaccineName = "Influenza"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateWalkInAppointmentDto.PatientNic)));
    }

    [Theory]
    [InlineData("plainaddress")]
    [InlineData("kasun@")]
    public void CreateWalkInAppointmentDto_invalid_email_fails_validation(string invalidEmail)
    {
        var dto = new CreateWalkInAppointmentDto
        {
            PatientNic = "951234567V",
            PatientEmail = invalidEmail,
            VaccineName = "Influenza"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateWalkInAppointmentDto.PatientEmail)));
    }

    [Theory]
    [InlineData("12345")] // 5 chars, min is 6
    [InlineData("abc")]
    public void ResetPasswordDto_password_under_six_chars_fails_validation(string shortPassword)
    {
        var dto = new ResetPasswordDto
        {
            Email = "user@example.com",
            ResetToken = "valid-token-123",
            NewPassword = shortPassword
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ResetPasswordDto.NewPassword)));
    }

    [Fact]
    public void ResetPasswordDto_missing_token_fails_validation()
    {
        var dto = new ResetPasswordDto
        {
            Email = "user@example.com",
            ResetToken = "",
            NewPassword = "ValidPassword123"
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ResetPasswordDto.ResetToken)));
    }

    [Fact]
    public void ChangePasswordDto_valid_dto_passes_validation()
    {
        var dto = new ChangePasswordDto
        {
            CurrentPassword = "OldPassword123!",
            NewPassword = "NewPassword123!"
        };

        var results = ValidateModel(dto);
        Assert.Empty(results);
    }

    [Fact]
    public void ChangePasswordDto_short_new_password_fails_validation()
    {
        var dto = new ChangePasswordDto
        {
            CurrentPassword = "OldPassword123!",
            NewPassword = "123" // under 6 chars
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ChangePasswordDto.NewPassword)));
    }
}
