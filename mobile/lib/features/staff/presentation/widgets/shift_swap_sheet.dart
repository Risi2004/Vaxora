import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../data/models/shift_model.dart';
import '../../data/repositories/shift_swap_repository.dart';
import 'staff_common_widgets.dart';

/// Staff files a cover request. No agent — the hospital's scheduling agent
/// suggests who should take the shift.
class ShiftSwapSheet extends StatefulWidget {
  final ShiftModel shift;
  final String hospitalName;

  const ShiftSwapSheet({
    super.key,
    required this.shift,
    required this.hospitalName,
  });

  static Future<void> show(
    BuildContext context, {
    required ShiftModel shift,
    required String hospitalName,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ShiftSwapSheet(
        shift: shift,
        hospitalName: hospitalName,
      ),
    );
  }

  @override
  State<ShiftSwapSheet> createState() => _ShiftSwapSheetState();
}

class _ShiftSwapSheetState extends State<ShiftSwapSheet> {
  final TextEditingController _reason = TextEditingController();
  bool _sending = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending || _sent) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ShiftSwapRepository.submit(
        shiftId: widget.shift.shiftId,
        reason: _reason.text,
      );
      if (!mounted) return;
      setState(() {
        _sending = false;
        _sent = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e is ApiException
            ? e.message
            : 'Could not send that request. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final s = widget.shift;
    final booth = (s.boothOrStation?.trim().isNotEmpty ?? false)
        ? s.boothOrStation!.trim()
        : 'Unassigned booth';

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: StaffSurfaces.appBarBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: StaffSurfaces.chipNeutralBorder,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: StaffSurfaces.softPanelDeep,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.swap_horiz, color: StaffSurfaces.brandSoft),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Request cover',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: StaffSurfaces.textSecondary),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: StaffSurfaces.softWell(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.hospitalName} · ${s.shiftDate}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${s.timeRangeLabel} · $booth',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: StaffSurfaces.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_sent) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF6EE7B7)),
                    ),
                    child: const Text(
                      'Request sent. Your hospital will review it and pick cover.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF047857),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: FilledButton.styleFrom(
                      backgroundColor: StaffSurfaces.cta,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Done',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _reason,
                    maxLines: 3,
                    maxLength: 500,
                    enabled: !_sending,
                    decoration: InputDecoration(
                      hintText: 'Optional — anything the hospital should know',
                      hintStyle: const TextStyle(
                        color: StaffSurfaces.textMutedSoft,
                        fontSize: 13,
                      ),
                      filled: true,
                      fillColor: StaffSurfaces.cardBg,
                      counterText: '',
                      contentPadding: const EdgeInsets.all(12),
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
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    StaffErrorBanner(
                      message: _error!,
                      onDismiss: () => setState(() => _error = null),
                    ),
                  ],
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _sending ? null : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: StaffSurfaces.cta,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: StaffSurfaces.softPanelDeep,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Send request',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
