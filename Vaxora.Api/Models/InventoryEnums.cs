namespace Vaxora.Api.Models;

public enum VaccineCategory
{
    MRNA,
    Routine,
    Seasonal,
    Pediatric
}

public enum TransactionType
{
    Restock,
    Wastage,
    Adjustment,
    Issue
}

public enum WastageReason
{
    VialBreakage,
    ColdChainExcursion,
    ExpiredUnopened,
    OpenVialExpiration,
    ReconstitutionError,
    Contamination
}

public enum BatchStatus
{
    Active,
    Expired,
    Depleted
}