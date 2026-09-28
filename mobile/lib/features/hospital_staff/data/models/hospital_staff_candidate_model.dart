class HospitalStaffCandidateModel {
  final String userId;
  final String registrationNumber;
  final String fullName;
  final String email;
  final String role;
  final String? specialization;
  final bool alreadyAffiliated;

  const HospitalStaffCandidateModel({
    required this.userId,
    required this.registrationNumber,
    required this.fullName,
    required this.email,
    required this.role,
    this.specialization,
    required this.alreadyAffiliated,
  });

  factory HospitalStaffCandidateModel.fromJson(Map<String, dynamic> json) {
    return HospitalStaffCandidateModel(
      userId: json['userId']?.toString() ?? '',
      registrationNumber: json['registrationNumber']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      specialization: json['specialization']?.toString(),
      alreadyAffiliated: json['alreadyAffiliated'] == true,
    );
  }
}
