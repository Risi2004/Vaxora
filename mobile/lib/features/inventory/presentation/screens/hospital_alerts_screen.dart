import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/batch_model.dart';
import '../providers/inventory_provider.dart';
import 'batch_detail_screen.dart';

class HospitalAlertsScreen extends StatelessWidget {
  const HospitalAlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InventoryProvider()..loadAll(),
      child: const _AlertsBody(),
    );
  }
}

class _AlertsBody extends StatelessWidget {
  const _AlertsBody();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InventoryProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Alerts', style: AppTextStyles.h3),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textMuted),
            tooltip: 'Refresh',
            onPressed: provider.refresh,
          ),
        ],
      ),
      body: provider.isLoading && provider.batches.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.brandBlue))
          : RefreshIndicator(
              onRefresh: provider.refresh,
              color: AppColors.brandBlue,
              child: _buildContent(context, provider),
            ),
    );
  }

  Widget _buildContent(BuildContext context, InventoryProvider provider) {
    final expired = provider.batches.where((b) => b.isExpired).toList();
    final expiring = provider.batches.where((b) => b.isExpiringSoon).toList();
    final lowStock = provider.batches.where((b) => b.isLowStock && !b.isExpired).toList();

    final totalAlerts = expired.length + expiring.length + lowStock.length;

    if (totalAlerts == 0) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 32),
            child: Column(
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: AppColors.successBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle, color: AppColors.success, size: 50),
                ),
                const SizedBox(height: 20),
                Text('All Clear', style: AppTextStyles.h2),
                const SizedBox(height: 8),
                Text(
                  'No low stock or expiring batches. Everything is running smoothly.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.caption,
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummaryRow(expired.length, expiring.length, lowStock.length),
        const SizedBox(height: 20),
        if (expired.isNotEmpty) ...[
          _sectionHeader('🚨 Expired Batches', expired.length, const Color(0xFF991B1B)),
          const SizedBox(height: 10),
          ...expired.map((b) => _alertCard(context, b, 'expired')),
          const SizedBox(height: 20),
        ],
        if (expiring.isNotEmpty) ...[
          _sectionHeader('⏳ Expiring Soon', expiring.length, const Color(0xFFD97706)),
          const SizedBox(height: 10),
          ...expiring.map((b) => _alertCard(context, b, 'expiring')),
          const SizedBox(height: 20),
        ],
        if (lowStock.isNotEmpty) ...[
          _sectionHeader('⚠️ Low Stock', lowStock.length, const Color(0xFFDC2626)),
          const SizedBox(height: 10),
          ...lowStock.map((b) => _alertCard(context, b, 'low')),
        ],
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildSummaryRow(int expired, int expiring, int low) {
    return Row(
      children: [
        Expanded(child: _summaryCard('🚨', 'Expired', expired, const Color(0xFF991B1B))),
        const SizedBox(width: 10),
        Expanded(child: _summaryCard('⏳', 'Expiring', expiring, const Color(0xFFD97706))),
        const SizedBox(width: 10),
        Expanded(child: _summaryCard('⚠️', 'Low Stock', low, const Color(0xFFDC2626))),
      ],
    );
  }

  Widget _summaryCard(String icon, String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 6),
          Text(
            '$count',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color),
          ),
          Text(label, style: AppTextStyles.caption, textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title, int count, Color color) {
    return Row(
      children: [
        Expanded(child: Text(title, style: AppTextStyles.h3)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '$count',
            style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12),
          ),
        ),
      ],
    );
  }

  Widget _alertCard(BuildContext context, BatchModel batch, String type) {
    final color = type == 'expired'
        ? const Color(0xFF991B1B)
        : type == 'expiring'
            ? const Color(0xFFD97706)
            : const Color(0xFFDC2626);

    final message = type == 'expired'
        ? 'Expired on ${batch.expiry}'
        : type == 'expiring'
            ? 'Expires on ${batch.expiry}'
            : 'Below threshold (${batch.minThreshold} min)';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => BatchDetailScreen(batch: batch)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  type == 'expired'
                      ? Icons.dangerous_outlined
                      : type == 'expiring'
                          ? Icons.hourglass_bottom
                          : Icons.trending_down,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      batch.name,
                      style: AppTextStyles.bodyBold,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Lot ${batch.lotNumber} • ${batch.available} vials',
                      style: AppTextStyles.caption,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message,
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}