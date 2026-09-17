using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/patient-vaccinations")]
[Authorize(Roles = "DOCTOR,NURSE,HOSPITAL,ADMIN")]
public class PatientVaccinationController : ControllerBase
{
    private readonly IPatientVaccinationService _service;
    private readonly ILogger<PatientVaccinationController> _logger;

    public PatientVaccinationController(IPatientVaccinationService service, ILogger<PatientVaccinationController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("patients/{patientProfileId:guid}/timeline")]
    public async Task<IActionResult> GetTimeline(Guid patientProfileId)
    {
        try
        {
            var result = await _service.GetTimelineAsync(patientProfileId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching vaccination timeline for patient {PatientId}", patientProfileId);
            return StatusCode(500, new { message = "Failed to fetch vaccination timeline." });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var result = await _service.GetByIdAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching vaccination record {Id}", id);
            return StatusCode(500, new { message = "Failed to fetch vaccination record." });
        }
    }

    [HttpPost("patients/{patientProfileId:guid}")]
    [Authorize(Roles = "DOCTOR,NURSE,HOSPITAL")]
    public async Task<IActionResult> Create(Guid patientProfileId, [FromBody] CreatePatientVaccinationDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(new { message = "Invalid identity claim." });

        try
        {
            var result = await _service.CreateAsync(actorUserId, patientProfileId, dto);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording vaccination for patient {PatientId}", patientProfileId);
            return StatusCode(500, new { message = "Failed to record vaccination." });
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(claim, out userId);
    }
}
