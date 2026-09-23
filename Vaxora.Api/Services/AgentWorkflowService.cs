using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IAgentWorkflowService
{
    Task<AgentWorkflowDto> RecordChatAsync(
        Guid userId,
        AgentChatRequestDto request,
        AgentGatewayResult gatewayResult);

    Task<AgentWorkflowDto> RecordDecisionAsync(
        Guid userId,
        Guid workflowId,
        AgentWorkflowDecisionDto decision);

    Task<List<AgentWorkflowDto>> GetRecentAsync(Guid userId, int limit = 20);
}

/// <summary>
/// Persists Agentic AI run state so high-impact proposals and human decisions
/// are auditable in PostgreSQL rather than living only in the browser.
/// </summary>
public class AgentWorkflowService : IAgentWorkflowService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AgentWorkflowService> _logger;

    public AgentWorkflowService(ApplicationDbContext context, ILogger<AgentWorkflowService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AgentWorkflowDto> RecordChatAsync(
        Guid userId,
        AgentChatRequestDto request,
        AgentGatewayResult gatewayResult)
    {
        var objective = request.Messages
            .LastOrDefault(m => string.Equals(m.Role, "user", StringComparison.OrdinalIgnoreCase))
            ?.Content
            ?.Trim() ?? string.Empty;

        if (objective.Length > 2000)
            objective = objective[..2000];

        var agentName = string.IsNullOrWhiteSpace(request.TargetAgent)
            ? "Orchestrator"
            : request.TargetAgent.Trim();

        if (!gatewayResult.Success || string.IsNullOrWhiteSpace(gatewayResult.Json))
        {
            var failed = new AgentWorkflow
            {
                UserId = userId,
                AgentName = agentName,
                Objective = objective,
                ProposalsJson = "[]",
                ResultSummary = Truncate(gatewayResult.Error ?? "Agent request failed.", 4000),
                Status = AgentWorkflowStatus.Failed,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AgentWorkflows.Add(failed);
            await _context.SaveChangesAsync();
            return ToDto(failed);
        }

        using var document = JsonDocument.Parse(gatewayResult.Json);
        var root = document.RootElement;

        var summary = root.TryGetProperty("content", out var contentEl) && contentEl.ValueKind == JsonValueKind.String
            ? Truncate(contentEl.GetString(), 4000)
            : null;

        var proposalsJson = "[]";
        if (root.TryGetProperty("proposals", out var proposalsEl) &&
            proposalsEl.ValueKind == JsonValueKind.Array)
        {
            proposalsJson = proposalsEl.GetRawText();
        }

        var hasProposals = proposalsJson != "[]" && proposalsJson.Length > 2;
        var workflow = new AgentWorkflow
        {
            UserId = userId,
            AgentName = root.TryGetProperty("agent", out var agentEl) && agentEl.ValueKind == JsonValueKind.String
                ? Truncate(agentEl.GetString(), 80) ?? agentName
                : agentName,
            Objective = objective,
            ProposalsJson = proposalsJson,
            ResultSummary = summary,
            Status = hasProposals ? AgentWorkflowStatus.AwaitingApproval : AgentWorkflowStatus.Completed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AgentWorkflows.Add(workflow);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Recorded agent workflow {WorkflowId} for user {UserId} with status {Status}",
            workflow.Id,
            userId,
            workflow.Status);

        return ToDto(workflow);
    }

    public async Task<AgentWorkflowDto> RecordDecisionAsync(
        Guid userId,
        Guid workflowId,
        AgentWorkflowDecisionDto decision)
    {
        var workflow = await _context.AgentWorkflows
            .FirstOrDefaultAsync(w => w.Id == workflowId && w.UserId == userId);

        if (workflow == null)
            throw new KeyNotFoundException("Workflow not found.");

        if (workflow.Status != AgentWorkflowStatus.AwaitingApproval)
            throw new InvalidOperationException($"Workflow cannot be decided from status '{workflow.Status}'.");

        workflow.Status = decision.Approved ? AgentWorkflowStatus.Approved : AgentWorkflowStatus.Rejected;
        workflow.DecidedAt = DateTime.UtcNow;
        workflow.DecisionNote = string.IsNullOrWhiteSpace(decision.Note) ? null : Truncate(decision.Note.Trim(), 500);
        workflow.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(workflow);
    }

    public async Task<List<AgentWorkflowDto>> GetRecentAsync(Guid userId, int limit = 20)
    {
        limit = Math.Clamp(limit, 1, 50);

        var workflows = await _context.AgentWorkflows
            .AsNoTracking()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return workflows.Select(ToDto).ToList();
    }

    private static AgentWorkflowDto ToDto(AgentWorkflow workflow) => new()
    {
        WorkflowId = workflow.Id,
        AgentName = workflow.AgentName,
        Objective = workflow.Objective,
        Status = workflow.Status.ToString(),
        ResultSummary = workflow.ResultSummary,
        ProposalsJson = workflow.ProposalsJson,
        CreatedAt = workflow.CreatedAt,
        DecidedAt = workflow.DecidedAt,
        DecisionNote = workflow.DecisionNote
    };

    private static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= max ? value : value[..max];
    }
}
