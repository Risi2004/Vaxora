using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

// ==================== AGENT DRAFT DOCUMENTS ====================

public class DraftValidationCheckDto
{
    public string Rule { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string? Detail { get; set; }
}

public class ExecuteDraftDto
{
    [Required]
    public string WorkflowId { get; set; } = string.Empty;

    [Required]
    public string DraftType { get; set; } = string.Empty; // "purchase_order" | "expiry_memo"

    [Required]
    public Dictionary<string, object> Payload { get; set; } = new();
}

public class AgentWorkflowDto
{
    public string WorkflowId { get; set; } = string.Empty;
    public string AgentName { get; set; } = string.Empty;
    public string DraftType { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}