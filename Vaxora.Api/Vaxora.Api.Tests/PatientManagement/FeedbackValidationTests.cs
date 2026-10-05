using System.ComponentModel.DataAnnotations;
using Xunit;
using Vaxora.Api.Dtos;

namespace Vaxora.Api.Tests.PatientManagement;

public class FeedbackValidationTests
{
    private static IList<ValidationResult> ValidateModel(object model)
    {
        var results = new List<ValidationResult>();
        var context = new ValidationContext(model, serviceProvider: null, items: null);
        Validator.TryValidateObject(model, context, results, validateAllProperties: true);
        return results;
    }

    // ============================================================
    // CreateFeedbackDto
    // ============================================================

    [Fact]
    public void CreateFeedbackDto_valid_payload_passes_validation()
    {
        var dto = new CreateFeedbackDto
        {
            Message = "Helpful service.",
            Rating = 5,
            IsAnonymous = false,
            SubmitterName = "Jane Doe",
            SubmitterEmail = "jane@example.com",
            SubmitterPhone = "0771234567"
        };

        Assert.Empty(ValidateModel(dto));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void CreateFeedbackDto_missing_message_fails_validation(string? message)
    {
        var dto = new CreateFeedbackDto
        {
            Message = message!,
            Rating = 5
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateFeedbackDto.Message)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    [InlineData(100)]
    public void CreateFeedbackDto_rating_out_of_range_fails_validation(int rating)
    {
        var dto = new CreateFeedbackDto
        {
            Message = "Valid message",
            Rating = rating
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateFeedbackDto.Rating)));
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("missing@")]
    public void CreateFeedbackDto_invalid_submitter_email_fails_validation(string invalidEmail)
    {
        var dto = new CreateFeedbackDto
        {
            Message = "Valid message",
            Rating = 4,
            SubmitterEmail = invalidEmail
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateFeedbackDto.SubmitterEmail)));
    }

    [Fact]
    public void CreateFeedbackDto_message_over_max_length_fails_validation()
    {
        var dto = new CreateFeedbackDto
        {
            Message = new string('x', 4001), // MaxLength is 4000
            Rating = 5
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateFeedbackDto.Message)));
    }

    // ============================================================
    // UpdateFeedbackDto
    // ============================================================

    [Fact]
    public void UpdateFeedbackDto_valid_payload_passes_validation()
    {
        var dto = new UpdateFeedbackDto
        {
            Message = "Edited message",
            Rating = 4
        };

        Assert.Empty(ValidateModel(dto));
    }

    // ============================================================
    // FeedbackResolutionDto
    // ============================================================

    [Fact]
    public void FeedbackResolutionDto_valid_payload_passes_validation()
    {
        var dto = new FeedbackResolutionDto
        {
            Status = "Resolved",
            AdminResponse = "All done."
        };

        Assert.Empty(ValidateModel(dto));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void FeedbackResolutionDto_missing_status_fails_validation(string? status)
    {
        var dto = new FeedbackResolutionDto
        {
            Status = status!
        };

        var results = ValidateModel(dto);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(FeedbackResolutionDto.Status)));
    }
}
