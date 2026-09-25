import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../models/appointment_model.dart';

class AppointmentRepository {
  static Future<List<AppointmentModel>> getMyAppointments() async {
    try {
      final response = await ApiClient.get(ApiConstants.myAppointments);
      if (response is List) {
        return response
            .map((item) => AppointmentModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<AppointmentModel> bookAppointment({
    required String hospitalUserId,
    required String vaccineName,
    required String appointmentDate,
    required String timeSlot,
    String? doseNumber,
    String? notes,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.bookAppointment,
      body: {
        'hospitalUserId': hospitalUserId,
        'vaccineName': vaccineName,
        'appointmentDate': appointmentDate,
        'timeSlot': timeSlot,
        'doseNumber': doseNumber ?? 'Dose 1',
        'notes': notes ?? '',
      },
    );

    if (response is Map<String, dynamic>) {
      return AppointmentModel.fromJson(response);
    }

    throw ApiException('Failed to parse booked appointment from server response.');
  }
}
