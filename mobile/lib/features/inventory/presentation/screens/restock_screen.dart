import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../providers/inventory_provider.dart';

class RestockScreen extends StatefulWidget {
  const RestockScreen({super.key});

  @override
  State<RestockScreen> createState() => _RestockScreenState();
}

class _RestockScreenState extends State<RestockScreen> {
  final _lotController = TextEditingController();
  final _quantityController = TextEditingController();
  final _storageController = TextEditingController(text: 'Chiller Unit B (2-8°C)');
  final _supplierController = TextEditingController();

  String? _selectedVaccine;
  DateTime _expiryDate = DateTime.now().add(const Duration(days: 365));
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.read<InventoryProvider>();
      if (p.formulary.isEmpty) p.loadFormulary();
    });
  }

  @override
  void dispose() {
    _lotController.dispose();
    _quantityController.dispose();
    _storageController.dispose();
    _supplierController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiryDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _expiryDate = picked);
  }

  Future<void> _submit() async {
    final vaccine = _selectedVaccine;
    final lot = _lotController.text.trim();
    final qty = int.tryParse(_quantityController.text.trim()) ?? 0;

    if (vaccine == null || vaccine.isEmpty) {
      _err('Pick a vaccine product.');
      return;
    }
    if (lot.isEmpty) {
      _err('Lot number is required.');
      return;
    }
    if (qty <= 0) {
      _err('Quantity must be greater than 0.');
      return;
    }

    setState(() => _submitting = true);
    final provider = context.read<InventoryProvider>();
    final ok = await provider.restockBatch(
      vaccineName: vaccine,
      lotNumber: lot,
      quantity: qty,
      storageUnit: _storageController.text.trim(),
      expiryDate: _expiryDate.toIso8601String(),
      supplier: _supplierController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Restocked $qty vials of $vaccine.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    } else {
      _err(provider.errorMessage ?? 'Failed to restock.');
    }
  }

  void _err(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InventoryProvider>();
    final formulary = provider.formulary;

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: AppBar(
        title: const Text('Log restock shipment'),
        backgroundColor: StaffSurfaces.cardBg,
        foregroundColor: StaffSurfaces.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 40),
        children: [
          const StaffPageIntro(
            eyebrow: 'Incoming',
            title: 'New batch',
            subtitle: 'Record a received shipment of vials into cold storage.',
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: StaffSurfaces.cardBg,
              border: Border.all(color: StaffSurfaces.cardBorder),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Vaccine product *',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _selectedVaccine,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    hintText: 'Pick from formulary',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: formulary
                      .map((e) => DropdownMenuItem<String>(
                            value: e.vaccineName,
                            child: Text(
                              e.vaccineName,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedVaccine = v),
                ),
                if (formulary.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Text(
                      'No products registered yet — add them in Vaccine formulary first.',
                      style: TextStyle(
                        fontSize: 12,
                        color: StaffSurfaces.textMutedSoft,
                      ),
                    ),
                  ),
                const SizedBox(height: 14),
                TextField(
                  controller: _lotController,
                  decoration: const InputDecoration(
                    labelText: 'Lot number *',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _quantityController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Quantity (vials) *',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _storageController,
                  decoration: const InputDecoration(
                    labelText: 'Storage unit',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _supplierController,
                  decoration: const InputDecoration(
                    labelText: 'Supplier',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(8),
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Expiry date',
                      border: OutlineInputBorder(),
                      isDense: true,
                      suffixIcon: Icon(Icons.calendar_today, size: 18),
                    ),
                    child: Text(
                      '${_expiryDate.year}-${_expiryDate.month.toString().padLeft(2, '0')}-${_expiryDate.day.toString().padLeft(2, '0')}',
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.inventory_2_outlined),
                    label: Text(_submitting ? 'Saving…' : 'Log restock'),
                    style: FilledButton.styleFrom(
                      backgroundColor: StaffSurfaces.brandSoft,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}