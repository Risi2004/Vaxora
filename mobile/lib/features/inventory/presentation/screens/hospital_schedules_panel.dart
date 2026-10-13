import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../hospital_staff/data/models/hospital_booth_model.dart';
import '../../../hospital_staff/data/repositories/hospital_staff_repository.dart';
import '../../../staff/presentation/utils/staff_date_utils.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../../data/models/formulary_entry_model.dart';
import '../../data/models/hospital_schedule_model.dart';
import '../../data/repositories/hospital_schedule_repository.dart';
import '../../data/repositories/inventory_repository.dart';

/// Vaccine session schedules for the hospital (web Appointments → schedules).
class HospitalSchedulesPanel extends StatefulWidget {
  const HospitalSchedulesPanel({super.key});

  @override
  State<HospitalSchedulesPanel> createState() => HospitalSchedulesPanelState();
}

class HospitalSchedulesPanelState extends State<HospitalSchedulesPanel> {
  List<HospitalScheduleModel> _schedules = [];
  List<HospitalBoothModel> _booths = [];
  List<FormularyEntryModel> _formulary = [];
  bool _loading = true;
  String? _error;

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
      final results = await Future.wait([
        HospitalScheduleRepository.list(),
        HospitalStaffRepository.getBooths(activeOnly: true),
        InventoryRepository.getFormulary(),
      ]);
      if (!mounted) return;
      setState(() {
        _schedules = results[0] as List<HospitalScheduleModel>;
        _booths = results[1] as List<HospitalBoothModel>;
        _formulary = results[2] as List<FormularyEntryModel>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Failed to load schedules.';
      });
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating),
    );
  }

  bool get canCreate => _booths.isNotEmpty && _formulary.isNotEmpty && !_loading;

  Future<void> openCreate() async {
    if (!canCreate) {
      _toast(
        _booths.isEmpty
            ? 'Create an active booth before posting schedules.'
            : 'Add formulary vaccines under Inventory first.',
      );
      return;
    }
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: StaffSurfaces.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) => _ScheduleFormSheet(
        booths: _booths,
        formulary: _formulary,
      ),
    );
    if (ok == true) {
      _toast('Schedule created.');
      await _load();
    }
  }

  Future<void> _edit(HospitalScheduleModel s) async {
    if (_booths.isEmpty || _formulary.isEmpty) {
      _toast(
        _booths.isEmpty
            ? 'Create an active booth before editing schedules.'
            : 'Add formulary vaccines under Inventory first.',
      );
      return;
    }
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: StaffSurfaces.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) => _ScheduleFormSheet(
        booths: _booths,
        formulary: _formulary,
        existing: s,
      ),
    );
    if (ok == true) {
      _toast('Schedule updated.');
      await _load();
    }
  }

  Future<void> _cancel(HospitalScheduleModel s) async {
    final ok = await confirmAction(
      context,
      title: 'Cancel schedule?',
      message: 'Cancel ${s.vaccineName} · ${s.whenLabel}? Patients will no longer see this session.',
      cancelLabel: 'Keep',
      confirmLabel: 'Cancel slot',
      destructive: true,
    );
    if (!ok) return;
    try {
      await HospitalScheduleRepository.cancel(s.id);
      _toast('Schedule cancelled.');
      await _load();
    } catch (e) {
      _toast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _schedules.where((s) => !s.isCancelled).toList();

    return RefreshIndicator(
      onRefresh: _load,
      color: StaffSurfaces.brandSoft,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          StaffSectionHeader(
            title: 'Immunization schedules',
            count: active.length,
          ),
          if (_booths.isEmpty || _formulary.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _booths.isEmpty
                    ? 'Create an active booth before posting schedules.'
                    : 'Add formulary vaccines under Inventory before posting schedules.',
                style: const TextStyle(
                  fontSize: 12.5,
                  color: StaffSurfaces.textSecondary,
                ),
              ),
            ),
          if (_loading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Center(
                child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
              ),
            )
          else if (_error != null)
            StaffEmptyCard(message: _error!, icon: Icons.error_outline)
          else if (active.isEmpty)
            const StaffEmptyCard(
              message: 'No active schedules. Add a one-time or weekly session.',
              icon: Icons.event_available_outlined,
            )
          else
            ...active.map(
              (s) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: StaffSurfaces.card(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              s.vaccineName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14.5,
                                color: StaffSurfaces.textPrimary,
                              ),
                            ),
                          ),
                          StaffStatusChip(
                            label: s.scheduleType,
                            tone: StaffChipTone.brand,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        s.whenLabel,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: StaffSurfaces.textSecondary,
                        ),
                      ),
                      Text(
                        '${s.timeLabel} · ${s.boothLabel ?? 'Booth'} · '
                        '${s.price <= 0 ? 'Free' : 'LKR ${s.price.toStringAsFixed(0)}'}',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: StaffSurfaces.brandSoft,
                        ),
                      ),
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => _edit(s),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.accent,
                            ),
                            child: const Text('Edit'),
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: () => _cancel(s),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.error,
                            ),
                            child: const Text('Cancel slot'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

String _hhmm(String? raw, String fallback) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(raw?.trim() ?? '');
  if (m == null) return fallback;
  return '${twoDigits(int.parse(m.group(1)!))}:${m.group(2)}';
}

