import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Record Wastage', style: AppTextStyles.h3),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildBatchSummary(),
              const SizedBox(height: 20),
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.errorBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ],
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'Quantity wasted (vials)',
                  prefixIcon: Icon(Icons.numbers),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Quantity is required';
                  final n = int.tryParse(v.trim());
                  if (n == null || n <= 0) return 'Enter a valid positive number';
                  if (n > widget.batch.available) {
                    return 'Max available is ${widget.batch.available} vials';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _reason,
                decoration: const InputDecoration(
                  hintText: 'Reason for wastage',
                  prefixIcon: Icon(Icons.report_problem),
                ),
                items: _reasons
                    .map((r) => DropdownMenuItem(
                          value: r['value'],
                          child: Text(r['label']!),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _reason = v ?? 'vial_breakage'),
              ),
              const SizedBox(height: 14),

              // ========== DATE PICKER — MANDATORY DEVICE FEATURE ==========
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.inputAuthBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderAuthInput, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month, color: AppColors.textBody),
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
                                color: AppColors.textMuted,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formattedDate,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textTitle,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.edit, size: 16, color: AppColors.textMuted),
                    ],
                  ),
                ),
              ),
              // =============================================================

              const SizedBox(height: 14),
              TextFormField(
                controller: _reportedByController,
                decoration: const InputDecoration(
                  hintText: 'Reported by (your name)',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Reporter name is required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Notes (optional)',
                  prefixIcon: Icon(Icons.notes),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Confirm Wastage',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBatchSummary() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.batch.name, style: AppTextStyles.bodyBold),
          const SizedBox(height: 4),
          Text('Lot: ${widget.batch.lotNumber}', style: AppTextStyles.caption),
          const SizedBox(height: 6),
          Text(
            'Available: ${widget.batch.available} vials',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.brandBlue,
            ),
          ),
        ],
      ),
    );
  }
}