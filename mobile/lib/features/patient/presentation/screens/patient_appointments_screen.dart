import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../widgets/appointment_card.dart';
import '../widgets/book_appointment_sheet.dart';
import '../widgets/digital_certificate_sheet.dart';
import '../widgets/agent_booking_sheet.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/data/repositories/auth_repository.dart';

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
  UserModel? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _appointments = widget.initialAppointments ?? [];
    _loadBackendAppointments();
  }

  Future<void> _loadBackendAppointments() async {
    setState(() => _isLoading = true);
    try {
      final userFuture = AuthRepository.getCurrentUser();
      final apptsFuture = AppointmentRepository.getMyAppointments();
      final user = await userFuture;
      final backendList = await apptsFuture;
      if (mounted) {
        setState(() {
          _user = user;
          _appointments = backendList.map((b) => PatientAppointment(
            id: b.referenceNumber ?? (b.id.length > 8 ? b.id.substring(0, 8) : b.id),
            rawId: b.id,
            vaccineName: b.vaccineName,
            hospitalName: b.hospitalName,
            location: 'Assigned Vaccination Center',
            date: b.appointmentDate,
            time: b.timeSlot,
            doctorName: 'Medical Officer',
            status: b.status,
            fee: b.fee ?? 0.0,
            isPaid: b.isPaid,
          )).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openAgentBookingSheet() {
    AgentBookingSheet.show(
      context,
      onAppointmentBooked: () {
        _loadBackendAppointments();
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

  void _openBookSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookAppointmentSheet(
        onAppointmentBooked: (data) {
          final newApt = PatientAppointment(
            id: data['id'] as String,
            rawId: data['id'] as String,
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
        patientName: _user?.name.toUpperCase() ?? 'VALUED CITIZEN',
        vaxoraId: _user?.registrationNumber ?? apt.id,
        nic: _user?.nicNumber ?? _user?.registrationNumber ?? 'VAX-P-RECORD',
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
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final targetId = apt.rawId.isNotEmpty ? apt.rawId : apt.id;
                await AppointmentRepository.cancelAppointment(targetId);
                _loadBackendAppointments();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppColors.error,
                      content: Text('Appointment cancelled successfully.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: AppColors.error,
                      content: Text('Failed to cancel appointment: $e'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
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
          TextButton.icon(
            onPressed: _openAgentBookingSheet,
            icon: const Text('🤖', style: TextStyle(fontSize: 16)),
            label: const Text('AI Booking', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.brandBlue)),
          ),
          IconButton(
            onPressed: _openBookSheet,
            icon: const Icon(Icons.add_circle, color: AppColors.brandBlue, size: 26),
            tooltip: 'Manual Booking',
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
            child: RefreshIndicator(
              onRefresh: _loadBackendAppointments,
              color: AppColors.brandBlue,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.brandBlue))
                  : filteredAppointments.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 80),
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
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
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
