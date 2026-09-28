import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/hospital_staff_member_model.dart';

class HospitalStaffRepository {
  HospitalStaffRepository._();

  static List<HospitalStaffMemberModel> _parse(dynamic response) {
    if (response is! List) return [];
    return response
        .map((e) =>
            HospitalStaffMemberModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// List of staff affiliated with this hospital.
  /// Filters (all optional): role, dutyStatus, search, status.
  /// [status] defaults to Active on the server when omitted; pass 'All'
  /// to include Pending and Rejected too.
  static Future<List<HospitalStaffMemberModel>> getStaff({
    String? role,
    String? dutyStatus,
    String? search,
    String? status,
  }) async {
    final query = <String, String>{};
    if (role != null && role.isNotEmpty) query['role'] = role;
    if (dutyStatus != null && dutyStatus.isNotEmpty) {
      query['dutyStatus'] = dutyStatus;
    }
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (status != null && status.isNotEmpty) query['status'] = status;

    try {
      final response = await ApiClient.get(
        ApiConstants.hospitalStaffRoster,
        queryParams: query.isEmpty ? null : query,
      );
      return _parse(response);
    } on ApiException {
      rethrow;
    } catch (_) {
      return [];
    }
  }
}
