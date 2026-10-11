import 'package:flutter/material.dart';
import '../widgets/landing_app_bar.dart';
import '../widgets/landing_drawer.dart';
import '../widgets/hero_section.dart';
import '../widgets/stats_section.dart';
import '../widgets/about_section.dart';
import '../widgets/showcase_section.dart';
import '../widgets/features_section.dart';
import '../widgets/roles_section.dart';
import '../widgets/steps_section.dart';
import '../widgets/reviews_carousel.dart';
import '../widgets/faq_section.dart';
import '../widgets/contact_section.dart';
import '../widgets/cta_section.dart';
import '../widgets/landing_footer.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/presentation/screens/signup_screen.dart';
import '../../../auth/presentation/screens/forgot_password_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final ScrollController _scrollController = ScrollController();

  final GlobalKey _homeKey = GlobalKey();
  final GlobalKey _aboutKey = GlobalKey();
  final GlobalKey _featuresKey = GlobalKey();
  final GlobalKey _howItWorksKey = GlobalKey();
  final GlobalKey _reviewsKey = GlobalKey();
  final GlobalKey _faqKey = GlobalKey();
  final GlobalKey _contactKey = GlobalKey();

  String _activeSection = 'home';

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToKey(GlobalKey key, String section) {
    setState(() => _activeSection = section);
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _onSectionSelected(String section) {
    switch (section) {
      case 'home':
        _scrollToKey(_homeKey, 'home');
      case 'about':
        _scrollToKey(_aboutKey, 'about');
      case 'features':
        _scrollToKey(_featuresKey, 'features');
      case 'reviews':
        _scrollToKey(_reviewsKey, 'reviews');
      case 'faq':
        _scrollToKey(_faqKey, 'faq');
      case 'contact':
        _scrollToKey(_contactKey, 'contact');
      case 'how-it-works':
        _scrollToKey(_howItWorksKey, 'how-it-works');
    }
  }

  void _navigateToLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  void _navigateToSignup([String? initialRole]) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => SignupScreen(initialRole: initialRole),
      ),
    );
  }

  void _navigateToForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
    );
  }

  void _onLandingAction(String action) {
    switch (action) {
      case 'login':
        _navigateToLogin();
      case 'signup':
        _navigateToSignup('patient');
      case 'signup-hospital':
        _navigateToSignup('hospital');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: LandingAppBar(
        onLoginPressed: _navigateToLogin,
        onSignupPressed: () => _navigateToSignup(),
        onMenuPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
      ),
      endDrawer: LandingDrawer(
        activeSection: _activeSection,
        onSectionSelected: _onSectionSelected,
        onLoginPressed: _navigateToLogin,
        onSignupPressed: () => _navigateToSignup(),
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            Container(
              key: _homeKey,
              child: HeroSection(
                onBookClick: () => _navigateToSignup('patient'),
                onSeeHow: () => _scrollToKey(_howItWorksKey, 'how-it-works'),
              ),
            ),
            const StatsSection(),
            Container(
              key: _aboutKey,
              child: const AboutSection(),
            ),
            ShowcaseSection(onAction: _onLandingAction),
            Container(
              key: _featuresKey,
              child: const FeaturesSection(),
            ),
            RolesSection(onAction: _onLandingAction),
            Container(
              key: _howItWorksKey,
              child: const StepsSection(),
            ),
            Container(
              key: _reviewsKey,
              child: const ReviewsCarousel(),
            ),
            Container(
              key: _faqKey,
              child: const FaqSection(),
            ),
            Container(
              key: _contactKey,
              child: ContactSection(
                onArrowClick: () => _scrollToKey(_contactKey, 'contact'),
              ),
            ),
            CtaSection(
              onSignup: () => _navigateToSignup('patient'),
              onLogin: _navigateToLogin,
            ),
            LandingFooter(
              onNavClick: _onSectionSelected,
              onLogin: _navigateToLogin,
              onSignup: () => _navigateToSignup('patient'),
              onForgotPassword: _navigateToForgotPassword,
              onHospitalSignup: () => _navigateToSignup('hospital'),
            ),
          ],
        ),
      ),
    );
  }
}