class _ScheduleFormSheet extends StatefulWidget {
  final List<HospitalBoothModel> booths;
  final List<FormularyEntryModel> formulary;
  final HospitalScheduleModel? existing;

  const _ScheduleFormSheet({
    required this.booths,
    required this.formulary,
    this.existing,
  });

  @override
  State<_ScheduleFormSheet> createState() => _ScheduleFormSheetState();
}

class _ScheduleFormSheetState extends State<_ScheduleFormSheet> {
  late String _vaccineName;
  String? _vaccineId;
  String? _boothId;
  late String _type;
  late String _date;
  late String _endDate;
  late String _start;
  late String _end;
  late List<String> _daysOfWeek;
  late final TextEditingController _price;
  String? _error;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    if (existing != null) {
      _type = existing.scheduleType.toLowerCase() == 'weekly' ? 'Weekly' : 'OneTime';
      _vaccineName = existing.vaccineName;
      _vaccineId = existing.vaccineId;
      _boothId = existing.boothId;
      _date = _type == 'Weekly'
          ? (existing.startDate?.isNotEmpty == true
              ? existing.startDate!.substring(0, 10)
              : todayIsoDate())
          : (existing.specificDate?.isNotEmpty == true
              ? existing.specificDate!.substring(0, 10)
              : todayIsoDate());
      _endDate = existing.endDate?.isNotEmpty == true
          ? existing.endDate!.substring(0, 10)
          : formatDateOnly(hospitalNow().add(const Duration(days: 28)));
      _start = _hhmm(existing.startTime, '09:00');
      _end = _hhmm(existing.endTime, '12:00');
      _daysOfWeek = existing.daysOfWeek.isNotEmpty
          ? List<String>.from(existing.daysOfWeek)
          : const ['Monday', 'Wednesday', 'Friday'];
      _price = TextEditingController(
        text: existing.price <= 0 ? '0' : existing.price.toStringAsFixed(0),
      );
      for (final f in widget.formulary) {
        final sameName = f.vaccineName.trim().toLowerCase() ==
            _vaccineName.trim().toLowerCase();
        final sameId =
            existing.vaccineId != null && f.vaccineId == existing.vaccineId;
        if (sameName || sameId) {
          _vaccineName = f.vaccineName;
          _vaccineId = f.vaccineId;
          break;
        }
      }
    } else {
      _type = 'OneTime';
      _date = todayIsoDate();
      _endDate = formatDateOnly(hospitalNow().add(const Duration(days: 28)));
      _start = '09:00';
      _end = '12:00';
      _daysOfWeek = const ['Monday', 'Wednesday', 'Friday'];
      final first = widget.formulary.first;
      _vaccineName = first.vaccineName;
      _vaccineId = first.vaccineId;
      _boothId = widget.booths.isNotEmpty ? widget.booths.first.boothId : null;
      _price = TextEditingController(text: '0');
    }
  }

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  List<HospitalBoothModel> get _matchingBooths {
    final wanted = _vaccineName.trim().toLowerCase();
    final offering = widget.booths.where((b) {
      return b.vaccineNames.any((n) {
        final v = n.trim().toLowerCase();
        return v.isNotEmpty &&
            (v == wanted || v.contains(wanted) || wanted.contains(v));
      });
    }).toList();
    return offering.isNotEmpty ? offering : widget.booths;
  }

  Future<void> _submit() async {
    if (_boothId == null || _boothId!.isEmpty) {
      setState(() => _error = 'Select a booth.');
      return;
    }
    final price = double.tryParse(_price.text.trim()) ?? -1;
    if (price < 0) {
      setState(() => _error = 'Enter a valid price (0 for free).');
      return;
    }
    if (_end.compareTo(_start) <= 0) {
      setState(() => _error = 'End time must be after start time.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (_isEdit) {
        await HospitalScheduleRepository.update(
          scheduleId: widget.existing!.id,
          boothId: _boothId!,
          vaccineName: _vaccineName,
          vaccineId: _vaccineId,
          scheduleType: _type,
          specificDate: _type == 'OneTime' ? _date : null,
          daysOfWeek: _type == 'Weekly' ? _daysOfWeek : const [],
          startDate: _type == 'Weekly' ? _date : null,
          endDate: _type == 'Weekly' ? _endDate : null,
          startTime: _start,
          endTime: _end,
          price: price,
        );
      } else {
        await HospitalScheduleRepository.create(
          boothId: _boothId!,
          vaccineName: _vaccineName,
          vaccineId: _vaccineId,
          scheduleType: _type,
          specificDate: _type == 'OneTime' ? _date : null,
          daysOfWeek: _type == 'Weekly'
              ? const ['Monday', 'Wednesday', 'Friday']
              : const [],
          startDate: _type == 'Weekly' ? _date : null,
          endDate: _type == 'Weekly'
              ? formatDateOnly(hospitalNow().add(const Duration(days: 28)))
              : null,
          startTime: _start,
          endTime: _end,
          price: price,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = e is ApiException ? e.message : e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final booths = _matchingBooths;
    if (_boothId != null && !booths.any((b) => b.boothId == _boothId)) {
      _boothId = booths.isNotEmpty ? booths.first.boothId : null;
    }
    final startItems = {
      ..._times,
      if (!_times.contains(_start)) _start,
    }.toList()
      ..sort();
    final endItems = {
      ..._times,
      if (!_times.contains(_end)) _end,
    }.toList()
      ..sort();

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _isEdit ? 'Edit schedule' : 'New schedule',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: StaffSurfaces.textPrimary,
              ),
            ),
            if (_isEdit)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Booth or vaccine changes are blocked while upcoming appointments remain on this session.',
                  style: TextStyle(
                    fontSize: 12,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: AppColors.error)),
            ],
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'OneTime', label: Text('One-time')),
                ButtonSegment(value: 'Weekly', label: Text('Weekly')),
              ],
              selected: {_type},
              onSelectionChanged: (s) => setState(() => _type = s.first),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: widget.formulary.any((f) => f.vaccineName == _vaccineName)
                  ? _vaccineName
                  : widget.formulary.first.vaccineName,
              decoration: const InputDecoration(labelText: 'Vaccine'),
              items: widget.formulary
                  .map(
                    (f) => DropdownMenuItem(
                      value: f.vaccineName,
                      child: Text(f.vaccineName),
                    ),
                  )
                  .toList(),
              onChanged: (v) {
                if (v == null) return;
                final entry = widget.formulary.firstWhere((f) => f.vaccineName == v);
                setState(() {
                  _vaccineName = v;
                  _vaccineId = entry.vaccineId;
                });
              },
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _boothId,
              decoration: const InputDecoration(labelText: 'Booth'),
              items: booths
                  .map(
                    (b) => DropdownMenuItem(
                      value: b.boothId,
                      child: Text('${b.code} · ${b.name}'),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _boothId = v),
            ),
            const SizedBox(height: 10),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(_type == 'OneTime' ? 'Date' : 'Start date'),
              subtitle: Text(_date),
              trailing: const Icon(Icons.calendar_today_outlined),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime.tryParse(_date) ?? hospitalNow(),
                  firstDate: hospitalNow().subtract(const Duration(days: 1)),
                  lastDate: hospitalNow().add(const Duration(days: 365)),
                );
                if (picked != null) {
                  setState(() => _date = formatDateOnly(picked));
                }
              },
            ),
            if (_type == 'Weekly')
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('End date'),
                subtitle: Text(_endDate),
                trailing: const Icon(Icons.event_outlined),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.tryParse(_endDate) ?? hospitalNow(),
                    firstDate: DateTime.tryParse(_date) ?? hospitalNow(),
                    lastDate: hospitalNow().add(const Duration(days: 400)),
                  );
                  if (picked != null) {
                    setState(() => _endDate = formatDateOnly(picked));
                  }
                },
              ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _start,
                    decoration: const InputDecoration(labelText: 'Start'),
                    items: startItems
                        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _start = v);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _end,
                    decoration: const InputDecoration(labelText: 'End'),
                    items: endItems
                        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _end = v);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Price (0 = free)',
              ),
            ),
            if (_type == 'Weekly' && !_isEdit)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Weekly posts Mon / Wed / Fri for the next 4 weeks from the start date.',
                  style: TextStyle(
                    fontSize: 12,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: StaffSurfaces.cta),
              child: Text(
                _saving
                    ? 'Saving…'
                    : (_isEdit ? 'Save changes' : 'Create schedule'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _times = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
];
