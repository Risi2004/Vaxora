import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/patient/presentation/screens/patient_feedback_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../booking-management/test_helpers.dart';

/// Seeds a PATIENT user with an email so the feedback form's identity
/// fields populate correctly. (The shared mockUserAndToken helper does
/// not include email.)
void seedPatientWithEmail({String email = 'amara@vaxora.lk'}) {
  FlutterSecureStorage.setMockInitialValues({
    'vaxora_auth_token': 'test-token',
  });
  SharedPreferences.setMockInitialValues({
    'vaxora_auth_user': jsonEncode({
      'id': 'patient-user-1',
      'name': 'Amara Perera',
      'email': email,
      'role': 'PATIENT',
      'status': 'Active',
      'registrationNumber': 'VAX-P-10023',
      'nicNumber': '199512345678',
      'profilePhotoUrl': null,
    }),
  });
}

Map<String, dynamic> _pastFeedback({
  String id = 'fb-1',
  String message = 'Great service',
  int rating = 5,
  String status = 'New',
  String? adminResponse,
}) {
  return {
    'id': id,
    'userId': 'patient-user-1',
    'isAnonymous': false,
    'submitterName': 'Amara Perera',
    'submitterEmail': 'amara@vaxora.lk',
    'category': 'General Feedback',
    'message': message,
    'rating': rating,
    'status': status,
    'adminResponse': adminResponse,
    'createdAt': '2026-10-01T10:00:00Z',
  };
}

void main() {
  setUp(() {
    seedPatientWithEmail();
  });

  tearDown(() {
    HttpOverrides.global = null;
  });

  group('PatientFeedbackScreen - Patient mobile feedback submission', () {
    // 1. Header + form render
    testWidgets('renders the page header and form on mount', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Share feedback'), findsOneWidget);
      expect(find.text('Submit feedback'), findsOneWidget);
      expect(find.text('My Past Feedbacks'), findsOneWidget);
      expect(find.text('Submit anonymously'), findsOneWidget);
    });

    // 2. Empty past feedbacks state
    testWidgets('shows empty past-feedback state when list is empty', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      expect(
        find.text("You haven't submitted any feedback yet."),
        findsOneWidget,
      );
    });

    // 3. Past feedbacks render from API
    testWidgets('renders past feedback cards from API response', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final pastList = [
        _pastFeedback(id: 'fb-1', message: 'Great service', rating: 5),
        _pastFeedback(
          id: 'fb-2',
          message: 'Queue was long',
          rating: 3,
          status: 'Resolved',
          adminResponse: 'Thanks for reporting',
        ),
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(pastList));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Great service'), findsOneWidget);
      expect(find.text('Queue was long'), findsOneWidget);
      expect(find.text('Admin response'), findsOneWidget);
      expect(find.text('Thanks for reporting'), findsOneWidget);
    });

    // 4. Anonymous toggle disables identity fields and lets submission proceed
    testWidgets(
      'anonymous toggle disables name/email and lets empty identity pass',
      (tester) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        var postBody = <String, dynamic>{};
        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          if (uri.path == '/api/feedback/my') {
            return MockHttpResponse(statusCode: 200, body: '[]');
          }
          if (uri.path == '/api/feedback' && method == 'POST') {
            postBody = jsonDecode(body) as Map<String, dynamic>;
            return MockHttpResponse(
              statusCode: 200,
              body: jsonEncode({
                'id': 'fb-new',
                'rating': 5,
                'message': 'ok',
                'status': 'New',
                'isAnonymous': true,
                'createdAt': '2026-10-08T00:00:00Z',
              }),
            );
          }
          return MockHttpResponse(statusCode: 200, body: '[]');
        });

        await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
        await tester.pumpAndSettle();

        // Toggle anonymous ON
        await tester.tap(find.byType(Switch));
        await tester.pumpAndSettle();

        // Fill message only
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Tell us about your visit…'),
          'Anonymous note',
        );

        await tester.tap(find.text('Submit feedback'));
        await tester.pumpAndSettle();

        // Submit succeeded with all identity fields null
        expect(postBody['isAnonymous'], true);
        expect(postBody['submitterName'], isNull);
        expect(postBody['submitterEmail'], isNull);
        expect(postBody['submitterPhone'], isNull);
      },
    );

    // 5. Form validation on empty message
    testWidgets('shows validation error when message is empty', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Submit feedback'));
      await tester.pumpAndSettle();

      expect(find.text('Please write your feedback'), findsOneWidget);
    });

    // 6. Successful submit flips to success card
    testWidgets('successful submit flips to success card', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        if (uri.path == '/api/feedback' && method == 'POST') {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode({
              'id': 'fb-new',
              'rating': 5,
              'message': 'ok',
              'status': 'New',
              'isAnonymous': false,
              'createdAt': '2026-10-08T00:00:00Z',
            }),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Tell us about your visit…'),
        'All good',
      );
      await tester.tap(find.text('Submit feedback'));
      await tester.pumpAndSettle();

      expect(find.text('Thanks for the feedback'), findsOneWidget);
      expect(find.text('Submit another'), findsOneWidget);
    });

    // 7. Submit failure shows error banner
    testWidgets('submit failure shows error banner and stays on form', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        if (uri.path == '/api/feedback' && method == 'POST') {
          return MockHttpResponse(
            statusCode: 400,
            body: jsonEncode({
              'message': 'Message must be at least 10 characters.',
            }),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Tell us about your visit…'),
        'short',
      );
      await tester.tap(find.text('Submit feedback'));
      await tester.pumpAndSettle();

      expect(
        find.text('Message must be at least 10 characters.'),
        findsOneWidget,
      );
      expect(find.text('Submit feedback'), findsOneWidget);
    });

    // 8. Resolved feedback shows "Locked" not Edit
    testWidgets('resolved past feedback shows Locked instead of Edit', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final pastList = [
        _pastFeedback(id: 'fb-1', message: 'Resolved note', status: 'Resolved'),
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(pastList));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Locked'), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Edit'), findsNothing);
    });

    // 9. Non-resolved feedback shows Edit button
    testWidgets('non-resolved feedback shows Edit button', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final pastList = [
        _pastFeedback(id: 'fb-1', message: 'Pending note', status: 'New'),
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(pastList));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(TextButton, 'Edit'), findsOneWidget);
    });

    // 10. Edit dialog opens for non-resolved feedback
    testWidgets('tapping Edit opens the edit feedback dialog', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final pastList = [
        _pastFeedback(id: 'fb-1', message: 'Editable note', status: 'New'),
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path == '/api/feedback/my') {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(pastList));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(createTestApp(const PatientFeedbackScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(TextButton, 'Edit'));
      await tester.pumpAndSettle();

      expect(find.text('Edit Feedback'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Save'), findsOneWidget);
    });
  });
}
