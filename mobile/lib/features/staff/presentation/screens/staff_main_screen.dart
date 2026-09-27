import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/repositories/staff_repository.dart';
import 'staff_affiliations_screen.dart';
import 'staff_shifts_screen.dart';
import 'staff_profile_screen.dart';

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
    } catch (_) {
      // Keep last known count on transient errors.
    }
  }

  void _onTabSelected(int i) {
    setState(() => _index = i);
    if (i == 0) _refreshPendingCount();
  }

  Widget _badgeIcon({
    required IconData icon,
    required IconData selectedIcon,
    required bool selected,
    int count = 0,
  }) {
    final child = Icon(
      selected ? selectedIcon : icon,
      color: selected ? AppColors.brandBlue : null,
    );
    if (count <= 0) return child;

    return Badge(
      label: Text(count > 9 ? '9+' : '$count'),
      backgroundColor: AppColors.error,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      StaffAffiliationsScreen(onChanged: _refreshPendingCount),
      const StaffShiftsScreen(),
      const StaffProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _onTabSelected,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.brandBlue.withValues(alpha: 0.15),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          NavigationDestination(
            icon: _badgeIcon(
              icon: Icons.local_hospital_outlined,
              selectedIcon: Icons.local_hospital,
              selected: false,
              count: _pendingInvites,
            ),
            selectedIcon: _badgeIcon(
              icon: Icons.local_hospital_outlined,
              selectedIcon: Icons.local_hospital,
              selected: true,
              count: _pendingInvites,
            ),
            label: 'Hospitals',
          ),
          const NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month, color: AppColors.brandBlue),
            label: 'Shifts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.brandBlue),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
