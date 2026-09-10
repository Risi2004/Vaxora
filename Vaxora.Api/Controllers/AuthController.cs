using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaxora.Api.Dtos;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("signup/patient")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SignupPatient([FromForm] PatientSignupDto dto)
    {
        try
        {
            var result = await _authService.RegisterPatientAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            if (ex.ToString().Contains("IX_Users_Email", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this email address already exists." });
            }
            if (ex.ToString().Contains("IX_PatientProfiles_NicNumber", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this National Identity Card (NIC) number already exists." });
            }
            _logger.LogError(ex, "Database update error during patient signup");
            return BadRequest(new { message = "An account with this email or identity information already exists." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during patient signup");
            return StatusCode(500, new { message = "An error occurred during patient registration. Please try again." });
        }
    }

    [HttpPost("signup/doctor")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SignupDoctor([FromForm] DoctorSignupDto dto)
    {
        try
        {
            var result = await _authService.RegisterDoctorAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            if (ex.ToString().Contains("IX_Users_Email", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this email address already exists." });
            }
            if (ex.ToString().Contains("IX_DoctorProfiles_SlmcNumber", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this SLMC Registration Number already exists." });
            }
            _logger.LogError(ex, "Database update error during doctor signup");
            return BadRequest(new { message = "An account with this email or SLMC registration number already exists." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during doctor signup");
            return StatusCode(500, new { message = "An error occurred during doctor registration. Please try again." });
        }
    }

    [HttpPost("signup/nurse")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SignupNurse([FromForm] NurseSignupDto dto)
    {
        try
        {
            var result = await _authService.RegisterNurseAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            if (ex.ToString().Contains("IX_Users_Email", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this email address already exists." });
            }
            if (ex.ToString().Contains("IX_NurseProfiles_SlncNumber", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this SLNC Registration Number already exists." });
            }
            _logger.LogError(ex, "Database update error during nurse signup");
            return BadRequest(new { message = "An account with this email or SLNC registration number already exists." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during nurse signup");
            return StatusCode(500, new { message = "An error occurred during nurse registration. Please try again." });
        }
    }

    [HttpPost("signup/hospital")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SignupHospital([FromForm] HospitalSignupDto dto)
    {
        try
        {
            var result = await _authService.RegisterHospitalAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            if (ex.ToString().Contains("IX_Users_Email", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this email address already exists." });
            }
            if (ex.ToString().Contains("IX_HospitalProfiles_RegistrationNumber", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "An account with this Hospital Registration Number already exists." });
            }
            _logger.LogError(ex, "Database update error during hospital signup");
            return BadRequest(new { message = "An account with this email or hospital registration number already exists." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during hospital signup");
            return StatusCode(500, new { message = "An error occurred during hospital registration. Please try again." });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { message = "An internal error occurred during login. Please try again." });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid user token claims." });
        }

        try
        {
            var user = await _authService.GetCurrentUserAsync(userId);
            return Ok(user);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "User record not found." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching current user profile");
            return StatusCode(500, new { message = "Error fetching user profile." });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto dto)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(dto);
            return Ok(result);
        }
        catch (SecurityException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return StatusCode(500, new { message = "Failed to refresh token." });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (Guid.TryParse(userIdClaim, out var userId))
        {
            await _authService.LogoutAsync(userId);
        }

        return Ok(new { message = "Logged out successfully." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        try
        {
            await _authService.ForgotPasswordAsync(dto);
            return Ok(new { message = "If your email is registered in Vaxora, a password reset code has been sent." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in forgot password");
            return StatusCode(500, new { message = "Failed to process forgot password request." });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _authService.ResetPasswordAsync(dto);
            return Ok(new { message = "Password has been successfully reset. You can now log in with your new password." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password");
            return StatusCode(500, new { message = "Failed to reset password." });
        }
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid authentication claims." });
        }

        try
        {
            await _authService.ChangePasswordAsync(userId, dto);
            return Ok(new { message = "Password changed successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new { message = "Failed to change password." });
        }
    }
}
