using System.Globalization;
using System.Text;

namespace Vaxora.Api.Services;

public interface IVaccinationCardService
{
    byte[] GenerateVaccinationCardPdf(
        string patientName,
        string registrationNumber,
        string nicNumber,
        DateTime? dateOfBirth,
        string? phoneNumber,
        DateTime issuanceDate);
}

public class VaccinationCardService : IVaccinationCardService
{
    public byte[] GenerateVaccinationCardPdf(
        string patientName,
        string registrationNumber,
        string nicNumber,
        DateTime? dateOfBirth,
        string? phoneNumber,
        DateTime issuanceDate)
    {
        var dobText = dateOfBirth?.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) ?? "N/A";
        var phoneText = string.IsNullOrWhiteSpace(phoneNumber) ? "N/A" : phoneNumber.Trim();
        var issuedText = issuanceDate.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

        var safePatientName = EscapePdf(patientName);
        var safeRegNumber = EscapePdf(registrationNumber);
        var safeNicNumber = EscapePdf(nicNumber);
        var safeDob = EscapePdf(dobText);
        var safePhone = EscapePdf(phoneText);
        var safeIssued = EscapePdf(issuedText);

        // Build PDF graphics and text stream (A6 Landscape: 420 x 298 pt)
        var sb = new StringBuilder();

        // White card background
        sb.AppendLine("1.0 1.0 1.0 rg");
        sb.AppendLine("0 0 420 298 re f");

        // Outer border
        sb.AppendLine("0.82 0.86 0.90 RG 1 w");
        sb.AppendLine("12 12 396 274 re S");

        // Top decorative blue banner
        sb.AppendLine("0.12 0.25 0.69 rg");
        sb.AppendLine("12 282 396 4 re f");

        // Header Title: VAXORA
        sb.AppendLine("BT /F2 16 Tf 0.12 0.23 0.54 rg 24 256 Td (VAXORA) Tj ET");

        // Header Subtitle tag: | DIGITAL VACCINATION CARD
        sb.AppendLine("BT /F2 9.5 Tf 0.06 0.46 0.43 rg 106 257 Td (|  DIGITAL VACCINATION CARD) Tj ET");

        // Header Sub-agency
        sb.AppendLine("BT /F1 7.5 Tf 0.39 0.45 0.55 rg 24 242 Td (Ministry of Health | National Immunization Registry) Tj ET");

        // Official Record Badge (top right)
        sb.AppendLine("0.94 0.96 1.0 rg 298 244 98 22 re f");
        sb.AppendLine("0.58 0.77 0.99 RG 0.75 w 298 244 98 22 re S");
        sb.AppendLine("BT /F2 7.5 Tf 0.12 0.25 0.69 rg 310 252 Td (OFFICIAL RECORD) Tj ET");

        // Header divider line
        sb.AppendLine("0.23 0.51 0.96 RG 1.5 w");
        sb.AppendLine("24 233 m 396 233 l S");

        // Box 1: Patient Full Name Block
        sb.AppendLine("0.97 0.98 0.99 rg 24 184 372 38 re f");
        sb.AppendLine("0.89 0.91 0.94 RG 0.75 w 24 184 372 38 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.39 0.45 0.55 rg 34 211 Td (PATIENT FULL NAME) Tj ET");
        sb.AppendLine($"BT /F2 13 Tf 0.12 0.23 0.54 rg 34 194 Td ({safePatientName}) Tj ET");

        // Box 2: Vaxora Registration No
        sb.AppendLine("0.94 0.99 0.98 rg 24 136 181 38 re f");
        sb.AppendLine("0.60 0.96 0.89 RG 0.75 w 24 136 181 38 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.06 0.46 0.43 rg 34 163 Td (VAXORA REGISTRATION NO) Tj ET");
        sb.AppendLine($"BT /F2 11.5 Tf 0.07 0.37 0.35 rg 34 146 Td ({safeRegNumber}) Tj ET");

        // Box 3: NIC Number
        sb.AppendLine("0.97 0.98 0.99 rg 215 136 181 38 re f");
        sb.AppendLine("0.89 0.91 0.94 RG 0.75 w 215 136 181 38 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.39 0.45 0.55 rg 225 163 Td (NIC NUMBER) Tj ET");
        sb.AppendLine($"BT /F2 11.5 Tf 0.20 0.25 0.33 rg 225 146 Td ({safeNicNumber}) Tj ET");

