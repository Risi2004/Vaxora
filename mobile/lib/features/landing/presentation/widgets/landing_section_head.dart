import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Shared section header matching the web landing `section-head`.
class LandingSectionHead extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String? lead;

  const LandingSectionHead({
    super.key,
    required this.eyebrow,
    required this.title,
    this.lead,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            eyebrow,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
              color: AppColors.brandBlue,
            ),
          ),
          const SizedBox(height: 8),
          Text(title, style: AppTextStyles.h2),
          if (lead != null) ...[
            const SizedBox(height: 8),
            Text(
              lead!,
              style: const TextStyle(
                fontSize: 14.5,
                height: 1.5,
                color: AppColors.textBody,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
