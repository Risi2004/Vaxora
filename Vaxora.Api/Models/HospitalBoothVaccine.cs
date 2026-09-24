using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("HospitalBoothVaccines")]
public class HospitalBoothVaccine
{
    public Guid BoothId { get; set; }

    [ForeignKey(nameof(BoothId))]
    public virtual HospitalBooth Booth { get; set; } = null!;

    public Guid VaccineId { get; set; }

    [ForeignKey(nameof(VaccineId))]
    public virtual Vaccine Vaccine { get; set; } = null!;
}
