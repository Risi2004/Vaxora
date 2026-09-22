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
    private readonly ILogger<AgentController> _logger;

    public AgentController(IAgentGatewayService agentGateway, ILogger<AgentController> logger)
    {
        _agentGateway = agentGateway;
        _logger = logger;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> Health(CancellationToken ct)
    {
        var health = await _agentGateway.HealthAsync(ct);
        return Ok(health);
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AgentChatRequestDto request, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(request.TargetAgent) &&
            AgentRoleRequirements.TryGetValue(request.TargetAgent, out var allowedRoles) &&
            !allowedRoles.Any(User.IsInRole))
        {
            _logger.LogWarning("Blocked {Agent} request from an unauthorized role.", request.TargetAgent);
            return Forbid();
        }

        var bearerToken = ExtractBearerToken();
        var result = await _agentGateway.ChatAsync(request, bearerToken, ct);

        if (!result.Success)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = result.Error });

        return Content(result.Json!, "application/json");
    }

    private string? ExtractBearerToken()
    {
        var header = Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header["Bearer ".Length..].Trim()
            : null;
    }
}
