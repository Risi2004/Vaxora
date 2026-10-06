import 'package:flutter/foundation.dart';

import 'dart:io' show Platform;

class ApiConstants {
  // Configurable compile-time environment URLs (via --dart-define=API_URL=... and --dart-define=AGENT_URL=...)
  static const String _envApiUrl = String.fromEnvironment('API_URL');
  static const String _envAgentUrl = String.fromEnvironment('AGENT_URL');

  // Local development fallbacks (Android Emulator: 10.0.2.2, iOS/Desktop/Web: localhost)
  static String get _localFallback {
    if (kIsWeb) return 'http://localhost:5004/api';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:5004/api';
    } catch (_) {}
    return 'http://localhost:5004/api';
  }

  static String get baseUrl {
    if (_envApiUrl.isNotEmpty) {
      final trimmed = _envApiUrl.trim().replaceAll(RegExp(r'/+$'), '');
      return trimmed.endsWith('/api') ? trimmed : '$trimmed/api';
    }
    return _localFallback;
  }

  static String get agentUrl {
    if (_envAgentUrl.isNotEmpty) {
      return _envAgentUrl.trim().replaceAll(RegExp(r'/+$'), '');
    }
    return 'http://10.0.2.2:8001';
  }

  // Auth endpoints
  static const String login = '/auth/login';
  static const String signupPatient = '/auth/signup/patient';
  static const String currentUser = '/auth/me';

  // Appointment endpoints
  static const String myAppointments = '/appointments/my';
  static const String bookAppointment = '/appointments';
  static const String availableDates = '/appointments/available-dates';
  static const String availableSlots = '/appointments/available-slots';

  // AI Agent endpoints (proxied through ASP.NET Core)
  static const String agentChat = '/agent/chat';
  static const String agentHealth = '/agent/health';

  static const String patientCarePlan = '/agent/patient-care-plan';

  // Patient Clinical & Vaccination endpoints
  static const String updateProfile = '/auth/profile';
  static const String patientVaccinations = '/patient-vaccinations';
  static const String patientMedicalHistory = '/patient-medical-history';
  static const String availableSchedules = '/schedule/available';
  static const String vaccines = '/inventory/vaccines';

  // PayHere Payment endpoints
  static const String payHereInit = '/payment/payhere-init';
  static const String confirmPayment = '/payment/confirm';

  // Inventory endpoints
  static const String inventoryBatches = '/inventory/batches';
  static const String inventoryExpiring = '/inventory/batches/expiring';
  static const String inventorySummary = '/inventory/summary';
  static const String inventoryVaults = '/inventory/vaults';
  static const String inventoryFormulary = '/inventory/formulary';
static String formularyEntry(String id) => '/inventory/formulary/$id';
// same path — the HTTP method changes, not the URL
static const String inventoryRestock = '/inventory/batches';
static const String inventoryDamageReport = '/inventory/damage-report';

  // Inventory AI draft execution (approval-gated)
  static const String inventoryAgentExecuteDraft = '/inventory/agent/execute-draft';
  static const String inventoryAgentWorkflows = '/inventory/agent/workflows';

  static String batchIssue(String batchId) => '/inventory/batches/$batchId/issue';
  static String batchWastage(String batchId) => '/inventory/batches/$batchId/wastage';
  static String batchAudit(String batchId) => '/inventory/batches/$batchId/audit';

  // Staff management (doctor / nurse)
  static const String staffMyAffiliations = '/staff/my-affiliations';
  static const String staffInvitations = '/staff/invitations';
  static const String staffMyShifts = '/staff/shifts/mine';
  static const String staffAppointments = '/appointments/staff';

  static String staffInvitationRespond(String affiliationId) =>
      '/staff/invitations/$affiliationId/respond';

  // Staff management (hospital side)
  static const String hospitalStaffRoster = '/staff/hospital';
  static const String hospitalStaffCandidates = '/staff/candidates';
  static const String hospitalStaffInvite = '/staff/invite';
  static const String hospitalStaffShifts = '/staff/shifts/hospital';
  static const String hospitalShiftSwaps = '/staff/shift-swaps/hospital';
  static const String staffShiftSwaps = '/staff/shift-swaps';
  static const String staffMyShiftSwaps = '/staff/shift-swaps/mine';
  static const String staffShiftSwapQuota = '/staff/shift-swaps/quota';

  static String hospitalShiftSwapDecision(String requestId) =>
      '/staff/shift-swaps/$requestId/decision';

  static String hospitalAffiliationDuty(String affiliationId) =>
      '/staff/affiliations/$affiliationId/duty';
  static String hospitalAffiliation(String affiliationId) =>
      '/staff/affiliations/$affiliationId';

  static String appointmentStatus(String id) => '/appointments/$id/status';
  static String appointmentAefi(String id) => '/appointments/$id/aefi';
}