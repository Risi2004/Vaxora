import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../../../core/network/api_constants.dart';
import '../../../../core/theme/app_colors.dart';

/// Turns API photo paths into a browser-loadable absolute URL.
String? resolveMediaUrl(String? raw) {
  final url = raw?.trim();
  if (url == null || url.isEmpty || url.toLowerCase() == 'null') return null;
  if (url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:')) {
    return url;
  }

  final origin = ApiConstants.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');
  if (url.startsWith('/')) return '$origin$url';
  // Bare R2 object keys occasionally stored without host.
  if (url.contains('/')) return '$origin/$url';
  return '$origin/$url';
}

/// Profile / logo image that works on Flutter web (HTML img avoids CORS canvas fails).
class NetworkAvatar extends StatelessWidget {
  final String? url;
  final double size;
  final Widget fallback;
  final BoxFit fit;

  const NetworkAvatar({
    super.key,
    required this.url,
    required this.size,
    required this.fallback,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    final resolved = resolveMediaUrl(url);
    if (resolved == null) return SizedBox(width: size, height: size, child: fallback);

    return Image.network(
      resolved,
      width: size,
      height: size,
      fit: fit,
      gaplessPlayback: true,
      filterQuality: FilterQuality.medium,
      // Critical on Chrome/web: CanvasKit CORS blocks R2/API images; HTML <img> does not.
      webHtmlElementStrategy: kIsWeb
          ? WebHtmlElementStrategy.prefer
          : WebHtmlElementStrategy.never,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          width: size,
          height: size,
          // Matches StaffSurfaces.softPanelDeep
          color: const Color(0xFFDCEAF7),
          alignment: Alignment.center,
          child: SizedBox(
            width: size * 0.28,
            height: size * 0.28,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.brandBlue.withValues(alpha: 0.88),
            ),
          ),
        );
      },
      errorBuilder: (_, _, _) => SizedBox(
        width: size,
        height: size,
        child: fallback,
      ),
    );
  }
}
