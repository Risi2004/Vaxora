class InventorySummaryModel {
  final int totalVials;
  final int totalDoses;
  final int lowStockCount;
  final int expiringCount;
  final int totalFormulations;
  final String coldStorageHealth;
  final int vaultsOnline;

  const InventorySummaryModel({
    required this.totalVials,
    required this.totalDoses,
    required this.lowStockCount,
    required this.expiringCount,
    required this.totalFormulations,
    required this.coldStorageHealth,
    required this.vaultsOnline,
  });

  factory InventorySummaryModel.fromJson(Map<String, dynamic> json) {
    return InventorySummaryModel(
      totalVials: (json['totalVials'] as num?)?.toInt() ?? 0,
      totalDoses: (json['totalDoses'] as num?)?.toInt() ?? 0,
      lowStockCount: (json['lowStockCount'] as num?)?.toInt() ?? 0,
      expiringCount: (json['expiringCount'] as num?)?.toInt() ?? 0,
      totalFormulations: (json['totalFormulations'] as num?)?.toInt() ?? 0,
      coldStorageHealth: json['coldStorageHealth']?.toString() ?? '100%',
      vaultsOnline: (json['vaultsOnline'] as num?)?.toInt() ?? 0,
    );
  }
}