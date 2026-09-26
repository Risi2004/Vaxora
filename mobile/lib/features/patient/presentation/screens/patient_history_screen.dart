import 'package:flutter/material.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../data/models/vaccination_record_model.dart';
import '../../data/repositories/patient_repository.dart';
import '../widgets/agent_booking_sheet.dart';
import '../widgets/digital_certificate_sheet.dart';

class PatientHistoryScreen extends StatefulWidget {
  const PatientHistoryScreen({super.key});

  @override
  State<PatientHistoryScreen> createState() => _PatientHistoryScreenState();
}

class _PatientHistoryScreenState extends State<PatientHistoryScreen> {
  UserModel? _user;
  PatientVaccinationTimelineModel? _timeline;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistoryData();
  }

  Future<void> _loadHistoryData() async {
    setState(() => _isLoading = true);

    final cached = await StorageService.getUser();
    UserModel? user = cached != null ? UserModel.fromJson(cached) : null;
    try {
      final freshUser = await AuthRepository.getCurrentUser();
      if (freshUser != null) user = freshUser;
    } catch (_) {}

    PatientVaccinationTimelineModel? timeline;
    if (user?.patientProfileId != null && user!.patientProfileId!.isNotEmpty) {
      try {
        timeline = await PatientRepository.getVaccinationTimeline(user.patientProfileId!);
      } catch (_) {}
    }

    if (mounted) {
      setState(() {
        _user = user;
        _timeline = timeline;
        _isLoading = false;
      });
    }
  }

  void _openCertificate(BuildContext context, PatientVaccinationRecordModel rec) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DigitalCertificateSheet(
        vaccineName: rec.vaccineName,
        dose: 'Dose ${rec.doseNumber}',
        administeredDate:
            '${rec.administeredAt.year}-${rec.administeredAt.month.toString().padLeft(2, '0')}-${rec.administeredAt.day.toString().padLeft(2, '0')}',
        administeredBy: rec.administeredByName,
        centerName: rec.notes?.isNotEmpty == true ? rec.notes! : 'National Vaccination Center',
        patientName: _user?.name.toUpperCase() ?? 'CITIZEN',
        vaxoraId: _user?.registrationNumber ?? 'VAX-P-RECORD',
        nic: _user?.nicNumber ?? 'N/A',
      ),
    );
  }

  void _openAgentBookingSheet(BuildContext context) {
    AgentBookingSheet.show(
      context,
      onAppointmentBooked: () {
        _loadHistoryData();
      },
    );
  }

  Widget _buildSummaryBox(String val, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            val,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final patientName = _user?.name.toUpperCase() ?? 'VAXORA CITIZEN';
    final regNo = _user?.registrationNumber ?? 'VAX-P-PENDING';
    final nic = _user?.nicNumber ?? 'Not Provided';
    final totalDoses = _timeline?.totalDoses ?? 0;
    final distinctVaccines = _timeline?.distinctVaccines ?? 0;
    final lastVaccinated = _timeline?.lastVaccinatedAt != null
        ? '${_timeline!.lastVaccinatedAt!.year}-${_timeline!.lastVaccinatedAt!.month.toString().padLeft(2, '0')}-${_timeline!.lastVaccinatedAt!.day.toString().padLeft(2, '0')}'
        : 'None';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Vaccination History', style: AppTextStyles.h3),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _loadHistoryData,
        color: AppColors.brandBlue,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Citizen Profile Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderLight, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.brandBlue.withValues(alpha: 0.12),
                      child: const Icon(Icons.person, size: 36, color: AppColors.brandBlue),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            patientName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textTitle,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'ID: $regNo • NIC: $nic',
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.check_circle, size: 14, color: AppColors.success),
                              const SizedBox(width: 4),
                              Text(
                                _user?.status == 'Active' ? 'Verified Citizen Record' : (_user?.status ?? 'Citizen Record'),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Summary Metric Boxes
              Row(
                children: [
                  Expanded(
                    child: _buildSummaryBox('$totalDoses Doses', 'Total Received', AppColors.brandBlue),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSummaryBox('$distinctVaccines Types', 'Distinct Vaccines', const Color(0xFF8B5CF6)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSummaryBox(lastVaccinated, 'Last Vaccinated', AppColors.success),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 3. Records Heading
              const Text(
                'Administered Doses',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textTitle),
              ),
              const SizedBox(height: 12),

              // 4. Records List
              if (_isLoading) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.brandBlue),
                  ),
                ),
              ] else if (_timeline != null && _timeline!.records.isNotEmpty) ...[
                ..._timeline!.records.map((rec) {
                  final adminDateStr =
                      '${rec.administeredAt.year}-${rec.administeredAt.month.toString().padLeft(2, '0')}-${rec.administeredAt.day.toString().padLeft(2, '0')}';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.borderLight, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryDark.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
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
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'COMPLETED ✅',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.success),
                              ),
                            ),
                            Text(
                              adminDateStr,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          rec.vaccineName,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textTitle),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Dose ${rec.doseNumber} • Route: ${rec.route}${rec.lotNumber != null ? " • Lot: ${rec.lotNumber}" : ""}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Administered by ${rec.administeredByName}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textBody),
                        ),
                        const SizedBox(height: 12),
                        InkWell(
                          onTap: () => _openCertificate(context, rec),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSubtle,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.qr_code, size: 16, color: AppColors.brandBlue),
                                SizedBox(width: 6),
                                Text(
                                  'View Verified Certificate',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandBlue),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ] else ...[
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.verified_user_outlined, size: 48, color: AppColors.brandBlue),
                      const SizedBox(height: 12),
                      const Text(
                        'No Vaccination Records Yet',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textTitle,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'When you receive vaccines at registered hospitals and clinics, your official digital immunization credentials will appear here automatically.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () => _openAgentBookingSheet(context),
                        icon: const Text('🤖', style: TextStyle(fontSize: 14)),
                        label: const Text('Book Your First Dose'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
