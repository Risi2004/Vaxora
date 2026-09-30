import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/repositories/staff_repository.dart';
import '../widgets/staff_common_widgets.dart';
import 'staff_affiliations_screen.dart';
import 'staff_appointments_screen.dart';
import 'staff_profile_screen.dart';
import 'staff_shifts_screen.dart';

class StaffMainScreen extends StatefulWidget {
  const StaffMainScreen({super.key});

  @override
  State<StaffMainScreen> createState() => _StaffMainScreenState();
}

class _StaffMainScreenState extends State<StaffMainScreen> {
  int _index = 0;
  int _pendingInvites = 0;

  @override
  void initState() {
    super.initState();
    _refreshPendingCount();
  }

  Future<void> _refreshPendingCount() async {
    try {
      final invites = await StaffRepository.getMyInvitations();
      if (!mounted) return;
      setState(() => _pendingInvites = invites.length);
    } catch (_) {}
  }

  void _onTabSelected(int i) {
    setState(() => _index = i);
    if (i == 2) _refreshPendingCount();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const StaffShiftsScreen(),
      const StaffAppointmentsScreen(),
      StaffAffiliationsScreen(onChanged: _refreshPendingCount),
      const StaffProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: StaffSurfaces.appBarBg,
          border: const Border(
            top: BorderSide(color: StaffSurfaces.divider, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: StaffSurfaces.textPrimary.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(
                  index: 0,
                  icon: Icons.calendar_month_outlined,
                  activeIcon: Icons.calendar_month,
                  label: 'Shifts',
                ),
                _navItem(
                  index: 1,
                  icon: Icons.event_note_outlined,
                  activeIcon: Icons.event_note,
                  label: 'Appts',
                ),
                _navItem(
                  index: 2,
                  icon: Icons.local_hospital_outlined,
                  activeIcon: Icons.local_hospital,
                  label: 'Hospitals',
                  badgeCount: _pendingInvites,
                ),
                _navItem(
                  index: 3,
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    int badgeCount = 0,
  }) {
    final selected = _index == index;
    final color =
        selected ? StaffSurfaces.navSelected : StaffSurfaces.navIdle;

    Widget iconWidget = Icon(
      selected ? activeIcon : icon,
      color: color,
      size: 22,
    );

    if (badgeCount > 0) {
      iconWidget = Badge(
        label: Text(badgeCount > 9 ? '9+' : '$badgeCount'),
        backgroundColor: AppColors.error,
        child: iconWidget,
      );
    }

    return InkWell(
      onTap: () => _onTabSelected(index),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? StaffSurfaces.navSelectedBg
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            iconWidget,
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
