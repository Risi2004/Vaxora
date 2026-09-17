using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/patient-visits")]
[Authorize(Roles = "DOCTOR,NURSE,HOSPITAL,ADMIN")]
public class PatientVisitController : ControllerBase
{
    private readonly IPatientVisitService _service;
    private readonly ILogger<PatientVisitController> _logger;

    public PatientVisitController(IPatientVisitService service, ILogger<PatientVisitController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("patients/{patientProfileId:guid}/timeline")]
    public async Task<IActionResult> GetTimeline(Guid patientProfileId)
    {
        try { return Ok(await _service.GetTimelineAsync(patientProfileId)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching visit timeline for patient {PatientId}", patientProfileId);
            return StatusCode(500, new { message = "Failed to fetch visit timeline." });
        }
    }

    [HttpGet("patients/{patientProfileId:guid}/follow-ups")]
    public async Task<IActionResult> GetUpcomingFollowUps(Guid patientProfileId)
    {
        try { return Ok(await _service.GetUpcomingFollowUpsAsync(patientProfileId)); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching follow-ups for patient {PatientId}", patientProfileId);
            return StatusCode(500, new { message = "Failed to fetch follow-ups." });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try { return Ok(await _service.GetByIdAsync(id)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching visit {Id}", id);
            return StatusCode(500, new { message = "Failed to fetch visit." });
        }
    }

    [HttpGet("{id:guid}/summary")]
    public async Task<IActionResult> GetSummary(Guid id)
    {
        try { return Ok(await _service.GetSummaryAsync(id)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching visit summary {Id}", id);
            return StatusCode(500, new { message = "Failed to fetch visit summary." });
        }
    }

    [HttpPost("patients/{patientProfileId:guid}")]
    [Authorize(Roles = "DOCTOR,NURSE,HOSPITAL")]
    public async Task<IActionResult> Create(Guid patientProfileId, [FromBody] CreatePatientVisitDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try { return Ok(await _service.CreateAsync(actorUserId, patientProfileId, dto)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating visit for patient {PatientId}", patientProfileId);
            return StatusCode(500, new { message = "Failed to create visit." });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "DOCTOR,NURSE,HOSPITAL")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePatientVisitDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try { return Ok(await _service.UpdateAsync(actorUserId, id, dto)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating visit {Id}", id);
            return StatusCode(500, new { message = "Failed to update visit." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "DOCTOR,ADMIN")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            await _service.DeleteAsync(actorUserId, id);
            return Ok(new { message = "Visit deleted." });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting visit {Id}", id);
            return StatusCode(500, new { message = "Failed to delete visit." });
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(claim, out userId);
    }
}
