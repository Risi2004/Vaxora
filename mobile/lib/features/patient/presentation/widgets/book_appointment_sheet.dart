import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/schedule_model.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/patient_repository.dart';

class BookAppointmentSheet extends StatefulWidget {
  final Function(Map<String, dynamic> appointmentData) onAppointmentBooked;

  const BookAppointmentSheet({
    super.key,
    required this.onAppointmentBooked,
  });

  @override
  State<BookAppointmentSheet> createState() => _BookAppointmentSheetState();
}

class _BookAppointmentSheetState extends State<BookAppointmentSheet> {
  final _notesController = TextEditingController();

  List<String> _vaccines = [
    'COVID-19 mRNA Booster (Moderna / Pfizer)',
    'AstraZeneca',
    'Influenza (Quadrivalent Seasonal)',
    'Hepatitis B Recombinant Booster',
    'HPV (Human Papillomavirus)',
    'Tetanus & Diphtheria (Td Adult)',
  ];

  List<HospitalScheduleModel> _schedules = [];

  List<String> _slots = [
    '09:00 AM - 09:20 AM',
    '09:20 AM - 09:40 AM',
    '09:40 AM - 10:00 AM',
    '10:00 AM - 10:20 AM',
    '10:20 AM - 10:40 AM',
    '10:40 AM - 11:00 AM',
    '02:00 PM - 02:20 PM',
    '02:20 PM - 02:40 PM',
  ];

