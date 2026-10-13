import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class CtaSection extends StatelessWidget {
  final VoidCallback onSignup;
  final VoidCallback onLogin;

  const CtaSection({
    super.key,
    required this.onSignup,
    required this.onLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.brandBlue,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            const Text(
              'Ready for your next dose?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Create a free account and book in a few minutes.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14.5,
                height: 1.45,
                color: Color(0xFFB8DED9),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onSignup,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.brandBlue,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Create free account',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onLogin,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white70),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Log in',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
