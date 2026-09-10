using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Vaxora.Api.Services;

public interface IEmailService
{
    Task<bool> SendPatientWelcomeEmailAsync(string toEmail, string patientName, string regNumber, DateTime? dob, byte[] vaccinationCardPdfBytes);
    Task<bool> SendPendingApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName);
    Task<bool> SendApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName);
    Task<bool> SendRejectionEmailAsync(string toEmail, string recipientName, string regNumber, string roleName, string? rejectionReason);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private string? GetConfigValue(string configKey, string envKey) =>
        _configuration[configKey] ?? Environment.GetEnvironmentVariable(envKey);

    public async Task<bool> SendPatientWelcomeEmailAsync(string toEmail, string patientName, string regNumber, DateTime? dob, byte[] vaccinationCardPdfBytes)
    {
        var subject = $"Welcome to Vaxora • Your Digital Vaccination Card ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1329; margin: 0; padding: 20px; color: #e2e8f0; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #111c38; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px; text-align: center; }}
    .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; }}
    .header p {{ margin: 5px 0 0 0; color: #e0f2fe; font-size: 13px; }}
    .content {{ padding: 30px; line-height: 1.6; font-size: 15px; }}
    .badge-box {{ background-color: #0d1527; border: 1px solid #0284c7; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center; }}
    .badge-label {{ color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }}
    .badge-value {{ color: #38bdf8; font-size: 22px; font-weight: bold; letter-spacing: 2px; }}
    .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .info-table td {{ padding: 10px 0; border-bottom: 1px solid #1e293b; }}
    .info-table td.label {{ color: #94a3b8; width: 40%; font-size: 14px; }}
    .info-table td.val {{ color: #f8fafc; font-weight: 600; font-size: 14px; }}
    .attachment-notice {{ background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 13.5px; color: #6ee7b7; }}
    .footer {{ background-color: #0b1329; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>VAXORA</h1>
      <p>National Immunization & Healthcare Platform</p>
    </div>
    <div class='content'>
      <p>Dear <strong>{patientName}</strong>,</p>
      <p>Welcome to <strong>Vaxora</strong>. Your official national immunization citizen profile has been created successfully.</p>
      
      <div class='badge-box'>
        <div class='badge-label'>Your Vaxora Registration Number</div>
        <div class='badge-value'>{regNumber}</div>
      </div>

      <table class='info-table'>
        <tr>
          <td class='label'>Patient Name:</td>
          <td class='val'>{patientName}</td>
        </tr>
        <tr>
          <td class='label'>Vaxora ID:</td>
          <td class='val'>{regNumber}</td>
        </tr>
        <tr>
          <td class='label'>Date of Birth:</td>
          <td class='val'>{dob?.ToString("dd MMM yyyy") ?? "N/A"}</td>
        </tr>
        <tr>
          <td class='label'>Account Status:</td>
          <td class='val' style='color: #34d399;'>✓ Active / Verified</td>
        </tr>
      </table>

      <div class='attachment-notice'>
        📎 <strong>Attached:</strong> Your official digital <strong>Vaxora Vaccination Card (PDF)</strong> with encrypted verification QR code is attached to this email. You can present this card at any registered clinic or hospital.
      </div>

      <p style='color: #94a3b8; font-size: 13.5px;'>Please save your Vaxora Registration Number for fast identification during immunization appointments.</p>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, patientName, subject, bodyHtml, vaccinationCardPdfBytes, $"Vaxora_Vaccination_Card_{regNumber}.pdf");
    }

    public async Task<bool> SendPendingApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName)
    {
        var subject = $"Application Received • Vaxora {roleName} Account ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1329; margin: 0; padding: 20px; color: #e2e8f0; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #111c38; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }}
    .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; }}
    .header p {{ margin: 5px 0 0 0; color: #fef3c7; font-size: 13px; }}
    .content {{ padding: 30px; line-height: 1.6; font-size: 15px; }}
    .badge-box {{ background-color: #0d1527; border: 1px solid #f59e0b; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center; }}
    .badge-label {{ color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
    .badge-value {{ color: #fbbf24; font-size: 22px; font-weight: bold; letter-spacing: 2px; }}
    .status-notice {{ background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #fcd34d; }}
    .footer {{ background-color: #0b1329; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>VAXORA</h1>
      <p>Healthcare Professional & Facility Portal</p>
    </div>
    <div class='content'>
      <p>Dear <strong>{recipientName}</strong>,</p>
      <p>Thank you for registering on the <strong>Vaxora Healthcare Platform</strong> as a <strong>{roleName}</strong>.</p>
      
      <div class='badge-box'>
        <div class='badge-label'>Assigned Registration Number</div>
        <div class='badge-value'>{regNumber}</div>
      </div>

      <div class='status-notice'>
        ⏳ <strong>Account Status: Under Administrative Review</strong><br/>
        Your submitted professional credentials, licensing numbers, and verification documents have been securely routed to the Ministry of Health administration team.
      </div>

      <p>Our team will verify your details against official regulatory registries. Once approved, you will receive an activation email granting immediate access to your portal.</p>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform.
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName)
    {
        var subject = $"Account Approved • Access Granted to Vaxora {roleName} Portal ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1329; margin: 0; padding: 20px; color: #e2e8f0; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #111c38; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }}
    .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; }}
    .header p {{ margin: 5px 0 0 0; color: #d1fae5; font-size: 13px; }}
    .content {{ padding: 30px; line-height: 1.6; font-size: 15px; }}
    .badge-box {{ background-color: #0d1527; border: 1px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center; }}
    .badge-label {{ color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
    .badge-value {{ color: #34d399; font-size: 22px; font-weight: bold; letter-spacing: 2px; }}
    .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 15px 0; }}
    .footer {{ background-color: #0b1329; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>VAXORA</h1>
      <p>Healthcare Professional Authorization Notice</p>
    </div>
    <div class='content'>
      <p>Dear <strong>{recipientName}</strong>,</p>
      <p>We are pleased to inform you that your <strong>Vaxora {roleName}</strong> credentials have been verified and approved by the system administration.</p>
      
      <div class='badge-box'>
        <div class='badge-label'>Vaxora Registration Number</div>
        <div class='badge-value'>{regNumber}</div>
      </div>

      <p>Your account is now <strong>Active</strong>. You have full access to manage vaccination records, appointments, and immunization batches.</p>

      <div style='text-align: center;'>
        <a href='http://localhost:5173/login' class='btn'>Log In to Vaxora Portal</a>
      </div>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform.
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendRejectionEmailAsync(string toEmail, string recipientName, string regNumber, string roleName, string? rejectionReason)
    {
        var subject = $"Account Verification Notice • Vaxora {roleName} ({regNumber})";
        var reasonText = !string.IsNullOrWhiteSpace(rejectionReason) 
            ? rejectionReason 
            : "The submitted credential documents could not be matched against official regulatory registries.";

        var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1329; margin: 0; padding: 20px; color: #e2e8f0; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #111c38; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; text-align: center; }}
    .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; }}
    .header p {{ margin: 5px 0 0 0; color: #fee2e2; font-size: 13px; }}
    .content {{ padding: 30px; line-height: 1.6; font-size: 15px; }}
    .reason-box {{ background-color: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 18px; margin: 20px 0; }}
    .reason-title {{ color: #f87171; font-weight: bold; font-size: 14px; margin-bottom: 6px; }}
    .reason-body {{ color: #e2e8f0; font-size: 14px; }}
    .footer {{ background-color: #0b1329; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>VAXORA</h1>
      <p>Verification Review Notice</p>
    </div>
    <div class='content'>
      <p>Dear <strong>{recipientName}</strong>,</p>
      <p>Thank you for your interest in registering on <strong>Vaxora</strong> as a <strong>{roleName}</strong> (Ref: <code>{regNumber}</code>).</p>
      
      <p>After careful review by the administrative team, your application could not be verified at this time due to the following reason:</p>

      <div class='reason-box'>
        <div class='reason-title'>Administrative Review Note:</div>
        <div class='reason-body'>{reasonText}</div>
      </div>

      <p style='color: #94a3b8; font-size: 13.5px;'>If you believe this is an error or wish to provide updated verification documents, please submit a new registration or contact our help desk.</p>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform.
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    private async Task<bool> SendEmailAsync(
        string toEmail,
        string toName,
        string subject,
        string bodyHtml,
        byte[]? attachmentBytes = null,
        string? attachmentFilename = null)
    {
        var host = GetConfigValue("Smtp:Host", "SMTP_HOST");
        var portStr = GetConfigValue("Smtp:Port", "SMTP_PORT") ?? "587";
        var username = GetConfigValue("Smtp:Username", "SMTP_USERNAME");
        var password = GetConfigValue("Smtp:Password", "SMTP_PASSWORD");
        var fromEmail = GetConfigValue("Smtp:FromEmail", "SMTP_FROM_EMAIL") ?? "noreply@vaxora.health.gov.lk";
        var fromName = GetConfigValue("Smtp:FromName", "SMTP_FROM_NAME") ?? "Vaxora Immunization Platform";
        var enableSslStr = GetConfigValue("Smtp:EnableSsl", "SMTP_ENABLE_SSL") ?? "true";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("SMTP credentials not fully configured (Host: {Host}, User: {User}). Skipping live email dispatch for '{Subject}' to '{Recipient}'.", host, username, subject, toEmail);
            return false;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = bodyHtml
            };

            if (attachmentBytes != null && !string.IsNullOrWhiteSpace(attachmentFilename))
            {
                builder.Attachments.Add(attachmentFilename, attachmentBytes, new ContentType("application", "pdf"));
            }

            message.Body = builder.ToMessageBody();

            int port = int.TryParse(portStr, out var p) ? p : 587;
            bool enableSsl = bool.TryParse(enableSslStr, out var ssl) ? ssl : true;
            var socketOptions = enableSsl 
                ? (port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls)
                : SecureSocketOptions.Auto;

            using var client = new SmtpClient();
            // Accept all certificates for custom/self-hosted dev environments if needed
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            await client.ConnectAsync(host, port, socketOptions);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Successfully sent email '{Subject}' to '{Recipient}'.", subject, toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email '{Subject}' to '{Recipient}'.", subject, toEmail);
            return false;
        }
    }
}
