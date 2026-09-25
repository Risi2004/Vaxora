class UserModel {
  final String id;
  final String email;
  final String role;
  final String status;
  final String name;
  final String? phoneNumber;
  final String? registrationNumber;
  final String? nicNumber;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    required this.name,
    this.phoneNumber,
    this.registrationNumber,
    this.nicNumber,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    String? extractedNic;
    if (json['profileDetails'] != null && json['profileDetails'] is Map) {
      extractedNic = json['profileDetails']['nicNumber']?.toString();
    }

    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'PATIENT',
      status: json['status']?.toString() ?? 'APPROVED',
      name: json['name']?.toString() ?? json['fullName']?.toString() ?? 'User',
      phoneNumber: json['phoneNumber']?.toString(),
      registrationNumber: json['registrationNumber']?.toString(),
      nicNumber: extractedNic ?? json['nicNumber']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'status': status,
      'name': name,
      'phoneNumber': phoneNumber,
      'registrationNumber': registrationNumber,
      'nicNumber': nicNumber,
    };
  }
}
