using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/admin/verification")]
[Authorize(Roles = "ADMIN")]
public class AdminVerificationController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminVerificationController> _logger;

    public AdminVerificationController(IAdminService adminService, ILogger<AdminVerificationController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingVerifications()
    {
        try
        {
            var pending = await _adminService.GetPendingVerificationsAsync();
            return Ok(pending);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending verifications");
            return StatusCode(500, new { message = "Failed to fetch pending verification requests." });
        }
    }

    [HttpPost("decide/{userId}")]
    public async Task<IActionResult> ProcessDecision(Guid userId, [FromBody] VerificationDecisionDto dto)
    {
        var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (!Guid.TryParse(adminIdClaim, out var adminId))
        {
            return Unauthorized(new { message = "Invalid admin identity claim." });
        }

        try
        {
            await _adminService.ProcessVerificationDecisionAsync(adminId, userId, dto);
            return Ok(new { message = $"Verification decision '{dto.Decision}' processed successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing verification decision for user {UserId}", userId);
            return StatusCode(500, new { message = "Failed to process verification decision." });
        }
    }

    [HttpPut("status/{userId}")]
    public async Task<IActionResult> UpdateStatus(Guid userId, [FromBody] UserStatusUpdateDto dto)
    {
        var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (!Guid.TryParse(adminIdClaim, out var adminId))
        {
            return Unauthorized(new { message = "Invalid admin identity claim." });
        }

        try
        {
            await _adminService.UpdateUserStatusAsync(adminId, userId, dto);
            return Ok(new { message = $"User account status updated to '{dto.Status}'." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status for user {UserId}", userId);
            return StatusCode(500, new { message = "Failed to update user status." });
        }
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 100)
    {
        try
        {
            var logs = await _adminService.GetAuditLogsAsync(limit);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching audit logs");
            return StatusCode(500, new { message = "Failed to fetch audit logs." });
        }
    }
}
