using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

public enum AgentWorkflowStatus
{
    /// <summary>Agent answered without proposing a high-impact change.</summary>
    Completed,

    /// <summary>Agent produced proposals that require human approval.</summary>
    AwaitingApproval,

    /// <summary>Human approved; high-impact action was applied.</summary>
    Approved,

    /// <summary>Human rejected; nothing was applied.</summary>
    Rejected,

    /// <summary>Agent run failed (model/tool/gateway error).</summary>
    Failed
}

/// <summary>
/// Durable record of one Agentic AI run: objective, proposals, validation outcome,
/// and the human approval decision. Required by the SE3090 minimum assessed workflow.
/// </summary>
[Table("AgentWorkflows")]
public class AgentWorkflow
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [Required]
    [MaxLength(80)]
    public string AgentName { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Objective { get; set; } = string.Empty;

    /// <summary>JSON array of shift proposals (or empty array).</summary>
    [Required]
    public string ProposalsJson { get; set; } = "[]";

    /// <summary>Short agent reply kept for audit / observability.</summary>
    [MaxLength(4000)]
    public string? ResultSummary { get; set; }

    [Required]
    public AgentWorkflowStatus Status { get; set; } = AgentWorkflowStatus.Completed;

    public DateTime? DecidedAt { get; set; }

    [MaxLength(500)]
    public string? DecisionNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