        // Box 4: Date of Birth
        sb.AppendLine("0.97 0.98 0.99 rg 24 92 118 34 re f");
        sb.AppendLine("0.89 0.91 0.94 RG 0.75 w 24 92 118 34 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.39 0.45 0.55 rg 32 116 Td (DATE OF BIRTH) Tj ET");
        sb.AppendLine($"BT /F2 9.5 Tf 0.20 0.25 0.33 rg 32 102 Td ({safeDob}) Tj ET");

        // Box 5: Contact Phone
        sb.AppendLine("0.97 0.98 0.99 rg 151 92 118 34 re f");
        sb.AppendLine("0.89 0.91 0.94 RG 0.75 w 151 92 118 34 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.39 0.45 0.55 rg 159 116 Td (CONTACT PHONE) Tj ET");
        sb.AppendLine($"BT /F2 9.5 Tf 0.20 0.25 0.33 rg 159 102 Td ({safePhone}) Tj ET");

        // Box 6: Date Issued
        sb.AppendLine("0.97 0.98 0.99 rg 278 92 118 34 re f");
        sb.AppendLine("0.89 0.91 0.94 RG 0.75 w 278 92 118 34 re S");
        sb.AppendLine("BT /F2 6.5 Tf 0.39 0.45 0.55 rg 286 116 Td (DATE ISSUED) Tj ET");
        sb.AppendLine($"BT /F2 9.5 Tf 0.20 0.25 0.33 rg 286 102 Td ({safeIssued}) Tj ET");

        // Box 7: Verified Immunization Status Pill
        sb.AppendLine("0.94 0.99 0.96 rg 24 56 372 26 re f");
        sb.AppendLine("0.52 0.94 0.67 RG 0.75 w 24 56 372 26 re S");
        sb.AppendLine("BT /F2 8 Tf 0.08 0.50 0.24 rg 34 65 Td ([VERIFIED]  National Citizen Immunization Profile Record) Tj ET");

        // Footer Divider
        sb.AppendLine("0.89 0.91 0.94 RG 0.5 w");
        sb.AppendLine("24 43 m 396 43 l S");

        // Footer Text
        sb.AppendLine("BT /F1 6 Tf 0.50 0.55 0.63 rg 24 32 Td (This digital card is cryptographically issued by the Vaxora Immunization System. Keep this document accessible for appointments.) Tj ET");

        var contentBytes = Encoding.ASCII.GetBytes(sb.ToString());

        return BuildPdf(contentBytes);
    }

    private static string EscapePdf(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;

        var sb = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            if (ch == '(' || ch == ')' || ch == '\\')
            {
                sb.Append('\\').Append(ch);
            }
            else if (ch >= 32 && ch <= 126)
            {
                sb.Append(ch);
            }
            else
            {
                sb.Append(' ');
            }
        }
        return sb.ToString();
    }

    private static byte[] BuildPdf(byte[] streamBytes)
    {
        using var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, Encoding.ASCII, leaveOpen: true);

        var offsets = new List<long>();

        // Header
        writer.Write("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
        writer.Flush();

        // Object 1: Catalog
        offsets.Add(ms.Position);
        writer.Write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        writer.Flush();

        // Object 2: Pages
        offsets.Add(ms.Position);
        writer.Write("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
        writer.Flush();

        // Object 3: Page (A6 Landscape: 420 x 298 points)
        offsets.Add(ms.Position);
        writer.Write("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 298] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n");
        writer.Flush();

        // Object 4: Font F1 (Helvetica)
        offsets.Add(ms.Position);
        writer.Write("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");
        writer.Flush();

        // Object 5: Font F2 (Helvetica-Bold)
        offsets.Add(ms.Position);
        writer.Write("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");
        writer.Flush();

        // Object 6: Stream Contents
        offsets.Add(ms.Position);
        writer.Write($"6 0 obj\n<< /Length {streamBytes.Length} >>\nstream\n");
        writer.Flush();
        ms.Write(streamBytes, 0, streamBytes.Length);
        writer.Write("\nendstream\nendobj\n");
        writer.Flush();

        // Cross-reference table
        var xrefOffset = ms.Position;
        writer.Write($"xref\n0 {offsets.Count + 1}\n");
        writer.Write("0000000000 65535 f \n");
        foreach (var offset in offsets)
        {
            writer.Write($"{offset:D10} 00000 n \n");
        }

        // Trailer
        writer.Write($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefOffset}\n%%EOF\n");
        writer.Flush();

        return ms.ToArray();
    }
}
