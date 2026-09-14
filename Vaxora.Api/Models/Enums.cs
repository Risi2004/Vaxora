namespace Vaxora.Api.Models;

public enum UserRole
{
    PATIENT,
    DOCTOR,
    NURSE,
    HOSPITAL,
    ADMIN
}

public enum UserStatus
{
    Pending,
    Active,
    Rejected,
    Suspended
}

public enum VerificationStatus
{
    Pending,
    Approved,
    Rejected
}

public enum AffiliationStatus
{
    Pending,
    Active,
    Rejected,
    Removed
}

public enum DutyStatus
{
    Off,
    OnDuty,
    OnBreak
}
