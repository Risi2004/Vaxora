import 'package:flutter/material.dart';
import '../widgets/landing_app_bar.dart';
import '../widgets/landing_drawer.dart';
import '../widgets/hero_section.dart';
import '../widgets/about_section.dart';
import '../widgets/stats_section.dart';
import '../widgets/contact_section.dart';
import '../widgets/reviews_carousel.dart';
import '../widgets/landing_footer.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/presentation/screens/signup_screen.dart';

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
  final GlobalKey _contactKey = GlobalKey();
  final GlobalKey _reviewsKey = GlobalKey();

  String _activeSection = 'home';

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToKey(GlobalKey key, String section) {
    setState(() {
      _activeSection = section;
    });

    final context = key.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
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
        onSectionSelected: (section) {
          switch (section) {
            case 'home':
              _scrollToKey(_homeKey, 'home');
              break;
            case 'about':
              _scrollToKey(_aboutKey, 'about');
              break;
            case 'contact':
              _scrollToKey(_contactKey, 'contact');
              break;
            case 'reviews':
              _scrollToKey(_reviewsKey, 'reviews');
              break;
          }
        },
        onLoginPressed: _navigateToLogin,
        onSignupPressed: () => _navigateToSignup(),
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            // 1. Hero Section
            Container(
              key: _homeKey,
              child: HeroSection(
                onBookClick: () => _scrollToKey(_contactKey, 'contact'),
              ),
            ),

            // 2. About Portal Section
            Container(
              key: _aboutKey,
              child: const AboutSection(),
            ),

            // 3. Stats & Impact Section
            const StatsSection(),

            // 4. Contact Us & Booking Form Section
            Container(
              key: _contactKey,
              child: ContactSection(
                onArrowClick: () => _scrollToKey(_contactKey, 'contact'),
              ),
            ),

            // 5. User Reviews Carousel Section
            Container(
              key: _reviewsKey,
              child: const ReviewsCarousel(),
            ),

            // 6. Footer
            const LandingFooter(),
          ],
        ),
      ),
    );
  }
}
