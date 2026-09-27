import 'package:flutter/material.dart';

class AppColors {
  // Brand & Primary
  static const Color primary = Color(0xFF1E40AF);
  static const Color primaryHover = Color(0xFF1D4ED8);
  static const Color primaryDark = Color(0xFF1E1B4B);
  static const Color primaryDeep = Color(0xFF160C40);
  static const Color brandBlue = Color(0xFF19469D);
  static const Color accent = Color(0xFF0284C7);
  static const Color accentTeal = Color(0xFF0D9488);

  // Background & Surfaces
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF8FAFC);
  static const Color inputBg = Color(0xFFF1F3F8);
  static const Color inputAuthBg = Color(0xFFEEE9F0);

  // Borders
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color borderCard = Color(0xFFCBD5E1);
  static const Color borderPill = Color(0xFFCBD5E1);
  static const Color borderFocus = Color(0xFF2563EB);
  static const Color borderAuthCard = Color(0xFF281966);
  static const Color borderAuthInput = Color(0xFF4A3E7A);

  // Typography
  static const Color textTitle = Color(0xFF1E1B4B);
  static const Color textSubtitle = Color(0xFF2563EB);
  static const Color textBody = Color(0xFF334155);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textPlaceholder = Color(0xFF71688C);
  static const Color textInverse = Color(0xFFFFFFFF);

  // Status
  static const Color success = Color(0xFF16A34A);
  static const Color successBg = Color(0xFFF0FDF4);
  static const Color error = Color(0xFFDC2626);
  static const Color errorBg = Color(0xFFFEF2F2);
  static const Color info = Color(0xFF0284C7);
  static const Color infoBg = Color(0xFFF0F9FF);

  // Gradients
  static const LinearGradient authButtonGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF2054B8),
      Color(0xFF174296),
    ],
  );
}
