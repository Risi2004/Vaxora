using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPayHereService _payHereService;
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        ApplicationDbContext context,
        IPayHereService payHereService,
        IAppointmentService appointmentService,
        ILogger<PaymentController> logger)
    {
        _context = context;
        _payHereService = payHereService;
        _appointmentService = appointmentService;
        _logger = logger;
    }

    /// <summary>
    /// Generates PayHere checkout form parameters and security MD5 hash for a given appointment.
    /// </summary>
    [HttpPost("payhere-init")]
    [Authorize]
    public async Task<IActionResult> InitializePayHere([FromBody] PayHereInitRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Invalid user identity token." });
        }

        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId && a.PatientUserId == userId);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment record not found or does not belong to you." });
        }

        if (appointment.Fee <= 0)
        {
            return BadRequest(new { message = "This vaccination appointment is free (0 LKR). Payment gateway is not required." });
        }

        var originHeader = Request.Headers.Origin.ToString();
        var clientOrigin = !string.IsNullOrWhiteSpace(originHeader) ? originHeader : "http://localhost:5173";

        var payload = _payHereService.CreateCheckoutParameters(appointment, clientOrigin);

        _logger.LogInformation("Generated PayHere checkout payload for Appointment {AppId} (Order: {OrderId}, Fee: {Fee})",
            appointment.Id, payload.OrderId, payload.Amount);

        return Ok(payload);
    }

    /// <summary>
    /// Confirm PayHere payment from client return flow.
    /// Updates status to Confirmed, PaymentStatus to Paid, and triggers booking + receipt emails.
    /// </summary>
    [HttpPost("confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPayHerePaymentRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Invalid user identity token." });
        }

        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId && a.PatientUserId == userId);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment record not found." });
        }

        var txId = !string.IsNullOrWhiteSpace(dto.PaymentId) ? dto.PaymentId : $"PH-MOCK-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
        var result = await _appointmentService.ConfirmPayHerePaymentAsync(appointment.Id, txId);

        return Ok(new
        {
            message = "Payment confirmed successfully. Booking confirmed and emails sent.",
            appointment = result
        });
    }

    /// <summary>
    /// PayHere IPN (Instant Payment Notification) Webhook.
    /// Validates MD5 signature, confirms appointment, and triggers booking + payment receipt emails.
    /// </summary>
    [HttpPost("payhere-notify")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded", "multipart/form-data")]
    public async Task<IActionResult> PayHereNotify([FromForm] IFormCollection form)
    {
        try
        {
            var merchantId = form["merchant_id"].ToString();
            var orderId = form["order_id"].ToString();
            var paymentId = form["payment_id"].ToString();
            var payhereAmount = form["payhere_amount"].ToString();
            var payhereCurrency = form["payhere_currency"].ToString();
            var statusCode = form["status_code"].ToString();
            var md5Sig = form["md5sig"].ToString();

            _logger.LogInformation("Received PayHere IPN: Order={OrderId}, PaymentId={PaymentId}, Status={StatusCode}, Amount={Amount}",
                orderId, paymentId, statusCode, payhereAmount);

            var isValid = _payHereService.VerifyNotification(merchantId, orderId, payhereAmount, payhereCurrency, statusCode, md5Sig);
            if (!isValid)
            {
                _logger.LogWarning("Invalid PayHere IPN signature for Order {OrderId}", orderId);
                return BadRequest("Invalid hash signature");
            }

            // PayHere status_code: 2 = Success, 0 = Pending, -1 = Canceled, -2 = Failed, -3 = Chargedback
            if (statusCode == "2")
            {
                // Resolve appointment by OrderId: "APT-{first12Guid}"
                var cleanOrderId = orderId.Trim();
                var appointments = await _context.Appointments
                    .Where(a => a.PaymentStatus != "Paid")
                    .ToListAsync();

                var appointment = appointments.FirstOrDefault(a =>
                    cleanOrderId.Contains(a.Id.ToString("N")[..12], StringComparison.OrdinalIgnoreCase) ||
                    cleanOrderId.EndsWith(a.Id.ToString(), StringComparison.OrdinalIgnoreCase));

                if (appointment != null)
                {
                    await _appointmentService.ConfirmPayHerePaymentAsync(appointment.Id, paymentId, cleanOrderId);
                    _logger.LogInformation("Successfully processed PayHere IPN for Appointment {AppId}", appointment.Id);
                }
                else
                {
                    _logger.LogWarning("PayHere IPN: Could not locate appointment matching OrderId {OrderId}", orderId);
                }
            }
            else
            {
                _logger.LogInformation("PayHere IPN status code was {StatusCode} (non-success). No confirmation applied.", statusCode);
            }

            return Ok("Notification processed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing PayHere notification");
            return StatusCode(500, "Internal error processing payment notification");
        }
    }
}
