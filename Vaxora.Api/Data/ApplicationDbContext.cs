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
    }
}
