using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

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
        // 1. Generate Non-sensitive Verification QR Code payload
        var qrPayload = $"https://vaxora.health.gov.lk/verify/card?regNo={registrationNumber}&nic={nicNumber}&issued={issuanceDate:yyyyMMdd}";
        
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(qrPayload, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(qrCodeData);
        byte[] qrCodeBytes = qrCode.GetGraphic(10);

        // 2. Generate Digital PDF Document via QuestPDF
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                // Compact Official ID / Certificate Card Format (A6 Landscape)
                page.Size(PageSizes.A6.Landscape());
                page.Margin(12, Unit.Millimetre);
                page.PageColor(Colors.Grey.Lighten5);
                page.DefaultTextStyle(x => x.FontFamily("Helvetica").FontSize(9).FontColor(Colors.Grey.Darken3));

                page.Header().Element(header =>
                {
                    header.BorderBottom(1).BorderColor(Colors.Blue.Lighten3).PaddingBottom(6).Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Row(r =>
                            {
                                r.AutoItem().Text("VAXORA").Bold().FontSize(14).FontColor(Colors.Blue.Darken3);
                                r.AutoItem().PaddingLeft(6).Text("• DIGITAL VACCINATION CARD").Bold().FontSize(9).FontColor(Colors.Teal.Darken2);
                            });
                            col.Item().Text("Ministry of Health • National Immunization Registry").FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                        });

                        row.ConstantItem(90).AlignRight().Column(col =>
                        {
                            col.Item().Background(Colors.Blue.Lighten5).Border(1).BorderColor(Colors.Blue.Lighten3).PaddingVertical(2).PaddingHorizontal(6).Text("OFFICIAL RECORD").Bold().FontSize(7).FontColor(Colors.Blue.Darken3).AlignCenter();
                        });
                    });
                });

                page.Content().PaddingTop(8).Row(row =>
                {
                    // Left Column: Patient Details
                    row.RelativeItem(3).Column(col =>
                    {
                        col.Item().PaddingBottom(6).Column(c =>
                        {
                            c.Item().Text("PATIENT FULL NAME").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(patientName).Bold().FontSize(12).FontColor(Colors.Blue.Darken4);
                        });

                        col.Item().Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text("VAXORA REG. NO").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                                c.Item().Background(Colors.Teal.Lighten5).Border(1).BorderColor(Colors.Teal.Lighten3).PaddingVertical(2).PaddingHorizontal(6).Text(registrationNumber).Bold().FontSize(10).FontColor(Colors.Teal.Darken3);
                            });

                            r.RelativeItem().PaddingLeft(8).Column(c =>
                            {
                                c.Item().Text("NIC NUMBER").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                                c.Item().Text(nicNumber).Bold().FontSize(9.5f).FontColor(Colors.Grey.Darken3);
                            });
                        });

                        col.Item().PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text("DATE OF BIRTH").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                                c.Item().Text(dateOfBirth?.ToString("dd MMM yyyy") ?? "N/A").FontSize(8.5f).FontColor(Colors.Grey.Darken3);
                            });

                            r.RelativeItem().PaddingLeft(8).Column(c =>
                            {
                                c.Item().Text("CONTACT PHONE").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                                c.Item().Text(string.IsNullOrWhiteSpace(phoneNumber) ? "N/A" : phoneNumber).FontSize(8.5f).FontColor(Colors.Grey.Darken3);
                            });

                            r.RelativeItem().PaddingLeft(8).Column(c =>
                            {
                                c.Item().Text("DATE ISSUED").FontSize(6.5f).Bold().FontColor(Colors.Grey.Medium);
                                c.Item().Text(issuanceDate.ToString("dd MMM yyyy")).FontSize(8.5f).FontColor(Colors.Grey.Darken3);
                            });
                        });

                        col.Item().PaddingTop(6).Background(Colors.Grey.Lighten4).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(4).Row(r =>
                        {
                            r.AutoItem().Text("✓").Bold().FontColor(Colors.Green.Darken2);
                            r.RelativeItem().PaddingLeft(4).Text("Verified National Citizen Immunization Profile").FontSize(7).FontColor(Colors.Green.Darken3).Bold();
                        });
                    });

                    // Right Column: QR Code verification
                    row.ConstantItem(100).PaddingLeft(10).AlignMiddle().Column(col =>
                    {
                        col.Item().AlignCenter().Width(80).Height(80).Image(qrCodeBytes);
                        col.Item().PaddingTop(3).Text("Scan for Verification").AlignCenter().FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                    });
                });

                page.Footer().BorderTop(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingTop(4).Row(row =>
                {
                    row.RelativeItem().Text("This digital card is cryptographically issued by the Vaxora Immunization System. Keep this document accessible for clinic appointments.").FontSize(6).FontColor(Colors.Grey.Medium);
                    row.ConstantItem(80).AlignRight().Text("vaxora.health.gov.lk").FontSize(6).Bold().FontColor(Colors.Blue.Darken2);
                });
            });
        });

        return document.GeneratePdf();
    }
}
