import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../staff/presentation/widgets/network_avatar.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';
import '../providers/inventory_provider.dart';
import 'batch_detail_screen.dart';
import 'hospital_ai_screen.dart';
import 'hospital_alerts_screen.dart';
import 'qr_scanner_screen.dart';
import '../widgets/batch_card.dart';
import 'formulary_screen.dart';
import 'restock_screen.dart';
import 'report_damage_screen.dart';

class InventoryHomeScreen extends StatefulWidget {
  const InventoryHomeScreen({super.key});

  @override
  State<InventoryHomeScreen> createState() => _InventoryHomeScreenState();
}

class _InventoryHomeScreenState extends State<InventoryHomeScreen> {
  String _hospitalName = 'Hospital';
  String? _logoUrl;

  @override
  void initState() {
    super.initState();
    _loadHeader();
  }

  Future<void> _loadHeader() async {
    final user = await StorageService.getUser();
    if (!mounted || user == null) return;
    setState(() {
      _hospitalName = user['name']?.toString().trim().isNotEmpty == true
          ? user['name'].toString().trim()
          : 'Hospital';
      _logoUrl = resolveMediaUrl(
        user['profilePhotoUrl']?.toString() ??
            user['logoUrl']?.toString() ??
            user['photoUrl']?.toString(),
      );
    });
  }

