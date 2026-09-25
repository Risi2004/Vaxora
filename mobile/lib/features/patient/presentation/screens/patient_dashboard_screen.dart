import 'package:flutter/material.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../data/models/appointment_model.dart';
import '../../data/models/vaccination_record_model.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/patient_repository.dart';
import '../widgets/agent_booking_sheet.dart';
import '../widgets/book_appointment_sheet.dart';
import '../widgets/digital_certificate_sheet.dart';
import '../widgets/immunization_timeline_item.dart';
import '../widgets/patient_stat_card.dart';
import '../widgets/appointment_card.dart';
import '../widgets/payhere_checkout_sheet.dart';

class PatientDashboardScreen extends StatefulWidget {
  final Function(int targetTab) onNavigateTab;
  final Function(Map<String, dynamic> appointmentData)? onAppointmentBooked;

  const PatientDashboardScreen({
    super.key,
    required this.onNavigateTab,
    this.onAppointmentBooked,
  });

  @override
  State<PatientDashboardScreen> createState() => _PatientDashboardScreenState();
}

class _PatientDashboardScreenState extends State<PatientDashboardScreen> {
  UserModel? _user;
  List<AppointmentModel> _appointments = [];
  PatientVaccinationTimelineModel? _timeline;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

    // 1. Get cached or fresh user profile
    final cached = await StorageService.getUser();
    UserModel? user = cached != null ? UserModel.fromJson(cached) : null;
    try {
      final freshUser = await AuthRepository.getCurrentUser();
      if (freshUser != null) user = freshUser;
    } catch (_) {}

    // 2. Fetch real appointments from backend
    List<AppointmentModel> appts = [];
    try {
      appts = await AppointmentRepository.getMyAppointments();
    } catch (_) {}

    // 3. Fetch real vaccination timeline if profile ID exists
    PatientVaccinationTimelineModel? timeline;
    if (user?.patientProfileId != null && user!.patientProfileId!.isNotEmpty) {
      try {
        timeline = await PatientRepository.getVaccinationTimeline(user.patientProfileId!);
      } catch (_) {}
    }

