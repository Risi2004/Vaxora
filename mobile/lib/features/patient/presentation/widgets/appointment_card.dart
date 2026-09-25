import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class PatientAppointment {
  final String id;
  final String rawId;
  final String vaccineName;
  final String hospitalName;
  final String location;
  final String date;
  final String time;
  final String doctorName;
  final String status;
  final double fee;
  final bool isPaid;

  const PatientAppointment({
    required this.id,
    this.rawId = '',
    required this.vaccineName,
    required this.hospitalName,
    required this.location,
    required this.date,
    required this.time,
    required this.doctorName,
    required this.status,
    this.fee = 0.0,
    this.isPaid = true,
  });
}

class AppointmentCard extends StatelessWidget {
  final PatientAppointment appointment;
  final VoidCallback onViewSlip;
  final VoidCallback? onCancel;
  final VoidCallback? onPayNow;

  const AppointmentCard({
    super.key,
    required this.appointment,
    required this.onViewSlip,
    this.onCancel,
    this.onPayNow,
  });

  Color _getStatusColor() {
    switch (appointment.status.toLowerCase()) {
      case 'confirmed':
        return AppColors.brandBlue;
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.error;
      default:
        return const Color(0xFFD97706);
    }
  }

  Color _getStatusBg() {
    switch (appointment.status.toLowerCase()) {
      case 'confirmed':
        return const Color(0xFFEFF6FF);
      case 'completed':
        return const Color(0xFFDCFCE7);
      case 'cancelled':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFFEF3C7);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();
    final statusBg = _getStatusBg();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Vaccine pill badge & Status badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Text(
                    appointment.vaccineName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      appointment.status,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Hospital Name & Location
          Text(
            appointment.hospitalName,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textTitle,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  appointment.location,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Date, Time & Doctor Line
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 13, color: AppColors.brandBlue),
                    const SizedBox(width: 5),
                    Text(
                      '${appointment.date} • ${appointment.time}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textTitle,
                      ),
                    ),
                  ],
                ),
                Text(
                  appointment.doctorName,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Action buttons row
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onViewSlip,
                  icon: const Icon(Icons.qr_code, size: 16),
                  label: const Text('QR Slip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.brandBlue,
                    side: const BorderSide(color: AppColors.brandBlue),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              if (!appointment.isPaid && onPayNow != null) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onPayNow,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      'Pay LKR ${appointment.fee.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
              if (appointment.status.toLowerCase() == 'confirmed' && onCancel != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  onPressed: onCancel,
                  icon: const Icon(Icons.close, size: 18, color: AppColors.error),
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.errorBg,
                    padding: const EdgeInsets.all(8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  tooltip: 'Cancel Appointment',
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
