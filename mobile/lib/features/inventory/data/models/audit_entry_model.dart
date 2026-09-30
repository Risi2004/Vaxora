class AuditEntryModel {
  final String id;
  final String timestamp;
  final String event;
  final String actor;
  final String type; // 'restock' | 'dispense' | 'qa' | 'sensor'

  const AuditEntryModel({
    required this.id,
    required this.timestamp,
    required this.event,
    required this.actor,
    required this.type,
  });

  factory AuditEntryModel.fromJson(Map<String, dynamic> json) {
    return AuditEntryModel(
      id: json['id']?.toString() ?? '',
      timestamp: json['timestamp']?.toString() ?? '',
      event: json['event']?.toString() ?? '',
      actor: json['actor']?.toString() ?? 'System',
      type: json['type']?.toString() ?? 'qa',
    );
  }
}

class BatchAuditModel {
  final List<AuditEntryModel> entries;
  const BatchAuditModel({required this.entries});

  factory BatchAuditModel.fromJson(Map<String, dynamic> json) {
    final list = (json['entries'] as List<dynamic>?) ?? [];
    return BatchAuditModel(
      entries: list
          .map((e) => AuditEntryModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

//audit entry model for a batch, including restock, dispense, QA, and sensor events