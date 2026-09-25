class AppointmentModel {
  final String id;
  final String vaccineName;
  final String hospitalName;
  final String appointmentDate;
  final String timeSlot;
  final String status;
  final String? referenceNumber;
  final String? doseNumber;
  final double? fee;
  final bool isPaid;
  final String? notes;

  const AppointmentModel({
    required this.id,
    required this.vaccineName,
    required this.hospitalName,
    required this.appointmentDate,
    required this.timeSlot,
    required this.status,
    this.referenceNumber,
    this.doseNumber,
    this.fee,
    this.isPaid = false,
    this.notes,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    final status = (json['status'] ?? json['Status'] ?? 'SCHEDULED').toString();
    final paymentStatus = (json['paymentStatus'] ?? json['PaymentStatus'] ?? '').toString().toLowerCase();
    final paymentTxId = (json['paymentTransactionId'] ?? json['PaymentTransactionId'] ?? '').toString().trim();
    final double? parsedFee = (json['fee'] != null)
        ? (json['fee'] as num).toDouble()
        : (json['Fee'] != null ? (json['Fee'] as num).toDouble() : null);

    final bool isPaidCalculated = json['isPaid'] == true ||
        json['IsPaid'] == true ||
        paymentStatus == 'paid' ||
        status.toLowerCase() == 'confirmed' ||
        status.toLowerCase() == 'completed' ||
        paymentTxId.isNotEmpty ||
        (parsedFee == null || parsedFee <= 0);

    return AppointmentModel(
      id: json['id']?.toString() ?? json['Id']?.toString() ?? '',
      vaccineName: json['vaccineName']?.toString() ?? json['VaccineName']?.toString() ?? 'Vaccine Dose',
      hospitalName: json['hospitalName']?.toString() ?? json['HospitalName']?.toString() ?? 'General Hospital',
      appointmentDate: json['appointmentDate']?.toString() ?? json['AppointmentDate']?.toString() ?? '',
      timeSlot: json['timeSlot']?.toString() ?? json['TimeSlot']?.toString() ?? '09:00 AM',
      status: status,
      referenceNumber: json['referenceNumber']?.toString() ?? json['ReferenceNumber']?.toString(),
      doseNumber: json['doseNumber']?.toString() ?? json['DoseNumber']?.toString() ?? 'Dose 1',
      fee: parsedFee,
      isPaid: isPaidCalculated,
      notes: json['notes']?.toString() ?? json['Notes']?.toString(),
    );
  }
}
