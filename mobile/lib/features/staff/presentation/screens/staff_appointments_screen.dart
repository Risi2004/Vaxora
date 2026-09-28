import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/models/staff_appointment_model.dart';
import '../../data/repositories/staff_repository.dart';
import '../utils/staff_date_utils.dart';
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
        ? (_loadingHospitals ? 'Loading hospital...' : 'No affiliated hospital')
        : '${_selectedHospital!.hospitalName}$_facilitySuffix';
    final isToday = _filterDate == todayIsoDate();

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'Appointments',
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loadingHospitals || _loadingAppointments
                ? null
                : _loadHospitals,
            icon: Icon(Icons.refresh, color: StaffSurfaces.brandSoft),
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
            Container(
              padding: const EdgeInsets.all(16),
              decoration: StaffSurfaces.softWell(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Clinic roster',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                      color: StaffSurfaces.brandSoft,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Manage Your Appointments',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: StaffSurfaces.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    facility,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: StaffSurfaces.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _SoftStat(label: 'Total', value: '${_appointments.length}'),
                      const SizedBox(width: 8),
                      _SoftStat(label: 'Waiting', value: '$_waitingCount'),
                      const SizedBox(width: 8),
                      _SoftStat(label: 'Done', value: '$_completedCount'),
                    ],
                  ),
                ],
              ),
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
            Row(
              children: [
                Expanded(
                  child: Material(
                    color: StaffSurfaces.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      onTap: _pickDate,
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
                            Text(
                              _filterDate,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: StaffSurfaces.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () async {
                    setState(() => _filterDate = todayIsoDate());
                    await _loadAppointments();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: isToday
                        ? StaffSurfaces.cta
                        : StaffSurfaces.softPanelDeep,
                    foregroundColor: isToday
                        ? Colors.white
                        : StaffSurfaces.brandSoft,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Today',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_loadingHospitals || _loadingAppointments)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
                ),
              )
            else if (_hospitals.isEmpty)
              const StaffEmptyCard(
                message: 'Join a hospital affiliation to view appointments.',
                icon: Icons.local_hospital_outlined,
              )
            else if (_appointments.isEmpty)
              const StaffEmptyCard(
                message: 'No appointments for this date.',
                icon: Icons.event_busy_outlined,
              )
            else
              ..._appointments.map(
                (a) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _AppointmentCard(appointment: a),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SoftStat extends StatelessWidget {
  final String label;
  final String value;

  const _SoftStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: StaffSurfaces.softPanelDeep,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: StaffSurfaces.brandSoft,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: StaffSurfaces.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final StaffAppointmentModel appointment;

  const _AppointmentCard({required this.appointment});

  @override
  Widget build(BuildContext context) {
    final a = appointment;

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
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        a.patientName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: StaffSurfaces.softPanelDeep,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        a.status,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: StaffSurfaces.brandSoft,
                        ),
                      ),
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
                  '${a.appointmentDate} · ${a.timeLabel}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                if (a.hasDosage) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Dosage: ${a.prescribedDosage}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: StaffSurfaces.textMutedSoft,
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
