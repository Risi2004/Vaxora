import 'package:flutter/material.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../widgets/appointment_card.dart';
import '../../data/repositories/appointment_repository.dart';
import 'patient_dashboard_screen.dart';
import 'patient_appointments_screen.dart';
import 'patient_history_screen.dart';
import 'patient_feedback_screen.dart';
import 'patient_profile_screen.dart';

class PatientMainScreen extends StatefulWidget {
  final int initialIndex;

  const PatientMainScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<PatientMainScreen> createState() => _PatientMainScreenState();
}

class _PatientMainScreenState extends State<PatientMainScreen> {
  late int _currentIndex;

  List<PatientAppointment> _appointments = [];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    try {
      final backendList = await AppointmentRepository.getMyAppointments();
      if (mounted) {
        setState(() {
          _appointments = backendList
              .map((b) => PatientAppointment(
                    id: b.referenceNumber ?? (b.id.length > 8 ? b.id.substring(0, 8) : b.id),
                    rawId: b.id,
                    vaccineName: b.vaccineName,
                    hospitalName: b.hospitalName,
                    location: 'Assigned Vaccination Center',
                    date: b.appointmentDate,
                    time: b.timeSlot,
                    doctorName: 'Medical Officer',
                    status: b.status,
                    fee: b.fee ?? 0.0,
                    isPaid: b.isPaid || b.status.toLowerCase() == 'confirmed' || b.status.toLowerCase() == 'completed',
                  ))
              .toList();
        });
      }
    } catch (_) {}
  }

  void _onAppointmentBooked(Map<String, dynamic> data) {
    _loadAppointments();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      PatientDashboardScreen(
        onNavigateTab: (tabIndex) => setState(() => _currentIndex = tabIndex),
        onAppointmentBooked: _onAppointmentBooked,
      ),
      PatientAppointmentsScreen(
        initialAppointments: _appointments,
        onAppointmentBooked: _onAppointmentBooked,
        onAppointmentsChanged: _loadAppointments,
      ),
      const PatientHistoryScreen(),
      const PatientFeedbackScreen(),
      const PatientProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: StaffBottomNav(
        index: _currentIndex,
        onSelect: (i) {
          setState(() => _currentIndex = i);
          if (i == 1) _loadAppointments();
        },
        destinations: [
          const StaffNavDestination(
            icon: Icons.dashboard_outlined,
            activeIcon: Icons.dashboard,
            label: 'Home',
          ),
          StaffNavDestination(
            icon: Icons.calendar_today_outlined,
            activeIcon: Icons.calendar_month,
            label: 'Bookings',
            badgeCount: _appointments.where(isUpcomingPatientAppointment).length,
          ),
          const StaffNavDestination(
            icon: Icons.verified_user_outlined,
            activeIcon: Icons.verified_user,
            label: 'History',
          ),
          const StaffNavDestination(
            icon: Icons.rate_review_outlined,
            activeIcon: Icons.rate_review,
            label: 'Feedback',
          ),
          const StaffNavDestination(
            icon: Icons.person_outline,
            activeIcon: Icons.person,
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
