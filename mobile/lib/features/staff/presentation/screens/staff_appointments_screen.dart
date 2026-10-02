import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../../inventory/data/models/batch_model.dart';
import '../../../inventory/data/repositories/inventory_repository.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/models/staff_appointment_model.dart';
import '../../data/repositories/staff_repository.dart';
import '../utils/staff_date_utils.dart';
import '../widgets/network_avatar.dart';
import '../widgets/staff_administer_sheet.dart';
import '../widgets/staff_common_widgets.dart';

const _observationWindowMinutes = 15;

int? _observationMinutesLeft(String? updatedAt, DateTime now) {
  if (updatedAt == null || updatedAt.trim().isEmpty) return null;
  final started = DateTime.tryParse(updatedAt);
  if (started == null) return null;
  final elapsed = now.toUtc().difference(started.toUtc()).inMinutes;
  final left = _observationWindowMinutes - elapsed;
  return left < 0 ? 0 : left;
}

class StaffAppointmentsScreen extends StatefulWidget {
  const StaffAppointmentsScreen({super.key});

  @override
  State<StaffAppointmentsScreen> createState() =>
      _StaffAppointmentsScreenState();
}

class _StaffAppointmentsScreenState extends State<StaffAppointmentsScreen> {
  List<AffiliationModel> _hospitals = [];
  List<StaffAppointmentModel> _appointments = [];
  List<BatchModel> _lots = [];
  String _selectedHospitalId = '';
  late String _filterDate;
  String _filterStatus = 'all';
  bool _loadingHospitals = true;
  bool _loadingAppointments = false;
  bool _updating = false;
  String? _error;
  bool _allowHospitalSwitch = true;
  String _facilitySuffix = '';
  String? _activePatientId;

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

