using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Models;

namespace Vaxora.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<PatientProfile> PatientProfiles => Set<PatientProfile>();
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<NurseProfile> NurseProfiles => Set<NurseProfile>();
    public DbSet<HospitalProfile> HospitalProfiles => Set<HospitalProfile>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<StaffAffiliation> StaffAffiliations => Set<StaffAffiliation>();
    public DbSet<StaffShift> StaffShifts => Set<StaffShift>();
    public DbSet<AgentWorkflow> AgentWorkflows => Set<AgentWorkflow>();

    // === INVENTORY MODULE (Added) ===
    public DbSet<Vaccine> Vaccines => Set<Vaccine>();
    public DbSet<HospitalFormulary> HospitalFormularies => Set<HospitalFormulary>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<ColdVault> ColdVaults => Set<ColdVault>();

    // === VACCINE APPOINTMENT SCHEDULE & BOOKING MODULE ===
    public DbSet<VaccineSchedule> VaccineSchedules => Set<VaccineSchedule>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    // === PATIENT VACCINATION RECORD MODULE ===
    public DbSet<PatientVaccinationRecord> PatientVaccinationRecords => Set<PatientVaccinationRecord>();

    // === PATIENT MEDICAL HISTORY MODULE ===
    public DbSet<PatientMedicalHistory> PatientMedicalHistories => Set<PatientMedicalHistory>();

    // === PATIENT VISIT MODULE ===
    public DbSet<PatientVisit> PatientVisits => Set<PatientVisit>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enums mapping as string in PostgreSQL
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .Property(u => u.Status)
            .HasConversion<string>();

        modelBuilder.Entity<DoctorProfile>()
            .Property(d => d.VerificationStatus)
            .HasConversion<string>();

        modelBuilder.Entity<NurseProfile>()
            .Property(n => n.VerificationStatus)
            .HasConversion<string>();

        modelBuilder.Entity<HospitalProfile>()
            .Property(h => h.VerificationStatus)
            .HasConversion<string>();

        // Sequences for Vaxora Registration Numbers
        modelBuilder.HasSequence<long>("vaxora_seq_patient").StartsAt(1000).IncrementsBy(1);
        modelBuilder.HasSequence<long>("vaxora_seq_doctor").StartsAt(1000).IncrementsBy(1);
        modelBuilder.HasSequence<long>("vaxora_seq_nurse").StartsAt(1000).IncrementsBy(1);
        modelBuilder.HasSequence<long>("vaxora_seq_hospital").StartsAt(1000).IncrementsBy(1);
        modelBuilder.HasSequence<long>("vaxora_seq_admin").StartsAt(1000).IncrementsBy(1);

        // Unique constraints
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.RegistrationNumber)
            .IsUnique();

        modelBuilder.Entity<PatientProfile>()
            .HasIndex(p => p.NicNumber)
            .IsUnique();

        modelBuilder.Entity<DoctorProfile>()
            .HasIndex(d => d.SlmcNumber)
            .IsUnique();

        modelBuilder.Entity<NurseProfile>()
            .HasIndex(n => n.SlncNumber)
            .IsUnique();

        modelBuilder.Entity<HospitalProfile>()
            .HasIndex(h => h.RegistrationNumber)
            .IsUnique();

        // 1-to-1 relationships
        modelBuilder.Entity<User>()
            .HasOne(u => u.PatientProfile)
            .WithOne(p => p.User)
            .HasForeignKey<PatientProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasOne(u => u.DoctorProfile)
            .WithOne(d => d.User)
            .HasForeignKey<DoctorProfile>(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasOne(u => u.NurseProfile)
            .WithOne(n => n.User)
            .HasForeignKey<NurseProfile>(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasOne(u => u.HospitalProfile)
            .WithOne(h => h.User)
            .HasForeignKey<HospitalProfile>(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // === INVENTORY MODULE CONFIGURATION (Added) ===
        modelBuilder.Entity<Vaccine>()
            .Property(v => v.Category)
            .HasConversion<string>();

        modelBuilder.Entity<Batch>()
            .Property(b => b.Status)
            .HasConversion<string>();

        modelBuilder.Entity<InventoryTransaction>()
            .Property(t => t.Type)
            .HasConversion<string>();

        modelBuilder.Entity<InventoryTransaction>()
            .Property(t => t.WastageReason)
            .HasConversion<string>();

        modelBuilder.Entity<HospitalFormulary>()
            .HasIndex(f => new { f.HospitalProfileId, f.VaccineId })
            .IsUnique();

        modelBuilder.Entity<Batch>()
            .HasIndex(b => new { b.HospitalProfileId, b.BatchNumber })
            .IsUnique();

        modelBuilder.Entity<Batch>()
            .HasIndex(b => b.ExpiryDate);

        modelBuilder.Entity<Batch>()
            .HasIndex(b => b.HospitalProfileId);

        modelBuilder.Entity<InventoryTransaction>()
            .HasIndex(t => t.BatchId);

        modelBuilder.Entity<InventoryTransaction>()
            .HasIndex(t => t.Timestamp);

        // === STAFF MANAGEMENT MODULE CONFIGURATION (Teammate) ===
        modelBuilder.Entity<StaffAffiliation>()
            .Property(a => a.StaffRole)
            .HasConversion<string>();

        modelBuilder.Entity<StaffAffiliation>()
            .Property(a => a.Status)
            .HasConversion<string>();

        modelBuilder.Entity<StaffAffiliation>()
            .Property(a => a.DutyStatus)
            .HasConversion<string>();

        modelBuilder.Entity<StaffAffiliation>()
            .HasIndex(a => new { a.HospitalUserId, a.StaffUserId });

        modelBuilder.Entity<StaffAffiliation>()
            .HasOne(a => a.HospitalUser)
            .WithMany()
            .HasForeignKey(a => a.HospitalUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StaffAffiliation>()
            .HasOne(a => a.StaffUser)
            .WithMany()
            .HasForeignKey(a => a.StaffUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StaffShift>()
            .HasOne(s => s.Affiliation)
            .WithMany(a => a.Shifts)
            .HasForeignKey(s => s.AffiliationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StaffShift>()
            .HasIndex(s => new { s.AffiliationId, s.ShiftDate });

        // === AGENTIC AI WORKFLOW STATE ===
        modelBuilder.Entity<AgentWorkflow>()
            .Property(w => w.Status)
            .HasConversion<string>();

        modelBuilder.Entity<AgentWorkflow>()
            .HasOne(w => w.User)
            .WithMany()
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AgentWorkflow>()
            .HasIndex(w => new { w.UserId, w.CreatedAt });

        modelBuilder.Entity<AgentWorkflow>()
            .HasIndex(w => w.Status);

        // === PRICING & PAYMENT CONFIGURATION ===
        modelBuilder.Entity<VaccineSchedule>()
            .Property(s => s.Price)
            .HasPrecision(18, 2)
            .HasDefaultValue(0.00m);

        modelBuilder.Entity<Appointment>()
            .Property(a => a.Fee)
            .HasPrecision(18, 2)
            .HasDefaultValue(0.00m);


        // === PATIENT VACCINATION RECORDS CONFIGURATION ===
        modelBuilder.Entity<PatientVaccinationRecord>()
            .Property(r => r.Route)
            .HasConversion<string>();

        modelBuilder.Entity<PatientVaccinationRecord>()
            .Property(r => r.Site)
            .HasConversion<string>();

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasIndex(r => new { r.PatientProfileId, r.AdministeredAt });

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasIndex(r => r.VaccineId);

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasIndex(r => r.BatchId);

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasOne(r => r.PatientProfile)
            .WithMany()
            .HasForeignKey(r => r.PatientProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasOne(r => r.Vaccine)
            .WithMany()
            .HasForeignKey(r => r.VaccineId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasOne(r => r.Batch)
            .WithMany()
            .HasForeignKey(r => r.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PatientVaccinationRecord>()
            .HasOne(r => r.AdministeredByUser)
            .WithMany()
            .HasForeignKey(r => r.AdministeredByUserId)
            .OnDelete(DeleteBehavior.SetNull);
        
        // === PATIENT MEDICAL HISTORY MODULE CONFIGURATION (Added) ===
        modelBuilder.Entity<PatientMedicalHistory>()
            .Property(r => r.RecordType)
            .HasConversion<string>();

        modelBuilder.Entity<PatientMedicalHistory>()
            .Property(r => r.Severity)
            .HasConversion<string>();

        modelBuilder.Entity<PatientMedicalHistory>()
            .Property(r => r.Status)
            .HasConversion<string>();

        modelBuilder.Entity<PatientMedicalHistory>()
            .HasIndex(r => new { r.PatientProfileId, r.DiagnosedAt });

        modelBuilder.Entity<PatientMedicalHistory>()
            .HasIndex(r => r.RecordType);

        modelBuilder.Entity<PatientMedicalHistory>()
            .HasIndex(r => r.Status);

        modelBuilder.Entity<PatientMedicalHistory>()
            .HasOne(r => r.PatientProfile)
            .WithMany()
            .HasForeignKey(r => r.PatientProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientMedicalHistory>()
            .HasOne(r => r.RecordedByUser)
            .WithMany()
            .HasForeignKey(r => r.RecordedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // === PATIENT VISIT CONFIGURATION ===
        modelBuilder.Entity<PatientVisit>()
            .Property(v => v.VisitType)
            .HasConversion<string>();

        modelBuilder.Entity<PatientVisit>()
            .Property(v => v.Status)
            .HasConversion<string>();

        modelBuilder.Entity<PatientVisit>()
            .HasIndex(v => new { v.PatientProfileId, v.VisitDate });

        modelBuilder.Entity<PatientVisit>()
            .HasIndex(v => v.Status);

        modelBuilder.Entity<PatientVisit>()
            .HasIndex(v => v.FollowUpDate);

        modelBuilder.Entity<PatientVisit>()
            .HasOne(v => v.PatientProfile)
            .WithMany()
            .HasForeignKey(v => v.PatientProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientVisit>()
            .HasOne(v => v.DoctorUser)
            .WithMany()
            .HasForeignKey(v => v.DoctorUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PatientVisit>()
            .HasOne(v => v.NurseUser)
            .WithMany()
            .HasForeignKey(v => v.NurseUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PatientVisit>()
            .HasOne(v => v.HospitalProfile)
            .WithMany()
            .HasForeignKey(v => v.HospitalProfileId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}