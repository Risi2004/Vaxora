using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IFeedbackService
{
    Task<FeedbackDto> CreateAsync(Guid actorUserId, CreateFeedbackDto dto);
    Task<List<FeedbackDto>> GetMyAsync(Guid actorUserId);
    Task<FeedbackDto> UpdateAsync(Guid actorUserId, Guid feedbackId, UpdateFeedbackDto dto);
    Task<List<FeedbackDto>> GetAllAsync();
    Task<FeedbackDto> ResolveAsync(Guid adminUserId, Guid feedbackId, FeedbackResolutionDto dto);
    Task<List<PublicFeedbackDto>> GetRandomPublicAsync(int count);
}

public class FeedbackService : IFeedbackService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<FeedbackService> _logger;

    public FeedbackService(ApplicationDbContext context, ILogger<FeedbackService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ---------------------------------------------------------------
    // Patient / staff self-service
    // ---------------------------------------------------------------

    public async Task<FeedbackDto> CreateAsync(Guid actorUserId, CreateFeedbackDto dto)
    {
        var isAnon = dto.IsAnonymous;

        var feedback = new Feedback
        {
            UserId = actorUserId,
            IsAnonymous = isAnon,

            // Null out submitter identity when anonymous — the admin can never
            // recover these values because they are not persisted.
            SubmitterName = isAnon ? null : Trim(dto.SubmitterName, 120),
            SubmitterEmail = isAnon ? null : Trim(dto.SubmitterEmail, 200),
            SubmitterPhone = isAnon ? null : Trim(dto.SubmitterPhone, 30),

            HospitalName = Trim(dto.HospitalName, 200),
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "General Feedback" : dto.Category.Trim(),
            Subject = DeriveSubject(dto.Message),
            Message = dto.Message.Trim(),
            Rating = Math.Clamp(dto.Rating, 1, 5),
            Status = FeedbackStatus.New,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Feedbacks.Add(feedback);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Feedback {FeedbackId} created by user {UserId} (anonymous={Anon}, rating={Rating})",
            feedback.Id, actorUserId, isAnon, feedback.Rating);

        return ToDto(feedback, userRole: null);
    }

    public async Task<List<FeedbackDto>> GetMyAsync(Guid actorUserId)
    {
        var rows = await _context.Feedbacks
            .AsNoTracking()
            .Where(f => f.UserId == actorUserId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return rows.Select(f => ToDto(f, userRole: null)).ToList();
    }

    public async Task<FeedbackDto> UpdateAsync(Guid actorUserId, Guid feedbackId, UpdateFeedbackDto dto)
    {
        var feedback = await _context.Feedbacks
            .FirstOrDefaultAsync(f => f.Id == feedbackId)
            ?? throw new KeyNotFoundException("Feedback not found.");

        if (feedback.UserId != actorUserId)
            throw new UnauthorizedAccessException("You can only edit your own feedback.");

        if (feedback.Status == FeedbackStatus.Resolved)
            throw new InvalidOperationException("Resolved feedback can no longer be edited.");

        var isAnon = dto.IsAnonymous;

        feedback.IsAnonymous = isAnon;
        feedback.SubmitterName = isAnon ? null : Trim(dto.SubmitterName, 120);
        feedback.SubmitterEmail = isAnon ? null : Trim(dto.SubmitterEmail, 200);
        feedback.SubmitterPhone = isAnon ? null : Trim(dto.SubmitterPhone, 30);
        feedback.Message = dto.Message.Trim();
        feedback.Rating = Math.Clamp(dto.Rating, 1, 5);
        feedback.Subject = DeriveSubject(dto.Message);
        feedback.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(feedback, userRole: null);
    }

    // ---------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------

    public async Task<List<FeedbackDto>> GetAllAsync()
    {
        var rows = await _context.Feedbacks
            .AsNoTracking()
            .Include(f => f.User)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return rows.Select(f => ToDto(f, userRole: f.User?.Role.ToString())).ToList();
    }

    public async Task<FeedbackDto> ResolveAsync(Guid adminUserId, Guid feedbackId, FeedbackResolutionDto dto)
    {
        var feedback = await _context.Feedbacks
            .Include(f => f.User)
            .FirstOrDefaultAsync(f => f.Id == feedbackId)
            ?? throw new KeyNotFoundException("Feedback not found.");

        if (!Enum.TryParse<FeedbackStatus>(dto.Status, ignoreCase: true, out var newStatus))
            throw new InvalidOperationException($"Invalid status '{dto.Status}'.");

        feedback.Status = newStatus;

        var trimmedResponse = Trim(dto.AdminResponse, 4000);
        if (!string.IsNullOrEmpty(trimmedResponse))
        {
            feedback.AdminResponse = trimmedResponse;
            feedback.RepliedAt = DateTime.UtcNow;
        }

        feedback.InternalNotes = Trim(dto.InternalNotes, 2000);
        feedback.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Feedback {FeedbackId} resolved by admin {AdminId} to status {Status}",
            feedback.Id, adminUserId, feedback.Status);

        return ToDto(feedback, userRole: feedback.User?.Role.ToString());
    }

    // ---------------------------------------------------------------
    // Public (landing page)
    // ---------------------------------------------------------------

    public async Task<List<PublicFeedbackDto>> GetRandomPublicAsync(int count)
    {
        count = Math.Clamp(count, 1, 20);

        // Only show positive, non-escalated submissions on the public page.
        // A low-rated open complaint should not appear on the marketing site.
        var pool = await _context.Feedbacks
            .AsNoTracking()
            .Where(f => f.Status != FeedbackStatus.Escalated)
            .Where(f => f.Rating >= 4 || (f.Rating >= 3 && f.AdminResponse != null))
            .ToListAsync();

        // Randomise in-memory (dataset is small; keep the query simple and Postgres-portable).
        return pool
            .OrderBy(_ => Guid.NewGuid())
            .Take(count)
            .Select(f => new PublicFeedbackDto
            {
                Id = f.Id,
                Name = f.IsAnonymous ? "Anonymous" : (f.SubmitterName ?? "Verified User"),
                Rating = f.Rating,
                Message = f.Message,
                Category = f.Category,
                CreatedAt = f.CreatedAt,
            })
            .ToList();
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private static string? Trim(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var t = value.Trim();
        return t.Length <= max ? t : t[..max];
    }

    private static string? DeriveSubject(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return null;
        var firstLine = message.Trim().Split('\n')[0].Trim();
        if (firstLine.Length <= 80) return firstLine;
        return firstLine[..77] + "...";
    }

    private static FeedbackDto ToDto(Feedback f, string? userRole) => new()
    {
        Id = f.Id,
        UserId = f.UserId,
        IsAnonymous = f.IsAnonymous,
        SubmitterName = f.SubmitterName,
        SubmitterEmail = f.SubmitterEmail,
        SubmitterPhone = f.SubmitterPhone,
        HospitalName = f.HospitalName,
        Category = f.Category,
        Subject = f.Subject,
        Message = f.Message,
        Rating = f.Rating,
        Status = f.Status.ToString(),
        AdminResponse = f.AdminResponse,
        RepliedAt = f.RepliedAt,
        InternalNotes = f.InternalNotes,
        UserRole = userRole,
        CreatedAt = f.CreatedAt,
        UpdatedAt = f.UpdatedAt,
    };
}
