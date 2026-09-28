import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';

class ShiftSwapRepository {
  ShiftSwapRepository._();

  static Future<void> submit({
    required String shiftId,
    String? reason,
  }) async {
    await ApiClient.post(
      ApiConstants.staffShiftSwaps,
      body: {
        'shiftId': shiftId,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }
}
