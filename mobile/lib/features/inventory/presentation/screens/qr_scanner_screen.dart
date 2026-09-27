import 'package:flutter/material.dart';
import '../../../../core/theme/app_text_styles.dart';

class QrScannerScreen extends StatelessWidget {
  const QrScannerScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('QR Scanner', style: AppTextStyles.h3)),
      body: const Center(child: Text('Coming in Phase B2')),
    );
  }
}