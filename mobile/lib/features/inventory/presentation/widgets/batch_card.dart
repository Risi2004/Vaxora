import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/batch_model.dart';

class BatchCard extends StatelessWidget {
  final BatchModel batch;
  final VoidCallback onTap;

  const BatchCard({super.key, required this.batch, required this.onTap});

  Color get _statusColor {
    if (batch.isLowStock) return const Color(0xFFDC2626);
    if (batch.isExpiringSoon) return const Color(0xFFD97706);
    return const Color(0xFF16A34A);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: batch.isLowStock ? _statusColor.withValues(alpha: 0.4) : AppColors.borderLight),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      batch.name,
                      style: AppTextStyles.bodyBold,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      batch.isLowStock ? 'LOW' : (batch.isExpiringSoon ? 'EXPIRING' : 'OK'),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: _statusColor),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.qr_code_2, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text('Lot: ${batch.lotNumber}', style: AppTextStyles.caption),
                  const SizedBox(width: 12),
                  const Icon(Icons.calendar_today, size: 12, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(batch.expiry, style: AppTextStyles.caption),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: batch.stockPercent.clamp(0.0, 1.0),
                        minHeight: 6,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation(_statusColor),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    '${batch.available} / ${batch.capacity}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textBody),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}