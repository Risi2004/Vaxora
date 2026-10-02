import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/models/staff_appointment_model.dart';
import '../../data/repositories/staff_repository.dart';
import '../utils/staff_date_utils.dart';
import '../widgets/network_avatar.dart';
import '../widgets/staff_common_widgets.dart';

class StaffAppointmentsScreen extends StatefulWidget {
  const StaffAppointmentsScreen({super.key});

  @override
  State<StaffAppointmentsScreen> createState() =>
      _StaffAppointmentsScreenState();
}

class _StaffAppointmentsScreenState extends State<StaffAppointmentsScreen> {
  List<AffiliationModel> _hospitals = [];
  List<StaffAppointmentModel> _appointments = [];
  String _selectedHospitalId = '';
  late String _filterDate;
  bool _loadingHospitals = true;
  bool _loadingAppointments = false;
  String? _error;
  bool _allowHospitalSwitch = true;
  String _facilitySuffix = '';

  String _displayName = 'there';
  String _roleLabel = 'Staff';
  String? _photoUrl;

  @override
  void initState() {
    super.initState();
    _filterDate = todayIsoDate();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final user = await StorageService.getUser();
    final role = user?['role']?.toString().toUpperCase() ?? '';
    final isNurse = role.contains('NURSE') && !role.contains('DOCTOR');
    if (mounted) {
      setState(() {
        _allowHospitalSwitch = !isNurse;
        _facilitySuffix = isNurse ? ' · Nursing Station' : '';
        if (user != null) {
          _displayName = user['name']?.toString().trim().isNotEmpty == true
              ? user['name'].toString().trim()
              : 'there';
          _roleLabel = staffRoleLabel(user['role']?.toString() ?? '');
          _photoUrl = resolveMediaUrl(
            user['profilePhotoUrl']?.toString() ??
                user['profilePhoto']?.toString() ??
                user['photoUrl']?.toString(),
          );
        }
      });
    }
    await _loadHospitals();
  }

