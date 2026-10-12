import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'landing_section_head.dart';

class StepsSection extends StatelessWidget {
  const StepsSection({super.key});

  static const _steps = [
    (
      'Create an account',
      'Sign up with your details. It takes about a minute.',
      AppColors.primary,
      AppColors.infoBg,
    ),
    (
      'Book a slot',
      'Choose a hospital, a vaccine and a time that suits you.',
      AppColors.accent,
      AppColors.infoBg,
    ),
    (
      'Get vaccinated',
      'Visit the booth. Your record updates as soon as the dose is given.',
      AppColors.success,
      AppColors.successBg,
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
            eyebrow: 'How it works',
            title: 'Three steps to your next dose',
          ),
          ...List.generate(_steps.length, (index) {
            final step = _steps[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: step.$4,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: step.$3.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: step.$3,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${index + 1}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            step.$1,
                            style: TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              color: step.$3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            step.$2,
                            style: const TextStyle(
                              fontSize: 13.5,
                              height: 1.45,
                              color: AppColors.textBody,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
