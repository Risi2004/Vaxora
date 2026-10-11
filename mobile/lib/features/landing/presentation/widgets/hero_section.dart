import 'package:flutter/material.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class HeroSection extends StatelessWidget {
  final VoidCallback onBookClick;
  final VoidCallback? onSeeHow;

  const HeroSection({
    super.key,
    required this.onBookClick,
    this.onSeeHow,
  });

  static const _highlights = [
    'Verified staff',
    'Secure records',
    'AI booking help',
  ];

  static const _chips = [
    (Icons.calendar_month_outlined, 'Booking confirmed', 'Tomorrow, 09:30'),
    (Icons.vaccines_outlined, 'Next dose', 'Hepatitis B in 14 days'),
    (Icons.verified_user_outlined, 'Verified hospital', 'Ministry of Health'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.surfaceSubtle,
            Colors.white,
          ],
        ),
        border: const Border(
          bottom: BorderSide(color: AppColors.borderLight),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.infoBorder),
            ),
            child: const Text(
              'Vaccination made simple',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Vaccine booking and records for Sri Lanka',
            style: AppTextStyles.h1,
          ),
          const SizedBox(height: 12),
          const Text(
            'Book a vaccine online any time, get reminded when the next dose is due, and keep every record in one secure place.',
            style: AppTextStyles.subtitle1,
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ElevatedButton(
                onPressed: onBookClick,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Book vaccine',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
              ),
              if (onSeeHow != null)
                OutlinedButton(
                  onPressed: onSeeHow,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.borderCard),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 22,
                      vertical: 14,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'See how it works',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: _highlights
                .map(
                  (item) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        item,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textBody,
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 28),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              AppAssets.heroVaccine,
              fit: BoxFit.cover,
              height: 240,
              width: double.infinity,
            ),
          ),
          const SizedBox(height: 14),
          ..._chips.map(
            (chip) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.infoBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(chip.$1, size: 18, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            chip.$2,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textTitle,
                            ),
                          ),
                          Text(
                            chip.$3,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textMuted,
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
