import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';

class PatientProfileScreen extends StatefulWidget {
  const PatientProfileScreen({super.key});

  @override
  State<PatientProfileScreen> createState() => _PatientProfileScreenState();
}

class _PatientProfileScreenState extends State<PatientProfileScreen> {
  bool _isEditing = false;
  bool _isLoading = true;
  bool _isSaving = false;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _nicController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();

  String _registrationNumber = 'VAX-P-PENDING';
  String _status = 'ACTIVE';

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    setState(() => _isLoading = true);
    final user = await AuthRepository.getCurrentUser();
    if (user != null && mounted) {
      setState(() {
        _nameController.text = user.name;
        _emailController.text = user.email;
        if (user.phoneNumber != null) _phoneController.text = user.phoneNumber!;
        if (user.nicNumber != null) _nicController.text = user.nicNumber!;
        if (user.dateOfBirth != null) {
          _dobController.text = user.dateOfBirth!.split('T').first;
        }
        _registrationNumber = user.registrationNumber ?? 'VAX-P-PENDING';
        _status = user.status;
        _isLoading = false;
      });
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _nicController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    try {
      DateTime? parsedDob;
      if (_dobController.text.trim().isNotEmpty) {
        parsedDob = DateTime.tryParse(_dobController.text.trim());
      }

      await AuthRepository.updateProfile(
        fullName: _nameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        dateOfBirth: parsedDob,
      );

      if (mounted) {
        setState(() {
          _isEditing = false;
          _isSaving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text('Profile details updated successfully!'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text('Failed to update profile: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: StaffSurfaces.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(StaffSurfaces.cardRadius),
        ),
        title: const Text(
          'Log out?',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: StaffSurfaces.textPrimary,
          ),
        ),
        content: const Text(
          'You will need to sign in again to view your immunization account.',
          style: TextStyle(fontSize: 13.5, color: StaffSurfaces.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Stay',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textSecondary,
              ),
            ),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await AuthRepository.logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (context) => const LoginScreen()),
                (route) => false,
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
              elevation: 0,
            ),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'Profile',
        actions: [
          if (!_isLoading)
            _isSaving
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                : StaffHeaderAction(
                    icon: _isEditing ? Icons.check : Icons.edit_outlined,
                    tooltip: _isEditing ? 'Save' : 'Edit',
                    onPressed: () {
                      if (_isEditing) {
                        _handleSave();
                      } else {
                        setState(() => _isEditing = true);
                      }
                    },
                  ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
              children: [
                  // 1. Profile Avatar & Badges Header Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: StaffSurfaces.card(),
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            CircleAvatar(
                              radius: 44,
                              backgroundColor: StaffSurfaces.softPanelDeep,
                              child: Icon(
                                Icons.person,
                                size: 54,
                                color: StaffSurfaces.brandSoft,
                              ),
                            ),
                            if (_isEditing)
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: StaffSurfaces.cta,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _nameController.text.isNotEmpty ? _nameController.text : 'Patient Profile',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: StaffSurfaces.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'National Registration: $_registrationNumber',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: StaffSurfaces.brandSoft,
                          ),
                        ),
                        const SizedBox(height: 8),
                        StaffStatusChip(
                          label: _status,
                          tone: StaffChipTone.success,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Personal Information Fields
                  _buildSectionCard(
                    title: 'Personal Information',
                    icon: Icons.badge_outlined,
                    children: [
                      _buildField(label: 'Full Name', controller: _nameController, enabled: _isEditing),
                      const SizedBox(height: 12),
                      _buildField(label: 'NIC / Passport', controller: _nicController, enabled: false),
                      const SizedBox(height: 12),
                      _buildField(label: 'Date of Birth (YYYY-MM-DD)', controller: _dobController, enabled: _isEditing),
                      const SizedBox(height: 12),
                      _buildField(label: 'Email Address', controller: _emailController, enabled: false),
                      const SizedBox(height: 12),
                      _buildField(label: 'Contact Number', controller: _phoneController, enabled: _isEditing),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 3. Clinical & Health Profile
                  _buildSectionCard(
                    title: 'Medical & Clinical Registry',
                    icon: Icons.medical_services_outlined,
                    children: [
                      _buildStaticRow('Registry ID', _registrationNumber),
                      const Divider(color: StaffSurfaces.divider, height: 16),
                      _buildStaticRow('Account Status', _status),
                      const Divider(color: StaffSurfaces.divider, height: 16),
                      _buildStaticRow('Immunization Record', 'National Health Database Verified'),
                      const Divider(color: StaffSurfaces.divider, height: 16),
                      _buildStaticRow('Clinical Notes', 'Eligible for national immunization schedules'),
                    ],
                  ),
            const SizedBox(height: 16),

            // 4. Emergency Contact
            _buildSectionCard(
              title: 'Emergency Contact',
              icon: Icons.contact_phone_outlined,
              children: [
                _buildField(label: 'Contact Name & Relationship', controller: _emergencyNameController, enabled: _isEditing),
                const SizedBox(height: 12),
                _buildField(label: 'Emergency Phone', controller: _emergencyPhoneController, enabled: _isEditing),
              ],
            ),
            const SizedBox(height: 20),

            // 5. Action Buttons (Export & Logout)
            OutlinedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Exporting official citizen health dossier (.PDF)'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              icon: const Icon(Icons.file_download_outlined, size: 20),
              label: const Text('Export health pass (PDF)'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: StaffSurfaces.cardBorder),
                foregroundColor: StaffSurfaces.textPrimary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Log out'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.errorBg,
                foregroundColor: AppColors.error,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: StaffSurfaces.dangerBorder),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: StaffSurfaces.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: StaffSurfaces.brandSoft),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: StaffSurfaces.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    required bool enabled,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: StaffSurfaces.textSecondary,
          ),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          enabled: enabled,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: StaffSurfaces.textPrimary,
          ),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            fillColor: enabled ? StaffSurfaces.cardBg : StaffSurfaces.softPanel,
            filled: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: StaffSurfaces.brandSoft),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStaticRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: StaffSurfaces.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: StaffSurfaces.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
