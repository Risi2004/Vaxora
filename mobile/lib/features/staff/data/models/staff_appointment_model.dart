class StaffAppointmentModel {
  final String id;
  final String patientUserId;
  final String? patientProfileId;
  final String patientName;
  final String? patientNic;
  final String? patientPhone;
  final String? patientEmail;
  final String hospitalUserId;
  final String hospitalName;
  final String? vaccineScheduleId;
  final String vaccineName;
  final String? doctorName;
  final String? nurseName;
  final String appointmentDate;
  final String timeSlot;
  final String? startTime;
  final String? endTime;
  final String status;
  final String paymentStatus;
  final String? notes;
  final String? boothId;
  final String? boothLabel;
  final String? prescribedDosage;
  final String? prescribedByDoctorName;
  final String? dosageUpdatedAt;
  final String? updatedAt;
  final String? checkedInAt;

  /// Doctor or nurse running the live session (Administering or Observation).
  final String? sessionStaffUserId;
  final String? sessionStaffName;

  const StaffAppointmentModel({
    required this.id,
    required this.patientUserId,
    this.patientProfileId,
    required this.patientName,
    this.patientNic,
    this.patientPhone,
    this.patientEmail,
    required this.hospitalUserId,
    required this.hospitalName,
    this.vaccineScheduleId,
    required this.vaccineName,
    this.doctorName,
    this.nurseName,
    required this.appointmentDate,
    required this.timeSlot,
    this.startTime,
    this.endTime,
    required this.status,
    required this.paymentStatus,
    this.notes,
    this.boothId,
    this.boothLabel,
    this.prescribedDosage,
    this.prescribedByDoctorName,
    this.dosageUpdatedAt,
    this.updatedAt,
    this.checkedInAt,
    this.sessionStaffUserId,
    this.sessionStaffName,
  });

  /// UI queue bucket mirrored from web StaffClinicalDashboard.
  String get uiStatus {
    final s = status.toLowerCase();
    if (s == 'completed') return 'completed';
    if (s == 'observation') return 'observation';
    if (s == 'administering') return 'consulting';
    if (s == 'cancelled' || s == 'rejected') return 'cancelled';
    return 'waiting';
  }

  /// Patient has arrived and been checked in at the desk (or by staff).
  bool get isCheckedIn => (checkedInAt ?? '').isNotEmpty;

  String get statusLabel {
    if (uiStatus == 'waiting' && !isCheckedIn) return 'Not arrived';
    if (uiStatus == 'waiting' && !isPaymentSettled) return 'Awaiting payment';
    switch (uiStatus) {
      case 'completed':
        return 'Completed';
      case 'observation':
        return 'Observation';
      case 'consulting':
        return 'In session';
      case 'cancelled':
        return status.toLowerCase() == 'rejected' ? 'Rejected' : 'Cancelled';
      default:
        return 'In queue';
    }
  }

  String get token {
    final short = id.replaceAll('-', '');
    final slice = short.length >= 4 ? short.substring(0, 4) : short;
    return 'T-${slice.toUpperCase()}';
  }

  String get timeLabel {
    if (timeSlot.trim().isNotEmpty) return timeSlot;
    final start = startTime?.trim() ?? '';
    final end = endTime?.trim() ?? '';
    if (start.isNotEmpty && end.isNotEmpty) return '$start – $end';
    if (start.isNotEmpty) return start;
    return '—';
  }

  /// Slot start as minutes since midnight ("17:20", "17:20:00" or "05:20 PM").
  int? get startMinutes {
    for (final raw in [startTime, timeSlot]) {
      final m = RegExp(r'^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?', caseSensitive: false)
          .firstMatch((raw ?? '').trim());
      if (m == null) continue;
      var hours = int.parse(m.group(1)!);
      final meridiem = (m.group(3) ?? '').toUpperCase();
      if (meridiem == 'PM' && hours < 12) hours += 12;
      if (meridiem == 'AM' && hours == 12) hours = 0;
      return hours * 60 + int.parse(m.group(2)!);
    }
    return null;
  }

  /// Earliest slot first, then earliest check-in; Call next walks this order.
  static int byQueueOrder(StaffAppointmentModel a, StaffAppointmentModel b) {
    const last = 1 << 30;
    final bySlot = (a.startMinutes ?? last).compareTo(b.startMinutes ?? last);
    return bySlot != 0
        ? bySlot
        : (a.checkedInAt ?? '').compareTo(b.checkedInAt ?? '');
  }

  bool get hasDosage =>
      prescribedDosage != null && prescribedDosage!.trim().isNotEmpty;

  bool get isPaymentSettled => paymentStatus.toLowerCase() == 'paid';

  factory StaffAppointmentModel.fromJson(Map<String, dynamic> json) {
    return StaffAppointmentModel(
      id: json['id']?.toString() ?? '',
      patientUserId: json['patientUserId']?.toString() ?? '',
      patientProfileId: json['patientProfileId']?.toString(),
      patientName: json['patientName']?.toString() ?? 'Patient',
      patientNic: json['patientNic']?.toString(),
      patientPhone: json['patientPhone']?.toString(),
      patientEmail: json['patientEmail']?.toString(),
      hospitalUserId: json['hospitalUserId']?.toString() ?? '',
      hospitalName: json['hospitalName']?.toString() ?? 'Hospital',
      vaccineScheduleId: json['vaccineScheduleId']?.toString(),
      vaccineName: json['vaccineName']?.toString() ?? 'Vaccine',
      doctorName: json['doctorName']?.toString(),
      nurseName: json['nurseName']?.toString(),
      appointmentDate: json['appointmentDate']?.toString() ?? '',
      timeSlot: json['timeSlot']?.toString() ?? '',
      startTime: json['startTime']?.toString(),
      endTime: json['endTime']?.toString(),
      status: json['status']?.toString() ?? 'Confirmed',
      paymentStatus: json['paymentStatus']?.toString() ?? '—',
      notes: json['notes']?.toString(),
      boothId: json['boothId']?.toString(),
      boothLabel: json['boothLabel']?.toString(),
      prescribedDosage: json['prescribedDosage']?.toString(),
      prescribedByDoctorName: json['prescribedByDoctorName']?.toString(),
      dosageUpdatedAt: json['dosageUpdatedAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      checkedInAt: json['checkedInAt']?.toString(),
      sessionStaffUserId: json['sessionStaffUserId']?.toString(),
      sessionStaffName: json['sessionStaffName']?.toString(),
    );
  }
}
