import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/landing/presentation/screens/landing_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VaxoraApp());
}

class VaxoraApp extends StatelessWidget {
  const VaxoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vaxora National Immunization Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LandingScreen(),
    );
  }
}
