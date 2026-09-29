import 'dart:async';

import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../../data/models/hospital_staff_candidate_model.dart';
import '../../data/repositories/hospital_staff_repository.dart';

/// Modal bottom sheet: search doctors/nurses and send an invitation.
///
/// Returns `true` from [Navigator.pop] once an invitation is sent so the
/// parent screen can refresh.
class InviteStaffSheet extends StatefulWidget {
  const InviteStaffSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const InviteStaffSheet(),
    );
  }

  @override
  State<InviteStaffSheet> createState() => _InviteStaffSheetState();
}

class _InviteStaffSheetState extends State<InviteStaffSheet> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;

  List<HospitalStaffCandidateModel> _results = [];
  bool _searching = false;
  bool _hasQueried = false;
  String? _error;
  String? _sendingRegNumber;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () {
      _search(value);
    });
  }

  Future<void> _search(String value) async {
    final query = value.trim();
    setState(() {
      _searching = true;
      _error = null;
      _hasQueried = true;
    });
    try {
      final list = await HospitalStaffRepository.searchCandidates(query);
      if (!mounted) return;
      setState(() {
        _results = list;
        _searching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _searching = false;
        _error = e is ApiException ? e.message : 'Search failed.';
        _results = [];
      });
    }
  }

  Future<void> _invite(HospitalStaffCandidateModel c) async {
    setState(() => _sendingRegNumber = c.registrationNumber);
    try {
      await HospitalStaffRepository.invite(c.registrationNumber);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invitation sent to ${c.fullName}.'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _sendingRegNumber = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiException ? e.message : 'Failed to send invitation.',
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: StaffSurfaces.appBarBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: StaffSurfaces.chipNeutralBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: StaffSurfaces.softPanelDeep,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.person_add_alt_outlined,
                      color: StaffSurfaces.brandSoft,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Invite staff',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: StaffSurfaces.textPrimary,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Search by name, email, or registration number.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: StaffSurfaces.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close,
                      color: StaffSurfaces.textSecondary,
                    ),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _controller,
                autofocus: true,
                onChanged: _onQueryChanged,
                textInputAction: TextInputAction.search,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: StaffSurfaces.textPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'e.g. DR-1023 or dr.perera@…',
                  hintStyle: const TextStyle(
                    color: StaffSurfaces.textMutedSoft,
                    fontWeight: FontWeight.w500,
                  ),
                  prefixIcon:
                      Icon(Icons.search, color: StaffSurfaces.brandSoft),
                  suffixIcon: _controller.text.isEmpty
                      ? null
                      : IconButton(
                          icon: Icon(
                            Icons.clear,
                            size: 18,
                            color: StaffSurfaces.textMutedSoft,
                          ),
                          onPressed: () {
                            _controller.clear();
                            _onQueryChanged('');
                          },
                        ),
                  filled: true,
                  fillColor: StaffSurfaces.softPanel,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: StaffSurfaces.cardBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: StaffSurfaces.cardBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        BorderSide(color: StaffSurfaces.brandSoft, width: 1.4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(child: _buildResults()),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: StaffErrorBanner(
          message: _error!,
          onDismiss: () => setState(() => _error = null),
        ),
      );
    }

    if (_searching) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Center(
          child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
        ),
      );
    }

    if (!_hasQueried) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Text(
          'Start typing to search doctors and nurses registered with Vaxora.',
          style: TextStyle(
            fontSize: 12.5,
            color: StaffSurfaces.textSecondary,
            height: 1.4,
          ),
        ),
      );
    }

    if (_results.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: StaffEmptyCard(
          message: _controller.text.trim().isEmpty
              ? 'No candidates available.'
              : 'No one matches "${_controller.text.trim()}".',
          icon: Icons.search_off,
          compact: true,
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: _results.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _CandidateCard(
        candidate: _results[i],
        sending: _sendingRegNumber == _results[i].registrationNumber,
        onInvite: () => _invite(_results[i]),
      ),
    );
  }
}

class _CandidateCard extends StatelessWidget {
  final HospitalStaffCandidateModel candidate;
  final bool sending;
  final VoidCallback onInvite;

  const _CandidateCard({
    required this.candidate,
    required this.sending,
    required this.onInvite,
  });

  String get _roleLine {
    final role = staffRoleLabel(candidate.role);
    final spec = candidate.specialization?.trim();
    if (spec != null && spec.isNotEmpty) return '$role · $spec';
    return role;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: StaffSurfaces.card(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              candidate.role.toUpperCase().contains('NURSE')
                  ? Icons.health_and_safety_outlined
                  : Icons.medical_services_outlined,
              color: StaffSurfaces.brandSoft,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  candidate.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _roleLine,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.brandSoft,
                  ),
                ),
                if (candidate.registrationNumber.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    candidate.registrationNumber,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: StaffSurfaces.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          _actionButton(),
        ],
      ),
    );
  }

  Widget _actionButton() {
    if (candidate.alreadyAffiliated) {
      return const StaffStatusChip(
        label: 'Already added',
        tone: StaffChipTone.neutral,
      );
    }
    return FilledButton(
      onPressed: sending ? null : onInvite,
      style: FilledButton.styleFrom(
        backgroundColor: StaffSurfaces.cta,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        minimumSize: const Size(0, 36),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        textStyle: const TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
        ),
      ),
      child: Text(sending ? 'Sending…' : 'Invite'),
    );
  }
}
