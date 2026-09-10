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
