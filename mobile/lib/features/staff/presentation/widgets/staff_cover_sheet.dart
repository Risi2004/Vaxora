import 'package:flutter/material.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../hospital_staff/data/models/shift_swap_request_model.dart';
import '../../data/repositories/shift_swap_repository.dart';
import 'network_avatar.dart';
import 'staff_common_widgets.dart';

/// Staff view of cover they asked for, and shifts assigned to them as cover.
class StaffCoverSheet extends StatefulWidget {
  const StaffCoverSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const StaffCoverSheet(),
    );
  }

  @override
  State<StaffCoverSheet> createState() => _StaffCoverSheetState();
}

class _StaffCoverSheetState extends State<StaffCoverSheet> {
  bool _loading = true;
  String? _error;
  List<ShiftSwapRequestModel> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await ShiftSwapRepository.listMine();
      if (!mounted) return;
      setState(() {
        _items = list;
        _loading = false;
      });
      await ShiftSwapRepository.markIncomingSeen(
        list.where((r) => r.isIncoming).map((r) => r.id),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException
            ? e.message
            : 'Failed to load cover requests.';
        _items = [];
      });
    }
  }

  List<ShiftSwapRequestModel> _sorted(Iterable<ShiftSwapRequestModel> rows) {
    final list = rows.toList();
    int rank(ShiftSwapRequestModel r) {
      if (r.isPending) return 0;
      if (r.isDeclined) return 1;
      return 2;
    }

    list.sort((a, b) {
      final byStatus = rank(a).compareTo(rank(b));
      if (byStatus != 0) return byStatus;
      final da = a.shiftDay;
      final db = b.shiftDay;
      if (da != null && db != null) return da.compareTo(db);
      return a.shiftDate.compareTo(b.shiftDate);
    });
    return list;
  }

  List<ShiftSwapRequestModel> get _incoming =>
      _sorted(_items.where((r) => r.isIncoming && r.isUpcoming));

  List<ShiftSwapRequestModel> get _outgoing =>
      _sorted(_items.where((r) => r.isOutgoing));

  bool get _empty => _incoming.isEmpty && _outgoing.isEmpty;

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.78;
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: StaffSurfaces.appBarBg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: StaffSurfaces.chipNeutralBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Cover',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: StaffSurfaces.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Refresh',
                    onPressed: _loading ? null : _load,
                    icon: Icon(Icons.refresh, color: StaffSurfaces.brandSoft),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: StaffSurfaces.textSecondary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: StaffSurfaces.divider),
            Expanded(
              child: _loading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: StaffSurfaces.brandSoft,
                      ),
                    )
                  : _error != null
                  ? ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        StaffErrorBanner(
                          message: _error!,
                          onDismiss: () => setState(() => _error = null),
                        ),
                      ],
                    )
                  : _empty
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: StaffEmptyCard(
                        icon: Icons.swap_horiz,
                        message: 'No cover activity yet. New assignments and requests will show here.',
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                      children: [
                        _Section(
                          title: 'Assigned to you',
                          hint: 'Shifts the hospital asked you to take',
                          count: _incoming.length,
                          accent: AppColors.success,
                        ),
                        const SizedBox(height: 8),
                        if (_incoming.isEmpty)
                          const StaffEmptyCard(
                            compact: true,
                            icon: Icons.event_available_outlined,
                            message: 'No upcoming cover shifts.',
                          )
                        else
                          ..._incoming.map(
                            (r) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _IncomingTile(request: r),
                            ),
                          ),
                        const SizedBox(height: 18),
                        _Section(
                          title: 'Your requests',
                          hint: 'Cover you asked the hospital to find',
                          count: _outgoing.length,
                          accent: const Color(0xFFB2660A),
                        ),
                        const SizedBox(height: 8),
                        if (_outgoing.isEmpty)
                          const StaffEmptyCard(
                            compact: true,
                            icon: Icons.hourglass_top_outlined,
                            message: 'No cover requests yet.',
                          )
                        else
                          ..._outgoing.map(
                            (r) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _OutgoingTile(request: r),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final String hint;
  final int count;
  final Color accent;

  const _Section({
    required this.title,
    required this.hint,
    required this.count,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
          width: 3,
          height: 28,
          decoration: BoxDecoration(
            color: accent,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: StaffSurfaces.textPrimary,
                ),
              ),
              Text(
                hint,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: StaffSurfaces.textMutedSoft,
                ),
              ),
            ],
          ),
        ),
        Text(
          '$count',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: accent,
          ),
        ),
      ],
    );
  }
}

String _initials(String name) {
  final parts = name
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

class _IncomingTile extends StatelessWidget {
  final ShiftSwapRequestModel request;
  const _IncomingTile({required this.request});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: StaffSurfaces.card(
        color: AppColors.successBg,
        borderColor: AppColors.success.withValues(alpha: 0.28),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.success.withValues(alpha: 0.3),
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: NetworkAvatar(
              url: request.requesterPhotoUrl,
              size: 42,
              fallback: Container(
                color: const Color(0xFFD1FAE5),
                alignment: Alignment.center,
                child: Text(
                  _initials(request.requesterName),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
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
                  'You cover for ${request.requesterName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  request.shiftLine,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                const StaffStatusChip(
                  label: 'Yours now',
                  tone: StaffChipTone.success,
                  icon: Icons.swap_horiz,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OutgoingTile extends StatelessWidget {
  final ShiftSwapRequestModel request;
  const _OutgoingTile({required this.request});

  @override
  Widget build(BuildContext context) {
    final waiting = request.isPending;
    final approved = request.isApproved;
    final replacementName = request.replacementName?.trim();
    final coveredBy = replacementName?.isNotEmpty == true
        ? replacementName!
        : 'another staff member';
    final statusText = waiting
        ? 'Waiting for the hospital to pick cover'
        : approved
        ? 'Covered by $coveredBy'
        : 'Hospital declined — this shift stays yours';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: StaffSurfaces.card(
        color: waiting
            ? const Color(0xFFFFF8EE)
            : approved
            ? const Color(0xFFF0FDF4)
            : null,
        borderColor: waiting
            ? const Color(0xFFF5B168)
            : approved
            ? AppColors.success.withValues(alpha: 0.35)
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: waiting
                  ? const Color(0xFFFFF4E5)
                  : approved
                  ? const Color(0xFFDCFCE7)
                  : StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              waiting
                  ? Icons.hourglass_top_outlined
                  : approved
                  ? Icons.check_circle_outline
                  : Icons.highlight_off,
              size: 20,
              color: waiting
                  ? const Color(0xFFB2660A)
                  : approved
                  ? AppColors.success
                  : AppColors.error,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.shiftLine,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusText,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                StaffStatusChip(
                  label: waiting
                      ? 'Waiting'
                      : approved
                      ? 'Approved'
                      : 'Declined',
                  tone: waiting
                      ? StaffChipTone.warning
                      : approved
                      ? StaffChipTone.success
                      : StaffChipTone.danger,
                  icon: waiting
                      ? Icons.hourglass_top_outlined
                      : approved
                      ? Icons.check_circle_outline
                      : Icons.highlight_off,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
