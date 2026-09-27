class BatchModel {
  final String id;
  final String vaccineId;
  final String name;
  final String manufacturer;
  final String category;
  final String lotNumber;
  final int available;
  final int capacity;
  final int minThreshold;
  final int dosesPerVial;
  final String expiry;
  final String expiryStatus; // 'healthy' | 'expiring_soon' | 'expired'
  final String temp;
  final String storageUnit;
  final String statusColor;  // 'bar-green' | 'bar-orange' | 'bar-red' | 'bar-blue'
  final String lastRestocked;

  const BatchModel({
    required this.id,
    required this.vaccineId,
    required this.name,
    required this.manufacturer,
    required this.category,
    required this.lotNumber,
    required this.available,
    required this.capacity,
    required this.minThreshold,
    required this.dosesPerVial,
    required this.expiry,
    required this.expiryStatus,
    required this.temp,
    required this.storageUnit,
    required this.statusColor,
    required this.lastRestocked,
  });

  bool get isLowStock => available <= minThreshold;
  bool get isExpiringSoon => expiryStatus == 'expiring_soon';
  bool get isExpired => expiryStatus == 'expired';
  double get stockPercent => capacity > 0 ? (available / capacity) : 0.0;

  factory BatchModel.fromJson(Map<String, dynamic> json) {
    return BatchModel(
      id: json['id']?.toString() ?? '',
      vaccineId: json['vaccineId']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Vaccine',
      manufacturer: json['manufacturer']?.toString() ?? '',
      category: json['category']?.toString() ?? 'routine',
      lotNumber: json['lotNumber']?.toString() ?? '',
      available: (json['available'] as num?)?.toInt() ?? 0,
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      minThreshold: (json['minThreshold'] as num?)?.toInt() ?? 0,
      dosesPerVial: (json['dosesPerVial'] as num?)?.toInt() ?? 1,
      expiry: json['expiry']?.toString() ?? '',
      expiryStatus: json['expiryStatus']?.toString() ?? 'healthy',
      temp: json['temp']?.toString() ?? '',
      storageUnit: json['storageUnit']?.toString() ?? '',
      statusColor: json['statusColor']?.toString() ?? 'bar-green',
      lastRestocked: json['lastRestocked']?.toString() ?? '',
    );
  }
}