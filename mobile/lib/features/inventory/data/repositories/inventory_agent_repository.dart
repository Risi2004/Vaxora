import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/inventory_agent_models.dart';

class InventoryAgentRepository {
  /// Triggers one of the inventory agents through the .NET gateway.
  /// targetAgent: 'RestockAgent' | 'ExpiryAgent'
  static Future<InventoryAgentRun> run({
    required String targetAgent,
    required String prompt,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.agentChat,
      body: {
        'targetAgent': targetAgent,
        'messages': [
          {'role': 'user', 'content': prompt},
        ],
      },
    );
    if (response is Map<String, dynamic>) {
      return InventoryAgentRun.fromJson(response);
    }
    throw ApiException('Unexpected agent response.');
  }

  /// Approves a draft — this actually writes to inventory + sends email.
  static Future<InventoryAgentExecutionResult> approveDraft(
    String workflowId, {
    required InventoryAgentDraft draft,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.inventoryAgentExecuteDraft,
      body: {
        'workflowId': workflowId,
        'draftType': draft.type,
        'payload': draft.payload,
      },
    );
    if (response is Map<String, dynamic>) {
      return InventoryAgentExecutionResult.fromJson(response);
    }
    throw ApiException('Failed to execute draft.');
  }

  static Future<List<InventoryAgentWorkflow>> recentWorkflows({int limit = 20}) async {
    try {
      final response = await ApiClient.get(
        ApiConstants.inventoryAgentWorkflows,
        queryParams: {'limit': limit.toString()},
      );
      if (response is List) {
        return response
            .map((e) => InventoryAgentWorkflow.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }
}