    if (mounted) {
      setState(() {
        _user = user;
        _appointments = appts;
        _timeline = timeline;
        _isLoading = false;
      });
    }
  }

  void _openBookSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookAppointmentSheet(
        onAppointmentBooked: (data) {
          widget.onAppointmentBooked?.call(data);
          _loadDashboardData();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppColors.success,
              content: Text('Appointment reserved for ${data['vaccineName']}!'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }

  void _openAgentBookingSheet(BuildContext context) {
    AgentBookingSheet.show(
      context,
      onAppointmentBooked: () {
        _loadDashboardData();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text('Appointment confirmed via AI Concierge!'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      },
    );
  }

  void _openDigitalPassSheet(BuildContext context, {AppointmentModel? appt}) {
    final userName = _user?.name.toUpperCase() ?? 'VAXORA CITIZEN';
    final regNo = _user?.registrationNumber ?? 'VAX-P-PENDING';
    final nic = _user?.nicNumber ?? 'N/A';

    final vaccineName = appt?.vaccineName ??
        (_timeline?.records.isNotEmpty == true
            ? _timeline!.records.first.vaccineName
            : 'Vaxora Certified Health Pass');

    final dose = appt != null
        ? (appt.doseNumber ?? 'Scheduled Dose')
        : (_timeline?.records.isNotEmpty == true
            ? 'Dose ${_timeline!.records.first.doseNumber}'
            : 'Pass Active');

    final date = appt?.appointmentDate ??
        (_timeline?.lastVaccinatedAt != null
            ? '${_timeline!.lastVaccinatedAt!.year}-${_timeline!.lastVaccinatedAt!.month.toString().padLeft(2, '0')}-${_timeline!.lastVaccinatedAt!.day.toString().padLeft(2, '0')}'
            : 'Active 2026');

    final center = appt?.hospitalName ??
        (_timeline?.records.isNotEmpty == true
            ? _timeline!.records.first.administeredByName
            : 'National Immunization Network');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DigitalCertificateSheet(
        vaccineName: vaccineName,
        dose: dose,
        administeredDate: date,
        administeredBy: 'Authorized Medical Officer',
        centerName: center,
        patientName: userName,
        vaxoraId: regNo,
        nic: nic,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userName = _user?.name.isNotEmpty == true ? _user!.name : 'Citizen';
    final upcomingAppointments = _appointments
        .where((a) => a.status.toLowerCase() != 'cancelled' && a.status.toLowerCase() != 'completed')
        .toList();
    final nextAppointment = upcomingAppointments.isNotEmpty ? upcomingAppointments.first : null;
    final totalDoses = _timeline?.totalDoses ??
        _appointments.where((a) => a.status.toLowerCase() == 'completed').length;
    final scheduledCount = _appointments
        .where((a) => a.status.toLowerCase() != 'cancelled' && a.status.toLowerCase() != 'completed')
        .length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppColors.brandBlue,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isLoading) ...[
                  const LinearProgressIndicator(color: AppColors.brandBlue),
                  const SizedBox(height: 12),
                ],

                // 1. Welcome Card Banner
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF19469D),
                        Color(0xFF1E1B4B),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.brandBlue.withValues(alpha: 0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.shield_outlined, color: Colors.white, size: 14),
                                const SizedBox(width: 5),
                                Text(
                                  _user?.registrationNumber ?? 'Pass Active',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _openDigitalPassSheet(context, appt: nextAppointment),
                            icon: const Icon(Icons.qr_code, color: Colors.white, size: 22),
                            tooltip: 'View QR Health Pass',
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.white.withValues(alpha: 0.15),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Welcome back, $userName! 👋',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        nextAppointment != null
                            ? 'Your next immunization appointment for ${nextAppointment.vaccineName} is confirmed on ${nextAppointment.appointmentDate}.'
                            : 'Your immunization profile is synced with the National Health Registry. Book your next dose anytime.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.85),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _openAgentBookingSheet(context),
                            icon: const Text('🤖', style: TextStyle(fontSize: 14)),
                            label: const Text('Book with AI Concierge'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: AppColors.brandBlue,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => _openBookSheet(context),
                            icon: const Icon(Icons.add, size: 16, color: Colors.white),
                            label: const Text('Manual Form', style: TextStyle(color: Colors.white)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.white70),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Metrics Grid (2x2)
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.18,
                  children: [
                    PatientStatCard(
                      icon: '📅',
                      iconBgColor: AppColors.brandBlue,
                      label: 'Upcoming Dose',
                      value: nextAppointment != null ? nextAppointment.appointmentDate : 'None',
                      note: nextAppointment != null ? nextAppointment.vaccineName : 'All clear',
                    ),
                    PatientStatCard(
                      icon: '💉',
                      iconBgColor: AppColors.success,
                      label: 'Doses Received',
                      value: '$totalDoses Completed',
                      note: '${_timeline?.distinctVaccines ?? 0} Distinct vaccines',
                    ),
                    PatientStatCard(
                      icon: '🛡️',
                      iconBgColor: const Color(0xFF8B5CF6),
                      label: 'Health Pass',
                      value: _user?.status ?? 'Active',
                      note: _user?.registrationNumber ?? 'Verified Citizen',
                    ),
                    PatientStatCard(
                      icon: '⏰',
                      iconBgColor: const Color(0xFFD97706),
                      label: 'Scheduled',
                      value: '$scheduledCount In Queue',
                      note: scheduledCount > 0 ? 'Upcoming doses' : 'Up to date',
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // 3. Spotlight Next Confirmed Appointment Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderLight, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: nextAppointment != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Next Confirmed Appointment',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textTitle,
                                  ),
                                ),
                                TextButton(
                                  onPressed: () => widget.onNavigateTab(1),
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text(
                                    'View all →',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.brandBlue,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                nextAppointment.vaccineName,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.brandBlue,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              nextAppointment.hospitalName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textTitle,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '📍 Ref: ${nextAppointment.referenceNumber ?? (nextAppointment.id.length > 8 ? nextAppointment.id.substring(0, 8) : nextAppointment.id)}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '🗓️ ${nextAppointment.appointmentDate} • ${nextAppointment.timeSlot}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    nextAppointment.status,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.brandBlue,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                if (!nextAppointment.isPaid &&
                                    (nextAppointment.fee ?? 0) > 0 &&
                                    nextAppointment.status.toLowerCase() != 'confirmed' &&
                                    nextAppointment.status.toLowerCase() != 'completed' &&
                                    nextAppointment.status.toLowerCase() != 'cancelled') ...[
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () {
                                        final apt = PatientAppointment(
                                          id: nextAppointment.referenceNumber ?? (nextAppointment.id.length > 8 ? nextAppointment.id.substring(0, 8) : nextAppointment.id),
                                          rawId: nextAppointment.id,
                                          vaccineName: nextAppointment.vaccineName,
                                          hospitalName: nextAppointment.hospitalName,
                                          location: 'Assigned Center',
                                          date: nextAppointment.appointmentDate,
                                          time: nextAppointment.timeSlot,
                                          doctorName: 'Medical Officer',
                                          status: nextAppointment.status,
                                          fee: nextAppointment.fee ?? 0.0,
                                          isPaid: nextAppointment.isPaid,
                                        );
                                        PayHereCheckoutSheet.show(
                                          context,
                                          appointment: apt,
                                          onPaymentSuccess: _loadDashboardData,
                                        );
                                      },
                                      icon: const Icon(Icons.payment, size: 16),
                                      label: Text('Pay LKR ${(nextAppointment.fee ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF16A34A),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => widget.onNavigateTab(1),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: AppColors.borderLight),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text(
                                      'Manage',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primaryDark,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: () => _openDigitalPassSheet(context, appt: nextAppointment),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.brandBlue,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text('View Slip', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            const SizedBox(height: 10),
                            const Icon(Icons.event_available, color: AppColors.brandBlue, size: 40),
                            const SizedBox(height: 10),
                            const Text(
                              'No Upcoming Appointments',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textTitle,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'You have no pending vaccination sessions. Schedule one easily using our AI Concierge or manual form.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                            ),
                            const SizedBox(height: 14),
                            ElevatedButton.icon(
                              onPressed: () => _openAgentBookingSheet(context),
                              icon: const Text('🤖', style: TextStyle(fontSize: 14)),
                              label: const Text('Book Appointment'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.brandBlue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                            const SizedBox(height: 6),
                          ],
                        ),
                ),
                const SizedBox(height: 20),

                // 4. Travel & Health Advisory Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('✈️', style: TextStyle(fontSize: 22)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'International Travel Immunization',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textTitle,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Planning travel? Ensure Yellow Fever and Meningococcal records are renewed 14 days prior to departure.',
                              style: TextStyle(fontSize: 12, color: AppColors.textBody, height: 1.4),
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () => widget.onNavigateTab(2),
                              child: const Text(
                                'Check Certificates →',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.brandBlue,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 5. Immunization Tracker
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderLight, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Immunization Tracker',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textTitle,
                            ),
                          ),
                          TextButton(
                            onPressed: () => widget.onNavigateTab(2),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Full History →',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.brandBlue,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_timeline != null && _timeline!.records.isNotEmpty) ...[
                        for (int i = 0; i < _timeline!.records.length && i < 4; i++) ...[
                          if (i > 0) const Divider(color: AppColors.borderLight, height: 1),
                          ImmunizationTimelineItem(
                            icon: '💉',
                            name: _timeline!.records[i].vaccineName,
                            target: 'Dose ${_timeline!.records[i].doseNumber} • ${_timeline!.records[i].route}',
                            status: 'Completed',
                            date: '${_timeline!.records[i].administeredAt.year}-${_timeline!.records[i].administeredAt.month.toString().padLeft(2, '0')}-${_timeline!.records[i].administeredAt.day.toString().padLeft(2, '0')}',
                          ),
                        ],
                      ] else if (_appointments.isNotEmpty) ...[
                        for (int i = 0; i < _appointments.length && i < 3; i++) ...[
                          if (i > 0) const Divider(color: AppColors.borderLight, height: 1),
                          ImmunizationTimelineItem(
                            icon: '🗓️',
                            name: _appointments[i].vaccineName,
                            target: '${_appointments[i].hospitalName} • ${_appointments[i].doseNumber ?? "Dose 1"}',
                            status: _appointments[i].status,
                            date: _appointments[i].appointmentDate,
                          ),
                        ],
                      ] else ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(
                            child: Column(
                              children: [
                                Text('💉', style: TextStyle(fontSize: 28)),
                                SizedBox(height: 8),
                                Text(
                                  'No Immunization Records Found',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textTitle,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Completed doses recorded by medical officers will appear here.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
