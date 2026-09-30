import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../../staff/presentation/widgets/network_avatar.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../../data/models/shift_swap_request_model.dart';

class CoverRequestCard extends StatefulWidget {
  final ShiftSwapRequestModel request;
  final bool busy;
  final void Function(String affiliationId)? onApprove;
  final VoidCallback? onDecline;

  const CoverRequestCard({
    super.key,
    required this.request,
    this.busy = false,
    this.onApprove,
    this.onDecline,
  });

  @override
  State<CoverRequestCard> createState() => _CoverRequestCardState();
}

class _CoverRequestCardState extends State<CoverRequestCard> {
  String? _selectedAffiliationId;

  ShiftSwapRequestModel get request => widget.request;

  String get _initials {
    final parts = request.requesterName
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      final w = parts.first;
      return w.substring(0, w.length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  Widget _avatarFallback({double size = 13}) {
    return Container(
      color: StaffSurfaces.softPanelDeep,
      alignment: Alignment.center,
      child: Text(
        _initials,
        style: TextStyle(
          fontSize: size,
          fontWeight: FontWeight.w700,
          color: StaffSurfaces.brandSoft,
        ),
      ),
    );
  }

  StaffStatusChip get _statusChip {
    if (request.isApproved) {
      return const StaffStatusChip(
        label: 'Approved',
        tone: StaffChipTone.success,
        icon: Icons.check_circle_outline,
      );
    }
    if (request.isDeclined) {
      return const StaffStatusChip(
        label: 'Declined',
        tone: StaffChipTone.danger,
        icon: Icons.highlight_off,
      );
    }
    return const StaffStatusChip(
      label: 'Needs review',
      tone: StaffChipTone.warning,
      icon: Icons.hourglass_top_outlined,
    );
  }

  String? get _note {
    final reason = request.reason?.trim();
    if (reason != null && reason.isNotEmpty) return reason;
    final snippet = request.conversationSnippet?.trim();
    if (snippet != null && snippet.isNotEmpty) return snippet;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final note = _note;
    final suggestions = request.suggestions.where((s) => s.available).toList();
    final hasCover = suggestions.any((s) => s.available);
    final canApprove = request.isPending &&
        hasCover &&
        _selectedAffiliationId != null;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: StaffSurfaces.cardBorder),
                ),
                clipBehavior: Clip.antiAlias,
                child: NetworkAvatar(
                  url: request.requesterPhotoUrl,
                  size: 46,
                  fallback: _avatarFallback(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            request.requesterName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: StaffSurfaces.textPrimary,
                            ),
                          ),
                        ),
                        _statusChip,
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      staffRoleLabel(request.requesterRole),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: StaffSurfaces.brandSoft,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      request.shiftLine,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: StaffSurfaces.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (note != null) ...[
            const SizedBox(height: 10),
            Text(
              note,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                height: 1.4,
                color: StaffSurfaces.textPrimary,
              ),
            ),
          ],
          if (request.isPending) ...[
            const SizedBox(height: 12),
            _ReviewBanner(
              summary: request.reviewSummary ??
                  (suggestions.isEmpty
                      ? 'No other staff of this role on the roster.'
                      : hasCover
                          ? 'Pick who should take this shift.'
                          : 'No one is free in this window.'),
            ),
            if (suggestions.isNotEmpty) ...[
              const SizedBox(height: 8),
              ...suggestions.map(
                (s) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _ReplacementTile(
                    replacement: s,
                    selected: _selectedAffiliationId == s.affiliationId,
                    onTap: widget.busy || !s.available
                        ? null
                        : () => setState(
                              () => _selectedAffiliationId = s.affiliationId,
                            ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: widget.busy ? null : widget.onDecline,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: StaffSurfaces.dangerBorder),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text(
                      'Decline',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: widget.busy || !canApprove
                        ? null
                        : () => widget.onApprove?.call(_selectedAffiliationId!),
                    style: FilledButton.styleFrom(
                      backgroundColor: StaffSurfaces.cta,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: StaffSurfaces.softPanelDeep,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: widget.busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            hasCover ? 'Assign' : 'No cover',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ReviewBanner extends StatelessWidget {
  final String summary;

  const _ReviewBanner({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: StaffSurfaces.softPanel,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: StaffSurfaces.cardBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.auto_awesome, size: 16, color: StaffSurfaces.brandSoft),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              summary,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.35,
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReplacementTile extends StatelessWidget {
  final ShiftSwapReplacementModel replacement;
  final bool selected;
  final VoidCallback? onTap;

  const _ReplacementTile({
    required this.replacement,
    required this.selected,
    this.onTap,
  });

  String get _initials {
    final parts = replacement.staffName
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      final w = parts.first;
      return w.substring(0, w.length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = replacement.available;
    return Opacity(
      opacity: enabled ? 1 : 0.55,
      child: Material(
        color: selected ? StaffSurfaces.softPanel : StaffSurfaces.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: selected ? StaffSurfaces.accentBar : StaffSurfaces.cardBorder,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: StaffSurfaces.cardBorder),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: NetworkAvatar(
                    url: replacement.staffPhotoUrl,
                    size: 36,
                    fallback: Container(
                      color: StaffSurfaces.softPanelDeep,
                      alignment: Alignment.center,
                      child: Text(
                        _initials,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.brandSoft,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        replacement.staffName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        replacement.why,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: StaffSurfaces.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  selected ? Icons.radio_button_checked : Icons.radio_button_off,
                  size: 20,
                  color: selected
                      ? StaffSurfaces.cta
                      : StaffSurfaces.textMutedSoft,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
