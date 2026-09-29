class UserModel {
  final String id;
  final String email;
  final String role;
  final String status;
  final String name;
  final String? phoneNumber;
  final String? registrationNumber;
  final String? nicNumber;
  final String? patientProfileId;
  final String? dateOfBirth;
  final String? profilePhotoUrl;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    required this.name,
    this.phoneNumber,
    this.registrationNumber,
    this.nicNumber,
    this.patientProfileId,
    this.dateOfBirth,
    this.profilePhotoUrl,
  });

  static String? _pick(Map<dynamic, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final value = json[key]?.toString().trim();
      if (value != null && value.isNotEmpty && value.toLowerCase() != 'null') {
        return value;
      }
    }
    return null;
  }

  static String? _photoFromJson(Map<String, dynamic> json) {
    final direct = _pick(json, [
      'profilePhotoUrl',
      'ProfilePhotoUrl',
      'photoUrl',
      'PhotoUrl',
      'avatarUrl',
      'logoUrl',
      'LogoUrl',
    ]);
    if (direct != null) return direct;

    final details = json['profileDetails'] ?? json['ProfileDetails'];
    if (details is Map) {
      return _pick(details, [
        'profilePhotoUrl',
        'ProfilePhotoUrl',
        'photoUrl',
        'PhotoUrl',
        'logoUrl',
        'LogoUrl',
      ]);
    }
    return null;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    String? extractedNic;
    String? extractedProfileId;
    String? extractedDob;

    final details = json['profileDetails'] ?? json['ProfileDetails'];
    if (details is Map) {
      extractedNic = _pick(details, ['nicNumber', 'NicNumber']);
      extractedProfileId = _pick(details, ['id', 'Id']);
      extractedDob = _pick(details, ['dateOfBirth', 'DateOfBirth']);
    }

    return UserModel(
      id: _pick(json, ['id', 'Id']) ?? '',
      email: _pick(json, ['email', 'Email']) ?? '',
      role: _pick(json, ['role', 'Role']) ?? 'PATIENT',
      status: _pick(json, ['status', 'Status']) ?? 'APPROVED',
      name: _pick(json, ['name', 'Name', 'fullName', 'FullName']) ?? 'User',
      phoneNumber: _pick(json, ['phoneNumber', 'PhoneNumber']),
      registrationNumber: _pick(json, [
        'registrationNumber',
        'RegistrationNumber',
      ]),
      nicNumber: extractedNic ?? _pick(json, ['nicNumber', 'NicNumber']),
      // Fallback to top-level key for cache round-trips; without this,
      // patientProfileId is null after any logout/login cycle through
      // the local SharedPreferences cache.
      patientProfileId:
          extractedProfileId ??
          _pick(json, ['patientProfileId', 'PatientProfileId']),
      dateOfBirth: extractedDob ?? _pick(json, ['dateOfBirth', 'DateOfBirth']),
      profilePhotoUrl: _photoFromJson(json),
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
      'patientProfileId': patientProfileId,
      'dateOfBirth': dateOfBirth,
      'profilePhotoUrl': profilePhotoUrl,
    };
  }
}
