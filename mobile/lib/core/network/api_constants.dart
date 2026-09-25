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
}
