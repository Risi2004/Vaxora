import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../widgets/digital_certificate_sheet.dart';

class VaccinationRecordItem {
  final String id;
  final String vaccineName;
  final String doseNumber;
  final String administeredAt;
  final String administeredBy;
  final String centerName;
  final String batchNumber;

  const VaccinationRecordItem({
    required this.id,
    required this.vaccineName,
    required this.doseNumber,
    required this.administeredAt,
    required this.administeredBy,
    required this.centerName,
    required this.batchNumber,
  });
}

class PatientHistoryScreen extends StatelessWidget {
  const PatientHistoryScreen({super.key});

  static const List<VaccinationRecordItem> sampleRecords = [
    VaccinationRecordItem(
      id: 'REC-001',
      vaccineName: 'COVID-19 mRNA Vaccine (Pfizer-BioNTech)',
      doseNumber: 'Dose 1',
      administeredAt: '2021-08-14',
      administeredBy: 'Dr. M. Bandara',
      centerName: 'National Hospital of Sri Lanka',
      batchNumber: 'PZ-9921',
    ),
    VaccinationRecordItem(
      id: 'REC-002',
      vaccineName: 'COVID-19 mRNA Vaccine (Pfizer-BioNTech)',
      doseNumber: 'Dose 2',
      administeredAt: '2021-09-15',
      administeredBy: 'Dr. M. Bandara',
      centerName: 'National Hospital of Sri Lanka',
      batchNumber: 'PZ-9980',
    ),
    VaccinationRecordItem(
      id: 'REC-003',
      vaccineName: 'COVID-19 mRNA Booster (Moderna)',
      doseNumber: 'Dose 3',
      administeredAt: '2022-03-10',
      administeredBy: 'Dr. N. Wickramasinghe',
      centerName: 'Colombo South Teaching Hospital',
      batchNumber: 'MD-4402',
    ),
    VaccinationRecordItem(
      id: 'REC-004',
      vaccineName: 'Hepatitis B Recombinant Booster',
      doseNumber: 'Dose 3',
      administeredAt: '2026-01-15',
      administeredBy: 'Dr. R. Fernando',
      centerName: 'Colombo South Teaching Hospital',
      batchNumber: 'HB-3301',
    ),
  ];

  void _openCertificate(BuildContext context, VaccinationRecordItem rec) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DigitalCertificateSheet(
        vaccineName: rec.vaccineName,
        dose: rec.doseNumber,
        administeredDate: rec.administeredAt,
        administeredBy: rec.administeredBy,
        centerName: rec.centerName,
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
      appBar: AppBar(
        title: const Text('Vaccination History', style: AppTextStyles.h3),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
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
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'KAVINDA PERERA',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textTitle,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'ID: VAX-P-883492 • NIC: 199824501234',
                          style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                        ),
                        SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.check_circle, size: 14, color: AppColors.success),
                            SizedBox(width: 4),
                            Text(
                              'Verified Citizen Record',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success),
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
                  child: _buildSummaryBox('4 Doses', 'Total Received', AppColors.brandBlue),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildSummaryBox('2 Types', 'Distinct Vaccines', const Color(0xFF8B5CF6)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildSummaryBox('15 Jan 2026', 'Last Vaccinated', AppColors.success),
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
            ...sampleRecords.map((rec) {
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
                          rec.administeredAt,
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
                      '${rec.doseNumber} • Batch: ${rec.batchNumber}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Administered by ${rec.administeredBy} at ${rec.centerName}',
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
                              'View Digital Certificate / Pass',
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
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBox(String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight, width: 1.5),
      ),
      child: Column(
        children: [
          Text(
            value,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
