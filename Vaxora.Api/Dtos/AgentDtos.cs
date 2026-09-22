using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

/// <summary>
/// Chat request forwarded to the internal Agentic AI service. Clients never call that
/// service directly, so this is the only place agent input is accepted and validated.
/// </summary>
public class AgentChatRequestDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one message is required.")]
    [MaxLength(40, ErrorMessage = "Conversation is too long. Please start a new chat.")]
    public List<AgentMessageDto> Messages { get; set; } = new();

    /// <summary>Optional display context (name/email) used by the agent for personalisation.</summary>
    public AgentContextDto? PatientInfo { get; set; }

    /// <summary>Optional direct agent selection. When omitted the orchestrator routes the request.</summary>
    [MaxLength(60)]
    [RegularExpression("^[A-Za-z]+$", ErrorMessage = "Invalid agent name.")]
    public string? TargetAgent { get; set; }
}

public class AgentMessageDto
{
    /// <summary>
    /// Only user and assistant turns are accepted. Rejecting client-supplied "system"
    /// messages stops callers from overwriting the agent's instructions.
    /// </summary>
    [Required]
    [RegularExpression("^(user|assistant)$", ErrorMessage = "Message role must be 'user' or 'assistant'.")]
    public string Role { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    [MaxLength(4000, ErrorMessage = "Message content exceeds the 4000 character limit.")]
    public string Content { get; set; } = string.Empty;
}

public class AgentContextDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Nic { get; set; }

    [MaxLength(200)]
    public string? HospitalName { get; set; }
}

/// <summary>Sanitised health response. Internal model and endpoint details are not exposed.</summary>
public class AgentHealthDto
{
    public bool Online { get; set; }
    public List<string> Agents { get; set; } = new();
}

public class AgentWorkflowDto
{
    public Guid WorkflowId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ResultSummary { get; set; }
    public string ProposalsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public string? DecisionNote { get; set; }
}

public class AgentWorkflowDecisionDto
{
    [Required]
    public bool Approved { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}
