import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/affiliation_model.dart';
import '../models/shift_model.dart';

class StaffRepository {
  StaffRepository._();

  static List<AffiliationModel> _parseAffiliations(dynamic response) {
    if (response is! List) return [];
    return response
        .map((e) => AffiliationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static List<ShiftModel> _parseShifts(dynamic response) {
    if (response is! List) return [];
    return response
        .map((e) => ShiftModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Active affiliations for the logged-in doctor/nurse.
  static Future<List<AffiliationModel>> getMyAffiliations() async {
    try {
      final response = await ApiClient.get(ApiConstants.staffMyAffiliations);
      return _parseAffiliations(response);
    } catch (_) {
      return [];
    }
  }

  /// Pending hospital invitations.
  static Future<List<AffiliationModel>> getMyInvitations() async {
    try {
      final response = await ApiClient.get(ApiConstants.staffInvitations);
      return _parseAffiliations(response);
    } catch (_) {
      return [];
    }
  }

  /// [decision] must be `Accept` or `Reject` (API contract).
  static Future<AffiliationModel> respondToInvitation({
    required String affiliationId,
    required String decision,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.staffInvitationRespond(affiliationId),
      body: {'decision': decision},
    );

    if (response is Map<String, dynamic>) {
      return AffiliationModel.fromJson(response);
    }
    throw ApiException('Failed to parse invitation response.');
  }

  static Future<AffiliationModel> acceptInvitation(String affiliationId) {
    return respondToInvitation(affiliationId: affiliationId, decision: 'Accept');
  }

  static Future<AffiliationModel> rejectInvitation(String affiliationId) {
    return respondToInvitation(affiliationId: affiliationId, decision: 'Reject');
  }

  /// Upcoming / ranged shifts for the logged-in staff member (`yyyy-MM-dd`).
  static Future<List<ShiftModel>> getMyShifts({String? from, String? to}) async {
    try {
      final query = <String, String>{};
      if (from != null && from.isNotEmpty) query['from'] = from;
      if (to != null && to.isNotEmpty) query['to'] = to;

      final response = await ApiClient.get(
        ApiConstants.staffMyShifts,
        queryParams: query.isEmpty ? null : query,
      );
      return _parseShifts(response);
    } catch (_) {
      return [];
    }
  }
}
