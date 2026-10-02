import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../../data/models/batch_model.dart';
import '../../data/repositories/inventory_repository.dart';

class IssueStockScreen extends StatefulWidget {
  final BatchModel batch;
  const IssueStockScreen({super.key, required this.batch});

  @override
  State<IssueStockScreen> createState() => _IssueStockScreenState();
}

class _IssueStockScreenState extends State<IssueStockScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _sessionController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _quantityController.dispose();
    _sessionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);

    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);

    try {
      await InventoryRepository.issueStock(
        batchId: widget.batch.id,
        quantity: int.parse(_quantityController.text.trim()),
        sessionReference: _sessionController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Issued ${_quantityController.text} vials to ${_sessionController.text}',
            ),
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
      appBar: StaffSurfaces.appBar(title: 'Issue stock'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        children: [
          const StaffPageIntro(
            eyebrow: 'Dispense',
            title: 'Issue vials',
            subtitle: 'Record vials leaving this lot for a clinic session.',
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: StaffSurfaces.card(
              color: AppColors.successBg,
              borderColor: AppColors.success.withValues(alpha: 0.28),
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
                  '${widget.batch.available} vials available',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
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
                  decoration: _field('Quantity to issue (vials)', Icons.numbers),
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
                TextFormField(
                  controller: _sessionController,
                  decoration: _field(
                    'Session reference (e.g. COL-2026-045)',
                    Icons.event_outlined,
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Session reference is required'
                      : null,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  style: FilledButton.styleFrom(
                    backgroundColor: StaffSurfaces.cta,
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
                      : const Text('Confirm issue'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
