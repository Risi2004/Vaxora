import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
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
  String _displayName = 'there';
  String _roleLabel = 'Staff';
  int _weekOffset = 0;

  @override
  void initState() {
    super.initState();
    _applyRange();
    _bootstrap();
  }

  void _applyRange() {
    final range = weekRangeOffset(_weekOffset, days: 7);
    _from = range.from;
    _to = range.to;
  }

  Future<void> _bootstrap() async {
    final user = await StorageService.getUser();
    if (mounted && user != null) {
      setState(() {
        _displayName = user['name']?.toString().trim().isNotEmpty == true
            ? user['name'].toString().trim()
            : 'there';
        _roleLabel = staffRoleLabel(user['role']?.toString() ?? '');
      });
    }
    await _load();
  }

  Future<void> _shiftWeek(int delta) async {
    setState(() {
      _weekOffset += delta;
      _applyRange();
    });
    await _load();
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

  Map<String, List<ShiftModel>> get _grouped {
    final map = <String, List<ShiftModel>>{};
    for (final s in _shifts) {
      final key = s.shiftDate.isEmpty ? 'Unknown' : s.shiftDate;
      map.putIfAbsent(key, () => []).add(s);
    }
    return map;
  }

  String get _primaryHospital {
    if (_affiliationsById.isEmpty) return 'No active hospital affiliation yet';
    return _affiliationsById.values.first.hospitalName;
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

    final weekLabel = _weekOffset == 0
        ? 'This week'
        : (_weekOffset == -1
            ? 'Last week'
            : (_weekOffset == 1 ? 'Next week' : 'Week $_weekOffset'));

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'My Shifts',
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
            icon: Icon(Icons.refresh, color: StaffSurfaces.brandSoft),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: StaffSurfaces.brandSoft,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          children: [
            StaffHeroBanner(
              eyebrow: 'Clinical roster',
              title: 'Welcome back, $_displayName',
              subtitle: '$_from → $_to · $_primaryHospital',
              pills: [
                _roleLabel,
                '${_shifts.length} shifts',
                '${_affiliationsById.length} ${_affiliationsById.length == 1 ? 'hospital' : 'hospitals'}',
              ],
            ),
            const SizedBox(height: 14),
            if (_error != null) ...[
              StaffErrorBanner(
                message: _error!,
                onDismiss: () => setState(() => _error = null),
              ),
              const SizedBox(height: 12),
            ],
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: StaffSurfaces.softWell(),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Previous week',
                    onPressed: _loading ? null : () => _shiftWeek(-1),
                    icon: Icon(
                      Icons.chevron_left,
                      color: StaffSurfaces.brandSoft,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          weekLabel,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: StaffSurfaces.brandSoft,
                          ),
                        ),
                        Text(
                          '$_from → $_to',
                          style: const TextStyle(
                            fontSize: 12,
                            color: StaffSurfaces.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Next week',
                    onPressed: _loading ? null : () => _shiftWeek(1),
                    icon: Icon(
                      Icons.chevron_right,
                      color: StaffSurfaces.brandSoft,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (_loading && _shifts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
                ),
              )
            else ...[
              _RangeHeader(from: _from, to: _to, count: _shifts.length),
              const SizedBox(height: 16),
              if (dayKeys.isEmpty)
                const StaffEmptyCard(
                  message: 'No shifts assigned in this week.',
                  icon: Icons.calendar_month_outlined,
                )
              else
                ...dayKeys.expand((day) {
                  final items = grouped[day]!;
                  return [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8, top: 10),
                      child: Text(
                        shiftDayHeading(day),
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.02,
                          color: StaffSurfaces.textSecondary,
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
      padding: const EdgeInsets.all(16),
      decoration: StaffSurfaces.softWell(),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.calendar_month_outlined,
              color: StaffSurfaces.brandSoft,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'This week',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.brandSoft,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$from → $to',
                  style: const TextStyle(
                    fontSize: 12,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: StaffSurfaces.brandSoft,
              ),
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
    final hospital = hospitalName?.isNotEmpty == true
        ? hospitalName!
        : 'Hospital roster';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 58,
            decoration: BoxDecoration(
              color: StaffSurfaces.accentBar,
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
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  hospital,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.brandSoft,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  booth,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                if (shift.notes != null && shift.notes!.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    shift.notes!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: StaffSurfaces.textMutedSoft,
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
