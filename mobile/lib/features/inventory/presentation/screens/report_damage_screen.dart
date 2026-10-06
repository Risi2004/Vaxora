import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../providers/inventory_provider.dart';
import '../../data/models/batch_model.dart';

class ReportDamageScreen extends StatefulWidget {
  final BatchModel? initialBatch;

  const ReportDamageScreen({super.key, this.initialBatch});

  @override
  State<ReportDamageScreen> createState() => _ReportDamageScreenState();
}

class _ReportDamageScreenState extends State<ReportDamageScreen> {
  final _picker = ImagePicker();
  File? _photo;
  String _damageType = 'Damaged vial';
  String? _selectedBatchId;
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();
  bool _sending = false;
  bool _showEmailPreview = false;

  static const _damageTypes = [
    'Damaged vial',
    'Broken cold-chain seal',
    'Spilled/leaked box',
    'Expired vial label',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialBatch != null) {
      _selectedBatchId = widget.initialBatch!.id;
    }
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  BatchModel? _selectedBatch(InventoryProvider provider) {
    if (_selectedBatchId == null) return null;
    try {
      return provider.batches.firstWhere((b) => b.id == _selectedBatchId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickFromCamera() async {
    try {
      final x = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        imageQuality: 82,
      );
      if (x != null) setState(() => _photo = File(x.path));
    } catch (e) {
      _snack('Camera not available: $e');
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final x = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        imageQuality: 82,
      );
      if (x != null) setState(() => _photo = File(x.path));
    } catch (e) {
      _snack('Gallery not available: $e');
    }
  }

  void _clearPhoto() => setState(() => _photo = null);

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? AppColors.error : null,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _send(InventoryProvider provider) async {
    final batch = _selectedBatch(provider);
    if (_photo == null) return _snack('Please attach a photo of the damage.', error: true);
    if (batch == null) return _snack('Please select the affected batch.', error: true);
    final qty = int.tryParse(_quantityController.text.trim()) ?? 0;
    if (qty <= 0) return _snack('Enter the quantity damaged.', error: true);

    setState(() => _sending = true);
    final ok = await provider.reportDamage(
      photo: _photo!,
      batchId: batch.id,
      vaccineName: batch.name,
      lotNumber: batch.lotNumber,
      quantity: qty,
      damageType: _damageType,
      notes: _notesController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _sending = false);

    if (ok) {
      _snack('Damage report emailed to supplier.');
      Navigator.pop(context);
    } else {
      _snack(provider.errorMessage ?? 'Failed to send damage report.', error: true);
    }
  }

  String _emailSubject(BatchModel? batch) {
    final lot = batch?.lotNumber ?? '—';
    return 'Damage Report — $lot — Vaxora';
  }

  String _emailBody(BatchModel? batch, int qty) {
    final vaccine = batch?.name ?? '—';
    final lot = batch?.lotNumber ?? '—';
    return '''Dear Sir/Madam,

This is to report damage detected on a vaccine batch received at our facility.

Vaccine:      $vaccine
Lot number:   $lot
Quantity:     $qty vials
Damage type:  $_damageType
${_notesController.text.trim().isNotEmpty ? '\nNotes:\n${_notesController.text.trim()}\n' : ''}
Photographic evidence is attached for your review.

Kindly advise on replacement or credit at your earliest convenience.

Regards,
Vaxora Hospital Inventory''';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InventoryProvider>();
    final batch = _selectedBatch(provider);
    final qty = int.tryParse(_quantityController.text.trim()) ?? 0;

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: AppBar(
        title: const Text('Report damage'),
        backgroundColor: StaffSurfaces.cardBg,
        foregroundColor: StaffSurfaces.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 40),
        children: [
          // ---------- Photo ----------
          const StaffSectionHeader(title: 'Photo evidence'),
          Container(
            decoration: StaffSurfaces.card(),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_photo == null) ...[
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: StaffSurfaces.softPanelDeep,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: StaffSurfaces.cardBorder),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.add_a_photo_outlined,
                            size: 42,
                            color: StaffSurfaces.brandSoft,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Add a photo of the damage',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: StaffSurfaces.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _pickFromCamera,
                          icon: const Icon(Icons.photo_camera_outlined, size: 18),
                          label: const Text('Take photo'),
                          style: FilledButton.styleFrom(
                            backgroundColor: StaffSurfaces.brandSoft,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickFromGallery,
                          icon: const Icon(Icons.photo_library_outlined, size: 18),
                          label: const Text('Gallery'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ] else ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(
                      _photo!,
                      height: 220,
                      fit: BoxFit.cover,
                      width: double.infinity,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickFromCamera,
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text('Retake'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _clearPhoto,
                          icon: const Icon(Icons.close, size: 18),
                          label: const Text('Remove'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ---------- Damage type ----------
          const StaffSectionHeader(title: 'Damage type'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _damageTypes.map((t) {
              final selected = _damageType == t;
              return ChoiceChip(
                label: Text(t),
                selected: selected,
                onSelected: (_) => setState(() => _damageType = t),
                selectedColor: StaffSurfaces.brandSoft.withValues(alpha: 0.15),
                labelStyle: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: selected ? StaffSurfaces.brandSoft : StaffSurfaces.textSecondary,
                ),
                side: BorderSide(
                  color: selected ? StaffSurfaces.brandSoft : StaffSurfaces.cardBorder,
                ),
                backgroundColor: StaffSurfaces.cardBg,
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // ---------- Batch ----------
          const StaffSectionHeader(title: 'Affected batch'),
          Container(
            decoration: StaffSurfaces.card(),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _selectedBatchId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Select batch',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: provider.batches
                      .map((b) => DropdownMenuItem<String>(
                            value: b.id,
                            child: Text(
                              '${b.name} · ${b.lotNumber}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedBatchId = v),
                ),
                if (batch != null) ...[
                  const SizedBox(height: 12),
                  _kv('Vaccine', batch.name),
                  _kv('Lot', batch.lotNumber),
                  _kv('Available', '${batch.available} vials'),
                ],
                const SizedBox(height: 14),
                TextField(
                  controller: _quantityController,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'Quantity damaged (vials) *',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _notesController,
                  maxLines: 4,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'Notes / description',
                    hintText: 'e.g. Outer carton crushed during transport',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ---------- Email preview ----------
          GestureDetector(
            onTap: () => setState(() => _showEmailPreview = !_showEmailPreview),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: StaffSurfaces.softPanelDeep,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: StaffSurfaces.cardBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.mail_outline,
                    size: 18,
                    color: StaffSurfaces.brandSoft,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Email preview',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: StaffSurfaces.textPrimary,
                      ),
                    ),
                  ),
                  Icon(
                    _showEmailPreview ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                    color: StaffSurfaces.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          if (_showEmailPreview) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: StaffSurfaces.card(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _kv('To', 'supplier@spc.gov.lk'),
                  _kv('Subject', _emailSubject(batch)),
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  Text(
                    _emailBody(batch, qty),
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: StaffSurfaces.textSecondary,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),

          // ---------- Send ----------
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _sending ? null : () => _send(provider),
              icon: _sending
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_outlined, size: 18),
              label: Text(_sending ? 'Sending…' : 'Send damage report'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.error,
                padding: const EdgeInsets.symmetric(vertical: 15),
                textStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 82,
            child: Text(
              k,
              style: const TextStyle(
                fontSize: 12,
                color: StaffSurfaces.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              v,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}