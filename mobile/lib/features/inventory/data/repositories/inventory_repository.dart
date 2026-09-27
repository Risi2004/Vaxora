import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/batch_model.dart';
import '../models/inventory_summary_model.dart';
import '../models/audit_entry_model.dart';

class InventoryRepository {
  // ============ LIST ============
  static Future<List<BatchModel>> getBatches() async {
    try {
      final response = await ApiClient.get(ApiConstants.inventoryBatches);
      if (response is List) {
        return response
            .map((e) => BatchModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<List<BatchModel>> getExpiringBatches({int days = 60}) async {
    try {
      final response = await ApiClient.get(
        ApiConstants.inventoryExpiring,
        queryParams: {'daysThreshold': days.toString()},
      );
      if (response is List) {
        return response
            .map((e) => BatchModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  // ============ SUMMARY ============
  static Future<InventorySummaryModel?> getSummary() async {
    try {
      final response = await ApiClient.get(ApiConstants.inventorySummary);
      if (response is Map<String, dynamic>) {
        return InventorySummaryModel.fromJson(response);
      }
    } catch (_) {}
    return null;
  }

  // ============ BUSINESS OPERATIONS ============
  static Future<Map<String, dynamic>> issueStock({
    required String batchId,
    required int quantity,
    required String sessionReference,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.batchIssue(batchId),
      body: {
        'quantity': quantity,
        'sessionReference': sessionReference,
      },
    );
    if (response is Map<String, dynamic>) return response;
    throw ApiException('Failed to issue stock.');
  }

  static Future<Map<String, dynamic>> logWastage({
    required String batchId,
    required int quantity,
    required String reason,
    required String reportedBy,
    String? notes,
    String? incidentDate,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.batchWastage(batchId),
      body: {
        'quantity': quantity,
        'reason': reason,
        'reportedBy': reportedBy,
        'notes': notes ?? '',
        'incidentDate': incidentDate,
      },
    );
    if (response is Map<String, dynamic>) return response;
    throw ApiException('Failed to log wastage.');
  }

  // ============ AUDIT ============
  static Future<BatchAuditModel?> getBatchAudit(String batchId) async {
    try {
      final response = await ApiClient.get(ApiConstants.batchAudit(batchId));
      if (response is Map<String, dynamic>) {
        return BatchAuditModel.fromJson(response);
      }
    } catch (_) {}
    return null;
  }
}