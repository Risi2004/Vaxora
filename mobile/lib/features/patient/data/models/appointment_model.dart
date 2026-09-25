class AppointmentModel {
  final String id;
  final String vaccineName;
  final String hospitalName;
  final String appointmentDate;
  final String timeSlot;
  final String status;
  final String? referenceNumber;
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
    this.fee,
    this.isPaid = false,
    this.notes,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id']?.toString() ?? json['Id']?.toString() ?? '',
      vaccineName: json['vaccineName']?.toString() ?? json['VaccineName']?.toString() ?? 'Vaccine Dose',
      hospitalName: json['hospitalName']?.toString() ?? json['HospitalName']?.toString() ?? 'General Hospital',
      appointmentDate: json['appointmentDate']?.toString() ?? json['AppointmentDate']?.toString() ?? '',
      timeSlot: json['timeSlot']?.toString() ?? json['TimeSlot']?.toString() ?? '09:00 AM',
      status: json['status']?.toString() ?? json['Status']?.toString() ?? 'SCHEDULED',
      referenceNumber: json['referenceNumber']?.toString() ?? json['ReferenceNumber']?.toString(),
      fee: (json['fee'] != null) ? (json['fee'] as num).toDouble() : (json['Fee'] != null ? (json['Fee'] as num).toDouble() : null),
      isPaid: json['isPaid'] == true || json['IsPaid'] == true,
      notes: json['notes']?.toString() ?? json['Notes']?.toString(),
    );
  }
}
