import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../../../hospital_staff/data/models/shift_swap_request_model.dart';

class ShiftSwapRepository {
  ShiftSwapRepository._();

  static const _seenIncomingKey = 'vaxora_seen_incoming_covers';

  static Future<void> submit({required String shiftId, String? reason}) async {
    await ApiClient.post(
      ApiConstants.staffShiftSwaps,
      body: {
        'shiftId': shiftId,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }

  static Future<List<ShiftSwapRequestModel>> listMine() async {
    final response = await ApiClient.get(ApiConstants.staffMyShiftSwaps);
    if (response is! List) {
      throw ApiException('Unexpected response while loading cover requests.');
    }
    return response
        .map((e) => ShiftSwapRequestModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<CoverQuotaModel> quota({String? shiftId}) async {
    final response = await ApiClient.get(
      ApiConstants.staffShiftSwapQuota,
      queryParams: {
        if (shiftId != null && shiftId.isNotEmpty) 'shiftId': shiftId,
      },
    );
    if (response is Map<String, dynamic>) {
      return CoverQuotaModel.fromJson(response);
    }
    throw ApiException('Failed to load cover quota.');
  }

  static Future<Set<String>> seenIncomingIds() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_seenIncomingKey) ?? const []).toSet();
  }

  static Future<void> markIncomingSeen(Iterable<String> ids) async {
    final incoming = ids.where((id) => id.isNotEmpty).toList();
    if (incoming.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final next = {
      ...(prefs.getStringList(_seenIncomingKey) ?? const []),
      ...incoming,
    };
    await prefs.setStringList(_seenIncomingKey, next.toList());
  }
}

class CoverQuotaModel {
  final int usedThisMonth;
  final int monthlyLimit;
  final int urgentUsedThisMonth;
  final int urgentLimit;
  final int minNoticeDays;
  final int? daysUntilShift;
  final bool isUrgent;
  final bool reasonRequired;
  final bool alreadyPending;
  final bool canRequest;
  final String? blockReason;
  final String summary;

  const CoverQuotaModel({
    required this.usedThisMonth,
    required this.monthlyLimit,
    required this.urgentUsedThisMonth,
    required this.urgentLimit,
    required this.minNoticeDays,
    this.daysUntilShift,
    required this.isUrgent,
    required this.reasonRequired,
    required this.alreadyPending,
    required this.canRequest,
    this.blockReason,
    required this.summary,
  });

  int get remaining => (monthlyLimit - usedThisMonth).clamp(0, monthlyLimit);

  factory CoverQuotaModel.fromJson(Map<String, dynamic> json) {
    return CoverQuotaModel(
      usedThisMonth: (json['usedThisMonth'] as num?)?.toInt() ?? 0,
      monthlyLimit: (json['monthlyLimit'] as num?)?.toInt() ?? 3,
      urgentUsedThisMonth: (json['urgentUsedThisMonth'] as num?)?.toInt() ?? 0,
      urgentLimit: (json['urgentLimit'] as num?)?.toInt() ?? 1,
      minNoticeDays: (json['minNoticeDays'] as num?)?.toInt() ?? 2,
      daysUntilShift: (json['daysUntilShift'] as num?)?.toInt(),
      isUrgent: json['isUrgent'] == true,
      reasonRequired: json['reasonRequired'] == true,
      alreadyPending: json['alreadyPending'] == true,
      canRequest: json['canRequest'] != false,
      blockReason: json['blockReason']?.toString(),
      summary: json['summary']?.toString() ?? '',
    );
  }
}
