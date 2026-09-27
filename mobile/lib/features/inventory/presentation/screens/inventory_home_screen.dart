import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/services/storage_service.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../providers/inventory_provider.dart';
import '../widgets/batch_card.dart';
import 'batch_detail_screen.dart';
import 'qr_scanner_screen.dart';

class InventoryHomeScreen extends StatelessWidget {
  const InventoryHomeScreen({super.key});

  static Future<void> logout(BuildContext context) async {
    await AuthRepository.logout();
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InventoryProvider()..loadAll(),
      child: const _InventoryHomeBody(),
    );
  }
}

class _InventoryHomeBody extends StatelessWidget {
  const _InventoryHomeBody();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InventoryProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Inventory', style: AppTextStyles.h3),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppColors.brandBlue),
            tooltip: 'Scan QR',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const QrScannerScreen()),
              ).then((_) => provider.refresh());
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.textMuted),
            tooltip: 'Logout',
            onPressed: () => InventoryHomeScreen.logout(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: provider.refresh,
        color: AppColors.brandBlue,
        child: provider.isLoading && provider.batches.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.brandBlue))
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _buildKpiRow(provider),
                  const SizedBox(height: 16),
                  _buildSearchBar(provider),
                  const SizedBox(height: 12),
                  _buildFilterChips(provider),
                  const SizedBox(height: 16),
                  if (provider.errorMessage != null)
                    _buildErrorBanner(provider.errorMessage!),
                  if (provider.batches.isEmpty)
                    _buildEmptyState(provider)
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
                  const SizedBox(height: 60),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const QrScannerScreen()),
          ).then((_) => provider.refresh());
        },
        backgroundColor: AppColors.brandBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Scan QR', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _buildKpiRow(InventoryProvider p) {
    return Row(
      children: [
        Expanded(
          child: _KpiCard(
            icon: '💉',
            label: 'Vials',
            value: p.totalVials.toString(),
            color: AppColors.brandBlue,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _KpiCard(
            icon: '⚠️',
            label: 'Low Stock',
            value: p.lowStockCount.toString(),
            color: const Color(0xFFDC2626),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _KpiCard(
            icon: '⏳',
            label: 'Expiring',
            value: p.expiringCount.toString(),
            color: const Color(0xFFD97706),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchBar(InventoryProvider p) {
    return TextField(
      onChanged: p.setSearchQuery,
      decoration: InputDecoration(
        hintText: 'Search by name, lot, manufacturer…',
        prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.brandBlue, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildFilterChips(InventoryProvider p) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(
            label: 'All (${p.batches.length})',
            selected: p.statusFilter == 'all',
            onTap: () => p.setStatusFilter('all'),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: '⚠️ Low Stock',
            selected: p.statusFilter == 'low',
            onTap: () => p.setStatusFilter('low'),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: '⏳ Expiring',
            selected: p.statusFilter == 'expiring',
            onTap: () => p.setStatusFilter('expiring'),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: '✓ Healthy',
            selected: p.statusFilter == 'sufficient',
            onTap: () => p.setStatusFilter('sufficient'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: const TextStyle(color: AppColors.error, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(InventoryProvider p) {
    final isFiltering = p.searchQuery.isNotEmpty || p.statusFilter != 'all';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 24),
      child: Column(
        children: [
          Icon(isFiltering ? Icons.search_off : Icons.inventory_2_outlined,
              size: 56, color: AppColors.textMuted),
          const SizedBox(height: 16),
          Text(
            isFiltering ? 'No batches match your filter' : 'No inventory yet',
            style: AppTextStyles.h3,
          ),
          const SizedBox(height: 6),
          Text(
            isFiltering
                ? 'Try changing the search or filter.'
                : 'Restock shipments will appear here once recorded.',
            textAlign: TextAlign.center,
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String icon, label, value;
  final Color color;
  const _KpiCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.brandBlue : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? AppColors.brandBlue : AppColors.borderLight),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textBody,
          ),
        ),
      ),
    );
  }
}