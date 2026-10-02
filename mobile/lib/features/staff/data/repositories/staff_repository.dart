import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/affiliation_model.dart';
import '../models/shift_model.dart';
import '../models/staff_appointment_model.dart';

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

  static List<StaffAppointmentModel> _parseAppointments(dynamic response) {
    if (response is! List) return [];
    return response
        .map((e) => StaffAppointmentModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Active affiliations for the logged-in doctor/nurse.
  static Future<List<AffiliationModel>> getMyAffiliations() async {
    try {
      final response = await ApiClient.get(ApiConstants.staffMyAffiliations);
      return _parseAffiliations(response);
    } on ApiException {
      rethrow;
    } catch (_) {
      return [];
    }
  }

  /// Pending hospital invitations.
  static Future<List<AffiliationModel>> getMyInvitations() async {
    try {
      final response = await ApiClient.get(ApiConstants.staffInvitations);
      return _parseAffiliations(response);
    } on ApiException {
      rethrow;
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
    } on ApiException {
      rethrow;
    } catch (_) {
      return [];
    }
  }

  /// Hospital appointments visible to affiliated doctor/nurse.
  static Future<List<StaffAppointmentModel>> getHospitalAppointments({
    required String hospitalUserId,
    String? date,
  }) async {
    final query = <String, String>{'hospitalUserId': hospitalUserId};
    if (date != null && date.trim().isNotEmpty) {
      query['date'] = date.trim();
    }

    final response = await ApiClient.get(
      ApiConstants.staffAppointments,
      queryParams: query,
    );
    return _parseAppointments(response);
  }

  /// Status values: Confirmed, Administering, Observation, Completed, Cancelled, Rejected.
  /// Optional [administration] fields are used when certifying to Observation.
  static Future<StaffAppointmentModel> updateAppointmentStatus({
    required String appointmentId,
    required String status,
    String? remarks,
    Map<String, dynamic>? administration,
  }) async {
    final body = <String, dynamic>{'status': status};
    if (remarks != null && remarks.trim().isNotEmpty) {
      body['remarks'] = remarks.trim();
    }
    if (administration != null) {
      for (final entry in administration.entries) {
        if (entry.value != null) body[entry.key] = entry.value;
      }
    }

    final response = await ApiClient.patch(
      ApiConstants.appointmentStatus(appointmentId),
      body: body,
    );

    if (response is Map<String, dynamic>) {
      return StaffAppointmentModel.fromJson(response);
    }
    throw ApiException('Failed to update appointment status.');
  }
}
