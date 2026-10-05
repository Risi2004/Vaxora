using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.PatientManagement;

public class FeedbackServiceTests
{
    private static FeedbackService CreateService(ApplicationDbContext context) =>
        new(context, NullLogger<FeedbackService>.Instance);

    private static User AddPatient(
        ApplicationDbContext context,
        string email = "patient@example.com",
        string registrationNumber = "VAX-P-8001")
    {
        var patient = new User
        {
            Email = email,
            PasswordHash = "test-hash",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = registrationNumber,
            PatientProfile = new PatientProfile
            {
                FullName = "Test Patient",
                NicNumber = $"NIC-{Guid.NewGuid():N}"[..12]
            }
        };
        context.Users.Add(patient);
        return patient;
    }

    // ============================================================
    // CreateAsync
    // ============================================================

    [Fact]
    public async Task CreateAsync_anonymous_nulls_submitter_identity_fields()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "The booking flow was smooth.",
            Rating = 5,
            IsAnonymous = true,
            SubmitterName = "Should Not Persist",
            SubmitterEmail = "leak@example.com",
            SubmitterPhone = "0770000000"
        });

        Assert.True(result.IsAnonymous);
        Assert.Null(result.SubmitterName);
        Assert.Null(result.SubmitterEmail);
        Assert.Null(result.SubmitterPhone);

        var stored = await context.Feedbacks.SingleAsync();
        Assert.Null(stored.SubmitterName);
        Assert.Null(stored.SubmitterEmail);
        Assert.Null(stored.SubmitterPhone);
        // Ownership must remain so /my endpoint can still return the row.
        Assert.Equal(patient.Id, stored.UserId);
    }

    [Fact]
    public async Task CreateAsync_persists_submitter_identity_when_not_anonymous()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Loved the vaccine reminder.",
            Rating = 4,
            IsAnonymous = false,
            SubmitterName = "Jane Doe",
            SubmitterEmail = "jane@example.com",
            SubmitterPhone = "0771111111"
        });

        Assert.False(result.IsAnonymous);
        Assert.Equal("Jane Doe", result.SubmitterName);
        Assert.Equal("jane@example.com", result.SubmitterEmail);
        Assert.Equal("0771111111", result.SubmitterPhone);
    }

    [Fact]
    public async Task CreateAsync_clamps_out_of_range_rating()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Rating out of range",
            Rating = 99
        });

        Assert.Equal(5, result.Rating);
    }

    [Fact]
    public async Task CreateAsync_derives_subject_from_first_line_of_message()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Missing booster appointment\nMore details on the second line.",
            Rating = 3
        });

        Assert.Equal("Missing booster appointment", result.Subject);
    }

    // ============================================================
    // GetMyAsync
    // ============================================================

    [Fact]
    public async Task GetMyAsync_returns_only_current_users_submissions()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context, "p1@example.com", "VAX-P-8001");
        var other = AddPatient(context, "p2@example.com", "VAX-P-8002");
        await context.SaveChangesAsync();
        var service = CreateService(context);

        await service.CreateAsync(patient.Id, new CreateFeedbackDto { Message = "Mine", Rating = 5 });
        await service.CreateAsync(other.Id, new CreateFeedbackDto { Message = "Theirs", Rating = 5 });

        var mine = await service.GetMyAsync(patient.Id);

        var single = Assert.Single(mine);
        Assert.Equal("Mine", single.Message);
    }

    // ============================================================
    // UpdateAsync
    // ============================================================

    [Fact]
    public async Task UpdateAsync_owner_can_edit_before_resolution()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Original",
            Rating = 4
        });

        var updated = await service.UpdateAsync(patient.Id, created.Id, new UpdateFeedbackDto
        {
            Message = "Edited message",
            Rating = 5
        });

        Assert.Equal("Edited message", updated.Message);
        Assert.Equal(5, updated.Rating);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_rejects_non_owner()
    {
        await using var context = TestDb.CreateContext();
        var owner = AddPatient(context, "owner@example.com", "VAX-P-8001");
        var attacker = AddPatient(context, "attacker@example.com", "VAX-P-8002");
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var created = await service.CreateAsync(owner.Id, new CreateFeedbackDto
        {
            Message = "Owned",
            Rating = 5
        });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.UpdateAsync(attacker.Id, created.Id, new UpdateFeedbackDto
            {
                Message = "Hacked",
                Rating = 1
            }));
    }

    [Fact]
    public async Task UpdateAsync_rejects_after_resolution()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Please fix",
            Rating = 2
        });

        await service.ResolveAsync(patient.Id, created.Id, new FeedbackResolutionDto
        {
            Status = "Resolved",
            AdminResponse = "Done."
        });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateAsync(patient.Id, created.Id, new UpdateFeedbackDto
            {
                Message = "Too late",
                Rating = 5
            }));
    }

    // ============================================================
    // GetAllAsync (admin)
    // ============================================================

    [Fact]
    public async Task GetAllAsync_includes_submitter_role()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Test",
            Rating = 5
        });

        var all = await service.GetAllAsync();

        var single = Assert.Single(all);
        Assert.Equal("PATIENT", single.UserRole);
    }

    // ============================================================
    // ResolveAsync
    // ============================================================

    [Fact]
    public async Task ResolveAsync_sets_status_response_and_replied_at()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Needs a reply",
            Rating = 3
        });

        var resolved = await service.ResolveAsync(patient.Id, created.Id, new FeedbackResolutionDto
        {
            Status = "Resolved",
            AdminResponse = "We fixed it.",
            InternalNotes = "Followed up via email."
        });

        Assert.Equal("Resolved", resolved.Status);
        Assert.Equal("We fixed it.", resolved.AdminResponse);
        Assert.Equal("Followed up via email.", resolved.InternalNotes);
        Assert.NotNull(resolved.RepliedAt);
    }

    [Fact]
    public async Task ResolveAsync_rejects_invalid_status()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "x",
            Rating = 5
        });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ResolveAsync(patient.Id, created.Id, new FeedbackResolutionDto
            {
                Status = "NotARealStatus"
            }));
    }

    // ============================================================
    // GetRandomPublicAsync
    // ============================================================

    [Fact]
    public async Task GetRandomPublicAsync_excludes_escalated_feedback()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var publicOne = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Great service",
            Rating = 5
        });
        var escalated = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Bad experience",
            Rating = 5
        });
        await service.ResolveAsync(patient.Id, escalated.Id, new FeedbackResolutionDto
        {
            Status = "Escalated"
        });

        var result = await service.GetRandomPublicAsync(5);

        var single = Assert.Single(result);
        Assert.Equal(publicOne.Id, single.Id);
    }

    [Fact]
    public async Task GetRandomPublicAsync_returns_anonymous_label_for_anonymous_rows()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Anonymous tip",
            Rating = 5,
            IsAnonymous = true
        });

        var result = await service.GetRandomPublicAsync(5);

        var single = Assert.Single(result);
        Assert.Equal("Anonymous", single.Name);
    }

    [Fact]
    public async Task GetRandomPublicAsync_excludes_low_rated_without_admin_response()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        // Low rating, no admin reply → must NOT appear publicly.
        await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "This is a complaint",
            Rating = 1
        });

        // High rating → appears.
        await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Awesome",
            Rating = 5
        });

        var result = await service.GetRandomPublicAsync(10);

        var single = Assert.Single(result);
        Assert.Equal("Awesome", single.Message);
    }

    [Fact]
    public async Task GetRandomPublicAsync_respects_count_limit()
    {
        await using var context = TestDb.CreateContext();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        for (var i = 0; i < 10; i++)
        {
            await service.CreateAsync(patient.Id, new CreateFeedbackDto
            {
                Message = $"Feedback {i}",
                Rating = 5
            });
        }

        var result = await service.GetRandomPublicAsync(3);

        Assert.Equal(3, result.Count);
    }
}
