import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/staff_appointment_model.dart';
import 'staff_common_widgets.dart';

class StaffAefiReportResult {
  final String severity;
  final String description;
  final String treatmentGiven;
  final DateTime followUpAt;
  final String followUpPlan;
  final bool notifyDoctor;

  const StaffAefiReportResult({
    required this.severity,
    required this.description,
    required this.treatmentGiven,
    required this.followUpAt,
    required this.followUpPlan,
    required this.notifyDoctor,
  });
}

Future<StaffAefiReportResult?> showStaffAefiSheet({
  required BuildContext context,
  required StaffAppointmentModel patient,
}) {
  return showModalBottomSheet<StaffAefiReportResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: StaffSurfaces.cardBg,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
    ),
    builder: (context) => _StaffAefiSheet(patient: patient),
  );
}

class _StaffAefiSheet extends StatefulWidget {
  final StaffAppointmentModel patient;

  const _StaffAefiSheet({required this.patient});

  @override
  State<_StaffAefiSheet> createState() => _StaffAefiSheetState();
}

class _StaffAefiSheetState extends State<_StaffAefiSheet> {
  static const _severities = ['Mild', 'Moderate', 'Severe'];

  String _severity = 'Mild';
  final _symptomsCtrl = TextEditingController();
  final _treatmentCtrl = TextEditingController();
  final _followUpPlanCtrl = TextEditingController();
  DateTime _followUpAt = DateTime.now().add(const Duration(days: 1));
  bool _notifyDoctor = true;
  String? _error;

  @override
  void dispose() {
    _symptomsCtrl.dispose();
    _treatmentCtrl.dispose();
    _followUpPlanCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickFollowUpDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _followUpAt,
      firstDate: DateTime.now(),
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
    setState(() => _followUpAt = picked);
  }

  void _submit() {
    final symptoms = _symptomsCtrl.text.trim();
    final treatment = _treatmentCtrl.text.trim();
    final plan = _followUpPlanCtrl.text.trim();
    if (symptoms.isEmpty) {
      setState(() => _error = 'Symptoms / clinical signs are required.');
      return;
    }
    if (treatment.isEmpty) {
      setState(() => _error = 'Immediate care / treatment given is required.');
      return;
    }
    if (plan.isEmpty) {
      setState(() => _error = 'Follow-up plan is required.');
      return;
    }

    Navigator.of(context).pop(
      StaffAefiReportResult(
        severity: _severity,
        description: symptoms,
        treatmentGiven: treatment,
        followUpAt: DateTime.utc(
          _followUpAt.year,
          _followUpAt.month,
          _followUpAt.day,
          9,
        ),
        followUpPlan: plan,
        notifyDoctor: _notifyDoctor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final p = widget.patient;
    final followLabel =
        '${_followUpAt.year.toString().padLeft(4, '0')}-${_followUpAt.month.toString().padLeft(2, '0')}-${_followUpAt.day.toString().padLeft(2, '0')}';

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 14, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: StaffSurfaces.cardBorder,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Report AEFI',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: StaffSurfaces.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${p.patientName} · ${p.vaccineName}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Severity',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: StaffSurfaces.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              key: ValueKey('severity-$_severity'),
              initialValue: _severity,
              decoration: _fieldDecoration(),
              items: _severities
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: (v) {
                if (v == null) return;
                setState(() => _severity = v);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _symptomsCtrl,
              decoration: _fieldDecoration(
                label: 'Symptoms & clinical signs',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _treatmentCtrl,
              minLines: 2,
              maxLines: 4,
              decoration: _fieldDecoration(
                label: 'Immediate care / treatment given',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 12),
            Material(
              color: StaffSurfaces.softPanel,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: _pickFollowUpDate,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  child: Row(
                    children: [
                      Icon(Icons.event_outlined,
                          size: 18, color: StaffSurfaces.brandSoft),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Follow-up date · $followLabel',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: StaffSurfaces.textPrimary,
                          ),
                        ),
                      ),
                      Icon(Icons.expand_more,
                          color: StaffSurfaces.textMutedSoft),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _followUpPlanCtrl,
              decoration: _fieldDecoration(
                label: 'Follow-up plan',
                hint: 'Phone check-in, clinic review…',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 8),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _notifyDoctor,
              onChanged: (v) => setState(() => _notifyDoctor = v ?? true),
              title: const Text(
                'Alert attending physician',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: StaffSurfaces.textPrimary,
                ),
              ),
              controlAffinity: ListTileControlAffinity.leading,
              activeColor: AppColors.error,
            ),
            if (_error != null) ...[
              const SizedBox(height: 4),
              Text(
                _error!,
                style: const TextStyle(
                  color: AppColors.error,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.error,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Log AEFI & schedule follow-up',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _fieldDecoration({String? label, String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: StaffSurfaces.softPanel,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    );
  }
}
