import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

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

  final List<String> _vaccines = [
    'COVID-19 mRNA Booster (Moderna / Pfizer)',
    'Influenza (Quadrivalent Seasonal)',
    'Hepatitis B Recombinant Booster',
    'HPV (Human Papillomavirus)',
    'Tetanus & Diphtheria (Td Adult)',
  ];

  final List<Map<String, String>> _hospitals = [
    {
      'name': 'National Hospital of Sri Lanka',
      'location': 'Colombo 10',
      'type': 'Government Center',
      'fee': '0',
    },
    {
      'name': 'Colombo South Teaching Hospital',
      'location': 'Kalubowila',
      'type': 'Government Center',
      'fee': '0',
    },
    {
      'name': 'Asiri Central Hospital',
      'location': 'Norris Canal Rd, Colombo 10',
      'type': 'Private Healthcare',
      'fee': '2500',
    },
    {
      'name': 'Kandy National Hospital',
      'location': 'William Gopallawa Mawatha, Kandy',
      'type': 'Government Center',
      'fee': '0',
    },
  ];

  final List<String> _slots = [
    '09:00 AM - 09:20 AM',
    '09:20 AM - 09:40 AM',
    '10:00 AM - 10:20 AM',
    '10:30 AM - 10:50 AM',
    '11:00 AM - 11:20 AM',
    '02:00 PM - 02:20 PM',
    '02:30 PM - 02:50 PM',
  ];

  String? _selectedVaccine;
  Map<String, String>? _selectedHospital;
  DateTime? _selectedDate;
  String? _selectedSlot;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedVaccine = _vaccines.first;
    _selectedHospital = _hospitals.first;
    _selectedSlot = _slots.first;
    _selectedDate = DateTime.now().add(const Duration(days: 2));
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
    }
  }

  void _handleConfirm() {
    if (_selectedVaccine == null ||
        _selectedHospital == null ||
        _selectedDate == null ||
        _selectedSlot == null) {
      return;
    }

    setState(() => _isSubmitting = true);

    Future.delayed(const Duration(milliseconds: 900), () {
      if (mounted) {
        setState(() => _isSubmitting = false);
        final dateStr =
            "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}";

        widget.onAppointmentBooked({
          'id': 'VX-APT-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
          'vaccineName': _selectedVaccine!,
          'hospitalName': _selectedHospital!['name']!,
          'location': _selectedHospital!['location']!,
          'date': dateStr,
          'time': _selectedSlot!.split(' - ').first,
          'doctorName': 'Assigned Medical Officer',
          'status': 'Confirmed',
          'fee': double.tryParse(_selectedHospital!['fee'] ?? '0') ?? 0.0,
          'isPaid': (_selectedHospital!['fee'] ?? '0') == '0',
        });
        Navigator.pop(context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final fee = _selectedHospital?['fee'] ?? '0';

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
              const SizedBox(height: 14),

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
                onChanged: (v) => setState(() => _selectedVaccine = v),
              ),
              const SizedBox(height: 14),

              // Select Hospital
              const Text(
                'Select Hospital / Center *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<Map<String, String>>(
                initialValue: _selectedHospital,
                decoration: const InputDecoration(hintText: 'Choose Center'),
                dropdownColor: Colors.white,
                isExpanded: true,
                items: _hospitals.map((h) {
                  return DropdownMenuItem(
                    value: h,
                    child: Text('${h['name']} (${h['location']})',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  );
                }).toList(),
                onChanged: (h) => setState(() => _selectedHospital = h),
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
              const Text(
                'Available 20-Minute Time Slot *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _slots.map((slot) {
                  final isSelected = _selectedSlot == slot;
                  return ChoiceChip(
                    label: Text(slot, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : AppColors.primaryDark)),
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
                      fee == '0' ? 'FREE (Gov. Immunization)' : 'LKR $fee',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: fee == '0' ? AppColors.success : AppColors.brandBlue,
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
