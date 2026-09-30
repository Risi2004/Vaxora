import 'package:flutter/material.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../staff/presentation/widgets/network_avatar.dart';
import '../../../staff/presentation/widgets/staff_common_widgets.dart';

class PatientFeedbackScreen extends StatefulWidget {
  const PatientFeedbackScreen({super.key});

  @override
  State<PatientFeedbackScreen> createState() => _PatientFeedbackScreenState();
}

class _PatientFeedbackScreenState extends State<PatientFeedbackScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _messageController = TextEditingController();

  int _rating = 5;
  bool _submitted = false;
  String _displayName = 'Citizen';
  String? _photoUrl;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthRepository.getCurrentUser();
    if (user != null && mounted) {
      setState(() {
        _nameController.text = user.name;
        _emailController.text = user.email;
        _displayName = user.name.isNotEmpty ? user.name : 'Citizen';
        _photoUrl = resolveMediaUrl(user.profilePhotoUrl);
        if (user.phoneNumber != null && user.phoneNumber!.isNotEmpty) {
          _phoneController.text = user.phoneNumber!;
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _submitted = true);
    }
  }

  void _handleReset() {
    setState(() {
      _messageController.clear();
      _rating = 5;
      _submitted = false;
    });
  }

  InputDecoration _field(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: StaffSurfaces.textMutedSoft,
        fontSize: 13,
      ),
      filled: true,
      fillColor: StaffSurfaces.cardBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: StaffSurfaces.brandSoft),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StaffSurfaces.pageBg,
      appBar: StaffScreenHeader.appBar(
        displayName: _displayName,
        subtitle: 'Patient · Feedback',
        photoUrl: _photoUrl,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        children: [
          StaffPageIntro(
            eyebrow: 'Service quality',
            title: 'Share feedback',
            subtitle: 'Rate a recent vaccination visit so centres can improve.',
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: StaffSurfaces.card(),
            child: _submitted
                ? Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: StaffSurfaces.softPanelDeep,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.check_circle_outline,
                          color: StaffSurfaces.brandSoft,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Thanks for the feedback',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: StaffSurfaces.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your $_rating-star rating and comments are recorded.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          color: StaffSurfaces.textSecondary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _handleReset,
                        style: FilledButton.styleFrom(
                          backgroundColor: StaffSurfaces.cta,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                        ),
                        child: const Text('Submit another'),
                      ),
                    ],
                  )
                : Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Your experience',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: StaffSurfaces.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Tap a star, then add a short note.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: StaffSurfaces.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            vertical: 10,
                            horizontal: 8,
                          ),
                          decoration: StaffSurfaces.softWell(),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (index) {
                              final starValue = index + 1;
                              return IconButton(
                                onPressed: () =>
                                    setState(() => _rating = starValue),
                                icon: Icon(
                                  starValue <= _rating
                                      ? Icons.star_rounded
                                      : Icons.star_outline_rounded,
                                  color: const Color(0xFFF59E0B),
                                  size: 30,
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _nameController,
                          decoration: _field('Your name'),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Please enter name'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: _field('Email'),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Please enter email'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: _field('Contact number'),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _messageController,
                          maxLines: 4,
                          decoration: _field('Tell us about your visit…'),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Please write your feedback'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _handleSubmit,
                          style: FilledButton.styleFrom(
                            backgroundColor: StaffSurfaces.cta,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: const Text('Submit feedback'),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
