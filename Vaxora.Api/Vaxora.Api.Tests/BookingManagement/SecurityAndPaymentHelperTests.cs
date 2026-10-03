using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.BookingManagement;

public class SecurityAndPaymentHelperTests
{
    [Fact]
    public void PasswordHasher_hashes_and_verifies_correct_password()
    {
        var hasher = new PasswordHasher();
        const string rawPassword = "SecurePassword#2026";

        var hash = hasher.HashPassword(rawPassword);

        Assert.NotNull(hash);
        Assert.StartsWith("$2", hash); // BCrypt prefix
        Assert.True(hasher.VerifyPassword(rawPassword, hash));
    }

    [Fact]
    public void PasswordHasher_rejects_wrong_password()
    {
        var hasher = new PasswordHasher();
        const string rawPassword = "CorrectPassword123";
        const string wrongPassword = "WrongPassword456";

        var hash = hasher.HashPassword(rawPassword);

        Assert.False(hasher.VerifyPassword(wrongPassword, hash));
    }

    [Fact]
    public void PayHereService_BuildOrderId_and_MatchesOrderId_behave_consistently()
    {
        var service = CreatePayHereService();
        var appointmentId = Guid.NewGuid();

        var orderId = service.BuildOrderId(appointmentId);

        Assert.StartsWith("APT-", orderId);
        Assert.Equal(16, orderId.Length); // "APT-" (4) + 12 hex chars = 16

        Assert.True(service.MatchesOrderId(appointmentId, orderId));
        Assert.True(service.MatchesOrderId(appointmentId, orderId.ToLowerInvariant())); // Case-insensitive
        Assert.False(service.MatchesOrderId(appointmentId, "APT-DIFFERENT12"));
        Assert.False(service.MatchesOrderId(appointmentId, null));
        Assert.False(service.MatchesOrderId(appointmentId, ""));
    }

    [Fact]
    public void PayHereService_GenerateHash_and_VerifyNotification_validate_matching_signature()
    {
        var service = CreatePayHereService();
        const string merchantId = "121212";
        const string orderId = "APT-1234567890AB";
        const string amount = "1500.00";
        const string currency = "LKR";
        const string statusCode = "2"; // 2 = success in PayHere

        // Generate MD5 signature according to PayHere spec:
        // md5(merchant_id + order_id + amount + currency + status_code + md5(merchant_secret).upper()).upper()
        var merchantSecretMd5 = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes("testSecret456"));
        var hashedSecret = Convert.ToHexString(merchantSecretMd5).ToUpperInvariant();
        var rawSig = $"{merchantId}{orderId}{amount}{currency}{statusCode}{hashedSecret}";
        var expectedSig = Convert.ToHexString(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(rawSig))).ToUpperInvariant();

        var isValid = service.VerifyNotification(merchantId, orderId, amount, currency, statusCode, expectedSig);
        Assert.True(isValid);
    }

    [Fact]
    public void PayHereService_VerifyNotification_rejects_merchant_mismatch_and_tampered_signature()
    {
        var service = CreatePayHereService();

        // 1. Merchant mismatch
        var rejectedWrongMerchant = service.VerifyNotification(
            "999999", // wrong merchant
            "APT-1234567890AB",
            "1500.00",
            "LKR",
            "2",
            "SOME_VALID_LOOKING_SIG");
        Assert.False(rejectedWrongMerchant);

        // 2. Tampered signature
        var rejectedTampered = service.VerifyNotification(
            "121212",
            "APT-1234567890AB",
            "1500.00",
            "LKR",
            "2",
            "TAMPERED_SIG");
        Assert.False(rejectedTampered);

        // 3. Null or empty arguments
        Assert.False(service.VerifyNotification("", "ORD-1", "100", "LKR", "2", "SIG"));
        Assert.False(service.VerifyNotification("121212", "", "100", "LKR", "2", "SIG"));
    }

    [Theory]
    [InlineData("1500.00", true, 1500.00)]
    [InlineData("0.50", true, 0.50)]
    [InlineData("12000", true, 12000.00)]
    [InlineData("invalid_amount", false, 0)]
    [InlineData("", false, 0)]
    [InlineData(null, false, 0)]
    public void PayHereService_TryParseAmount_handles_various_formats(string? input, bool expectedSuccess, decimal expectedAmount)
    {
        var service = CreatePayHereService();
        var success = service.TryParseAmount(input, out var amount);

        Assert.Equal(expectedSuccess, success);
        if (expectedSuccess)
        {
            Assert.Equal(expectedAmount, amount);
        }
    }

    [Fact]
    public void PayHereService_CreateCheckoutParameters_generates_valid_dto()
    {
        var service = CreatePayHereService();
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientName = "Kasun Perera",
            PatientEmail = "kasun@example.com",
            PatientPhone = "+94771234567",
            HospitalName = "General Hospital Colombo",
            VaccineName = "Influenza",
            Fee = 2500.00m
        };

        var dto = service.CreateCheckoutParameters(appointment, "https://vaxora.lk");

        Assert.Equal("121212", dto.MerchantId);
        Assert.Equal(2500.00m, dto.Amount);
        Assert.Equal("2500.00", dto.FormattedAmount);
        Assert.Equal("LKR", dto.Currency);
        Assert.Equal("Kasun", dto.FirstName);
        Assert.Equal("Perera", dto.LastName);
        Assert.Equal("kasun@example.com", dto.Email);
        Assert.Equal("https://sandbox.payhere.lk/pay/checkout", dto.CheckoutUrl);
        Assert.Contains(dto.OrderId, dto.ReturnUrl);
        Assert.NotNull(dto.Hash);
    }

    private static PayHereService CreatePayHereService()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayHere:MerchantId"] = "121212",
                ["PayHere:MerchantSecret"] = "testSecret456",
                ["PayHere:CheckoutUrl"] = "https://sandbox.payhere.lk/pay/checkout",
                ["PayHere:PublicApiBaseUrl"] = "https://api.vaxora.lk"
            })
            .Build();

        return new PayHereService(config, NullLogger<PayHereService>.Instance);
    }
}
