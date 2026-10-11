import 'package:flutter/material.dart';

class AppColors {
  // Brand & Primary
  static const Color primary = Color(0xFF0077B6);
  static const Color primaryHover = Color(0xFF00689F);
  static const Color primaryDark = Color(0xFF03045E);
  static const Color primaryDeep = Color(0xFF03045E);
  static const Color brandBlue = Color(0xFF023E8A);
  static const Color accent = Color(0xFF0077B6);
  static const Color accentTeal = Color(0xFF0077B6);

  // Background & Surfaces
  static const Color background = Color(0xFFF7F8FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF5F7F9);
  static const Color inputBg = Color(0xFFF9FAFB);
  static const Color inputAuthBg = Color(0xFFF9FAFB);

  // Borders
  static const Color borderLight = Color(0xFFE6E9ED);
  static const Color borderCard = Color(0xFFDDE2E8);
  static const Color borderPill = Color(0xFFDDE2E8);
  static const Color borderFocus = Color(0xFF0077B6);
  static const Color borderAuthCard = Color(0xFFDDE2E8);
  static const Color borderAuthInput = Color(0xFFD3D9E0);

  // Typography
  static const Color textTitle = Color(0xFF03045E);
  static const Color textSubtitle = Color(0xFF0077B6);
  static const Color textBody = Color(0xFF3A4660);
  static const Color textMuted = Color(0xFF5B6680);
  static const Color textPlaceholder = Color(0xFF8A96A0);
  static const Color textInverse = Color(0xFFFFFFFF);

  // Status
  static const Color success = Color(0xFF15803D);
  static const Color successBg = Color(0xFFEFFAF2);
  static const Color successBorder = Color(0xFFBFE5CB);
  static const Color error = Color(0xFFB54743);
  static const Color errorBg = Color(0xFFFFF1EF);
  static const Color errorBorder = Color(0xFFFECACA);
  static const Color info = Color(0xFF0077B6);
  static const Color infoBg = Color(0xFFEEF9FC);
  static const Color infoBorder = Color(0xFFCAF0F8);
  static const Color warning = Color(0xFFA35D08);
  static const Color warningBg = Color(0xFFFFF4E5);
  static const Color warningBorder = Color(0xFFF5B168);

  // AI assistant accents
  static const Color ai = Color(0xFF6D5BAE);
  static const Color aiBg = Color(0xFFEDE9F8);
  static const Color aiBorder = Color(0xFFDCD4F0);

  // Star ratings
  static const Color rating = Color(0xFFF59E0B);

  // Gradients
  static const LinearGradient authButtonGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF0077B6),
      Color(0xFF0077B6),
    ],
  );
}
