class AgentMessage {
  final String role; // 'user' or 'assistant'
  final String content;
  final AgentProposal? proposal;
  final AgentBooking? booking;
  final Map<String, dynamic>? cancellation;
  final bool isError;

  const AgentMessage({
    required this.role,
    required this.content,
    this.proposal,
    this.booking,
    this.cancellation,
    this.isError = false,
  });

  Map<String, dynamic> toJson() {
    return {'role': role, 'content': content};
  }
}

class AgentProposal {
  final String type; // 'booking' or 'cancellation'
  final String? appointmentId;
  final String vaccineName;
  final String hospitalName;
  final String appointmentDate;
  final String timeSlot;
  final double fee;
  final bool requiresPayment;

  const AgentProposal({
    this.type = 'booking',
    this.appointmentId,
    required this.vaccineName,
    required this.hospitalName,
    required this.appointmentDate,
    required this.timeSlot,
    required this.fee,
    required this.requiresPayment,
  });

  bool get isCancellation => type.toLowerCase() == 'cancellation';

  factory AgentProposal.fromJson(Map<String, dynamic> json) {
    final rawFee = json['price'] ?? json['fee'];
    final feeVal = (rawFee as num?)?.toDouble() ?? 0.0;
    final isFreeVal =
        json['is_free'] == true || (json['is_free'] == null && feeVal <= 0.0);
    final requiresPayVal =
        json['requires_payment'] == true || (!isFreeVal && feeVal > 0.0);

    return AgentProposal(
      type: json['type']?.toString().toLowerCase() ?? 'booking',
      appointmentId: json['appointment_id']?.toString(),
      vaccineName: json['vaccine_name']?.toString() ?? 'Vaccine',
      hospitalName: json['hospital_name']?.toString() ?? 'Hospital',
      appointmentDate: json['appointment_date']?.toString() ?? '',
      timeSlot: json['time_slot']?.toString() ?? '',
      fee: feeVal,
      requiresPayment: requiresPayVal,
    );
  }
}

class AgentBooking {
  final bool success;
  final bool isFree;
  final String? message;
  final Map<String, dynamic>? appointment;
  final Map<String, dynamic>? payherePayload;

  const AgentBooking({
    required this.success,
    this.isFree = true,
    this.message,
    this.appointment,
    this.payherePayload,
  });

  factory AgentBooking.fromJson(Map<String, dynamic> json) {
    return AgentBooking(
      success: json['success'] == true,
      isFree: json['is_free'] != false,
      message: json['message']?.toString(),
      appointment: json['appointment'] is Map<String, dynamic>
          ? json['appointment']
          : null,
      payherePayload: json['payhere_payload'] is Map<String, dynamic>
          ? json['payhere_payload']
          : null,
    );
  }
}

// ============================================================
// Patient Care Plan — mirrors the /api/agent/patient-care-plan response
// ============================================================

class CarePlanResponseModel {
  final bool success;
  final String? error;
  final String patientProfileId;
  final PatientSummaryModel? patientSummary;
  final CarePlanModel? carePlan;
  final List<CarePlanStepModel> steps;
  final int durationMs;

  const CarePlanResponseModel({
    required this.success,
    this.error,
    required this.patientProfileId,
    this.patientSummary,
    this.carePlan,
    required this.steps,
    required this.durationMs,
  });

