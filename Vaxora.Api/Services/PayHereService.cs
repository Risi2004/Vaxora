using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IPayHereService
{
    string MerchantId { get; }
    string CheckoutUrl { get; }
    string GenerateHash(string orderId, decimal amount, string currency = "LKR");
    bool VerifyNotification(string merchantId, string orderId, string payhereAmount, string payhereCurrency, string statusCode, string receivedMd5Sig);
    PayHereInitResponseDto CreateCheckoutParameters(Appointment appointment, string? baseUrl);
}

public class PayHereService : IPayHereService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PayHereService> _logger;

    public PayHereService(IConfiguration configuration, ILogger<PayHereService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public string MerchantId =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PayHere__MerchantId"))
            ? Environment.GetEnvironmentVariable("PayHere__MerchantId")!
            : (!string.IsNullOrWhiteSpace(_configuration["PayHere:MerchantId"])
                ? _configuration["PayHere:MerchantId"]!
                : "1236001");

    private string MerchantSecret =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PayHere__MerchantSecret"))
            ? Environment.GetEnvironmentVariable("PayHere__MerchantSecret")!
            : (!string.IsNullOrWhiteSpace(_configuration["PayHere:MerchantSecret"])
                ? _configuration["PayHere:MerchantSecret"]!
                : "NDIwMDA1MjE0MzM2ODI2NjQxNjIxNzY3MTMyNTg4NDkwOTE2NDM3");

    public string CheckoutUrl =>
        _configuration["PayHere:CheckoutUrl"]
        ?? Environment.GetEnvironmentVariable("PayHere__CheckoutUrl")
        ?? "https://sandbox.payhere.lk/pay/checkout";

    public string GenerateHash(string orderId, decimal amount, string currency = "LKR")
    {
        var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var hashedSecret = ComputeMd5(MerchantSecret).ToUpperInvariant();
        var raw = $"{MerchantId}{orderId}{formattedAmount}{currency}{hashedSecret}";
        return ComputeMd5(raw).ToUpperInvariant();
    }

    public bool VerifyNotification(string merchantId, string orderId, string payhereAmount, string payhereCurrency, string statusCode, string receivedMd5Sig)
    {
        if (string.IsNullOrWhiteSpace(receivedMd5Sig)) return false;

        var hashedSecret = ComputeMd5(MerchantSecret).ToUpperInvariant();
        var raw = $"{merchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{hashedSecret}";
        var expectedSig = ComputeMd5(raw).ToUpperInvariant();

        return string.Equals(expectedSig, receivedMd5Sig.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    public PayHereInitResponseDto CreateCheckoutParameters(Appointment appointment, string? baseUrl)
    {
        var clientOrigin = !string.IsNullOrWhiteSpace(baseUrl) ? baseUrl : "http://localhost:5173";
        var serverOrigin = "http://localhost:5004";

        var orderId = $"APT-{appointment.Id.ToString("N")[..12].ToUpperInvariant()}";
        var amount = appointment.Fee;
        var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var currency = "LKR";
        var hash = GenerateHash(orderId, amount, currency);

        var patientFullName = appointment.PatientName.Trim();
        var nameParts = patientFullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : "Patient";
        var lastName = nameParts.Length > 1 ? nameParts[1] : "Vaxora";

        _logger.LogInformation("Creating PayHere checkout parameters: MerchantId={MerchantId}, OrderId={OrderId}, Amount={Amount}, Hash={Hash}",
            MerchantId, orderId, formattedAmount, hash);

        return new PayHereInitResponseDto
        {
            MerchantId = MerchantId,
            OrderId = orderId,
            Items = $"Vaccination: {appointment.VaccineName} at {appointment.HospitalName}",
            Amount = amount,
            FormattedAmount = formattedAmount,
            Currency = currency,
            Hash = hash,
            CheckoutUrl = CheckoutUrl,
            ReturnUrl = $"{clientOrigin}/patient/appointments?payment=success&order_id={orderId}&apt_id={appointment.Id}",
            CancelUrl = $"{clientOrigin}/patient/appointments?payment=cancelled&apt_id={appointment.Id}",
            NotifyUrl = $"{serverOrigin}/api/payment/payhere-notify",
            FirstName = firstName,
            LastName = lastName,
            Email = appointment.PatientEmail ?? "patient@vaxora.lk",
            Phone = appointment.PatientPhone ?? "+94770000000",
            Address = "Sri Lanka",
            City = "Colombo",
            Country = "Sri Lanka"
        };
    }

    private static string ComputeMd5(string input)
    {
        using var md5 = MD5.Create();
        var inputBytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = md5.ComputeHash(inputBytes);
        return Convert.ToHexString(hashBytes);
    }
}
