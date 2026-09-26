class AgentMessage {
  final String role; // 'user' or 'assistant'
  final String content;
  final AgentProposal? proposal;
  final AgentBooking? booking;
  final Map<String, dynamic>? cancellation;
  final bool isError;

  const AgentMessage({
    required this.role,
    required this.content,
    this.proposal,
    this.booking,
    this.cancellation,
    this.isError = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
    };
  }
}

class AgentProposal {
  final String type; // 'booking' or 'cancellation'
  final String? appointmentId;
  final String vaccineName;
  final String hospitalName;
  final String appointmentDate;
  final String timeSlot;
  final double fee;
  final bool requiresPayment;

  const AgentProposal({
    this.type = 'booking',
    this.appointmentId,
    required this.vaccineName,
    required this.hospitalName,
    required this.appointmentDate,
    required this.timeSlot,
    required this.fee,
    required this.requiresPayment,
  });

  bool get isCancellation => type.toLowerCase() == 'cancellation';

  factory AgentProposal.fromJson(Map<String, dynamic> json) {
    final rawFee = json['price'] ?? json['fee'];
    final feeVal = (rawFee as num?)?.toDouble() ?? 0.0;
    final isFreeVal = json['is_free'] == true || (json['is_free'] == null && feeVal <= 0.0);
    final requiresPayVal = json['requires_payment'] == true || (!isFreeVal && feeVal > 0.0);

    return AgentProposal(
      type: json['type']?.toString().toLowerCase() ?? 'booking',
      appointmentId: json['appointment_id']?.toString(),
      vaccineName: json['vaccine_name']?.toString() ?? 'Vaccine',
      hospitalName: json['hospital_name']?.toString() ?? 'Hospital',
      appointmentDate: json['appointment_date']?.toString() ?? '',
      timeSlot: json['time_slot']?.toString() ?? '',
      fee: feeVal,
      requiresPayment: requiresPayVal,
    );
  }
}

class AgentBooking {
  final bool success;
  final bool isFree;
  final String? message;
  final Map<String, dynamic>? appointment;
  final Map<String, dynamic>? payherePayload;

  const AgentBooking({
    required this.success,
    this.isFree = true,
    this.message,
    this.appointment,
    this.payherePayload,
  });

  factory AgentBooking.fromJson(Map<String, dynamic> json) {
    return AgentBooking(
      success: json['success'] == true,
      isFree: json['is_free'] != false,
      message: json['message']?.toString(),
      appointment: json['appointment'] is Map<String, dynamic> ? json['appointment'] : null,
      payherePayload: json['payhere_payload'] is Map<String, dynamic> ? json['payhere_payload'] : null,
    );
  }
}
