import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../widgets/appointment_card.dart';
import '../widgets/book_appointment_sheet.dart';
import '../widgets/digital_certificate_sheet.dart';

class PatientAppointmentsScreen extends StatefulWidget {
  final List<PatientAppointment>? initialAppointments;
  final Function(Map<String, dynamic> appointmentData)? onAppointmentBooked;

  const PatientAppointmentsScreen({
    super.key,
    this.initialAppointments,
    this.onAppointmentBooked,
  });

  @override
  State<PatientAppointmentsScreen> createState() => _PatientAppointmentsScreenState();
}

class _PatientAppointmentsScreenState extends State<PatientAppointmentsScreen> {
  int _selectedFilter = 0; // 0: Upcoming, 1: Past

  late List<PatientAppointment> _appointments;

  @override
  void initState() {
    super.initState();
    _appointments = widget.initialAppointments ??
        [
          const PatientAppointment(
            id: 'VX-APT-883492',
            vaccineName: 'COVID-19 mRNA Booster (Moderna)',
            hospitalName: 'National Hospital of Sri Lanka',
            location: 'Unit 4, Vaccination Clinic Wing B, Colombo 10',
            date: '2026-10-12',
            time: '10:30 AM',
            doctorName: 'Dr. N. Wickramasinghe',
            status: 'Confirmed',
            fee: 0,
            isPaid: true,
          ),
          const PatientAppointment(
            id: 'VX-APT-772910',
            vaccineName: 'Influenza (Quadrivalent Seasonal)',
            hospitalName: 'Asiri Central Hospital',
            location: 'Norris Canal Rd, Colombo 10',
            date: '2026-11-05',
            time: '02:00 PM',
            doctorName: 'Dr. S. Jayawardena',
            status: 'Confirmed',
            fee: 2500,
            isPaid: false,
          ),
          const PatientAppointment(
            id: 'VX-APT-441203',
            vaccineName: 'Hepatitis B Booster Dose 3',
            hospitalName: 'Colombo South Teaching Hospital',
            location: 'Kalubowila',
            date: '2026-01-15',
            time: '09:00 AM',
            doctorName: 'Dr. R. Fernando',
            status: 'Completed',
            fee: 0,
            isPaid: true,
          ),
        ];
  }

  void _openBookSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookAppointmentSheet(
        onAppointmentBooked: (data) {
          final newApt = PatientAppointment(
            id: data['id'] as String,
            vaccineName: data['vaccineName'] as String,
            hospitalName: data['hospitalName'] as String,
            location: data['location'] as String,
            date: data['date'] as String,
            time: data['time'] as String,
            doctorName: data['doctorName'] as String,
            status: data['status'] as String,
            fee: (data['fee'] as num).toDouble(),
            isPaid: data['isPaid'] as bool,
          );

          setState(() {
            _appointments.insert(0, newApt);
          });

          widget.onAppointmentBooked?.call(data);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppColors.success,
              content: Text('Appointment confirmed for ${newApt.vaccineName}!'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }

  void _showSlipSheet(PatientAppointment apt) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DigitalCertificateSheet(
        vaccineName: apt.vaccineName,
        dose: 'Appointment Verification',
        administeredDate: apt.date,
        administeredBy: apt.doctorName,
        centerName: apt.hospitalName,
        patientName: 'KAVINDA PERERA',
        vaxoraId: apt.id,
        nic: '199824501234',
      ),
    );
  }

  void _cancelAppointment(PatientAppointment apt) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Appointment?', style: TextStyle(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to cancel your appointment for ${apt.vaccineName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep Appointment', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _appointments = _appointments.map((a) {
                  if (a.id == apt.id) {
                    return PatientAppointment(
                      id: a.id,
                      vaccineName: a.vaccineName,
                      hospitalName: a.hospitalName,
                      location: a.location,
                      date: a.date,
                      time: a.time,
                      doctorName: a.doctorName,
                      status: 'Cancelled',
                      fee: a.fee,
                      isPaid: a.isPaid,
                    );
                  }
                  return a;
                }).toList();
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: AppColors.error,
                  content: Text('Appointment cancelled.'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _payNow(PatientAppointment apt) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.payment, color: AppColors.brandBlue),
            SizedBox(width: 8),
            Text('PayHere Gateway', style: TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Paying: LKR ${apt.fee.toStringAsFixed(2)}'),
            const SizedBox(height: 4),
            Text('Hospital: ${apt.hospitalName}'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: const Text(
                'Demo Payment Gateway Mock: Complete payment securely without live charges.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _appointments = _appointments.map((a) {
                  if (a.id == apt.id) {
                    return PatientAppointment(
                      id: a.id,
                      vaccineName: a.vaccineName,
                      hospitalName: a.hospitalName,
                      location: a.location,
                      date: a.date,
                      time: a.time,
                      doctorName: a.doctorName,
                      status: 'Confirmed',
                      fee: a.fee,
                      isPaid: true,
                    );
                  }
                  return a;
                }).toList();
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: AppColors.success,
                  content: Text('Payment confirmed! Receipt sent to your email.'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
            child: const Text('Authorize Payment', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredAppointments = _selectedFilter == 0
        ? _appointments.where((a) => a.status.toLowerCase() != 'completed').toList()
        : _appointments.where((a) => a.status.toLowerCase() == 'completed' || a.status.toLowerCase() == 'cancelled').toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Appointments', style: AppTextStyles.h3),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _openBookSheet,
            icon: const Icon(Icons.add_circle, color: AppColors.brandBlue, size: 26),
            tooltip: 'Book Slot',
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs (Upcoming / Past)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedFilter = 0),
                      borderRadius: BorderRadius.circular(9),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        decoration: BoxDecoration(
                          color: _selectedFilter == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: _selectedFilter == 0
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.05),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Text(
                          'Upcoming (${_appointments.where((a) => a.status.toLowerCase() != 'completed').length})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _selectedFilter == 0 ? AppColors.brandBlue : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedFilter = 1),
                      borderRadius: BorderRadius.circular(9),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        decoration: BoxDecoration(
                          color: _selectedFilter == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: _selectedFilter == 1
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.05),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Text(
                          'Past / History (${_appointments.where((a) => a.status.toLowerCase() == 'completed' || a.status.toLowerCase() == 'cancelled').length})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _selectedFilter == 1 ? AppColors.brandBlue : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Appointment List
          Expanded(
            child: filteredAppointments.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.event_busy, size: 54, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          Text(
                            _selectedFilter == 0 ? 'No upcoming appointments' : 'No past appointments on record',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textTitle),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Schedule your recommended vaccination dosage at an accredited hospital or MOH center.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: _openBookSheet,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Book Appointment'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brandBlue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                    itemCount: filteredAppointments.length,
                    itemBuilder: (context, index) {
                      final apt = filteredAppointments[index];
                      return AppointmentCard(
                        appointment: apt,
                        onViewSlip: () => _showSlipSheet(apt),
                        onCancel: () => _cancelAppointment(apt),
                        onPayNow: !apt.isPaid ? () => _payNow(apt) : null,
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openBookSheet,
        backgroundColor: AppColors.brandBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Book Slot', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
