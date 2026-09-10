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
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string recipientName, string resetLink, string resetCode, int expiryMinutes = 15);
    Task<bool> SendPasswordChangedConfirmationEmailAsync(string toEmail, string recipientName);
    Task<bool> SendAccountDeletedEmailAsync(string toEmail, string recipientName, string regNumber, string roleName);
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

    public async Task<bool> SendPatientWelcomeEmailAsync(string toEmail, string patientName, string regNumber, DateTime? dob, byte[] vaccinationCardPdfBytes)
    {
        var subject = $"Welcome to Vaxora • Your Digital Vaccination Card ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;'>National Immunization &amp; Healthcare Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 32px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{patientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>Welcome to <strong>Vaxora</strong>. Your official national immunization citizen profile has been created successfully.</p>
              
              <!-- Registration Number Box -->
              <div style='background-color: #f0f9ff; border: 2px solid #0284c7; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;'>
                <div style='color: #0369a1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;'>Your Vaxora Registration Number</div>
                <div style='color: #0284c7; font-size: 26px; font-weight: 800; letter-spacing: 2px; font-family: ""Courier New"", Courier, monospace;'>{regNumber}</div>
              </div>

              <!-- Details Table -->
              <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='margin: 20px 0; border-collapse: collapse;'>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 40%;'>Patient Name:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{patientName}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Vaxora ID:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{regNumber}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Date of Birth:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{dob?.ToString("dd MMM yyyy") ?? "N/A"}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Account Status:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #16a34a; font-weight: 700; font-size: 14px;'>✓ Active &amp; Verified</td>
                </tr>
              </table>

              <!-- Attachment Notice -->
              <div style='background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin: 24px 0;'>
                <p style='margin: 0; color: #15803d; font-size: 14px; line-height: 1.5;'>
                  📎 <strong>Attached:</strong> Your official digital <strong>Vaxora Vaccination Card (PDF)</strong> is attached to this email. You can present this card at any registered hospital or clinic.
                </p>
              </div>

              <p style='margin: 0; color: #64748b; font-size: 13.5px; line-height: 1.5;'>Please keep your Vaxora Registration Number safe for immunization appointments and verification.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, patientName, subject, bodyHtml, vaccinationCardPdfBytes, $"Vaxora_Vaccination_Card_{regNumber}.pdf");
    }

    public async Task<bool> SendPendingApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName)
    {
        var subject = $"Application Received • Vaxora {roleName} Account ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #fef3c7; font-size: 13px; font-weight: 500;'>Healthcare Professional &amp; Hospital Portal</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 32px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>Thank you for registering on <strong>Vaxora</strong> as a <strong>{roleName}</strong>.</p>
              
              <div style='background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;'>
                <div style='color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;'>Assigned Registration Number</div>
                <div style='color: #b45309; font-size: 26px; font-weight: 800; letter-spacing: 2px; font-family: ""Courier New"", Courier, monospace;'>{regNumber}</div>
              </div>

              <div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 18px; border-radius: 6px; margin: 24px 0;'>
                <div style='color: #92400e; font-weight: 700; font-size: 14px; margin-bottom: 4px;'>⏳ Application Under Review</div>
                <div style='color: #78350f; font-size: 13.5px; line-height: 1.5;'>Your submitted credentials and documentation are currently undergoing administrative verification by our compliance team.</div>
              </div>

              <p style='margin: 0; color: #64748b; font-size: 13.5px; line-height: 1.5;'>You will receive an email confirmation as soon as your account is approved and activated.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendApprovalEmailAsync(string toEmail, string recipientName, string regNumber, string roleName)
    {
        var subject = $"Account Approved • Access Granted to Vaxora {roleName} Portal ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;'>Healthcare Professional Authorization Notice</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 32px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>We are pleased to inform you that your <strong>Vaxora {roleName}</strong> credentials have been verified and approved.</p>
              
              <div style='background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;'>
                <div style='color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;'>Vaxora Registration Number</div>
                <div style='color: #16a34a; font-size: 26px; font-weight: 800; letter-spacing: 2px; font-family: ""Courier New"", Courier, monospace;'>{regNumber}</div>
              </div>

              <p style='margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;'>Your account is now <strong>Active</strong>. You have full access to manage records, appointments, and batch operations.</p>

              <div style='text-align: center; margin: 28px 0;'>
                <a href='http://localhost:5173/login' style='display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);' target='_blank'>Log In to Vaxora Portal</a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendRejectionEmailAsync(string toEmail, string recipientName, string regNumber, string roleName, string? rejectionReason)
    {
        var subject = $"Account Verification Notice • Vaxora {roleName} ({regNumber})";
        var reasonText = !string.IsNullOrWhiteSpace(rejectionReason) 
            ? rejectionReason 
            : "The submitted credential documents could not be verified.";

        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #fee2e2; font-size: 13px; font-weight: 500;'>Verification Review Notice</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 32px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>Thank you for your interest in registering on <strong>Vaxora</strong> as a <strong>{roleName}</strong> (Ref: <code>{regNumber}</code>).</p>
              
              <p style='margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;'>After careful review, your application could not be verified at this time due to the following reason:</p>

              <!-- Reason Box -->
              <div style='background-color: #fef2f2; border: 1.5px solid #ef4444; border-radius: 8px; padding: 18px; margin: 20px 0;'>
                <div style='color: #dc2626; font-weight: 700; font-size: 14px; margin-bottom: 6px;'>Reviewer Feedback:</div>
                <div style='color: #7f1d1d; font-size: 14.5px; line-height: 1.5;'>{reasonText}</div>
              </div>

              <p style='margin: 0; color: #64748b; font-size: 13.5px; line-height: 1.5;'>If you believe this is an error or wish to provide updated verification documents, please submit a new application or contact support.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string recipientName, string resetLink, string resetCode, int expiryMinutes = 15)
    {
        var subject = "Password Reset Request • Vaxora Platform";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;'>National Immunization &amp; Healthcare Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 34px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>We received a request to reset the password for your <strong>Vaxora</strong> account (<code>{toEmail}</code>).</p>
              
              <!-- Highlighted Reset Token Box -->
              <div style='background-color: #f0f9ff; border: 2px solid #0284c7; border-radius: 10px; padding: 22px; margin: 24px 0; text-align: center;'>
                <div style='color: #0369a1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;'>Your Password Reset Token / Code</div>
                <div style='color: #0284c7; font-size: 32px; font-weight: 800; letter-spacing: 6px; font-family: ""Courier New"", Courier, monospace;'>{resetCode}</div>
              </div>

              <p style='margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;'>You can also click the button below to directly open the reset password screen:</p>

              <!-- Action Button -->
              <div style='text-align: center; margin: 28px 0;'>
                <a href='{resetLink}' style='display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);' target='_blank'>Reset My Password</a>
              </div>

              <!-- Notice Box -->
              <div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin: 24px 0;'>
                <p style='margin: 0; color: #92400e; font-size: 13.5px; line-height: 1.5;'>
                  ⏳ <strong>Security Notice:</strong> This code and link will expire in <strong>{expiryMinutes} minutes</strong>.<br/>
                  If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                </p>
              </div>

              <p style='margin: 20px 0 0 0; color: #64748b; font-size: 12.5px; line-height: 1.5; word-break: break-all;'>
                Direct link: <a href='{resetLink}' style='color: #0284c7; text-decoration: underline;'>{resetLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendPasswordChangedConfirmationEmailAsync(string toEmail, string recipientName)
    {
        var subject = "Security Alert • Your Vaxora Password Was Successfully Changed";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;'>Security Notification</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 34px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>This is an automated notification confirming that the password for your Vaxora account (<code>{toEmail}</code>) was successfully changed.</p>
              
              <div style='background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 18px; border-radius: 6px; margin: 24px 0;'>
                <div style='color: #15803d; font-weight: 700; font-size: 14px; margin-bottom: 4px;'>✓ Password Updated Successfully</div>
                <div style='color: #166534; font-size: 13.5px; line-height: 1.5;'>{DateTime.UtcNow:dd MMM yyyy, HH:mm} UTC • All active sessions and refresh tokens have been revoked.</div>
              </div>

              <p style='margin: 0; color: #64748b; font-size: 13.5px; line-height: 1.5;'>
                If you performed this change, no further action is required.<br/>
                <strong>If you did not initiate this change,</strong> please contact Vaxora Support immediately to secure your account.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    public async Task<bool> SendAccountDeletedEmailAsync(string toEmail, string recipientName, string regNumber, string roleName)
    {
        var subject = $"Account Deletion Confirmation • Vaxora {roleName} ({regNumber})";
        var bodyHtml = $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>{subject}</title>
</head>
<body style='margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
  <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 20px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 32px 24px; text-align: center;'>
              <h1 style='margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;'>VAXORA</h1>
              <p style='margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px; font-weight: 500;'>National Immunization &amp; Healthcare Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style='padding: 34px 28px; background-color: #ffffff;'>
              <p style='margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.5;'>Dear <strong>{recipientName}</strong>,</p>
              <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>This email confirms that your <strong>Vaxora {roleName} account</strong> (Registration: <code>{regNumber}</code>) has been <strong>permanently deleted</strong> upon your request.</p>
              
              <!-- Status Box -->
              <div style='background-color: #fef2f2; border: 1.5px solid #ef4444; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;'>
                <div style='color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;'>Account Status</div>
                <div style='color: #dc2626; font-size: 22px; font-weight: 800; letter-spacing: 1px;'>🗑️ Permanently Deleted &amp; Closed</div>
                <div style='color: #7f1d1d; font-size: 13px; margin-top: 6px;'>Processed on {DateTime.UtcNow:dd MMM yyyy, HH:mm} UTC</div>
              </div>

              <!-- Summary Table -->
              <table role='presentation' width='100%' border='0' cellspacing='0' cellpadding='0' style='margin: 20px 0; border-collapse: collapse;'>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 40%;'>Account Name:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{recipientName}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Account Role:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{roleName}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Registration Code:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace;'>{regNumber}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;'>Associated Email:</td>
                  <td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 14px;'>{toEmail}</td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style='background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px 18px; border-radius: 6px; margin: 24px 0;'>
                <p style='margin: 0; color: #334155; font-size: 13.5px; line-height: 1.5;'>
                  🔒 <strong>Privacy &amp; Data Security:</strong> All your profile details, personal identification numbers, access credentials, and uploaded documentation have been erased from the Vaxora database.
                </p>
              </div>

              <p style='margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;'>
                If you did not request this deletion or believe your account was compromised, please reach out to the Vaxora National Support Team immediately.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style='background-color: #f8fafc; padding: 22px 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
              <p style='margin: 0; color: #64748b; font-size: 12px;'>&copy; {DateTime.UtcNow.Year} Vaxora National Immunization Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, recipientName, subject, bodyHtml);
    }

    private string? GetConfigValue(string configKey, string envKey)
    {
        return _configuration[configKey]
            ?? _configuration[envKey]
            ?? Environment.GetEnvironmentVariable(envKey)
            ?? Environment.GetEnvironmentVariable(configKey.Replace(":", "__"))
            ?? Environment.GetEnvironmentVariable(configKey)
            ?? Environment.GetEnvironmentVariable(configKey.Replace(":", "_").ToUpperInvariant());
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
        var fromEmail = GetConfigValue("Smtp:FromEmail", "SMTP_FROM_EMAIL");
        var fromName = GetConfigValue("Smtp:FromName", "SMTP_FROM_NAME") ?? "Vaxora Immunization Platform";
        var enableSslStr = GetConfigValue("Smtp:EnableSsl", "SMTP_ENABLE_SSL") ?? "true";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("SMTP credentials not fully configured (Host: {Host}, User: {User}). Skipping live email dispatch for '{Subject}' to '{Recipient}'.", host, username, subject, toEmail);
            return false;
        }

        // For Gmail SMTP, the 'From' address must be the authenticated username (or verified alias) to prevent rejection
        if (string.IsNullOrWhiteSpace(fromEmail) || (host?.Contains("gmail.com", StringComparison.OrdinalIgnoreCase) == true))
        {
            fromEmail = username;
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

            await client.ConnectAsync(host!, port, socketOptions);
            await client.AuthenticateAsync(username!, password!);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Successfully sent email '{Subject}' to '{Recipient}' from '{FromEmail}'.", subject, toEmail, fromEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email '{Subject}' to '{Recipient}'. Host: {Host}, Port: {Port}, User: {User}", subject, toEmail, host, portStr, username);
            return false;
        }
    }
}
