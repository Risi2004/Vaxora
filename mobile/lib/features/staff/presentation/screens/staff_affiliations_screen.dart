import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/utils/home_route_utils.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/repositories/staff_repository.dart';
import '../widgets/staff_common_widgets.dart';

class StaffAffiliationsScreen extends StatefulWidget {
  final VoidCallback? onChanged;

  const StaffAffiliationsScreen({super.key, this.onChanged});

  @override
  State<StaffAffiliationsScreen> createState() => _StaffAffiliationsScreenState();
}

class _StaffAffiliationsScreenState extends State<StaffAffiliationsScreen> {
  List<AffiliationModel> _invitations = [];
  List<AffiliationModel> _affiliations = [];
  bool _loading = true;
  String? _error;
  String? _actionId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        StaffRepository.getMyInvitations(),
        StaffRepository.getMyAffiliations(),
      ]);

      if (!mounted) return;
      setState(() {
        _invitations = results[0];
        _affiliations = results[1];
        _loading = false;
      });
      widget.onChanged?.call();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Failed to load affiliations.';
        _invitations = [];
        _affiliations = [];
      });
      widget.onChanged?.call();
    }
  }

  Future<void> _confirmReject(AffiliationModel item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: StaffSurfaces.textPrimary.withValues(alpha: 0.35),
      builder: (ctx) => Dialog(
        backgroundColor: StaffSurfaces.appBarBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 28),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: StaffSurfaces.cardBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Reject invitation?',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: StaffSurfaces.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Decline the invitation from ${item.hospitalName}? You can be invited again later.',
                style: const TextStyle(
                  color: StaffSurfaces.textSecondary,
                  height: 1.4,
                  fontSize: 13.5,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      style: TextButton.styleFrom(
                        foregroundColor: StaffSurfaces.textSecondary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        'Reject',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (confirmed == true) {
      await _respond(item, 'Reject');
    }
  }

  Future<void> _respond(AffiliationModel item, String decision) async {
    setState(() => _actionId = '${item.affiliationId}-$decision');
    try {
      await StaffRepository.respondToInvitation(
        affiliationId: item.affiliationId,
        decision: decision,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            decision == 'Accept' ? 'Invitation accepted.' : 'Invitation rejected.',
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiException
                ? e.message
                : 'Failed to ${decision.toLowerCase()} invitation.',
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _actionId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffSurfaces.appBar(
        title: 'Hospital Affiliations',
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
            icon: Icon(Icons.refresh, color: StaffSurfaces.brandSoft),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: StaffSurfaces.brandSoft,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          children: [
            if (_error != null) ...[
              StaffErrorBanner(
                message: _error!,
                onDismiss: () => setState(() => _error = null),
              ),
              const SizedBox(height: 12),
            ],
            if (_loading && _invitations.isEmpty && _affiliations.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: CircularProgressIndicator(color: StaffSurfaces.brandSoft),
                ),
              )
            else ...[
              _SummaryRow(
                pending: _invitations.length,
                active: _affiliations.length,
              ),
              const SizedBox(height: 20),
              _SectionTitle(
                title: 'Active Affiliations',
                count: _affiliations.length,
              ),
              const SizedBox(height: 10),
              if (_affiliations.isEmpty)
                const StaffEmptyCard(
                  message:
                      'You are not affiliated with any hospital yet. Accept an invitation to join a roster.',
                  icon: Icons.local_hospital_outlined,
                  compact: true,
                )
              else
                ..._affiliations.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _AffiliationCard(item: item),
                  ),
                ),
              const SizedBox(height: 18),
              _SectionTitle(
                title: 'Pending Invitations',
                count: _invitations.length,
              ),
              const SizedBox(height: 10),
              if (_invitations.isEmpty)
                const StaffEmptyCard(
                  message: 'No pending hospital invitations.',
                  icon: Icons.mail_outline,
                  compact: true,
                )
              else
                ..._invitations.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _InvitationCard(
                      item: item,
                      actionId: _actionId,
                      onAccept: () => _respond(item, 'Accept'),
                      onReject: () => _confirmReject(item),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final int pending;
  final int active;

  const _SummaryRow({required this.pending, required this.active});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SummaryPill(
            label: 'Pending',
            value: pending,
            icon: Icons.mark_email_unread_outlined,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SummaryPill(
            label: 'Active',
            value: active,
            icon: Icons.verified_outlined,
          ),
        ),
      ],
    );
  }
}

class _SummaryPill extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;

  const _SummaryPill({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.softWell(),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: StaffSurfaces.brandSoft),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$value',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.brandSoft,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: StaffSurfaces.textSecondary,
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

class _SectionTitle extends StatelessWidget {
  final String title;
  final int count;

  const _SectionTitle({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Text(
      '$title ($count)',
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: StaffSurfaces.textSecondary,
      ),
    );
  }
}

class _InvitationCard extends StatelessWidget {
  final AffiliationModel item;
  final String? actionId;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const _InvitationCard({
    required this.item,
    required this.actionId,
    required this.onAccept,
    required this.onReject,
  });

  bool get _busy =>
      actionId != null && actionId!.startsWith(item.affiliationId);

  @override
  Widget build(BuildContext context) {
    final accepting = actionId == '${item.affiliationId}-Accept';
    final rejecting = actionId == '${item.affiliationId}-Reject';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StaffHospitalAvatar(logoUrl: item.hospitalLogoUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.hospitalName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: StaffSurfaces.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _affiliationMeta(item, pending: true),
                      style: const TextStyle(
                        fontSize: 12,
                        color: StaffSurfaces.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : onReject,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: StaffSurfaces.dangerBorder),
                    backgroundColor: AppColors.errorBg,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(rejecting ? 'Rejecting…' : 'Reject'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _busy ? null : onAccept,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: StaffSurfaces.cta,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(accepting ? 'Accepting…' : 'Accept'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AffiliationCard extends StatelessWidget {
  final AffiliationModel item;

  const _AffiliationCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: StaffSurfaces.card(),
      child: Row(
        children: [
          StaffHospitalAvatar(logoUrl: item.hospitalLogoUrl),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.hospitalName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _affiliationMeta(item, pending: false),
                  style: const TextStyle(
                    fontSize: 12,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StaffStatusChip(
            label: item.isOnDutyNow ? 'On duty now' : 'Off duty',
            positive: item.isOnDutyNow,
          ),
        ],
      ),
    );
  }
}

String _shortDate(String raw) {
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  final local = parsed.toLocal();
  final y = local.year.toString().padLeft(4, '0');
  final m = local.month.toString().padLeft(2, '0');
  final d = local.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

String _affiliationMeta(AffiliationModel item, {required bool pending}) {
  final parts = <String>[staffRoleLabel(item.staffRole)];
  final spec = item.specialization?.trim();
  if (spec != null && spec.isNotEmpty) parts.add(spec);
  if (pending) {
    parts.add(
      item.invitedAt != null
          ? 'Invited ${_shortDate(item.invitedAt!)}'
          : 'Pending',
    );
  } else {
    parts.add(
      item.respondedAt != null
          ? 'Joined ${_shortDate(item.respondedAt!)}'
          : 'Active',
    );
  }
  return parts.join(' · ');
}
