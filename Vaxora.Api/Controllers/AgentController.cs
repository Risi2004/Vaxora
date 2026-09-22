using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

/// <summary>
/// Public entry point for the Agentic AI subsystem. The Python agent service runs as an
/// internal service and is reachable only through this controller, so every agent request
/// passes authentication, role checks and input validation first.
/// </summary>
[ApiController]
[Route("api/agent")]
[Authorize]
public class AgentController : ControllerBase
{
    /// <summary>Agents that may only be driven by a hospital account.</summary>
    private static readonly Dictionary<string, string[]> AgentRoleRequirements = new(StringComparer.OrdinalIgnoreCase)
    {
        ["StaffSchedulingAgent"] = new[] { "HOSPITAL" }
    };

    private readonly IAgentGatewayService _agentGateway;
    private readonly IAgentWorkflowService _workflowService;
    private readonly ILogger<AgentController> _logger;

    public AgentController(
        IAgentGatewayService agentGateway,
        IAgentWorkflowService workflowService,
        ILogger<AgentController> logger)
    {
        _agentGateway = agentGateway;
        _workflowService = workflowService;
        _logger = logger;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> Health(CancellationToken ct)
    {
        var health = await _agentGateway.HealthAsync(ct);
        return Ok(health);
    }

    [HttpGet("workflows")]
    public async Task<IActionResult> GetRecentWorkflows([FromQuery] int limit = 20)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid identity claim." });

        var workflows = await _workflowService.GetRecentAsync(userId, limit);
        return Ok(workflows);
    }

    [HttpPost("workflows/{workflowId:guid}/decision")]
    public async Task<IActionResult> RecordDecision(Guid workflowId, [FromBody] AgentWorkflowDecisionDto decision)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            var result = await _workflowService.RecordDecisionAsync(userId, workflowId, decision);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AgentChatRequestDto request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid identity claim." });

        if (!string.IsNullOrWhiteSpace(request.TargetAgent) &&
            AgentRoleRequirements.TryGetValue(request.TargetAgent, out var allowedRoles) &&
            !allowedRoles.Any(User.IsInRole))
        {
            _logger.LogWarning("Blocked {Agent} request from an unauthorized role.", request.TargetAgent);
            return Forbid();
        }

        var bearerToken = ExtractBearerToken();
        var result = await _agentGateway.ChatAsync(request, bearerToken, ct);

        AgentWorkflowDto? workflow = null;
        try
        {
            workflow = await _workflowService.RecordChatAsync(userId, request, result);
        }
        catch (Exception ex)
        {
            // Chat should still return even if persistence fails — log and continue.
            _logger.LogError(ex, "Failed to persist agent workflow for user {UserId}", userId);
        }

        if (!result.Success)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = result.Error, workflowId = workflow?.WorkflowId });

        return Content(AttachWorkflowId(result.Json!, workflow?.WorkflowId), "application/json");
    }

    /// <summary>Injects workflowId into the agent JSON so the UI can approve/reject against the persisted run.</summary>
    private static string AttachWorkflowId(string agentJson, Guid? workflowId)
    {
        if (!workflowId.HasValue)
            return agentJson;

        try
        {
            var node = JsonNode.Parse(agentJson);
            if (node is JsonObject obj)
            {
                obj["workflowId"] = workflowId.Value;
                return obj.ToJsonString();
            }
        }
        catch (JsonException)
        {
            // Fall through and return the original payload.
        }

        return agentJson;
    }

    private string? ExtractBearerToken()
    {
        var header = Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..].Trim()
            : null;
    }

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(claim, out userId);
    }
}
