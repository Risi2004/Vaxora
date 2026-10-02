import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../auth/data/models/user_model.dart';
import '../widgets/staff_common_widgets.dart';
import '../widgets/network_avatar.dart';

class StaffProfileScreen extends StatefulWidget {
  const StaffProfileScreen({super.key});

  @override
  State<StaffProfileScreen> createState() => _StaffProfileScreenState();
}

class _StaffProfileScreenState extends State<StaffProfileScreen> {
  UserModel? _user;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  String? _photoUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String? _resolvePhotoUrl(String? raw) => resolveMediaUrl(raw);

  String? _photoFromMap(Map<String, dynamic>? map) {
    if (map == null) return null;
    return _resolvePhotoUrl(UserModel.fromJson(map).profilePhotoUrl);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    // Show cached photo immediately if we have one.
    final cached = await StorageService.getUser();
    if (mounted && cached != null) {
      setState(() {
        _user = UserModel.fromJson(cached);
        _photoUrl = _photoFromMap(cached);
      });
    }

    try {
      final user = await AuthRepository.getCurrentUser(forceRefresh: true);
      final fresh = await StorageService.getUser();
      if (!mounted) return;
      setState(() {
        _user = user ?? _user;
        _photoUrl = _photoFromMap(fresh) ??
            _resolvePhotoUrl(user?.profilePhotoUrl) ??
            _photoUrl;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Could not refresh profile.';
        _photoUrl ??= _photoFromMap(cached);
      });
    }
  }

