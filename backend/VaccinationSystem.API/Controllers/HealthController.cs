using Microsoft.AspNetCore.Mvc;

namespace VaccinationSystem.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { Status = "Inventory API is running!" });
}