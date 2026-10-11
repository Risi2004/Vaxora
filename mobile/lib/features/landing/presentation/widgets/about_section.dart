import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class AboutSection extends StatelessWidget {
  const AboutSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderLight, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.05),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('About the Portal', style: AppTextStyles.h2),
            const SizedBox(height: 14),
            const Text(
              'The Web-Based Vaccination Portal, crafted by SLIIT students, revolutionizes vaccination management in Sri Lanka. It provides secure, role-based access for patients, doctors, nurses, hospital administrators, and public health authorities. With features like online booking, record management, and real-time alerts, it ensures efficient coordination, data security, and timely healthcare delivery, supporting national immunization goals and enhancing accessibility for all citizens.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AppColors.textBody,
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
