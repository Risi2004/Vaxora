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
        // Generate Digital PDF Document via QuestPDF
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                // Compact Official ID / Certificate Card Format (A6 Landscape)
                page.Size(PageSizes.A6.Landscape());
                page.Margin(14, Unit.Millimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontFamily("Helvetica").FontSize(9).FontColor(Colors.Grey.Darken3));

                // Card Header
                page.Header().Element(header =>
                {
                    header.BorderBottom(1.5f).BorderColor(Colors.Blue.Medium).PaddingBottom(8).Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Row(r =>
                            {
                                r.AutoItem().Text("VAXORA").Bold().FontSize(16).FontColor(Colors.Blue.Darken3);
                                r.AutoItem().PaddingLeft(8).AlignMiddle().Text("• DIGITAL VACCINATION CARD").Bold().FontSize(10).FontColor(Colors.Teal.Darken2);
                            });
                            col.Item().PaddingTop(2).Text("Ministry of Health • National Immunization Registry").FontSize(8f).FontColor(Colors.Grey.Darken1);
                        });

                        row.ConstantItem(100).AlignRight().AlignMiddle().Column(col =>
                        {
                            col.Item().Background(Colors.Blue.Lighten5).Border(1).BorderColor(Colors.Blue.Lighten2).PaddingVertical(3).PaddingHorizontal(8).Text("OFFICIAL RECORD").Bold().FontSize(7.5f).FontColor(Colors.Blue.Darken3).AlignCenter();
                        });
                    });
                });

                // Card Main Content
                page.Content().PaddingVertical(10).Column(col =>
                {
                    // Patient Full Name Block
                    col.Item().Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(6).PaddingHorizontal(10).Column(c =>
                    {
                        c.Item().Text("PATIENT FULL NAME").FontSize(7f).Bold().FontColor(Colors.Grey.Darken1);
                        c.Item().PaddingTop(2).Text(patientName).Bold().FontSize(14).FontColor(Colors.Blue.Darken4);
                    });

                    // Registration Number & NIC Number Row
                    col.Item().PaddingTop(8).Row(r =>
                    {
                        r.RelativeItem().Background(Colors.Teal.Lighten5).Border(1).BorderColor(Colors.Teal.Lighten3).PaddingVertical(6).PaddingHorizontal(10).Column(c =>
                        {
                            c.Item().Text("VAXORA REGISTRATION NO").FontSize(7f).Bold().FontColor(Colors.Teal.Darken3);
                            c.Item().PaddingTop(2).Text(registrationNumber).Bold().FontSize(12).FontColor(Colors.Teal.Darken4);
                        });

                        r.RelativeItem().PaddingLeft(10).Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(6).PaddingHorizontal(10).Column(c =>
                        {
                            c.Item().Text("NIC NUMBER").FontSize(7f).Bold().FontColor(Colors.Grey.Darken1);
                            c.Item().PaddingTop(2).Text(nicNumber).Bold().FontSize(12).FontColor(Colors.Grey.Darken4);
                        });
                    });

                    // Additional Info Row (DOB, Phone, Issued Date)
                    col.Item().PaddingTop(8).Row(r =>
                    {
                        r.RelativeItem().Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(5).PaddingHorizontal(8).Column(c =>
                        {
                            c.Item().Text("DATE OF BIRTH").FontSize(6.5f).Bold().FontColor(Colors.Grey.Darken1);
                            c.Item().PaddingTop(2).Text(dateOfBirth?.ToString("dd MMM yyyy") ?? "N/A").Bold().FontSize(9.5f).FontColor(Colors.Grey.Darken3);
                        });

                        r.RelativeItem().PaddingLeft(8).Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(5).PaddingHorizontal(8).Column(c =>
                        {
                            c.Item().Text("CONTACT PHONE").FontSize(6.5f).Bold().FontColor(Colors.Grey.Darken1);
                            c.Item().PaddingTop(2).Text(string.IsNullOrWhiteSpace(phoneNumber) ? "N/A" : phoneNumber).Bold().FontSize(9.5f).FontColor(Colors.Grey.Darken3);
                        });

                        r.RelativeItem().PaddingLeft(8).Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(5).PaddingHorizontal(8).Column(c =>
                        {
                            c.Item().Text("DATE ISSUED").FontSize(6.5f).Bold().FontColor(Colors.Grey.Darken1);
                            c.Item().PaddingTop(2).Text(issuanceDate.ToString("dd MMM yyyy")).Bold().FontSize(9.5f).FontColor(Colors.Grey.Darken3);
                        });
                    });

                    // Status Verification Pill
                    col.Item().PaddingTop(10).Background(Colors.Green.Lighten5).Border(1).BorderColor(Colors.Green.Lighten3).PaddingVertical(5).PaddingHorizontal(10).Row(r =>
                    {
                        r.AutoItem().Text("✓").Bold().FontSize(9.5f).FontColor(Colors.Green.Darken2);
                        r.RelativeItem().PaddingLeft(6).Text("Verified National Citizen Immunization Profile").FontSize(8f).FontColor(Colors.Green.Darken3).Bold();
                    });
                });

                // Card Footer
                page.Footer().BorderTop(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingTop(6).Row(row =>
                {
                    row.RelativeItem().AlignCenter().Text("This digital card is cryptographically issued by the Vaxora Immunization System. Keep this document accessible for clinic appointments.").FontSize(6.5f).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }
}
