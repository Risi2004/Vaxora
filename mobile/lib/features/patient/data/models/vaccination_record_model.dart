class PatientVaccinationRecordModel {
  final String id;
  final String patientProfileId;
  final String vaccineId;
  final String vaccineName;
  final String manufacturer;
  final String category;
  final int doseNumber;
  final String route;
  final String? site;
  final String? lotNumber;
  final String? notes;
  final DateTime administeredAt;
  final String administeredByName;
  final String? batchId;
  final bool adverseEventReported;
  final String? adverseEventNotes;
  final DateTime createdAt;

  const PatientVaccinationRecordModel({
    required this.id,
    required this.patientProfileId,
    required this.vaccineId,
    required this.vaccineName,
    required this.manufacturer,
    required this.category,
    required this.doseNumber,
    required this.route,
    this.site,
    this.lotNumber,
    this.notes,
    required this.administeredAt,
    required this.administeredByName,
    this.batchId,
    this.adverseEventReported = false,
    this.adverseEventNotes,
    required this.createdAt,
  });

  factory PatientVaccinationRecordModel.fromJson(Map<String, dynamic> json) {
    return PatientVaccinationRecordModel(
      id: json['id']?.toString() ?? '',
      patientProfileId: json['patientProfileId']?.toString() ?? '',
      vaccineId: json['vaccineId']?.toString() ?? '',
      vaccineName: json['vaccineName']?.toString() ?? 'Vaccine',
      manufacturer: json['manufacturer']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Routine',
      doseNumber: (json['doseNumber'] as num?)?.toInt() ?? 1,
      route: json['route']?.toString() ?? 'Intramuscular',
      site: json['site']?.toString(),
      lotNumber: json['lotNumber']?.toString(),
      notes: json['notes']?.toString(),
      administeredAt: DateTime.tryParse(json['administeredAt']?.toString() ?? '') ?? DateTime.now(),
      administeredByName: json['administeredByName']?.toString() ?? 'Medical Officer',
      batchId: json['batchId']?.toString(),
      adverseEventReported: json['adverseEventReported'] == true,
      adverseEventNotes: json['adverseEventNotes']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class PatientVaccinationTimelineModel {
  final String patientProfileId;
  final String patientName;
  final String nicNumber;
  final int totalDoses;
  final int distinctVaccines;
  final DateTime? lastVaccinatedAt;
  final List<PatientVaccinationRecordModel> records;

  const PatientVaccinationTimelineModel({
    required this.patientProfileId,
    required this.patientName,
    required this.nicNumber,
    required this.totalDoses,
    required this.distinctVaccines,
    this.lastVaccinatedAt,
    required this.records,
  });

  factory PatientVaccinationTimelineModel.fromJson(Map<String, dynamic> json) {
    return PatientVaccinationTimelineModel(
      patientProfileId: json['patientProfileId']?.toString() ?? '',
      patientName: json['patientName']?.toString() ?? '',
      nicNumber: json['nicNumber']?.toString() ?? '',
      totalDoses: (json['totalDoses'] as num?)?.toInt() ?? 0,
      distinctVaccines: (json['distinctVaccines'] as num?)?.toInt() ?? 0,
      lastVaccinatedAt: json['lastVaccinatedAt'] != null
          ? DateTime.tryParse(json['lastVaccinatedAt'].toString())
          : null,
      records: (json['records'] as List<dynamic>?)
              ?.map((e) => PatientVaccinationRecordModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
