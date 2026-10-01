import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../../data/models/batch_model.dart';
import '../../data/repositories/inventory_repository.dart';

class WastageScreen extends StatefulWidget {
  final BatchModel batch;
  const WastageScreen({super.key, required this.batch});

  @override
  State<WastageScreen> createState() => _WastageScreenState();
}

class _WastageScreenState extends State<WastageScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _reportedByController = TextEditingController();
  final _notesController = TextEditingController();

  String _reason = 'vial_breakage';
  DateTime _incidentDate = DateTime.now();
  bool _isLoading = false;
  String? _errorMessage;

  static const List<Map<String, String>> _reasons = [
    {'value': 'vial_breakage', 'label': 'Vial Breakage / Damage'},
    {'value': 'cold_chain_excursion', 'label': 'Cold Chain Excursion'},
    {'value': 'expired_unopened', 'label': 'Expired (Unopened)'},
    {'value': 'open_vial_expiration', 'label': 'Open Vial Expired'},
    {'value': 'reconstitution_error', 'label': 'Reconstitution Error'},
    {'value': 'contamination', 'label': 'Contamination'},
  ];

  @override
  void dispose() {
    _quantityController.dispose();
    _reportedByController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _incidentDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: 'Select incident date',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: StaffSurfaces.cta,
              onPrimary: Colors.white,
              onSurface: StaffSurfaces.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _incidentDate = picked);
    }
  }

  String get _formattedDate =>
      '${_incidentDate.year}-${_incidentDate.month.toString().padLeft(2, '0')}-${_incidentDate.day.toString().padLeft(2, '0')}';

  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);

    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);

    try {
      await InventoryRepository.logWastage(
        batchId: widget.batch.id,
        quantity: int.parse(_quantityController.text.trim()),
        reason: _reason,
        reportedBy: _reportedByController.text.trim(),
        notes: _notesController.text.trim(),
        incidentDate: _formattedDate,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Logged ${_quantityController.text} wasted vials'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  InputDecoration _field(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: StaffSurfaces.textMutedSoft,
        fontSize: 13,
      ),
      prefixIcon: Icon(icon, color: StaffSurfaces.brandSoft),
      filled: true,
      fillColor: StaffSurfaces.cardBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: StaffSurfaces.brandSoft),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(title: 'Record wastage'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        children: [
          const StaffPageIntro(
            eyebrow: 'Loss report',
            title: 'Log wastage',
            subtitle: 'Record vials that cannot be administered from this lot.',
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: StaffSurfaces.card(
              color: AppColors.errorBg,
              borderColor: AppColors.error.withValues(alpha: 0.28),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.batch.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Lot ${widget.batch.lotNumber}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${widget.batch.available} vials on hand',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null) ...[
                  StaffErrorBanner(
                    message: _errorMessage!,
                    onDismiss: () => setState(() => _errorMessage = null),
                  ),
                  const SizedBox(height: 14),
                ],
                TextFormField(
                  controller: _quantityController,
                  keyboardType: TextInputType.number,
                  decoration:
                      _field('Quantity wasted (vials)', Icons.numbers),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Quantity is required';
                    }
                    final n = int.tryParse(v.trim());
                    if (n == null || n <= 0) {
                      return 'Enter a valid positive number';
                    }
                    if (n > widget.batch.available) {
                      return 'Max available is ${widget.batch.available} vials';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _reason,
                  decoration: _field(
                    'Reason for wastage',
                    Icons.report_problem_outlined,
                  ),
                  dropdownColor: StaffSurfaces.cardBg,
                  items: _reasons
                      .map(
                        (r) => DropdownMenuItem(
                          value: r['value'],
                          child: Text(
                            r['label']!,
                            style: const TextStyle(
                              color: StaffSurfaces.textPrimary,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) =>
                      setState(() => _reason = v ?? 'vial_breakage'),
                ),
                const SizedBox(height: 14),
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: StaffSurfaces.card(),
                    child: Row(
                      children: [
                        Icon(
                          Icons.calendar_month_outlined,
                          color: StaffSurfaces.brandSoft,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'INCIDENT DATE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: StaffSurfaces.textSecondary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formattedDate,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: StaffSurfaces.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.edit_outlined,
                          size: 16,
                          color: StaffSurfaces.textMutedSoft,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _reportedByController,
                  decoration: _field(
                    'Reported by (your name)',
                    Icons.person_outline,
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Reporter name is required'
                      : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: _field('Notes (optional)', Icons.notes_outlined),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    textStyle: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('Confirm wastage'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