  String? _selectedVaccine;
  HospitalScheduleModel? _selectedSchedule;
  DateTime? _selectedDate;
  String? _selectedSlot;
  bool _isLoadingData = true;
  bool _isLoadingSlots = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now().add(const Duration(days: 2));
    _fetchBackendData();
  }

  Future<void> _fetchBackendData() async {
    setState(() => _isLoadingData = true);
    try {
      final futures = await Future.wait([
        PatientRepository.getAvailableSchedules(),
        PatientRepository.getVaccines(),
      ]);

      final schedules = futures[0] as List<HospitalScheduleModel>;
      final vaccines = futures[1] as List<VaccineItemModel>;

      if (mounted) {
        setState(() {
          if (vaccines.isNotEmpty) {
            final distinctNames = vaccines.map((v) => v.name).toSet().toList();
            _vaccines = distinctNames;
          }
          _schedules = schedules;

          if (_vaccines.isNotEmpty) {
            _selectedVaccine = _vaccines.first;
          }
          if (_schedules.isNotEmpty) {
            _selectedSchedule = _schedules.first;
          }
          _selectedSlot = _slots.first;
          _isLoadingData = false;
        });

        _fetchSlotsForCurrentSelection();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingData = false);
      }
    }
  }

  Future<void> _fetchSlotsForCurrentSelection() async {
    if (_selectedSchedule == null || _selectedVaccine == null || _selectedDate == null) {
      return;
    }

    setState(() => _isLoadingSlots = true);
    try {
      final dateStr =
          "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}";

      final slots = await PatientRepository.getAvailableSlots(
        hospitalUserId: _selectedSchedule!.hospitalUserId,
        vaccineName: _selectedVaccine!,
        date: dateStr,
      );

      if (mounted && slots.isNotEmpty) {
        setState(() {
          _slots = slots.map((s) => s.slot).toList();
          _selectedSlot = _slots.first;
          _isLoadingSlots = false;
        });
      } else if (mounted) {
        setState(() => _isLoadingSlots = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSlots = false);
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.brandBlue,
              onPrimary: Colors.white,
              onSurface: AppColors.textTitle,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() => _selectedDate = picked);
      _fetchSlotsForCurrentSelection();
    }
  }

  Future<void> _handleConfirm() async {
    if (_selectedVaccine == null || _selectedDate == null || _selectedSlot == null) {
      setState(() => _errorMessage = 'Please complete all required fields.');
      return;
    }

    final hospitalUserId = _selectedSchedule?.hospitalUserId;
    if (hospitalUserId == null || hospitalUserId.isEmpty) {
      setState(() => _errorMessage = 'Please select a valid hospital.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final dateStr =
        "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}";

    try {
      final appt = await AppointmentRepository.bookAppointment(
        hospitalUserId: hospitalUserId,
        vaccineName: _selectedVaccine!,
        appointmentDate: dateStr,
        timeSlot: _selectedSlot!,
        notes: _notesController.text.trim(),
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        widget.onAppointmentBooked({
          'id': appt.referenceNumber ?? (appt.id.length > 8 ? appt.id.substring(0, 8) : appt.id),
          'rawId': appt.id,
          'vaccineName': appt.vaccineName,
          'hospitalName': appt.hospitalName,
          'location': 'Assigned Center',
          'date': appt.appointmentDate,
          'time': appt.timeSlot,
          'doctorName': 'Medical Officer',
          'status': appt.status,
          'fee': appt.fee ?? 0.0,
          'isPaid': appt.isPaid,
        });
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().replaceFirst('ApiException: ', '').replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fee = _selectedSchedule != null ? _selectedSchedule!.price : 0.0;
    final feeText = fee == 0.0 ? 'FREE (Gov. Immunization)' : 'LKR ${fee.toStringAsFixed(2)}';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Book Vaccination Slot',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textTitle,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (_isLoadingData) ...[
                const LinearProgressIndicator(color: AppColors.brandBlue),
                const SizedBox(height: 12),
              ],

              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.errorBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Select Vaccine
              const Text(
                'Select Vaccine *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedVaccine,
                decoration: const InputDecoration(hintText: 'Choose Vaccine'),
                dropdownColor: Colors.white,
                isExpanded: true,
                items: _vaccines.map((v) {
                  return DropdownMenuItem(
                    value: v,
                    child: Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  );
                }).toList(),
                onChanged: (v) {
                  setState(() => _selectedVaccine = v);
                  _fetchSlotsForCurrentSelection();
                },
              ),
              const SizedBox(height: 14),

              // Select Hospital
              const Text(
                'Select Hospital / Center *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              if (_schedules.isNotEmpty)
                DropdownButtonFormField<HospitalScheduleModel>(
                  initialValue: _selectedSchedule,
                  decoration: const InputDecoration(hintText: 'Choose Center'),
                  dropdownColor: Colors.white,
                  isExpanded: true,
                  items: _schedules.map((s) {
                    return DropdownMenuItem(
                      value: s,
                      child: Text(
                        '${s.hospitalName} • ${s.vaccineName} (${s.formattedPrice})',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (s) {
                    setState(() {
                      _selectedSchedule = s;
                      if (s?.vaccineName.isNotEmpty == true && _vaccines.contains(s!.vaccineName)) {
                        _selectedVaccine = s.vaccineName;
                      }
                    });
                    _fetchSlotsForCurrentSelection();
                  },
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Text(
                    'National Hospital Network Center (Direct Assignment)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textTitle),
                  ),
                ),
              const SizedBox(height: 14),

              // Select Date
              const Text(
                'Appointment Date *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              InkWell(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.inputAuthBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderAuthInput),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedDate != null
                            ? '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
                            : 'Select Date',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textTitle),
                      ),
                      const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.brandBlue),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Select Slot
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Available 20-Minute Time Slot *',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                  ),
                  if (_isLoadingSlots)
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.brandBlue),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _slots.map((slot) {
                  final isSelected = _selectedSlot == slot;
                  return ChoiceChip(
                    label: Text(
                      slot,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : AppColors.primaryDark,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.brandBlue,
                    backgroundColor: const Color(0xFFF1F5F9),
                    side: BorderSide(color: isSelected ? AppColors.brandBlue : AppColors.borderLight),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedSlot = slot);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              // Medical notes
              const Text(
                'Special Medical Notes / Allergies (Optional)',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'e.g. Mild allergy to penicillin, preferred arm etc.',
                ),
              ),
              const SizedBox(height: 16),

              // Fee summary row
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Service Charge / Fee:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBody)),
                    Text(
                      feeText,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: fee == 0.0 ? AppColors.success : AppColors.brandBlue,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Submit CTA
              Container(
                decoration: BoxDecoration(
                  gradient: AppColors.authButtonGradient,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF174296).withValues(alpha: 0.35),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                        )
                      : const Text(
                          'Confirm & Reserve Slot',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
