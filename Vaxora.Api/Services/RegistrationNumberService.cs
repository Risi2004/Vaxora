using System.Data;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IRegistrationNumberService
{
    Task<string> GenerateRegistrationNumberAsync(UserRole role);
}

public class RegistrationNumberService : IRegistrationNumberService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RegistrationNumberService> _logger;

    public RegistrationNumberService(ApplicationDbContext context, ILogger<RegistrationNumberService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<string> GenerateRegistrationNumberAsync(UserRole role)
    {
        var (sequenceName, prefix) = role switch
        {
            UserRole.PATIENT => ("vaxora_seq_patient", "VAX-P"),
            UserRole.DOCTOR => ("vaxora_seq_doctor", "VAX-D"),
            UserRole.NURSE => ("vaxora_seq_nurse", "VAX-N"),
            UserRole.HOSPITAL => ("vaxora_seq_hospital", "VAX-H"),
            _ => ("vaxora_seq_admin", "VAX-A")
        };

        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT nextval('{sequenceName}')";
            
            var result = await command.ExecuteScalarAsync();
            var sequenceNumber = Convert.ToInt64(result);

            return $"{prefix}-{sequenceNumber}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve next sequence value for {SequenceName}. Falling back to timestamp-based sequence.", sequenceName);
            // Fallback generation in case sequence table is in transition
            var fallbackNum = DateTimeOffset.UtcNow.ToUnixTimeSeconds() % 900000 + 100000;
            return $"{prefix}-{fallbackNum}";
        }
    }
}
