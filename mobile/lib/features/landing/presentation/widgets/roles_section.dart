import 'package:flutter/material.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/theme/app_colors.dart';
import 'landing_section_head.dart';

class RolesSection extends StatelessWidget {
  final void Function(String action) onAction;

  const RolesSection({super.key, required this.onAction});

  static const _roles = [
    (
      'Patients and families',
      AppAssets.landingRolePatient,
      ['Book appointments', 'View vaccination history', 'Get a care plan'],
      'Sign up free',
      'signup',
    ),
    (
      'Doctors',
      AppAssets.landingRoleDoctor,
      ['Run the booth queue', 'Prescribe vaccines', 'Report reactions'],
      'Doctor log in',
      'login',
    ),
    (
      'Nurses',
      AppAssets.landingRoleNurse,
      ['Administer doses', 'Record observations', 'Check patient history'],
      'Nurse log in',
      'login',
    ),
    (
      'Hospitals',
      AppAssets.landingRoleHospital,
      ['Manage staff and rosters', 'Set up booths', 'Track vaccine stock'],
      'Register a hospital',
      'signup-hospital',
    ),
    (
      'Ministry admins',
      AppAssets.landingRoleAdmin,
      ['Verify staff and hospitals', 'Review audit logs', 'Read feedback'],
      'Admin log in',
      'login',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceSubtle,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingSectionHead(
            eyebrow: 'Built for every role',
            title: 'Vaxora is right for everyone in the visit',
            lead: 'Each person signs in to a workspace made for their job.',
          ),
          ..._roles.map(
            (role) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderLight),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Image.asset(
                      role.$2,
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            role.$1,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textTitle,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...role.$3.map(
                            (task) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                '• $task',
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  color: AppColors.textBody,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: () => onAction(role.$5),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              padding: EdgeInsets.zero,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  role.$4,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward, size: 14),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