  Future<void> _editProfile() async {
    if (_user == null) return;
    final nameCtrl = TextEditingController(text: _user!.name);
    final phoneCtrl = TextEditingController(text: _user!.phoneNumber ?? '');

    final saved = await showDialog<bool>(
      context: context,
      barrierColor: StaffSurfaces.textPrimary.withValues(alpha: 0.35),
      builder: (ctx) {
        InputDecoration fieldDecoration(String label) {
          return InputDecoration(
            labelText: label,
            labelStyle: const TextStyle(
              color: StaffSurfaces.textSecondary,
              fontWeight: FontWeight.w500,
            ),
            filled: true,
            fillColor: StaffSurfaces.softPanel,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  BorderSide(color: StaffSurfaces.brandSoft, width: 1.4),
            ),
          );
        }

        return Dialog(
          backgroundColor: StaffSurfaces.appBarBg,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 28),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: StaffSurfaces.cardBorder),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Edit profile',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Update your name and phone number.',
                  style: TextStyle(
                    fontSize: 13,
                    color: StaffSurfaces.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: nameCtrl,
                  textInputAction: TextInputAction.next,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.textPrimary,
                  ),
                  decoration: fieldDecoration('Full name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.textPrimary,
                  ),
                  decoration: fieldDecoration('Phone'),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        style: TextButton.styleFrom(
                          foregroundColor: StaffSurfaces.textSecondary,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        style: FilledButton.styleFrom(
                          backgroundColor: StaffSurfaces.cta,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Save',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    final name = nameCtrl.text.trim();
    final phone = phoneCtrl.text.trim();
    nameCtrl.dispose();
    phoneCtrl.dispose();
    if (saved != true) return;

    setState(() => _saving = true);
    try {
      final updated = await AuthRepository.updateProfile(
        fullName: name.isEmpty ? null : name,
        phoneNumber: phone,
      );
      final fresh = await StorageService.getUser();
      if (!mounted) return;
      setState(() {
        _user = updated;
        _photoUrl = _photoFromMap(fresh) ??
            _resolvePhotoUrl(updated.profilePhotoUrl) ??
            _photoUrl;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiException ? e.message : 'Failed to update profile.',
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
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

  String get _roleLabel {
    final raw = _user?.role ?? '';
    final label = staffRoleLabel(raw);
    return label == 'Staff' && raw.isNotEmpty ? raw : label;
  }

  String get _initials {
    final name = _user?.name ?? '';
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'V';
    if (parts.length == 1) {
      final w = parts.first;
      return w.substring(0, w.length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  Widget _avatarFallback() {
    return Container(
      color: StaffSurfaces.softPanelDeep,
      alignment: Alignment.center,
      child: Text(
        _initials,
        style: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w700,
          color: StaffSurfaces.brandSoft,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final photo = _photoUrl ?? _resolvePhotoUrl(_user?.profilePhotoUrl);

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'My Profile',
        actions: [
          StaffHeaderAction(
            icon: Icons.edit_outlined,
            tooltip: 'Edit profile',
            onPressed:
                _loading || _saving || _user == null ? null : _editProfile,
          ),
          StaffHeaderAction(
            icon: Icons.refresh,
            tooltip: 'Refresh',
            onPressed: _loading || _saving ? null : _load,
          ),
        ],
      ),
      body: _loading
          ? Center(
              child:
                  CircularProgressIndicator(color: StaffSurfaces.brandSoft),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: StaffSurfaces.brandSoft,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
                children: [
                  if (_error != null) ...[
                    StaffErrorBanner(
                      message: _error!,
                      onDismiss: () => setState(() => _error = null),
                    ),
                    const SizedBox(height: 12),
                  ],
                  _ProfileCard(
                    photoUrl: photo,
                    fallback: _avatarFallback(),
                    name: _user?.name ?? 'Staff',
                    email: _user?.email ?? '',
                    roleLabel: _roleLabel,
                    status: _user?.status ?? 'Active',
                  ),
                  const SizedBox(height: 18),
                  StaffSectionHeader(title: 'Account details'),
                  _InfoTile(
                    icon: Icons.badge_outlined,
                    label: 'Registration number',
                    value: _user?.registrationNumber ?? 'N/A',
                  ),
                  _InfoTile(
                    icon: Icons.phone_outlined,
                    label: 'Phone',
                    value: _user?.phoneNumber?.trim().isNotEmpty == true
                        ? _user!.phoneNumber!
                        : 'Not set',
                  ),
                  _InfoTile(
                    icon: Icons.medical_services_outlined,
                    label: 'Role',
                    value: _roleLabel,
                    accent: AppColors.accentTeal,
                  ),
                  _InfoTile(
                    icon: Icons.verified_user_outlined,
                    label: 'Account status',
                    value: _user?.status ?? 'Active',
                    accent: (_user?.status ?? '').toLowerCase() == 'active'
                        ? AppColors.success
                        : null,
                  ),
                  const SizedBox(height: 18),
                  StaffSectionHeader(title: 'Session'),
                  OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout, size: 18),
                    label: const Text('Log out'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(
                          color: StaffSurfaces.dangerBorder),
                      backgroundColor: AppColors.errorBg,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      textStyle: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final String? photoUrl;
  final Widget fallback;
  final String name;
  final String email;
  final String roleLabel;
  final String status;

  const _ProfileCard({
    required this.photoUrl,
    required this.fallback,
    required this.name,
    required this.email,
    required this.roleLabel,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: StaffSurfaces.card(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: StaffSurfaces.cardBorder, width: 2),
              boxShadow: [
                BoxShadow(
                  color: StaffSurfaces.cta.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: ClipOval(
              child: NetworkAvatar(
                url: photoUrl,
                size: 72,
                fallback: fallback,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                    height: 1.2,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: StaffSurfaces.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    StaffStatusChip(
                      label: roleLabel,
                      tone: StaffChipTone.brand,
                      icon: Icons.medical_services,
                    ),
                    StaffStatusChip(
                      label: status,
                      tone: status.toLowerCase() == 'active'
                          ? StaffChipTone.success
                          : StaffChipTone.neutral,
                    ),
                  ],
                ),
              ],
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
  final Color? accent;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final color = accent ?? StaffSurfaces.brandSoft;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: StaffSurfaces.card(),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accent != null
                  ? color.withValues(alpha: 0.12)
                  : StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.textSecondary,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
