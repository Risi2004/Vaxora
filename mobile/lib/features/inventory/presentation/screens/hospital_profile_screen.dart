import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/storage_service.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../staff/presentation/widgets/network_avatar.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';

class HospitalProfileScreen extends StatefulWidget {
  const HospitalProfileScreen({super.key});

  @override
  State<HospitalProfileScreen> createState() => _HospitalProfileScreenState();
}

class _HospitalProfileScreenState extends State<HospitalProfileScreen> {
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final u = await StorageService.getUser();
    if (mounted) {
      setState(() {
        _user = u;
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    await AuthRepository.logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  String? get _photo => resolveMediaUrl(
        _user?['profilePhotoUrl']?.toString() ??
            _user?['logoUrl']?.toString() ??
            _user?['photoUrl']?.toString(),
      );

  @override
  Widget build(BuildContext context) {
    final name = _user?['name']?.toString() ?? 'Hospital';

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'Profile',
        actions: [
          StaffHeaderAction(
            icon: Icons.refresh,
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
          ),
        ],
      ),
      body: _loading
          ? Center(
              child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: StaffSurfaces.card(),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: StaffSurfaces.cardBorder),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: NetworkAvatar(
                          url: _photo,
                          size: 72,
                          fallback: Container(
                            color: StaffSurfaces.softPanelDeep,
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.local_hospital,
                              color: StaffSurfaces.brandSoft,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _user?['email']?.toString() ?? '',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: StaffSurfaces.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      StaffStatusChip(
                        label: _user?['status']?.toString() ?? 'Active',
                        tone: StaffChipTone.success,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                const StaffSectionHeader(title: 'Account details'),
                _InfoTile(
                  icon: Icons.badge_outlined,
                  label: 'Registration number',
                  value: _user?['registrationNumber']?.toString() ?? 'N/A',
                ),
                _InfoTile(
                  icon: Icons.phone_outlined,
                  label: 'Phone',
                  value: _user?['phoneNumber']?.toString() ?? 'N/A',
                ),
                _InfoTile(
                  icon: Icons.apartment_outlined,
                  label: 'Role',
                  value: _user?['role']?.toString() ?? 'HOSPITAL',
                ),
                _InfoTile(
                  icon: Icons.verified_user_outlined,
                  label: 'Status',
                  value: _user?['status']?.toString() ?? 'Active',
                ),
                const SizedBox(height: 18),
                const StaffSectionHeader(title: 'Session'),
                OutlinedButton.icon(
                  onPressed: _logout,
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Log out'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: StaffSurfaces.dangerBorder),
                    backgroundColor: AppColors.errorBg,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Row(
        children: [
          Icon(icon, size: 18, color: StaffSurfaces.brandSoft),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                color: StaffSurfaces.textSecondary,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: StaffSurfaces.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
