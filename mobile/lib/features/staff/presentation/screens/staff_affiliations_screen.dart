import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/affiliation_model.dart';
import '../../data/repositories/staff_repository.dart';

class StaffAffiliationsScreen extends StatefulWidget {
  const StaffAffiliationsScreen({super.key});

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
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Failed to load affiliations.';
        _invitations = [];
        _affiliations = [];
      });
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Hospital Affiliations', style: AppTextStyles.h3),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh, color: AppColors.brandBlue),
          ),
        ],
      ),
      body: _loading && _invitations.isEmpty && _affiliations.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.brandBlue,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                children: [
                  if (_error != null) ...[
                    _ErrorBanner(message: _error!, onDismiss: () => setState(() => _error = null)),
                    const SizedBox(height: 12),
                  ],
                  _SummaryRow(
                    pending: _invitations.length,
                    active: _affiliations.length,
                  ),
                  const SizedBox(height: 20),
                  _SectionTitle(
                    title: 'Pending Invitations',
                    count: _invitations.length,
                  ),
                  const SizedBox(height: 10),
                  if (_invitations.isEmpty)
                    const _EmptyCard(
                      message: 'No pending hospital invitations.',
                    )
                  else
                    ..._invitations.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _InvitationCard(
                          item: item,
                          actionId: _actionId,
                          onAccept: () => _respond(item, 'Accept'),
                          onReject: () => _respond(item, 'Reject'),
                        ),
                      ),
                    ),
                  const SizedBox(height: 18),
                  _SectionTitle(
                    title: 'Active Affiliations',
                    count: _affiliations.length,
                  ),
                  const SizedBox(height: 10),
                  if (_affiliations.isEmpty)
                    const _EmptyCard(
                      message:
                          'You are not affiliated with any hospital yet. Accept an invitation to join a roster.',
                    )
                  else
                    ..._affiliations.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _AffiliationCard(item: item),
                      ),
                    ),
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
          child: _SummaryPill(label: 'Pending', value: pending),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SummaryPill(label: 'Active', value: active),
        ),
      ],
    );
  }
}

class _SummaryPill extends StatelessWidget {
  final String label;
  final int value;

  const _SummaryPill({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$value',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.textTitle,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
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
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: AppColors.textTitle,
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;

  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Text(
        message,
        style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.4),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;

  const _ErrorBanner({required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.error,
              ),
            ),
          ),
          IconButton(
            onPressed: onDismiss,
            icon: const Icon(Icons.close, size: 18, color: AppColors.error),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

class _HospitalAvatar extends StatelessWidget {
  final String name;
  final String? logoUrl;

  const _HospitalAvatar({required this.name, this.logoUrl});

  @override
  Widget build(BuildContext context) {
    final url = logoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          url,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback(),
        ),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.brandBlue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(Icons.local_hospital, color: AppColors.brandBlue, size: 22),
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
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _HospitalAvatar(
                name: item.hospitalName,
                logoUrl: item.hospitalLogoUrl,
              ),
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
                        color: AppColors.textTitle,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.invitedAt != null
                          ? 'Invited: ${_shortDate(item.invitedAt!)}'
                          : 'Pending invitation',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
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
                    side: const BorderSide(color: AppColors.error),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: Text(rejecting ? 'Rejecting…' : 'Reject'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _busy ? null : onAccept,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
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
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          _HospitalAvatar(
            name: item.hospitalName,
            logoUrl: item.hospitalLogoUrl,
          ),
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
                    color: AppColors.textTitle,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.respondedAt != null
                      ? 'Joined: ${_shortDate(item.respondedAt!)}'
                      : 'Active roster member',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: item.isOnDutyNow
                  ? AppColors.successBg
                  : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              item.isOnDutyNow ? 'On duty now' : 'Off duty',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: item.isOnDutyNow ? AppColors.success : AppColors.textMuted,
              ),
            ),
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
