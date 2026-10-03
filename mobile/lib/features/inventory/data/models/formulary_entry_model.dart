class FormularyEntryModel {
  final String id;
  final String vaccineId;
  final String vaccineName;
  final String manufacturer;
  final String registeredAt;

  const FormularyEntryModel({
    required this.id,
    required this.vaccineId,
    required this.vaccineName,
    required this.manufacturer,
    required this.registeredAt,
  });

  factory FormularyEntryModel.fromJson(Map<String, dynamic> json) {
    return FormularyEntryModel(
      id: json['id']?.toString() ?? '',
      vaccineId: json['vaccineId']?.toString() ?? '',
      vaccineName: json['vaccineName']?.toString() ?? '',
      manufacturer: json['manufacturer']?.toString() ?? '',
      registeredAt: json['registeredAt']?.toString() ?? '',
    );
  }
}