import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class StaffErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;

  const StaffErrorBanner({
    super.key,
    required this.message,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.error,
              ),
            ),
          ),
          IconButton(
            onPressed: onDismiss,
            icon: const Icon(Icons.close, size: 18, color: AppColors.error),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

class StaffEmptyCard extends StatelessWidget {
  final String message;

  const StaffEmptyCard({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Text(
        message,
        style: const TextStyle(
          fontSize: 13,
          color: AppColors.textMuted,
          height: 1.4,
        ),
      ),
    );
  }
}

class StaffHospitalAvatar extends StatelessWidget {
  final String? logoUrl;
  final double size;

  const StaffHospitalAvatar({
    super.key,
    this.logoUrl,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    final url = logoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          url,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback(),
        ),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.brandBlue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(
        Icons.local_hospital,
        color: AppColors.brandBlue,
        size: size * 0.5,
      ),
    );
  }
}
