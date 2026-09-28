class ShiftModel {
  final String shiftId;
  final String affiliationId;
  final String staffUserId;
  final String staffName;
  final String staffRole;
  final String? staffPhotoUrl;
  final String shiftDate;
  final String startTime;
  final String endTime;
  final String? boothId;
  final String? boothOrStation;
  final String? notes;
  final String? createdAt;
  final String? updatedAt;
  final String? coverStatus;
  final String? coverLabel;
  final String? coverForName;

  const ShiftModel({
    required this.shiftId,
    required this.affiliationId,
    required this.staffUserId,
    required this.staffName,
    required this.staffRole,
    this.staffPhotoUrl,
    required this.shiftDate,
    required this.startTime,
    required this.endTime,
    this.boothId,
    this.boothOrStation,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.coverStatus,
    this.coverLabel,
    this.coverForName,
  });

  bool get isCoverRequested => coverStatus?.toLowerCase() == 'requested';
  bool get isCovering => coverStatus?.toLowerCase() == 'covering';
  bool get isCoverDeclined => coverStatus?.toLowerCase() == 'declined';

  /// Short display like "09:00–13:00" from API TimeOnly strings.
  String get timeRangeLabel {
    String short(String raw) {
      final t = raw.trim();
      if (t.length >= 5) return t.substring(0, 5);
      return t;
    }

    return '${short(startTime)}–${short(endTime)}';
  }

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      shiftId: json['shiftId']?.toString() ?? '',
      affiliationId: json['affiliationId']?.toString() ?? '',
      staffUserId: json['staffUserId']?.toString() ?? '',
      staffName: json['staffName']?.toString() ?? 'Staff',
      staffRole: json['staffRole']?.toString() ?? '',
      staffPhotoUrl: json['staffPhotoUrl']?.toString(),
      shiftDate: json['shiftDate']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      boothId: json['boothId']?.toString(),
      boothOrStation: json['boothOrStation']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      coverStatus: json['coverStatus']?.toString(),
      coverLabel: json['coverLabel']?.toString(),
      coverForName: json['coverForName']?.toString(),
    );
  }
}
