class HospitalStaffMemberModel {
  final String affiliationId;
  final String staffUserId;
  final String staffName;
  final String? staffPhotoUrl;
  final String staffRegistrationNumber;
  final String staffRole;
  final String? specialization;
  final String? phoneNumber;
  final String? email;
  final String status;
  final String dutyStatus;
  final bool isOnDutyNow;
  final String? invitedAt;
  final String? respondedAt;

  const HospitalStaffMemberModel({
    required this.affiliationId,
    required this.staffUserId,
    required this.staffName,
    this.staffPhotoUrl,
    required this.staffRegistrationNumber,
    required this.staffRole,
    this.specialization,
    this.phoneNumber,
    this.email,
    required this.status,
    required this.dutyStatus,
    required this.isOnDutyNow,
    this.invitedAt,
    this.respondedAt,
  });

  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isActive => status.toUpperCase() == 'ACTIVE';

  factory HospitalStaffMemberModel.fromJson(Map<String, dynamic> json) {
    return HospitalStaffMemberModel(
      affiliationId: json['affiliationId']?.toString() ?? '',
      staffUserId: json['staffUserId']?.toString() ?? '',
      staffName: json['staffName']?.toString() ?? 'Staff',
      staffPhotoUrl: json['staffProfilePhotoUrl']?.toString(),
      staffRegistrationNumber:
          json['staffRegistrationNumber']?.toString() ?? '',
      staffRole: json['staffRole']?.toString() ?? '',
      specialization: json['specialization']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      email: json['email']?.toString(),
      status: json['status']?.toString() ?? '',
      dutyStatus: json['dutyStatus']?.toString() ?? '',
      isOnDutyNow: json['isOnDutyNow'] == true,
      invitedAt: json['invitedAt']?.toString(),
      respondedAt: json['respondedAt']?.toString(),
    );
  }
}
