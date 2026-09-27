class ShiftModel {
  final String shiftId;
  final String affiliationId;
  final String staffUserId;
  final String staffName;
  final String staffRole;
  final String shiftDate;
  final String startTime;
  final String endTime;
  final String? boothId;
  final String? boothOrStation;
  final String? notes;
  final String? createdAt;
  final String? updatedAt;

  const ShiftModel({
    required this.shiftId,
    required this.affiliationId,
    required this.staffUserId,
    required this.staffName,
    required this.staffRole,
    required this.shiftDate,
    required this.startTime,
    required this.endTime,
    this.boothId,
    this.boothOrStation,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

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
      shiftDate: json['shiftDate']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      boothId: json['boothId']?.toString(),
      boothOrStation: json['boothOrStation']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }
}
