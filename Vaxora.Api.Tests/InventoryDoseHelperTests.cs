using System;
using Vaxora.Api.Models;
using Vaxora.Api.Services;
using Xunit;

namespace Vaxora.Api.Tests;

public class InventoryDoseHelperTests
{
    private static Vaccine MakeVaccine(int dosesPerVial) => new Vaccine
    {
        Id = Guid.NewGuid(),
        Name = "Pfizer",
        DosesPerVial = dosesPerVial,
    };

    private static Batch MakeBatch(int available, int? openDoses = null) => new Batch
    {
        Id = Guid.NewGuid(),
        HospitalProfileId = Guid.NewGuid(),
        VaccineId = Guid.NewGuid(),
        BatchNumber = "LOT-2026-001",
        ExpiryDate = DateTime.UtcNow.AddMonths(6),
        QuantityReceived = available,
        QuantityAvailable = available,
        OpenVialDosesRemaining = openDoses,
        Status = BatchStatus.Active,
    };

    // ---------------- ResolveDosesPerVial ----------------

    [Fact]
    public void ResolveDosesPerVial_ReturnsVaccineValue()
    {
        var vaccine = MakeVaccine(10);
        Assert.Equal(10, InventoryDoseHelper.ResolveDosesPerVial(vaccine));
    }

    [Fact]
    public void ResolveDosesPerVial_WhenZero_ReturnsOneAsFloor()
    {
        var vaccine = MakeVaccine(0);
        Assert.Equal(1, InventoryDoseHelper.ResolveDosesPerVial(vaccine));
    }

    [Fact]
    public void ResolveDosesPerVial_WhenNegative_ReturnsOneAsFloor()
    {
        var vaccine = MakeVaccine(-5);
        Assert.Equal(1, InventoryDoseHelper.ResolveDosesPerVial(vaccine));
    }

    // ---------------- AvailableDoseCount ----------------

    [Fact]
    public void AvailableDoseCount_SealedOnly_MultipliesByDosesPerVial()
    {
        var batch = MakeBatch(available: 4);
        var vaccine = MakeVaccine(10);
        Assert.Equal(40, InventoryDoseHelper.AvailableDoseCount(batch, vaccine));
    }

    [Fact]
    public void AvailableDoseCount_SealedPlusOpen_AddsOpenDoses()
    {
        var batch = MakeBatch(available: 3, openDoses: 5);
        var vaccine = MakeVaccine(10);
        Assert.Equal(35, InventoryDoseHelper.AvailableDoseCount(batch, vaccine));
    }

    [Fact]
    public void AvailableDoseCount_NoStock_ReturnsZero()
    {
        var batch = MakeBatch(available: 0);
        var vaccine = MakeVaccine(10);
        Assert.Equal(0, InventoryDoseHelper.AvailableDoseCount(batch, vaccine));
    }

    // ---------------- HasUsableDose ----------------

    [Fact]
    public void HasUsableDose_WithSealedVials_ReturnsTrue()
    {
        var batch = MakeBatch(available: 1);
        Assert.True(InventoryDoseHelper.HasUsableDose(batch));
    }

    [Fact]
    public void HasUsableDose_WithOpenVialDoses_ReturnsTrue()
    {
        var batch = MakeBatch(available: 0, openDoses: 2);
        Assert.True(InventoryDoseHelper.HasUsableDose(batch));
    }

    [Fact]
    public void HasUsableDose_WithNoStock_ReturnsFalse()
    {
        var batch = MakeBatch(available: 0);
        Assert.False(InventoryDoseHelper.HasUsableDose(batch));
    }

    // ---------------- ConsumeOneDose ----------------

    [Fact]
    public void ConsumeOneDose_WhenOpenVialHasDoses_DecrementsOpenVialOnly()
    {
        var batch = MakeBatch(available: 5, openDoses: 3);
        var vaccine = MakeVaccine(10);

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.Equal(2, batch.OpenVialDosesRemaining);
        Assert.Equal(5, batch.QuantityAvailable); // sealed vials unchanged
    }

    [Fact]
    public void ConsumeOneDose_WhenOpenVialEmpties_SetsOpenVialToNull()
    {
        var batch = MakeBatch(available: 5, openDoses: 1);
        var vaccine = MakeVaccine(10);

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.Null(batch.OpenVialDosesRemaining);
        Assert.Equal(5, batch.QuantityAvailable);
    }

    [Fact]
    public void ConsumeOneDose_WhenNoOpenVial_OpensNewVial()
    {
        var batch = MakeBatch(available: 3);
        var vaccine = MakeVaccine(10);

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.Equal(2, batch.QuantityAvailable);      // one vial consumed
        Assert.Equal(9, batch.OpenVialDosesRemaining); // 9 doses left in opened vial
    }

    [Fact]
    public void ConsumeOneDose_WhenLastSealedVialOpensAndIsSingleDose_LeavesNoOpenVial()
    {
        var batch = MakeBatch(available: 1);
        var vaccine = MakeVaccine(1); // single-dose vial

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.Equal(0, batch.QuantityAvailable);
        Assert.Null(batch.OpenVialDosesRemaining);
    }

    [Fact]
    public void ConsumeOneDose_WhenBatchBecomesDepleted_SetsStatusToDepleted()
    {
        var batch = MakeBatch(available: 1);
        var vaccine = MakeVaccine(1);

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.Equal(BatchStatus.Depleted, batch.Status);
    }

    [Fact]
    public void ConsumeOneDose_WhenNoStock_Throws()
    {
        var batch = MakeBatch(available: 0);
        var vaccine = MakeVaccine(10);

        Assert.Throws<InvalidOperationException>(
            () => InventoryDoseHelper.ConsumeOneDose(batch, vaccine));
    }

    [Fact]
    public void ConsumeOneDose_SetsUpdatedAt()
    {
        var batch = MakeBatch(available: 2);
        var vaccine = MakeVaccine(10);
        var before = DateTime.UtcNow.AddSeconds(-1);

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        Assert.NotNull(batch.UpdatedAt);
        Assert.True(batch.UpdatedAt > before);
    }
}