import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
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
              borderSide: BorderSide(color: StaffSurfaces.brandSoft, width: 1.4),
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
      if (!mounted) return;
      final fresh = await StorageService.getUser();
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
    final label = staffRoleLabel(raw).toUpperCase();
    return label == 'STAFF' && raw.isEmpty ? 'STAFF' : label;
  }

  @override
  Widget build(BuildContext context) {
    final photo = _photoUrl ?? _resolvePhotoUrl(_user?.profilePhotoUrl);

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'Profile',
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading || _saving ? null : _load,
            icon: Icon(Icons.refresh, color: StaffSurfaces.brandSoft),
          ),
          IconButton(
            tooltip: 'Edit',
            onPressed: _loading || _saving || _user == null ? null : _editProfile,
            icon: Icon(Icons.edit_outlined, color: StaffSurfaces.brandSoft),
          ),
        ],
      ),
      body: _loading
          ? Center(
              child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null) ...[
                  StaffErrorBanner(
                    message: _error!,
                    onDismiss: () => setState(() => _error = null),
                  ),
                  const SizedBox(height: 12),
                ],
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: StaffSurfaces.card(),
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: StaffSurfaces.accentBar,
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: StaffSurfaces.cta.withValues(alpha: 0.08),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: NetworkAvatar(
                            url: photo,
                            size: 80,
                            fallback: _avatarFallback(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        _user?.name ?? 'Staff',
                        style: AppTextStyles.h3.copyWith(
                          color: StaffSurfaces.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _user?.email ?? '',
                        style: const TextStyle(
                          fontSize: 13,
                          color: StaffSurfaces.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      StaffStatusChip(label: _roleLabel, positive: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _infoTile(
                  'Registration Number',
                  _user?.registrationNumber ?? 'N/A',
                ),
                _infoTile('Phone', _user?.phoneNumber ?? 'N/A'),
                _infoTile('Role', _roleLabel),
                _infoTile('Status', _user?.status ?? 'Active'),
                const SizedBox(height: 16),
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
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _avatarFallback() {
    return Container(
      color: StaffSurfaces.softPanelDeep,
      child: Icon(
        Icons.medical_services_outlined,
        color: StaffSurfaces.brandSoft,
        size: 36,
      ),
    );
  }

  Widget _infoTile(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: StaffSurfaces.card(),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textSecondary,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
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
