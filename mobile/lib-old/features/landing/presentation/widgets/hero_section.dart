import 'package:flutter/material.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class HeroSection extends StatelessWidget {
  final VoidCallback onBookClick;

  const HeroSection({
    super.key,
    required this.onBookClick,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Headline
          const Text(
            'Book Your Vaccine In few Minutes',
            style: AppTextStyles.h1,
          ),
          const SizedBox(height: 12),

          // Subtitle
          const Text(
            'Streamlining healthcare with secure, accessible, and efficient vaccination management for all Sri Lankans',
            style: AppTextStyles.subtitle1,
          ),
          const SizedBox(height: 20),

          // CTA Button
          ElevatedButton(
            onPressed: onBookClick,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              elevation: 3,
              shadowColor: AppColors.primary.withValues(alpha: 0.4),
            ),
            child: const Text(
              'Book Vaccine',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 28),

          // Hero Media Card
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryDark.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                AppAssets.heroVaccine,
                fit: BoxFit.cover,
                height: 240,
                width: double.infinity,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
