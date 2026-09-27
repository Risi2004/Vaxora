import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../data/models/agent_models.dart';

/// Persists the last 10 generated care plans locally (SharedPreferences).
/// No backend changes required — the web app has no persistence for care plans.
class CarePlanStorageService {
  static const _key = 'vaxora_care_plan_history';
  static const _maxEntries = 10;

  /// Save a new care plan at the head of the history list.
  /// Caller should only invoke this for FRESH results, not for re-opening
  /// an existing saved plan (that would create duplicates).
  static Future<void> save(CarePlanResponseModel result) async {
    if (!result.success || result.carePlan == null) return;
    final prefs = await SharedPreferences.getInstance();
    final list = _readList(prefs);
    list.insert(0, {
      'savedAt': DateTime.now().toIso8601String(),
      'data': _toJson(result),
    });
    final trimmed = list.take(_maxEntries).toList();
    await prefs.setString(_key, jsonEncode(trimmed));
  }

  /// All saved care plans, most recent first.
  static Future<List<SavedCarePlan>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final list = _readList(prefs);
    final out = <SavedCarePlan>[];
    for (final e in list) {
      try {
        final savedAt =
            DateTime.tryParse(e['savedAt']?.toString() ?? '') ?? DateTime.now();
        final data = e['data'];
        if (data is! Map) continue;
        final model = CarePlanResponseModel.fromJson(
          Map<String, dynamic>.from(data),
        );
        out.add(SavedCarePlan(savedAt: savedAt, result: model));
      } catch (_) {
        // Skip corrupt entries silently
      }
    }
    return out;
  }

  /// The most recently saved care plan, or null if none.
  static Future<CarePlanResponseModel?> getLatest() async {
    final history = await getHistory();
    return history.isEmpty ? null : history.first.result;
  }

  /// Remove a single entry by index (0 = newest).
  static Future<void> removeAt(int index) async {
    final prefs = await SharedPreferences.getInstance();
    final list = _readList(prefs);
    if (index < 0 || index >= list.length) return;
    list.removeAt(index);
    await prefs.setString(_key, jsonEncode(list));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  // ---------- internals ----------

  static List<Map<String, dynamic>> _readList(SharedPreferences prefs) {
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      return decoded
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Serialize back to the backend's snake_case shape so `fromJson` works.
  static Map<String, dynamic> _toJson(CarePlanResponseModel r) {
    return {
      'success': r.success,
      'error': r.error,
      'patient_profile_id': r.patientProfileId,
      'duration_ms': r.durationMs,
      'patient_summary': r.patientSummary == null
          ? null
          : {
              'demographics': r.patientSummary!.demographics,
              'chronic_conditions': r.patientSummary!.chronicConditions,
              'allergies': r.patientSummary!.allergies,
              'active_medications': r.patientSummary!.activeMedications,
              'vaccination_summary': r.patientSummary!.vaccinationSummary,
              'data_gaps': r.patientSummary!.dataGaps,
            },
      'care_plan': r.carePlan == null
          ? null
          : {
              'summary_text': r.carePlan!.summaryText,
              'immediate_actions': r.carePlan!.immediateActions
                  .map(
                    (a) => {
                      'action': a.action,
                      'priority': a.priority,
                      'reason': a.reason,
                    },
                  )
                  .toList(),
              'upcoming_vaccines': r.carePlan!.upcomingVaccines
                  .map(
                    (v) => {
                      'vaccine': v.vaccine,
                      'reason': v.reason,
                      'due_within_days': v.dueWithinDays,
                    },
                  )
                  .toList(),
              'lifestyle_recommendations': r.carePlan!.lifestyleRecommendations,
              'recommended_screenings': r.carePlan!.recommendedScreenings,
              'referrals': r.carePlan!.referrals,
              'warnings': r.carePlan!.warnings
                  .map((w) => {'severity': w.severity, 'message': w.message})
                  .toList(),
              'follow_up_recommendation': r.carePlan!.followUpRecommendation,
            },
      'steps': r.steps
          .map(
            (s) => {
              'agent': s.agent,
              'ok': s.ok,
              'duration_ms': s.durationMs,
              'tools_used': s.toolsUsed,
            },
          )
          .toList(),
    };
  }
}

class SavedCarePlan {
  final DateTime savedAt;
  final CarePlanResponseModel result;

  const SavedCarePlan({required this.savedAt, required this.result});
}
