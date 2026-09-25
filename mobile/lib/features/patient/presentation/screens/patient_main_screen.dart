import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'patient_dashboard_screen.dart';
import 'patient_appointments_screen.dart';
import 'patient_history_screen.dart';
import 'patient_feedback_screen.dart';
import 'patient_profile_screen.dart';
import '../widgets/appointment_card.dart';
import '../../data/repositories/appointment_repository.dart';

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
                    isPaid: b.isPaid,
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
      ),
      const PatientHistoryScreen(),
      const PatientFeedbackScreen(),
      const PatientProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  index: 0,
                  icon: Icons.dashboard_outlined,
                  activeIcon: Icons.dashboard_rounded,
                  label: 'Home',
                ),
                _buildNavItem(
                  index: 1,
                  icon: Icons.calendar_today_outlined,
                  activeIcon: Icons.calendar_month_rounded,
                  label: 'Bookings',
                  badgeCount: _appointments.where((a) => a.status.toLowerCase() != 'completed').length,
                ),
                _buildNavItem(
                  index: 2,
                  icon: Icons.verified_user_outlined,
                  activeIcon: Icons.verified_user_rounded,
                  label: 'History',
                ),
                _buildNavItem(
                  index: 3,
                  icon: Icons.rate_review_outlined,
                  activeIcon: Icons.rate_review_rounded,
                  label: 'Feedback',
                ),
                _buildNavItem(
                  index: 4,
                  icon: Icons.person_outline,
                  activeIcon: Icons.person_rounded,
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    int? badgeCount,
  }) {
    final isSelected = _currentIndex == index;

    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.brandBlue.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isSelected ? activeIcon : icon,
                  size: 22,
                  color: isSelected ? AppColors.brandBlue : AppColors.textMuted,
                ),
                if (badgeCount != null && badgeCount > 0)
                  Positioned(
                    top: -4,
                    right: -8,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppColors.brandBlue,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        badgeCount.toString(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.brandBlue : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
