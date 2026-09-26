import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class StatItem {
  final String iconPath;
  final String highlight;
  final String subtext;

  const StatItem({
    required this.iconPath,
    required this.highlight,
    required this.subtext,
  });
}

class StatsSection extends StatelessWidget {
  const StatsSection({super.key});

  static const List<StatItem> stats = [
    StatItem(
      iconPath: AppAssets.badgeExperience,
      highlight: '5 years experience',
      subtext: 'Since 2019',
    ),
    StatItem(
      iconPath: AppAssets.networkMembers,
      highlight: '10K plus',
      subtext: 'members',
    ),
    StatItem(
      iconPath: AppAssets.hospitalDoctors,
      highlight: '20+ hospitals',
      subtext: '60+ doctors',
    ),
    StatItem(
      iconPath: AppAssets.chartReviews,
      highlight: '2K plus',
      subtext: 'Reviews',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Portal Impact & Reach',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: stats.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              childAspectRatio: 1.15,
            ),
            itemBuilder: (context, index) {
              final item = stats[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: SvgPicture.asset(
                        item.iconPath,
                        width: 28,
                        height: 28,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      item.highlight,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textTitle,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.subtext,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
