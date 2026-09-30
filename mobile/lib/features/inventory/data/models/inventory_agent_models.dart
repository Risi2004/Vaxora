/// Response from POST /api/agent/chat when routed to RestockAgent / ExpiryAgent.
class InventoryAgentRun {
  final String workflowId;
  final String agentName;
  final String content;
  final List<dynamic> plan;
  final InventoryAgentDraft? draft;
  final List<Map<String, dynamic>> proposals;   // <-- from proposal.proposals

  const InventoryAgentRun({
    required this.workflowId,
    required this.agentName,
    required this.content,
    required this.plan,
    required this.draft,
    required this.proposals,
  });

  factory InventoryAgentRun.fromJson(Map<String, dynamic> json) {
    final wid = json['workflowId']?.toString()
        ?? json['workflow_id']?.toString()
        ?? '';

    final draftJson = json['draft'] as Map<String, dynamic>?;
    final proposalJson = json['proposal'] as Map<String, dynamic>?;
    final proposalsRaw =
        proposalJson?['proposals'] as List<dynamic>? ?? const [];

    final proposals = proposalsRaw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return InventoryAgentRun(
      workflowId: wid,
      agentName: json['agent']?.toString() ?? 'Agent',
      content: json['content']?.toString() ?? '',
      plan: (json['plan'] as List<dynamic>?) ?? const [],
      draft: draftJson == null ? null : InventoryAgentDraft.fromJson(draftJson),
      proposals: proposals,
    );
  }

  bool get hasDraft => draft != null || proposals.isNotEmpty;
}

class InventoryAgentDraft {
  final String type;
  final String documentNumber;
  final String summary;
  final Map<String, dynamic> payload;

  const InventoryAgentDraft({
    required this.type,
    required this.documentNumber,
    required this.summary,
    required this.payload,
  });

  factory InventoryAgentDraft.fromJson(Map<String, dynamic> json) {
    return InventoryAgentDraft(
      type: json['type']?.toString()
          ?? json['draft_type']?.toString()
          ?? '',
      documentNumber: json['document_number']?.toString()
          ?? json['po_number']?.toString()
          ?? json['memo_number']?.toString()
          ?? '',
      summary: json['summary']?.toString() ?? '',
      payload: (json['payload'] as Map<String, dynamic>?) ?? const {},
    );
  }

  bool get isPurchaseOrder => type == 'purchase_order';
  bool get isExpiryMemo    => type == 'expiry_memo';
}

/// Result of POST /api/inventory/agent/execute-draft.
class InventoryAgentExecutionResult {
  final bool success;
  final String message;
  final bool emailSent;
  const InventoryAgentExecutionResult({
    required this.success,
    required this.message,
    required this.emailSent,
  });

  factory InventoryAgentExecutionResult.fromJson(Map<String, dynamic> json) =>
      InventoryAgentExecutionResult(
        success: json['success'] == true,
        message: json['message']?.toString() ?? '',
        emailSent: json['emailSent'] == true,
      );
}

/// Row of GET /api/inventory/agent/workflows.
class InventoryAgentWorkflow {
  final String workflowId;
  final String agentName;
  final String draftType;
  final String documentNumber;
  final String summary;
  final String status;
  final DateTime createdAt;

  const InventoryAgentWorkflow({
    required this.workflowId,
    required this.agentName,
    required this.draftType,
    required this.documentNumber,
    required this.summary,
    required this.status,
    required this.createdAt,
  });

  factory InventoryAgentWorkflow.fromJson(Map<String, dynamic> json) =>
      InventoryAgentWorkflow(
        workflowId: json['workflowId']?.toString() ?? '',
        agentName: json['agentName']?.toString() ?? '',
        draftType: json['draftType']?.toString() ?? '',
        documentNumber: json['documentNumber']?.toString() ?? '',
        summary: json['summary']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
            DateTime.now(),
      );
}