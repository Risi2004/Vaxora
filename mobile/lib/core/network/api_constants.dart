import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class ApiConstants {
  // In Android Emulator, localhost maps to 10.0.2.2
  // On iOS Simulator / Desktop / Web, localhost is 127.0.0.1
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5004/api';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5004/api';
      }
    } catch (_) {}
    return 'http://localhost:5004/api';
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


  static String batchIssue(String batchId) => '/inventory/batches/$batchId/issue';
  static String batchWastage(String batchId) => '/inventory/batches/$batchId/wastage';
  static String batchAudit(String batchId) => '/inventory/batches/$batchId/audit';

  // Staff management (doctor / nurse)
  static const String staffMyAffiliations = '/staff/my-affiliations';
  static const String staffInvitations = '/staff/invitations';
  static const String staffMyShifts = '/staff/shifts/mine';

  static String staffInvitationRespond(String affiliationId) =>
      '/staff/invitations/$affiliationId/respond';
}
