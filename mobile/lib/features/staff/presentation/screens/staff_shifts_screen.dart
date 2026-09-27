import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/models/shift_model.dart';
import '../../data/repositories/staff_repository.dart';
import '../utils/staff_date_utils.dart';
import '../widgets/staff_common_widgets.dart';

class StaffShiftsScreen extends StatefulWidget {
  const StaffShiftsScreen({super.key});

  @override
  State<StaffShiftsScreen> createState() => _StaffShiftsScreenState();
}

class _StaffShiftsScreenState extends State<StaffShiftsScreen> {
  List<ShiftModel> _shifts = [];
  Map<String, AffiliationModel> _affiliationsById = {};
  bool _loading = true;
  String? _error;
  late String _from;
  late String _to;

  @override
  void initState() {
    super.initState();
    final range = weekRangeFromToday(days: 14);
    _from = range.from;
    _to = range.to;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        StaffRepository.getMyShifts(from: _from, to: _to),
        StaffRepository.getMyAffiliations(),
      ]);

      if (!mounted) return;

      final shifts = results[0] as List<ShiftModel>;
      final affiliations = results[1] as List<AffiliationModel>;
      final byId = <String, AffiliationModel>{
        for (final a in affiliations) a.affiliationId: a,
      };

      setState(() {
        _shifts = shifts;
        _affiliationsById = byId;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Failed to load shifts.';
        _shifts = [];
      });
    }
  }

  /// Group shifts by `shiftDate`, preserving API order within each day.
  Map<String, List<ShiftModel>> get _grouped {
    final map = <String, List<ShiftModel>>{};
    for (final s in _shifts) {
      final key = s.shiftDate.isEmpty ? 'Unknown' : s.shiftDate;
      map.putIfAbsent(key, () => []).add(s);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
      final grouped = _grouped;
    final dayKeys = grouped.keys.toList()
      ..sort((a, b) {
        final da = DateTime.tryParse(a);
        final db = DateTime.tryParse(b);
        if (da != null && db != null) return da.compareTo(db);
        return a.compareTo(b);
      });

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Shifts', style: AppTextStyles.h3),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.brandBlue),
          ),
        ],
      ),
      body: _loading && _shifts.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.brandBlue,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                children: [
                  if (_error != null) ...[
                    StaffErrorBanner(
                      message: _error!,
                      onDismiss: () => setState(() => _error = null),
                    ),
                    const SizedBox(height: 12),
                  ],
                  _RangeHeader(from: _from, to: _to, count: _shifts.length),
                  const SizedBox(height: 16),
                  if (dayKeys.isEmpty)
                    const StaffEmptyCard(
                      message: 'No shifts assigned in the next 14 days.',
                    )
                  else
                    ...dayKeys.expand((day) {
                      final items = grouped[day]!;
                      return [
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8, top: 4),
                          child: Text(
                            shiftDayHeading(day),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textTitle,
                            ),
                          ),
                        ),
                        ...items.map(
                          (shift) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _ShiftCard(
                              shift: shift,
                              hospitalName: _affiliationsById[shift.affiliationId]
                                      ?.hospitalName,
                            ),
                          ),
                        ),
                      ];
                    }),
                ],
              ),
            ),
    );
  }
}

class _RangeHeader extends StatelessWidget {
  final String from;
  final String to;
  final int count;

  const _RangeHeader({
    required this.from,
    required this.to,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.brandBlue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.calendar_month,
              color: AppColors.brandBlue,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Next 14 days',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textTitle,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$from → $to',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '$count',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.brandBlue,
            ),
          ),
        ],
      ),
    );
  }
}

class _ShiftCard extends StatelessWidget {
  final ShiftModel shift;
  final String? hospitalName;

  const _ShiftCard({required this.shift, this.hospitalName});

  @override
  Widget build(BuildContext context) {
    final booth = (shift.boothOrStation?.trim().isNotEmpty ?? false)
        ? shift.boothOrStation!
        : 'Unassigned booth';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.brandBlue,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shift.timeRangeLabel,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textTitle,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  hospitalName?.isNotEmpty == true
                      ? hospitalName!
                      : 'Hospital roster',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textBody,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  booth,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
                if (shift.notes != null && shift.notes!.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    shift.notes!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                      height: 1.35,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