  String _pickDefaultHospitalId(
    List<AffiliationModel> active,
    String preferredId,
  ) {
    final onDuty = active.where((a) => a.isOnDutyNow).toList();
    if (onDuty.isNotEmpty) return onDuty.first.hospitalUserId;
    if (preferredId.isNotEmpty &&
        active.any((a) => a.hospitalUserId == preferredId)) {
      return preferredId;
    }
    return active.isEmpty ? '' : active.first.hospitalUserId;
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
      final hospitalId = _allowHospitalSwitch
          ? _pickDefaultHospitalId(active, _selectedHospitalId)
          : (active.isEmpty ? '' : active.first.hospitalUserId);
      setState(() {
        _hospitals = active;
        _selectedHospitalId = hospitalId;
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
        _appointments = [];
        _lots = [];
      });
    }
  }

  Future<void> _loadAppointments() async {
    if (_selectedHospitalId.isEmpty) {
      setState(() {
        _appointments = [];
        _lots = [];
        _activePatientId = null;
      });
      return;
    }
    setState(() {
      _loadingAppointments = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        StaffRepository.getHospitalAppointments(
          hospitalUserId: _selectedHospitalId,
          date: _filterDate,
        ),
        InventoryRepository.getBatches(hospitalUserId: _selectedHospitalId),
      ]);
      if (!mounted) return;
      final list = results[0] as List<StaffAppointmentModel>;
      final lots = results[1] as List<BatchModel>;
      final consulting = list.where((a) => a.uiStatus == 'consulting').toList();
      setState(() {
        _appointments = list;
        _lots = lots;
        _loadingAppointments = false;
        if (_activePatientId != null &&
            consulting.any((a) => a.id == _activePatientId)) {
          // keep current spotlight
        } else {
          _activePatientId =
              consulting.isEmpty ? null : consulting.first.id;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingAppointments = false;
        _error =
            e is ApiException ? e.message : 'Failed to load appointments.';
        _appointments = [];
        _lots = [];
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

  bool get _isOnDuty => _selectedHospital?.isOnDutyNow == true;

  StaffAppointmentModel? get _activePatient {
    if (_activePatientId == null) return null;
    try {
      return _appointments.firstWhere((a) => a.id == _activePatientId);
    } catch (_) {
      return null;
    }
  }

  List<StaffAppointmentModel> get _filteredAppointments {
    return _appointments.where((a) {
      if (_filterStatus == 'all') return true;
      return a.uiStatus == _filterStatus;
    }).toList();
  }

  int get _completedCount =>
      _appointments.where((a) => a.uiStatus == 'completed').length;
  int get _waitingCount =>
      _appointments.where((a) => a.uiStatus == 'waiting').length;
  int get _observationCount =>
      _appointments.where((a) => a.uiStatus == 'observation').length;

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _updateStatus(
    StaffAppointmentModel appointment,
    String status, {
    Map<String, dynamic>? administration,
  }) async {
    setState(() => _updating = true);
    try {
      await StaffRepository.updateAppointmentStatus(
        appointmentId: appointment.id,
        status: status,
        administration: administration,
      );
      await _loadAppointments();
    } catch (e) {
      _toast(e is ApiException ? e.message : 'Failed to update status.');
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _callNext() async {
    if (!_isOnDuty) {
      _toast('You must have an active shift to call the next patient.');
      return;
    }
    final current = _activePatient;
    if (current != null && current.uiStatus == 'consulting') {
      _toast(
        'Finish ${current.patientName} (certify to observation) before calling the next patient.',
      );
      return;
    }
    StaffAppointmentModel? next;
    for (final a in _appointments) {
      if (a.uiStatus == 'waiting' && a.isPaymentSettled) {
        next = a;
        break;
      }
    }
    if (next == null) {
      final unpaidWaiting =
          _appointments.any((a) => a.uiStatus == 'waiting' && !a.isPaymentSettled);
      _toast(
        unpaidWaiting
            ? 'No paid patients waiting. Unpaid appointments cannot be administered yet.'
            : 'No more waiting patients in today’s queue.',
      );
      return;
    }
    setState(() => _activePatientId = next!.id);
    await _updateStatus(next, 'Administering');
    _toast('Called ${next.patientName}');
  }

  Future<void> _examine(StaffAppointmentModel patient) async {
    if (!_isOnDuty) {
      _toast('You must have an active shift to start consultation.');
      return;
    }
    if (!patient.isPaymentSettled) {
      _toast('Payment must be settled before starting consultation.');
      return;
    }
    setState(() => _activePatientId = patient.id);
    if (patient.uiStatus == 'waiting') {
      await _updateStatus(patient, 'Administering');
    }
  }

  Future<void> _returnToQueue(StaffAppointmentModel patient) async {
    if (!_isOnDuty) {
      _toast('You must have an active shift to return a patient to the queue.');
      return;
    }
    await _updateStatus(patient, 'Confirmed');
    if (_activePatientId == patient.id) {
      setState(() => _activePatientId = null);
    }
    _toast('${patient.patientName} returned to the waiting queue.');
  }

  Future<void> _certify(StaffAppointmentModel patient) async {
    if (!_isOnDuty) {
      _toast('You must have an active shift to record administration.');
      return;
    }
    if (!patient.isPaymentSettled) {
      _toast('Payment must be settled before recording administration.');
      return;
    }
    final result = await showStaffAdministerSheet(
      context: context,
      patient: patient,
      lots: _lots,
    );
    if (result == null) return;
    await _updateStatus(
      patient,
      'Observation',
      administration: {
        'batchId': result.batchId,
        'lotNumber': result.lotNumber,
        'injectionSite': result.injectionSite,
        'route': result.route,
        if (result.notes.isNotEmpty) 'administrationNotes': result.notes,
        'consentConfirmed': result.consentConfirmed,
        'vitalsConfirmed': result.vitalsConfirmed,
      },
    );
    _toast('Recorded administration for ${patient.patientName}');
  }

  Future<void> _discharge(StaffAppointmentModel patient) async {
    if (!_isOnDuty) {
      _toast('You must have an active shift to discharge a patient.');
      return;
    }
    if (!patient.isPaymentSettled) {
      _toast('Payment must be settled before discharging the patient.');
      return;
    }
    await _updateStatus(patient, 'Completed');
    if (_activePatientId == patient.id) {
      setState(() => _activePatientId = null);
    }
    _toast('${patient.patientName} discharged from observation.');
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

  @override
  Widget build(BuildContext context) {
    final facility = _selectedHospital == null
        ? (_loadingHospitals ? 'Loading hospital…' : 'No affiliated hospital')
        : '${_selectedHospital!.hospitalName}$_facilitySuffix';
    final isToday = _filterDate == todayIsoDate();
    final dutyLabel = _selectedHospital == null
        ? null
        : (_isOnDuty ? 'On duty' : 'No active shift');
    final active = _activePatient;
    final now = DateTime.now();

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffScreenHeader.appBar(
        displayName: _displayName,
        subtitle: '$_roleLabel · Clinical',
        photoUrl: _photoUrl,
        actions: [
          StaffHeaderAction(
            icon: Icons.refresh,
            tooltip: 'Refresh',
            onPressed: _loadingHospitals || _loadingAppointments || _updating
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
              eyebrow: 'Clinical session',
              title: isToday ? "Today's clinic queue" : 'Clinic queue',
              subtitle: dutyLabel == null ? facility : '$facility · $dutyLabel',
              stats: [
                StaffIntroStat(
                  label: 'Waiting',
                  value: '$_waitingCount',
                  icon: Icons.pending_outlined,
                  accent: _waitingCount > 0
                      ? const Color(0xFFB2660A)
                      : AppColors.success,
                ),
                StaffIntroStat(
                  label: 'Watch',
                  value: '$_observationCount',
                  icon: Icons.visibility_outlined,
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
            if (!_isOnDuty && _selectedHospital != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDBA74)),
                ),
                child: const Text(
                  'You are off shift at this hospital. Clinical actions are disabled until you have an active shift.',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF9A3412),
                  ),
                ),
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
                      setState(() {
                        _selectedHospitalId = v;
                        _activePatientId = null;
                      });
                      await _loadAppointments();
                    },
                    items: _hospitals
                        .map(
                          (h) => DropdownMenuItem(
                            value: h.hospitalUserId,
                            child: Text(
                              '${h.hospitalName}${h.isOnDutyNow ? ' · On duty' : ''}',
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
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _updating || !_isOnDuty ? null : _callNext,
                style: FilledButton.styleFrom(
                  backgroundColor: StaffSurfaces.cta,
                  disabledBackgroundColor: StaffSurfaces.softPanelDeep,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.campaign_outlined, size: 18),
                label: Text(
                  _isOnDuty ? 'Call next patient' : 'On-duty shift required',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
            if (active != null && active.uiStatus == 'consulting') ...[
              const SizedBox(height: 14),
              _ActivePatientCard(
                patient: active,
                busy: _updating,
                onDuty: _isOnDuty,
                onReturn: () => _returnToQueue(active),
                onCertify: () => _certify(active),
              ),
            ],
            if (_observationCount > 0) ...[
              const SizedBox(height: 14),
              StaffSectionHeader(
                title: 'Observation watch',
                count: _observationCount,
              ),
              ..._appointments
                  .where((a) => a.uiStatus == 'observation')
                  .map(
                    (obs) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _ObservationCard(
                        patient: obs,
                        minsLeft: _observationMinutesLeft(obs.updatedAt, now),
                        busy: _updating,
                        onDuty: _isOnDuty,
                        onDischarge: () => _discharge(obs),
                      ),
                    ),
                  ),
            ],
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _filterStatus == 'all',
                  onTap: () => setState(() => _filterStatus = 'all'),
                ),
                _FilterChip(
                  label: 'Waiting ($_waitingCount)',
                  selected: _filterStatus == 'waiting',
                  onTap: () => setState(() => _filterStatus = 'waiting'),
                ),
                _FilterChip(
                  label: 'Observation ($_observationCount)',
                  selected: _filterStatus == 'observation',
                  onTap: () => setState(() => _filterStatus = 'observation'),
                ),
                _FilterChip(
                  label: 'Done ($_completedCount)',
                  selected: _filterStatus == 'completed',
                  onTap: () => setState(() => _filterStatus = 'completed'),
                ),
              ],
            ),
            const SizedBox(height: 14),
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
                message: 'Join a hospital affiliation to run a clinical session.',
                icon: Icons.local_hospital_outlined,
              )
            else if (_filteredAppointments.isEmpty)
              const StaffEmptyCard(
                message: 'No appointments in this filter for the selected date.',
                icon: Icons.event_busy_outlined,
              )
            else ...[
              StaffSectionHeader(
                title: isToday ? "Today's queue" : 'Queue',
                count: _filteredAppointments.length,
              ),
              ..._filteredAppointments.map(
                (a) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _AppointmentCard(
                    appointment: a,
                    busy: _updating,
                    onDuty: _isOnDuty,
                    onExamine: () => _examine(a),
                    onCertify: () => _certify(a),
                    onDischarge: () => _discharge(a),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? StaffSurfaces.cta : StaffSurfaces.softPanel,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : StaffSurfaces.textSecondary,
            ),
          ),
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

class _ActivePatientCard extends StatelessWidget {
  final StaffAppointmentModel patient;
  final bool busy;
  final bool onDuty;
  final VoidCallback onReturn;
  final VoidCallback onCertify;

  const _ActivePatientCard({
    required this.patient,
    required this.busy,
    required this.onDuty,
    required this.onReturn,
    required this.onCertify,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(
        borderColor: StaffSurfaces.brandSoft.withValues(alpha: 0.35),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${patient.token} · ${patient.patientName}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
              ),
              StaffStatusChip(label: 'In session', tone: StaffChipTone.brand),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${patient.vaccineName}'
            '${patient.hasDosage ? ' · ${patient.prescribedDosage}' : ''}',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: StaffSurfaces.brandSoft,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'NIC: ${patient.patientNic ?? '—'} · Payment: ${patient.paymentStatus}'
            '${patient.boothLabel != null && patient.boothLabel!.isNotEmpty ? ' · Booth ${patient.boothLabel}' : ''}',
            style: const TextStyle(
              fontSize: 12.5,
              color: StaffSurfaces.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: busy || !onDuty ? null : onReturn,
                  child: const Text('Return to queue'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: busy || !onDuty || !patient.isPaymentSettled
                      ? null
                      : onCertify,
                  style: FilledButton.styleFrom(
                    backgroundColor: StaffSurfaces.cta,
                  ),
                  child: const Text('Certify'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ObservationCard extends StatelessWidget {
  final StaffAppointmentModel patient;
  final int? minsLeft;
  final bool busy;
  final bool onDuty;
  final VoidCallback onDischarge;

  const _ObservationCard({
    required this.patient,
    required this.minsLeft,
    required this.busy,
    required this.onDuty,
    required this.onDischarge,
  });

  @override
  Widget build(BuildContext context) {
    final watch = minsLeft == null
        ? 'Under observation'
        : (minsLeft == 0
            ? 'Observation window complete'
            : '$minsLeft min remaining');
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.patientName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  watch,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: busy || !onDuty || !patient.isPaymentSettled
                ? null
                : onDischarge,
            style: FilledButton.styleFrom(backgroundColor: AppColors.success),
            child: const Text('Discharge'),
          ),
        ],
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final StaffAppointmentModel appointment;
  final bool busy;
  final bool onDuty;
  final VoidCallback onExamine;
  final VoidCallback onCertify;
  final VoidCallback onDischarge;

  const _AppointmentCard({
    required this.appointment,
    required this.busy,
    required this.onDuty,
    required this.onExamine,
    required this.onCertify,
    required this.onDischarge,
  });

  StaffChipTone _toneFor(String uiStatus) {
    switch (uiStatus) {
      case 'completed':
        return StaffChipTone.success;
      case 'waiting':
        return StaffChipTone.warning;
      case 'cancelled':
        return StaffChipTone.danger;
      case 'observation':
      case 'consulting':
        return StaffChipTone.brand;
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

    Widget? action;
    if (a.uiStatus == 'waiting') {
      action = TextButton(
        onPressed: busy || !onDuty || !a.isPaymentSettled ? null : onExamine,
        child: Text(
          !a.isPaymentSettled ? 'Unpaid' : 'Examine',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      );
    } else if (a.uiStatus == 'consulting') {
      action = TextButton(
        onPressed: busy || !onDuty || !a.isPaymentSettled ? null : onCertify,
        child: const Text(
          'Certify',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      );
    } else if (a.uiStatus == 'observation') {
      action = TextButton(
        onPressed: busy || !onDuty || !a.isPaymentSettled ? null : onDischarge,
        child: const Text(
          'Discharge',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(borderColor: borderColor),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 72,
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
                        '${a.token} · ${a.patientName}',
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
                      label: a.statusLabel,
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
                Text(
                  '${a.appointmentDate} · ${a.timeLabel} · ${a.isPaymentSettled ? 'Paid' : a.paymentStatus}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                if (a.hasDosage) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Dosage · ${a.prescribedDosage}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: StaffSurfaces.textSecondary,
                    ),
                  ),
                ],
                if (action != null) ...[
                  const SizedBox(height: 4),
                  Align(alignment: Alignment.centerRight, child: action),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
