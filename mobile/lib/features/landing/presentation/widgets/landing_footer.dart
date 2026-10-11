import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/app_colors.dart';

class LandingFooter extends StatelessWidget {
  final void Function(String section) onNavClick;
  final VoidCallback onLogin;
  final VoidCallback onSignup;
  final VoidCallback? onForgotPassword;
  final VoidCallback? onHospitalSignup;

  const LandingFooter({
    super.key,
    required this.onNavClick,
    required this.onLogin,
    required this.onSignup,
    this.onForgotPassword,
    this.onHospitalSignup,
  });

  static const _navItems = [
    ('home', 'Home'),
    ('about', 'About'),
    ('features', 'Features'),
    ('reviews', 'Reviews'),
    ('faq', 'FAQ'),
    ('contact', 'Contact us'),
  ];

  @override
  Widget build(BuildContext context) {
    final year = DateTime.now().year;
    return Container(
      width: double.infinity,
      color: AppColors.textTitle,
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Vaxora',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Vaccination booking and records for Sri Lanka, made simple and secure.',
            style: TextStyle(
              fontSize: 13.5,
              height: 1.45,
              color: Color(0xFFB8C0D0),
            ),
          ),
          const SizedBox(height: 22),
          _FooterCol(
            heading: 'Explore',
            children: _navItems
                .map(
                  (item) => _FooterLink(
                    label: item.$2,
                    onTap: () => onNavClick(item.$1),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 18),
          _FooterCol(
            heading: 'Patients',
            children: [
              _FooterLink(label: 'Book a vaccine', onTap: onSignup),
              _FooterLink(label: 'Log in', onTap: onLogin),
              _FooterLink(label: 'Create an account', onTap: onSignup),
              if (onForgotPassword != null)
                _FooterLink(
                  label: 'Reset password',
                  onTap: onForgotPassword!,
                ),
            ],
          ),
          const SizedBox(height: 18),
          _FooterCol(
            heading: 'Staff & hospitals',
            children: [
              _FooterLink(label: 'Doctor log in', onTap: onLogin),
              _FooterLink(label: 'Nurse log in', onTap: onLogin),
              _FooterLink(label: 'Hospital log in', onTap: onLogin),
              _FooterLink(
                label: 'Register a hospital',
                onTap: onHospitalSignup ?? onSignup,
              ),
            ],
          ),
          const SizedBox(height: 18),
          _FooterCol(
            heading: 'Contact',
            children: [
              const Text(
                'Colombo, Sri Lanka',
                style: TextStyle(fontSize: 13.5, color: Color(0xFFB8C0D0)),
              ),
              const SizedBox(height: 6),
              _FooterLink(
                label: 'support@vaxora.lk',
                onTap: () {
                  Clipboard.setData(
                    const ClipboardData(text: 'support@vaxora.lk'),
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Email copied'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              const SizedBox(height: 6),
              const Text(
                'Mon to Sat, 8 am to 6 pm',
                style: TextStyle(fontSize: 13.5, color: Color(0xFFB8C0D0)),
              ),
              const SizedBox(height: 6),
              _FooterLink(
                label: 'Send us a message →',
                onTap: () => onNavClick('contact'),
                accent: true,
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Divider(color: Color(0xFF2A3350)),
          const SizedBox(height: 14),
          Text(
            '© $year Vaxora. All rights reserved.',
            style: const TextStyle(fontSize: 12, color: Color(0xFF8A96A0)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Built by SLIIT students',
            style: TextStyle(fontSize: 12, color: Color(0xFF8A96A0)),
          ),
        ],
      ),
    );
  }
}

class _FooterCol extends StatelessWidget {
  final String heading;
  final List<Widget> children;

  const _FooterCol({required this.heading, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          heading,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 10),
        ...children,
      ],
    );
  }
}

class _FooterLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool accent;

  const _FooterLink({
    required this.label,
    required this.onTap,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: GestureDetector(
        onTap: onTap,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: accent ? FontWeight.w700 : FontWeight.w500,
            color: accent ? const Color(0xFF7EC8C0) : const Color(0xFFB8C0D0),
          ),
        ),
      ),
    );
  }
}
