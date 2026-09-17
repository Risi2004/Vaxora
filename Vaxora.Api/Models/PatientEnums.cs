namespace Vaxora.Api.Models;

public enum VaccineRoute
{
    Intramuscular,
    Subcutaneous,
    Intradermal,
    Oral,
    Nasal
}

public enum InjectionSite
{
    LeftDeltoid,
    RightDeltoid,
    LeftThigh,
    RightThigh,
    LeftUpperArm,
    RightUpperArm,
    Oral,
    Nasal
}

public enum MedicalRecordType
{
    Diagnosis,
    Allergy,
    Surgery,
    Medication,
    FamilyHistory,
    LifestyleNote,
    LabResult
}

public enum MedicalRecordSeverity
{
    Info,
    Mild,
    Moderate,
    Severe,
    Critical
}

public enum MedicalRecordStatus
{
    Active,
    Resolved,
    InRemission,
    Chronic
}

public enum VisitType
{
    Checkup,
    Vaccination,
    FollowUp,
    Emergency,
    WalkIn,
    Telemedicine
}

public enum VisitStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    NoShow
}