  Future<void> _openAlerts() async {
    final provider = context.read<InventoryProvider>();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: provider,
          child: const HospitalAlertsScreen(),
        ),
      ),
    );
    if (mounted) await provider.refresh();
  }

  Future<void> _openAi() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const HospitalAiScreen()),
    );
  }

  Future<void> _openScanner() async {
    final provider = context.read<InventoryProvider>();
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (mounted) await provider.refresh();
  }

  Future<void> _openFormulary() async {
    final provider = context.read<InventoryProvider>();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: provider,
          child: const FormularyScreen(),
        ),
      ),
    );
    if (mounted) await provider.refresh();
  }

  Future<void> _openRestock() async {
    final provider = context.read<InventoryProvider>();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: provider,
          child: const RestockScreen(),
        ),
      ),
    );
    if (mounted) await provider.refresh();
  }

  Future<void> _openReportDamage() async {
    final provider = context.read<InventoryProvider>();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: provider,
          child: const ReportDamageScreen(),
        ),
      ),
    );
    if (mounted) await provider.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InventoryProvider>();
    final alertCount = provider.lowStockCount + provider.expiringCount;

    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffScreenHeader.appBar(
        displayName: _hospitalName,
        subtitle: 'Hospital · Inventory',
        photoUrl: _logoUrl,
        actions: const [],
      ),
      body: RefreshIndicator(
        onRefresh: provider.refresh,
        color: StaffSurfaces.brandSoft,
        child: provider.isLoading && provider.batches.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 80),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: StaffSurfaces.brandSoft,
                      ),
                    ),
                  ),
                ],
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                children: [
                  StaffPageIntro(
                    eyebrow: 'Cold chain',
                    title: 'Vaccine stock',
                    subtitle: 'Search lots, filter by risk, and scan incoming QR.',
                    stats: [
                      StaffIntroStat(
                        label: 'Vials',
                        value: '${provider.totalVials}',
                        icon: Icons.inventory_2_outlined,
                        accent: AppColors.accentTeal,
                      ),
                      StaffIntroStat(
                        label: 'Low',
                        value: '${provider.lowStockCount}',
                        icon: Icons.trending_down,
                        accent: provider.lowStockCount > 0
                            ? AppColors.error
                            : AppColors.success,
                      ),
                      StaffIntroStat(
                        label: 'Expiring',
                        value: '${provider.expiringCount}',
                        icon: Icons.hourglass_bottom,
                        accent: provider.expiringCount > 0
                            ? const Color(0xFFB2660A)
                            : AppColors.success,
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // ============ QUICK ACTIONS GRID ============
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'Quick actions',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: StaffSurfaces.textSecondary,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.05,
                    children: [
                      _QuickAction(
                        icon: Icons.report_problem_outlined,
                        label: 'Report',
                        color: AppColors.error,
                        onTap: _openReportDamage,
                      ),
                      _QuickAction(
                        icon: Icons.vaccines_outlined,
                        label: 'Formulary',
                        color: AppColors.accentTeal,
                        onTap: _openFormulary,
                      ),
                      _QuickAction(
                        icon: Icons.add_box_outlined,
                        label: 'Restock',
                        color: const Color(0xFF0284C7),
                        onTap: _openRestock,
                      ),
                      _QuickAction(
                        icon: Icons.notifications_outlined,
                        label: 'Alerts',
                        color: const Color(0xFFD97706),
                        badgeCount: alertCount,
                        onTap: provider.isLoading ? null : _openAlerts,
                      ),
                      _QuickAction(
                        icon: Icons.auto_awesome,
                        label: 'AI assistant',
                        color: const Color(0xFF7C3AED),
                        onTap: _openAi,
                      ),
                      _QuickAction(
                        icon: Icons.refresh,
                        label: 'Refresh',
                        color: const Color(0xFF64748B),
                        onTap: provider.isLoading ? null : provider.refresh,
                      ),
                    ],
                  ),

                  const SizedBox(height: 22),

                  TextField(
                    onChanged: provider.setSearchQuery,
                    decoration: InputDecoration(
                      hintText: 'Search name, lot, manufacturer…',
                      hintStyle: const TextStyle(
                        color: StaffSurfaces.textMutedSoft,
                        fontSize: 13,
                      ),
                      prefixIcon: Icon(
                        Icons.search,
                        color: StaffSurfaces.brandSoft,
                      ),
                      filled: true,
                      fillColor: StaffSurfaces.cardBg,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: StaffSurfaces.cardBorder,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: StaffSurfaces.cardBorder,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: StaffSurfaces.brandSoft),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: StaffSurfaces.softWell(),
                    child: Row(
                      children: [
                        _InvFilter(
                          label: 'All',
                          selected: provider.statusFilter == 'all',
                          onTap: () => provider.setStatusFilter('all'),
                        ),
                        _InvFilter(
                          label: 'Low',
                          selected: provider.statusFilter == 'low',
                          accent: AppColors.error,
                          onTap: () => provider.setStatusFilter('low'),
                        ),
                        _InvFilter(
                          label: 'Expiring',
                          selected: provider.statusFilter == 'expiring',
                          accent: const Color(0xFFB2660A),
                          onTap: () => provider.setStatusFilter('expiring'),
                        ),
                        _InvFilter(
                          label: 'Healthy',
                          selected: provider.statusFilter == 'sufficient',
                          accent: AppColors.success,
                          onTap: () => provider.setStatusFilter('sufficient'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  StaffSectionHeader(
                    title: 'Batches',
                    count: provider.batches.length,
                  ),
                  if (provider.errorMessage != null) ...[
                    StaffErrorBanner(
                      message: provider.errorMessage!,
                      onDismiss: () {},
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (provider.batches.isEmpty)
                    StaffEmptyCard(
                      message: provider.searchQuery.isNotEmpty ||
                              provider.statusFilter != 'all'
                          ? 'No batches match that filter.'
                          : 'Restock shipments will appear here once recorded.',
                      icon: Icons.inventory_2_outlined,
                    )
                  else
                    ...provider.batches.map(
                      (b) => BatchCard(
                        batch: b,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => BatchDetailScreen(batch: b),
                            ),
                          ).then((_) => provider.refresh());
                        },
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

class _InvFilter extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? accent;

  const _InvFilter({
    required this.label,
    required this.selected,
    required this.onTap,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final color = accent ?? StaffSurfaces.brandSoft;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? StaffSurfaces.cardBg : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? color.withValues(alpha: 0.35)
                  : Colors.transparent,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? color : StaffSurfaces.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final int badgeCount;
  final VoidCallback? onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.badgeCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Opacity(
          opacity: enabled ? 1.0 : 0.5,
          child: Container(
            decoration: BoxDecoration(
              color: StaffSurfaces.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: StaffSurfaces.cardBorder),
            ),
            padding: const EdgeInsets.all(6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: color, size: 20),
                    ),
                    if (badgeCount > 0)
                      Positioned(
                        right: -3,
                        top: -3,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.error,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          constraints: const BoxConstraints(minWidth: 16),
                          child: Text(
                            '$badgeCount',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                    height: 1.2,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}