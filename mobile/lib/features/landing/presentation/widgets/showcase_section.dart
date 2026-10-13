import 'package:flutter/material.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class ShowcaseSection extends StatelessWidget {
  final void Function(String action) onAction;

  const ShowcaseSection({super.key, required this.onAction});

  @override
  Widget build(BuildContext context) {
    final rows = [
      _ShowcaseRowData(
        title: 'Simplify every clinic day',
        text:
            'Doctors, nurses and hospitals work from the same live picture of the day.',
        points: const [
          'Booth queues for doctors and nurses',
          'Vaccine stock tracked by batch',
          'Shift rosters and cover in one place',
        ],
        linkLabel: 'Staff log in',
        action: 'login',
        image: AppAssets.landingRowClinic,
        preview: const _ClinicPreview(),
      ),
      _ShowcaseRowData(
        title: 'Safeguard patient records',
        text:
            'Health data stays private, and every professional is checked before they join.',
        points: const [
          'Staff and hospitals verified by the Ministry',
          'Only the care team can open a record',
          'Every admin action kept in an audit log',
        ],
        linkLabel: 'Create an account',
        action: 'signup',
        image: AppAssets.landingRowRecords,
        preview: const _AccessPreview(),
      ),
      _ShowcaseRowData(
        title: 'Every dose in a snap',
        text:
            'Each dose is saved the moment it is given, so the history is always complete.',
        points: const [
          'Full vaccination history in one place',
          'Care plan shows what is due next',
          'Reminders before the next dose',
        ],
        linkLabel: 'Book a vaccine',
        action: 'signup',
        image: AppAssets.landingRowDose,
        preview: const _HistoryPreview(),
      ),
    ];

    return Container(
      color: AppColors.surfaceSubtle,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        children: [
          for (final row in rows) ...[
            _ShowcaseRow(
              data: row,
              onAction: () => onAction(row.action),
            ),
            if (row != rows.last) const SizedBox(height: 28),
          ],
        ],
      ),
    );
  }
}

class _ShowcaseRowData {
  final String title;
  final String text;
  final List<String> points;
  final String linkLabel;
  final String action;
  final String image;
  final Widget preview;

  const _ShowcaseRowData({
    required this.title,
    required this.text,
    required this.points,
    required this.linkLabel,
    required this.action,
    required this.image,
    required this.preview,
  });
}

class _ShowcaseRow extends StatelessWidget {
  final _ShowcaseRowData data;
  final VoidCallback onAction;

  const _ShowcaseRow({required this.data, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(data.title, style: AppTextStyles.h2),
        const SizedBox(height: 8),
        Text(
          data.text,
          style: const TextStyle(
            fontSize: 14.5,
            height: 1.5,
            color: AppColors.textBody,
          ),
        ),
        const SizedBox(height: 12),
        ...data.points.map(
          (point) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.check, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    point,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: AppColors.textTitle,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            padding: EdgeInsets.zero,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                data.linkLabel,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.arrow_forward, size: 16),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Image.asset(
            data.image,
            height: 200,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(height: 12),
        data.preview,
      ],
    );
  }
}

class _MockCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _MockCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textTitle,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _ClinicPreview extends StatelessWidget {
  const _ClinicPreview();

  @override
  Widget build(BuildContext context) {
    const queue = [
      ('#12', 'N. Perera', 'Now', true),
      ('#13', 'A. Silva', 'Waiting', false),
      ('#14', 'K. Fernando', 'Waiting', false),
    ];
    return _MockCard(
      title: 'Booth 2 queue',
      child: Column(
        children: [
          ...queue.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Text(
                    item.$1,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      item.$2,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textTitle,
                      ),
                    ),
                  ),
                  _Chip(label: item.$3, emphasize: item.$4),
                ],
              ),
            ),
          ),
          const Divider(height: 18),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Hep B batch HB-2291',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              Text(
                '84 doses left',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textTitle,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AccessPreview extends StatelessWidget {
  const _AccessPreview();

  @override
  Widget build(BuildContext context) {
    const checks = [
      ('Licence verified', 'Ministry of Health'),
      ('Role-based access', 'Care team only'),
      ('Action logged', 'Audit trail, 10:42'),
    ];
    return _MockCard(
      title: 'Record access',
      child: Column(
        children: checks
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.$1,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.textTitle,
                            ),
                          ),
                          Text(
                            item.$2,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.check, size: 16, color: AppColors.success),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _HistoryPreview extends StatelessWidget {
  const _HistoryPreview();

  @override
  Widget build(BuildContext context) {
    const doses = [
      ('BCG', '12 Jan 2024', 'Given', false),
      ('MMR, dose 1', '03 Mar 2025', 'Given', false),
      ('Hepatitis B, dose 2', '14 Nov 2026', 'Due', true),
    ];
    return _MockCard(
      title: 'My vaccinations',
      child: Column(
        children: doses
            .map(
              (dose) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            dose.$1,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.textTitle,
                            ),
                          ),
                          Text(
                            dose.$2,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _Chip(label: dose.$3, emphasize: dose.$4, due: dose.$4),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool emphasize;
  final bool due;

  const _Chip({
    required this.label,
    this.emphasize = false,
    this.due = false,
  });

  @override
  Widget build(BuildContext context) {
    final bg = due
        ? AppColors.warningBg
        : emphasize
            ? AppColors.infoBg
            : AppColors.successBg;
    final fg = due
        ? AppColors.warning
        : emphasize
            ? AppColors.primary
            : AppColors.success;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}
