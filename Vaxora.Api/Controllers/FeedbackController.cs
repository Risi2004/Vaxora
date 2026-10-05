using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/feedback")]
[Authorize]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _service;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(IFeedbackService service, ILogger<FeedbackController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>Submit new feedback (any authenticated user).</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            var created = await _service.CreateAsync(actorUserId, dto);
            return Ok(created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating feedback");
            return StatusCode(500, new { message = "Failed to submit feedback." });
        }
    }

    /// <summary>Get the current user's own feedback history.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        var list = await _service.GetMyAsync(actorUserId);
        return Ok(list);
    }

    /// <summary>Edit a feedback submission (owner only, before resolution).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFeedbackDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            var updated = await _service.UpdateAsync(actorUserId, id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating feedback {Id}", id);
            return StatusCode(500, new { message = "Failed to update feedback." });
        }
    }

    /// <summary>Admin — list every feedback submission.</summary>
    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetAll()
    {
        var list = await _service.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Admin — resolve or reply to a feedback submission.</summary>
    [HttpPut("{id:guid}/resolution")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] FeedbackResolutionDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var adminUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            var updated = await _service.ResolveAsync(adminUserId, id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving feedback {Id}", id);
            return StatusCode(500, new { message = "Failed to resolve feedback." });
        }
    }

    /// <summary>Public — random recent showcase feedback for the landing page. No auth required.</summary>
    [HttpGet("public/random")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicRandom([FromQuery] int count = 5)
    {
        var list = await _service.GetRandomPublicAsync(count);
        return Ok(list);
    }

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(claim, out userId);
    }
}
