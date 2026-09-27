import 'package:flutter/material.dart';
import '../../inventory/presentation/screens/hospital_main_screen.dart';
import '../../patient/presentation/screens/patient_main_screen.dart';
import '../../staff/presentation/screens/staff_main_screen.dart';

/// Resolves post-login home from an API role string.
Widget homeScreenForRole(String rawRole) {
  final role = rawRole.toUpperCase().trim();

  final isHospital = role == 'HOSPITAL' ||
      role == 'ADMIN' ||
      role.contains('HOSPITAL') ||
      role.contains('ADMIN');
  if (isHospital) return const HospitalMainScreen();

  final isStaff = role == 'DOCTOR' ||
      role == 'NURSE' ||
      role.contains('DOCTOR') ||
      role.contains('NURSE');
  if (isStaff) return const StaffMainScreen();

  return const PatientMainScreen();
}

String staffRoleLabel(String rawRole) {
  final role = rawRole.toUpperCase().trim();
  if (role.contains('DOCTOR')) return 'Doctor';
  if (role.contains('NURSE')) return 'Nurse';
  return rawRole.isEmpty ? 'Staff' : rawRole;
}
