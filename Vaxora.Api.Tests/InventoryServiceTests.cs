using System;
using Xunit;

namespace Vaxora.Api.Tests.Inventory
{
    public class InventoryServiceTests
    {
        [Fact]
        public void ComputeReorderQuantity_WhenStockBelowThreshold_RoundsUpToNearestFifty()
        {
            // current = 30, threshold = 50 -> target = 100, deficit = 70 -> rounds to 100
            var result = ComputeReorderQuantity(currentStock: 30, threshold: 50);
            Assert.Equal(100, result);
        }

        [Fact]
        public void ComputeReorderQuantity_WhenStockAtTarget_ReturnsZero()
        {
            var result = ComputeReorderQuantity(currentStock: 100, threshold: 50);
            Assert.Equal(0, result);
        }

        [Fact]
        public void ComputeReorderQuantity_WhenStockAboveTarget_ReturnsZero()
        {
            var result = ComputeReorderQuantity(currentStock: 500, threshold: 50);
            Assert.Equal(0, result);
        }

        [Fact]
        public void ComputeUrgency_WhenStockBelowThreshold_ReturnsHigh()
        {
            var result = ComputeUrgency(currentStock: 40, threshold: 50);
            Assert.Equal("high", result);
        }

        [Fact]
        public void ComputeUrgency_WhenStockAtOneAndHalfTimesThreshold_ReturnsMedium()
        {
            var result = ComputeUrgency(currentStock: 70, threshold: 50);
            Assert.Equal("medium", result);
        }

        [Fact]
        public void ComputeUrgency_WhenStockAboveOneAndHalfTimesThreshold_ReturnsLow()
        {
            var result = ComputeUrgency(currentStock: 200, threshold: 50);
            Assert.Equal("low", result);
        }

        [Fact]
        public void ComputeUrgency_WhenThresholdIsZero_ReturnsLow()
        {
            var result = ComputeUrgency(currentStock: 10, threshold: 0);
            Assert.Equal("low", result);
        }

        [Fact]
        public void ComputeExpiryPriority_WhenDaysAtOrBelowFourteen_ReturnsCritical()
        {
            var result = ComputeExpiryPriority(daysUntilExpiry: 10, quantityAvailable: 100);
            Assert.Equal("critical", result);
        }

        [Fact]
        public void ComputeExpiryPriority_WhenQuantityAboveFiveHundred_ReturnsCritical()
        {
            var result = ComputeExpiryPriority(daysUntilExpiry: 45, quantityAvailable: 600);
            Assert.Equal("critical", result);
        }

        [Fact]
        public void ComputeExpiryPriority_WhenDaysAtOrBelowThirty_ReturnsHigh()
        {
            var result = ComputeExpiryPriority(daysUntilExpiry: 20, quantityAvailable: 100);
            Assert.Equal("high", result);
        }

        [Fact]
        public void ComputeExpiryPriority_WhenDaysAtOrBelowSixty_ReturnsMedium()
        {
            var result = ComputeExpiryPriority(daysUntilExpiry: 50, quantityAvailable: 100);
            Assert.Equal("medium", result);
        }

        [Fact]
        public void ComputeExpiryPriority_WhenDaysAboveSixty_ReturnsLow()
        {
            var result = ComputeExpiryPriority(daysUntilExpiry: 90, quantityAvailable: 100);
            Assert.Equal("low", result);
        }

        // --- Local copies of the deterministic rules.
        // If you already have InventoryDoseHelper with these methods,
        // delete these privates and call InventoryDoseHelper.ComputeX(...) instead.

        private static int ComputeReorderQuantity(int currentStock, int threshold)
        {
            if (threshold <= 0) return 0;
            var target = threshold * 2;
            var deficit = target - currentStock;
            if (deficit <= 0) return 0;
            return ((deficit + 49) / 50) * 50;
        }

        private static string ComputeUrgency(int currentStock, int threshold)
        {
            if (threshold <= 0) return "low";
            if (currentStock <= threshold) return "high";
            if (currentStock <= threshold * 1.5) return "medium";
            return "low";
        }

        private static string ComputeExpiryPriority(int daysUntilExpiry, int quantityAvailable)
        {
            if (daysUntilExpiry <= 14 || quantityAvailable > 500) return "critical";
            if (daysUntilExpiry <= 30) return "high";
            if (daysUntilExpiry <= 60) return "medium";
            return "low";
        }
    }
}