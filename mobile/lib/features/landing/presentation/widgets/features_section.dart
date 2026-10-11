import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'landing_section_head.dart';

class FeaturesSection extends StatelessWidget {
  const FeaturesSection({super.key});

  static const _features = [
    (
      Icons.calendar_month_outlined,
      'Online booking',
      'Pick a hospital, a vaccine and a time slot in a few taps.',
      null,
    ),
    (
      Icons.smart_toy_outlined,
      'AI booking assistant',
      'Book by chatting. The assistant finds an open slot for you.',
      'New',
    ),
    (
      Icons.assignment_outlined,
      'Vaccination history',
      'Every dose you receive is saved to one record you can view any time.',
      null,
    ),
    (
      Icons.shield_outlined,
      'Personal care plan',
      'See which vaccines are due next, based on your own history.',
      null,
    ),
    (
      Icons.vaccines_outlined,
      'Clinic workflow',
      'Doctors and nurses run the booth queue and record each dose.',
      null,
    ),
    (
      Icons.inventory_2_outlined,
      'Stock and staff',
      'Hospitals track vaccine batches, booths and staff rosters.',
      null,
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
            eyebrow: 'Features',
            title: 'Everything a vaccination visit needs',
            lead:
                'One system for booking, the clinic visit and the record that follows.',
          ),
          ..._features.map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.infoBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(f.$1, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            f.$2,
                            style: const TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textTitle,
                            ),
                          ),
                        ),
                        if (f.$4 != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.aiBg,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              f.$4!,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.ai,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      f.$3,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.45,
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
