import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'landing_section_head.dart';

class FaqSection extends StatelessWidget {
  const FaqSection({super.key});

  static const _faqs = [
    (
      'Who can use Vaxora?',
      'Anyone in Sri Lanka can sign up as a patient. Doctors, nurses and hospitals register separately and are verified before they get access.',
    ),
    (
      'How are doctors and nurses verified?',
      'A Ministry of Health admin checks each registration and its licence details before approving the account.',
    ),
    (
      'Can I cancel an appointment?',
      'Yes. Open Appointments in your patient portal and cancel any booking that has not started yet.',
    ),
    (
      'Where can I see my past vaccinations?',
      'Your vaccination history page lists every dose, with the date, vaccine and hospital.',
    ),
    (
      'Who can see my health records?',
      'Only you and the staff treating you. Access is limited by role, and admin actions are recorded in an audit log.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingSectionHead(
            eyebrow: 'FAQ',
            title: 'Common questions',
          ),
          ..._faqs.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.symmetric(horizontal: 14),
                  childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  backgroundColor: AppColors.surfaceSubtle,
                  collapsedBackgroundColor: AppColors.surfaceSubtle,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: AppColors.borderLight),
                  ),
                  collapsedShape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: AppColors.borderLight),
                  ),
                  title: Text(
                    item.$1,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textTitle,
                    ),
                  ),
                  children: [
                    Text(
                      item.$2,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.5,
                        color: AppColors.textBody,
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
