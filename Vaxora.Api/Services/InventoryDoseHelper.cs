using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

/// <summary>
/// Multi-dose vial accounting: sealed stock is vials; an opened vial tracks remaining doses.
/// </summary>
public static class InventoryDoseHelper
{
    public static int ResolveDosesPerVial(Vaccine vaccine)
        => Math.Max(1, vaccine.DosesPerVial);

    public static int AvailableDoseCount(Batch batch, Vaccine vaccine)
    {
        var dosesPerVial = ResolveDosesPerVial(vaccine);
        var open = Math.Max(0, batch.OpenVialDosesRemaining ?? 0);
        return checked(batch.QuantityAvailable * dosesPerVial + open);
    }

    public static bool HasUsableDose(Batch batch)
        => (batch.OpenVialDosesRemaining ?? 0) > 0 || batch.QuantityAvailable > 0;

    /// <summary>
    /// Consumes one administered patient dose from the batch (opens a sealed vial when needed).
    /// </summary>
    public static void ConsumeOneDose(Batch batch, Vaccine vaccine)
    {
        var dosesPerVial = ResolveDosesPerVial(vaccine);
        var open = batch.OpenVialDosesRemaining ?? 0;

        if (open > 0)
        {
            batch.OpenVialDosesRemaining = open - 1;
            if (batch.OpenVialDosesRemaining == 0)
                batch.OpenVialDosesRemaining = null;
        }
        else
        {
            if (batch.QuantityAvailable < 1)
            {
                throw new InvalidOperationException(
                    $"Batch {batch.BatchNumber} has no usable doses remaining.");
            }

            batch.QuantityAvailable -= 1;
            var remainingInOpenedVial = dosesPerVial - 1;
            batch.OpenVialDosesRemaining = remainingInOpenedVial > 0 ? remainingInOpenedVial : null;
        }

        batch.UpdatedAt = DateTime.UtcNow;

        if (batch.QuantityAvailable == 0 && (batch.OpenVialDosesRemaining ?? 0) == 0)
            batch.Status = BatchStatus.Depleted;
    }
}