  factory CarePlanResponseModel.fromJson(Map<String, dynamic> json) {
    return CarePlanResponseModel(
      success: json['success'] == true,
      error: json['error']?.toString(),
      patientProfileId: json['patient_profile_id']?.toString() ?? '',
      patientSummary: json['patient_summary'] is Map<String, dynamic>
          ? PatientSummaryModel.fromJson(
              json['patient_summary'] as Map<String, dynamic>,
            )
          : null,
      carePlan: json['care_plan'] is Map<String, dynamic>
          ? CarePlanModel.fromJson(json['care_plan'] as Map<String, dynamic>)
          : null,
      steps:
          (json['steps'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(CarePlanStepModel.fromJson)
              .toList() ??
          const [],
      durationMs: (json['duration_ms'] as num?)?.toInt() ?? 0,
    );
  }
}

class CarePlanStepModel {
  final String agent;
  final bool ok;
  final int durationMs;
  final List<String> toolsUsed;

  const CarePlanStepModel({
    required this.agent,
    required this.ok,
    required this.durationMs,
    required this.toolsUsed,
  });

  factory CarePlanStepModel.fromJson(Map<String, dynamic> json) {
    return CarePlanStepModel(
      agent: json['agent']?.toString() ?? '—',
      ok: json['ok'] == true,
      durationMs: (json['duration_ms'] as num?)?.toInt() ?? 0,
      toolsUsed:
          (json['tools_used'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }
}

class PatientSummaryModel {
  final Map<String, dynamic> demographics;
  final List<Map<String, dynamic>> chronicConditions;
  final List<Map<String, dynamic>> allergies;
  final List<String> activeMedications;
  final Map<String, dynamic> vaccinationSummary;
  final List<String> dataGaps;

  const PatientSummaryModel({
    required this.demographics,
    required this.chronicConditions,
    required this.allergies,
    required this.activeMedications,
    required this.vaccinationSummary,
    required this.dataGaps,
  });

  factory PatientSummaryModel.fromJson(Map<String, dynamic> json) {
    List<Map<String, dynamic>> listOfMaps(dynamic raw) {
      if (raw is! List) return const [];
      return raw.whereType<Map<String, dynamic>>().toList();
    }

    return PatientSummaryModel(
      demographics: (json['demographics'] as Map<String, dynamic>?) ?? const {},
      chronicConditions: listOfMaps(json['chronic_conditions']),
      allergies: listOfMaps(json['allergies']),
      activeMedications:
          (json['active_medications'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      vaccinationSummary:
          (json['vaccination_summary'] as Map<String, dynamic>?) ?? const {},
      dataGaps:
          (json['data_gaps'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }
}

class CarePlanModel {
  final String summaryText;
  final List<CarePlanActionModel> immediateActions;
  final List<CarePlanVaccineModel> upcomingVaccines;
  final List<String> lifestyleRecommendations;
  final List<String> recommendedScreenings;
  final List<String> referrals;
  final List<CarePlanWarningModel> warnings;
  final String followUpRecommendation;

  const CarePlanModel({
    required this.summaryText,
    required this.immediateActions,
    required this.upcomingVaccines,
    required this.lifestyleRecommendations,
    required this.recommendedScreenings,
    required this.referrals,
    required this.warnings,
    required this.followUpRecommendation,
  });

  factory CarePlanModel.fromJson(Map<String, dynamic> json) {
    List<String> listOfStrings(dynamic raw) {
      if (raw is! List) return const [];
      return raw.map((e) => e.toString()).toList();
    }

    return CarePlanModel(
      summaryText: json['summary_text']?.toString() ?? '',
      immediateActions:
          (json['immediate_actions'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(CarePlanActionModel.fromJson)
              .toList() ??
          const [],
      upcomingVaccines:
          (json['upcoming_vaccines'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(CarePlanVaccineModel.fromJson)
              .toList() ??
          const [],
      lifestyleRecommendations: listOfStrings(
        json['lifestyle_recommendations'],
      ),
      recommendedScreenings: listOfStrings(json['recommended_screenings']),
      referrals: listOfStrings(json['referrals']),
      warnings:
          (json['warnings'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(CarePlanWarningModel.fromJson)
              .toList() ??
          const [],
      followUpRecommendation:
          json['follow_up_recommendation']?.toString() ?? '',
    );
  }
}

class CarePlanActionModel {
  final String action;
  final String priority;
  final String reason;

  const CarePlanActionModel({
    required this.action,
    required this.priority,
    required this.reason,
  });

  factory CarePlanActionModel.fromJson(Map<String, dynamic> json) {
    return CarePlanActionModel(
      action: json['action']?.toString() ?? '',
      priority: json['priority']?.toString() ?? 'Medium',
      reason: json['reason']?.toString() ?? '',
    );
  }
}

class CarePlanVaccineModel {
  final String vaccine;
  final String reason;
  final int? dueWithinDays;

  const CarePlanVaccineModel({
    required this.vaccine,
    required this.reason,
    this.dueWithinDays,
  });

  factory CarePlanVaccineModel.fromJson(Map<String, dynamic> json) {
    return CarePlanVaccineModel(
      vaccine: json['vaccine']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      dueWithinDays: (json['due_within_days'] as num?)?.toInt(),
    );
  }
}

class CarePlanWarningModel {
  final String severity;
  final String message;

  const CarePlanWarningModel({required this.severity, required this.message});

  factory CarePlanWarningModel.fromJson(Map<String, dynamic> json) {
    return CarePlanWarningModel(
      severity: json['severity']?.toString() ?? 'Info',
      message: json['message']?.toString() ?? '',
    );
  }
}
