import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../widgets/patient_stat_card.dart';
import '../widgets/immunization_timeline_item.dart';
import '../widgets/digital_certificate_sheet.dart';
import '../widgets/book_appointment_sheet.dart';

class PatientDashboardScreen extends StatelessWidget {
  final Function(int targetTab) onNavigateTab;
  final Function(Map<String, dynamic> appointmentData)? onAppointmentBooked;

  const PatientDashboardScreen({
    super.key,
    required this.onNavigateTab,
    this.onAppointmentBooked,
  });

  void _openBookSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookAppointmentSheet(
        onAppointmentBooked: (data) {
          onAppointmentBooked?.call(data);
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

  void _openDigitalPassSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const DigitalCertificateSheet(
        vaccineName: 'COVID-19 mRNA Booster (Moderna)',
        dose: 'Dose 3 of 3',
        administeredDate: '15 Jan 2026',
        administeredBy: 'Dr. N. Wickramasinghe',
        centerName: 'National Hospital of Sri Lanka',
        patientName: 'KAVINDA PERERA',
        vaxoraId: 'VAX-P-883492',
        nic: '199824501234',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
                          child: const Row(
                            children: [
                              Icon(Icons.shield_outlined, color: Colors.white, size: 14),
                              SizedBox(width: 5),
                              Text(
                                'Pass Verified',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => _openDigitalPassSheet(context),
                          icon: const Icon(Icons.qr_code, color: Colors.white, size: 22),
                          tooltip: 'View QR Health Pass',
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.white.withValues(alpha: 0.15),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Welcome back, Kavinda! 👋',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Your immunization pass is verified and up-to-date. Next booster dose confirmed for Oct 12, 2026.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.85),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _openBookSheet(context),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Book Vaccination'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.brandBlue,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
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
                childAspectRatio: 1.35,
                children: const [
                  PatientStatCard(
                    icon: '📅',
                    iconBgColor: AppColors.brandBlue,
                    label: 'Upcoming Dose',
                    value: '12 Oct 2026',
                    note: 'COVID-19 Booster',
                  ),
                  PatientStatCard(
                    icon: '💉',
                    iconBgColor: AppColors.success,
                    label: 'Doses Received',
                    value: '4 Completed',
                    note: '100% Up to date',
                  ),
                  PatientStatCard(
                    icon: '🛡️',
                    iconBgColor: Color(0xFF8B5CF6),
                    label: 'Health Pass',
                    value: 'Verified',
                    note: 'QR International',
                  ),
                  PatientStatCard(
                    icon: '⏰',
                    iconBgColor: Color(0xFFD97706),
                    label: 'Next Due',
                    value: 'Influenza',
                    note: 'In 60 days',
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
                child: Column(
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
                          onPressed: () => onNavigateTab(1), // Go to Appointments tab
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text(
                            'View all →',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandBlue),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Vaccine badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'COVID-19 Booster (Moderna)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandBlue),
                      ),
                    ),
                    const SizedBox(height: 8),

                    const Text(
                      'National Hospital of Sri Lanka',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textTitle),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '📍 Unit 4, Vaccination Clinic Wing B, Colombo 10',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 12),

                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('🗓️ Mon, Oct 12 • 10:30 AM', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          Text('👨‍⚕️ Dr. Wickramasinghe', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => onNavigateTab(1),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.borderLight),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Manage', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => _openDigitalPassSheet(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brandBlue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('View QR Slip', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
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
                            onTap: () => onNavigateTab(2), // Go to History tab
                            child: const Text(
                              'Check Certificates →',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandBlue),
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
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textTitle),
                        ),
                        TextButton(
                          onPressed: () => onNavigateTab(2),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text(
                            'Full History →',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandBlue),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const ImmunizationTimelineItem(
                      icon: '💉',
                      name: 'COVID-19 mRNA Booster',
                      target: 'Dose 3 • Annual Protection',
                      status: 'Scheduled',
                      date: 'Oct 12, 2026',
                    ),
                    const Divider(color: AppColors.borderLight, height: 1),
                    const ImmunizationTimelineItem(
                      icon: '🛡️',
                      name: 'Influenza (Quadrivalent)',
                      target: 'Seasonal Influenza',
                      status: 'Due Soon',
                      date: 'Nov 2026',
                    ),
                    const Divider(color: AppColors.borderLight, height: 1),
                    const ImmunizationTimelineItem(
                      icon: '✅',
                      name: 'Hepatitis B Booster',
                      target: 'Dose 3 Completed',
                      status: 'Completed',
                      date: 'Jan 15, 2026',
                    ),
                    const Divider(color: AppColors.borderLight, height: 1),
                    const ImmunizationTimelineItem(
                      icon: '✅',
                      name: 'Tetanus, Diphtheria (Td)',
                      target: '10-Year Routine Booster',
                      status: 'Completed',
                      date: 'Aug 04, 2025',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
