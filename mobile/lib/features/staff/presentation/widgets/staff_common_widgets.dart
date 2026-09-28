import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'network_avatar.dart';

/// Soft staff UI tokens — use these everywhere for consistency.
///
/// Rules of thumb:
/// - Surfaces / text → pageBg, card*, softPanel*, text*
/// - Icons, refresh, loaders, stats → brandSoft
/// - Primary CTAs only → cta (full brand blue)
/// - Destructive / success → AppColors.error / success (semantic only)
class StaffSurfaces {
  static const Color pageBg = Color(0xFFF5F8FC);
  static const Color cardBg = Color(0xFFF8FBFE);
  static const Color cardBorder = Color(0xFFD7E6F5);
  static const Color softPanel = Color(0xFFE8F1FA);
  static const Color softPanelDeep = Color(0xFFDCEAF7);
  static const Color accentBar = Color(0xFF9BB8D9);
  static const Color textPrimary = Color(0xFF1E3A5F);
  static const Color textSecondary = Color(0xFF6B7C93);
  static const Color textMutedSoft = Color(0xFF8A97A8);
  static const Color appBarBg = Color(0xFFFFFFFF);
  static const Color divider = Color(0xFFE8EEF5);
  static const Color chipNeutralBg = Color(0xFFEEF2F7);
  static const Color chipNeutralBorder = Color(0xFFDCE4EE);
  static const Color dangerBorder = Color(0xFFFECACA);
  static const double cardRadius = 14;

  /// Soft brand for chrome (icons, loaders, accents).
  static Color get brandSoft =>
      AppColors.brandBlue.withValues(alpha: 0.88);

  /// Full brand for primary filled buttons only.
  static const Color cta = AppColors.brandBlue;

  static Color get navSelected => cta;
  static const Color navIdle = textMutedSoft;
  static Color get navSelectedBg => cta.withValues(alpha: 0.1);

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: textPrimary.withValues(alpha: 0.04),
          blurRadius: 10,
          offset: const Offset(0, 3),
        ),
      ];

  static BoxDecoration card({Color? color, Color? borderColor}) {
    return BoxDecoration(
      color: color ?? cardBg,
      borderRadius: BorderRadius.circular(cardRadius),
      border: Border.all(color: borderColor ?? cardBorder),
      boxShadow: cardShadow,
    );
  }

  static BoxDecoration softWell() {
    return BoxDecoration(
      color: softPanel,
      borderRadius: BorderRadius.circular(cardRadius),
      border: Border.all(color: cardBorder),
    );
  }

  static PreferredSizeWidget appBar({
    required String title,
    List<Widget>? actions,
  }) {
    return AppBar(
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: textPrimary,
        ),
      ),
      centerTitle: false,
      backgroundColor: appBarBg,
      elevation: 0,
      scrolledUnderElevation: 0,
      iconTheme: IconThemeData(color: brandSoft),
      actionsIconTheme: IconThemeData(color: brandSoft),
      actions: actions,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, thickness: 1, color: divider),
      ),
    );
  }
}

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
        borderRadius: BorderRadius.circular(12),
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
  final IconData icon;
  final bool compact;

  const StaffEmptyCard({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: StaffSurfaces.card(),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: StaffSurfaces.softPanelDeep,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: StaffSurfaces.brandSoft, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: StaffSurfaces.textSecondary,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: StaffSurfaces.card(),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: StaffSurfaces.brandSoft, size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: StaffSurfaces.textSecondary,
              height: 1.45,
            ),
          ),
        ],
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
        borderRadius: BorderRadius.circular(12),
        child: NetworkAvatar(
          url: url,
          size: size,
          fallback: _fallback(),
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
        color: StaffSurfaces.softPanelDeep,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: StaffSurfaces.cardBorder),
      ),
      child: Icon(
        Icons.local_hospital_outlined,
        color: StaffSurfaces.brandSoft,
        size: size * 0.48,
      ),
    );
  }
}

class StaffStatusChip extends StatelessWidget {
  final String label;
  final bool positive;

  const StaffStatusChip({
    super.key,
    required this.label,
    this.positive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: positive
            ? StaffSurfaces.softPanelDeep
            : StaffSurfaces.chipNeutralBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: positive
              ? StaffSurfaces.cardBorder
              : StaffSurfaces.chipNeutralBorder,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: positive
              ? StaffSurfaces.brandSoft
              : StaffSurfaces.textSecondary,
        ),
      ),
    );
  }
}

/// Landing-only hero: soft blue wash + light geometry (no photo).
class StaffHeroBanner extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final List<String> pills;

  const StaffHeroBanner({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.pills = const [],
  });

  @override
  Widget build(BuildContext context) {
    // Clear soft sky-blue — obvious against pageBg, not washed out / not navy.
    const bgDeep = Color(0xFF7FA4C4);
    const bgMid = Color(0xFF8FB2CF);
    const bgLight = Color(0xFFA3C0D9);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF6E96B8)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF3E5F7C).withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [bgDeep, bgMid, bgLight],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(
          height: 200,
          width: double.infinity,
          child: Stack(
            children: [
              Positioned(
                right: -30,
                top: -36,
                child: Container(
                  width: 150,
                  height: 150,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.22),
                  ),
                ),
              ),
              Positioned(
                right: 48,
                bottom: -40,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.14),
                  ),
                ),
              ),
              Positioned(
                left: -18,
                bottom: 20,
                child: Transform.rotate(
                  angle: -0.35,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      color: Colors.white.withValues(alpha: 0.16),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eyebrow,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: Colors.white.withValues(alpha: 0.88),
                      ),
                    ),
                    if (pills.isNotEmpty) ...[
                      const Spacer(),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: pills
                            .map(
                              (p) => Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.22),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Text(
                                  p,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