  Future<void> _loadHospitals() async {
    setState(() {
      _loadingHospitals = true;
      _error = null;
    });
    try {
      final list = await StaffRepository.getMyAffiliations();
      final active = list.where((a) => a.isActive).toList();
      if (!mounted) return;
      setState(() {
        _hospitals = active;
        if (active.isEmpty) {
          _selectedHospitalId = '';
        } else if (!_hospitals
            .any((h) => h.hospitalUserId == _selectedHospitalId)) {
          _selectedHospitalId = active.first.hospitalUserId;
        }
        _loadingHospitals = false;
      });
      await _loadAppointments();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingHospitals = false;
        _error = e is ApiException
            ? e.message
            : 'Failed to load hospital affiliations.';
        _hospitals = [];
        _selectedHospitalId = '';
      });
    }
  }

  Future<void> _loadAppointments() async {
    if (_selectedHospitalId.isEmpty) {
      setState(() => _appointments = []);
      return;
    }
    setState(() {
      _loadingAppointments = true;
      _error = null;
    });
    try {
      final list = await StaffRepository.getHospitalAppointments(
        hospitalUserId: _selectedHospitalId,
        date: _filterDate,
      );
      if (!mounted) return;
      setState(() {
        _appointments = list;
        _loadingAppointments = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingAppointments = false;
        _error =
            e is ApiException ? e.message : 'Failed to load appointments.';
        _appointments = [];
      });
    }
  }

  AffiliationModel? get _selectedHospital {
    try {
      return _hospitals
          .firstWhere((h) => h.hospitalUserId == _selectedHospitalId);
    } catch (_) {
      return _hospitals.isEmpty ? null : _hospitals.first;
    }
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_filterDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: StaffSurfaces.cta,
              onPrimary: Colors.white,
              surface: StaffSurfaces.appBarBg,
              onSurface: StaffSurfaces.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked == null) return;
    setState(() {
      _filterDate =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    });
    await _loadAppointments();
  }

  int get _completedCount =>
      _appointments.where((a) => a.uiStatus == 'completed').length;
  int get _waitingCount =>
      _appointments.where((a) => a.uiStatus == 'waiting').length;

  @override
  Widget build(BuildContext context) {
    final facility = _selectedHospital == null
        ? (_loadingHospitals ? 'Loading hospital…' : 'No affiliated hospital')
        : '${_selectedHospital!.hospitalName}$_facilitySuffix';
    final isToday = _filterDate == todayIsoDate();

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffScreenHeader.appBar(
        displayName: _displayName,
        subtitle: '$_roleLabel · Appointments',
        photoUrl: _photoUrl,
        actions: [
          StaffHeaderAction(
            icon: Icons.refresh,
            tooltip: 'Refresh',
            onPressed: _loadingHospitals || _loadingAppointments
                ? null
                : _loadHospitals,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadHospitals,
        color: StaffSurfaces.brandSoft,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          children: [
            StaffPageIntro(
              eyebrow: 'Clinic roster',
              title: 'Manage appointments',
              subtitle: facility,
              stats: [
                StaffIntroStat(
                  label: 'Total',
                  value: '${_appointments.length}',
                  icon: Icons.list_alt_outlined,
                ),
                StaffIntroStat(
                  label: 'Waiting',
                  value: '$_waitingCount',
                  icon: Icons.pending_outlined,
                  accent: _waitingCount > 0
                      ? const Color(0xFFB2660A)
                      : AppColors.success,
                ),
                StaffIntroStat(
                  label: 'Done',
                  value: '$_completedCount',
                  icon: Icons.check_circle_outline,
                  accent: AppColors.success,
                ),
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
            if (_allowHospitalSwitch && _hospitals.length > 1) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: StaffSurfaces.softWell(),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedHospitalId.isEmpty
                        ? null
                        : _selectedHospitalId,
                    hint: const Text('Select hospital'),
                    iconEnabledColor: StaffSurfaces.brandSoft,
                    onChanged: (v) async {
                      if (v == null) return;
                      setState(() => _selectedHospitalId = v);
                      await _loadAppointments();
                    },
                    items: _hospitals
                        .map(
                          (h) => DropdownMenuItem(
                            value: h.hospitalUserId,
                            child: Text(
                              h.hospitalName,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: StaffSurfaces.textPrimary,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            _DateFilterRow(
              date: _filterDate,
              isToday: isToday,
              onPick: _pickDate,
              onToday: () async {
                setState(() => _filterDate = todayIsoDate());
                await _loadAppointments();
              },
            ),
            const SizedBox(height: 18),
            if (_loadingHospitals || _loadingAppointments)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: CircularProgressIndicator(
                      color: StaffSurfaces.brandSoft),
                ),
              )
            else if (_hospitals.isEmpty)
              const StaffEmptyCard(
                message: 'Join a hospital affiliation to view appointments.',
                icon: Icons.local_hospital_outlined,
              )
            else if (_appointments.isEmpty)
              const StaffEmptyCard(
                message: 'No appointments scheduled for this date.',
                icon: Icons.event_busy_outlined,
              )
            else ...[
              StaffSectionHeader(
                title: isToday ? "Today's appointments" : 'Appointments',
                count: _appointments.length,
              ),
              ..._appointments.map(
                (a) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _AppointmentCard(appointment: a),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DateFilterRow extends StatelessWidget {
  final String date;
  final bool isToday;
  final VoidCallback onPick;
  final VoidCallback onToday;

  const _DateFilterRow({
    required this.date,
    required this.isToday,
    required this.onPick,
    required this.onToday,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Material(
            color: StaffSurfaces.cardBg,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: onPick,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 13,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: StaffSurfaces.cardBorder),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 18,
                      color: StaffSurfaces.brandSoft,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        date,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.expand_more,
                      size: 20,
                      color: StaffSurfaces.textMutedSoft,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        FilledButton(
          onPressed: onToday,
          style: FilledButton.styleFrom(
            backgroundColor:
                isToday ? StaffSurfaces.cta : StaffSurfaces.softPanelDeep,
            foregroundColor:
                isToday ? Colors.white : StaffSurfaces.brandSoft,
            elevation: 0,
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Today',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
        ),
      ],
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final StaffAppointmentModel appointment;

  const _AppointmentCard({required this.appointment});

  StaffChipTone _toneFor(String uiStatus) {
    switch (uiStatus) {
      case 'completed':
        return StaffChipTone.success;
      case 'waiting':
        return StaffChipTone.warning;
      case 'cancelled':
        return StaffChipTone.danger;
      default:
        return StaffChipTone.brand;
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = appointment;

    final tone = _toneFor(a.uiStatus);
    final barColor = switch (tone) {
      StaffChipTone.success => AppColors.success,
      StaffChipTone.warning => const Color(0xFFB2660A),
      StaffChipTone.danger => AppColors.error,
      _ => StaffSurfaces.accentBar,
    };
    final borderColor = switch (tone) {
      StaffChipTone.success => AppColors.success.withValues(alpha: 0.28),
      StaffChipTone.warning => const Color(0xFFF5B168),
      StaffChipTone.danger => AppColors.error.withValues(alpha: 0.28),
      _ => StaffSurfaces.cardBorder,
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(borderColor: borderColor),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 60,
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(4),
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
                        a.patientName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                    ),
                    StaffStatusChip(
                      label: a.status,
                      tone: _toneFor(a.uiStatus),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  a.vaccineName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.brandSoft,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 13,
                      color: StaffSurfaces.textMutedSoft,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${a.appointmentDate} · ${a.timeLabel}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: StaffSurfaces.textSecondary,
                      ),
                    ),
                  ],
                ),
                if (a.hasDosage) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: StaffSurfaces.softPanel,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: StaffSurfaces.cardBorder),
                    ),
                    child: Text(
                      'Dosage · ${a.prescribedDosage}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: StaffSurfaces.textSecondary,
                      ),
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
