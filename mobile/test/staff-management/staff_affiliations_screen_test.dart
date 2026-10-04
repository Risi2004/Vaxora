import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/staff/presentation/screens/staff_affiliations_screen.dart';

import 'test_helpers.dart';

void main() {
  setUp(() {
    mockUserAndToken(
      id: 'doctor-user-1',
      name: 'Dr Kasun Silva',
      role: 'DOCTOR',
      registrationNumber: 'VAX-D-9001',
    );
  });

  tearDown(() {
    HttpOverrides.global = null;
  });

  group('Staff Management - Affiliations Screen', () {
    testWidgets('1. Affiliations screen renders intro, stats, and empty states',
        (tester) async {
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/staff/invitations') ||
            uri.path.contains('/staff/my-affiliations')) {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        return MockHttpResponse(statusCode: 200, body: '{}');
      });

      await tester.pumpWidget(createTestApp(const StaffAffiliationsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Your affiliations'), findsOneWidget);
      expect(find.text('HOSPITAL NETWORK'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('On duty now'), findsOneWidget);
      expect(find.text('Pending'), findsWidgets);
      expect(
        find.text(
          'You are not affiliated with any hospital yet. Accept an invitation to join a roster.',
        ),
        findsOneWidget,
      );
      expect(find.text('No pending hospital invitations.'), findsOneWidget);
      expect(find.text('PENDING INVITATIONS'), findsOneWidget);
      expect(find.text('ACTIVE AFFILIATIONS'), findsOneWidget);
    });

    testWidgets('2. Pending invitation and active affiliation cards render',
        (tester) async {
      final invitation = {
        'affiliationId': 'aff-pending-1',
        'hospitalUserId': 'hosp-1',
        'hospitalName': 'Royal Hospitals',
        'staffUserId': 'doctor-user-1',
        'staffName': 'Dr Kasun Silva',
        'staffRole': 'DOCTOR',
        'specialization': 'Immunology',
        'status': 'Pending',
        'dutyStatus': 'OffDuty',
        'isOnDutyNow': false,
      };
      final affiliation = {
        'affiliationId': 'aff-active-1',
        'hospitalUserId': 'hosp-2',
        'hospitalName': 'National Hospital Colombo',
        'staffUserId': 'doctor-user-1',
        'staffName': 'Dr Kasun Silva',
        'staffRole': 'DOCTOR',
        'specialization': 'Immunology',
        'status': 'Active',
        'dutyStatus': 'OnDuty',
        'isOnDutyNow': true,
      };

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/staff/invitations')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([invitation]),
          );
        }
        if (uri.path.contains('/staff/my-affiliations')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([affiliation]),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '{}');
      });

      await tester.pumpWidget(createTestApp(const StaffAffiliationsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('PENDING INVITATIONS'), findsOneWidget);
      expect(find.text('Royal Hospitals'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
      expect(find.text('Reject'), findsOneWidget);
      expect(find.text('National Hospital Colombo'), findsOneWidget);
      expect(find.text('ACTIVE AFFILIATIONS'), findsOneWidget);
    });

    testWidgets('3. Accepting an invitation posts decision and refreshes list',
        (tester) async {
      var accepted = false;
      final invitation = {
        'affiliationId': 'aff-pending-1',
        'hospitalUserId': 'hosp-1',
        'hospitalName': 'Asiri Central Hospital',
        'staffUserId': 'doctor-user-1',
        'staffName': 'Dr Kasun Silva',
        'staffRole': 'DOCTOR',
        'status': 'Pending',
        'dutyStatus': 'OffDuty',
        'isOnDutyNow': false,
      };

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (method == 'POST' &&
            uri.path.contains('/staff/invitations/aff-pending-1/respond')) {
          accepted = true;
          expect(body.toString(), contains('Accept'));
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode({
              ...invitation,
              'status': 'Active',
            }),
          );
        }
        if (uri.path.contains('/staff/invitations')) {
          return MockHttpResponse(
            statusCode: 200,
            body: accepted ? '[]' : jsonEncode([invitation]),
          );
        }
        if (uri.path.contains('/staff/my-affiliations')) {
          return MockHttpResponse(
            statusCode: 200,
            body: accepted
                ? jsonEncode([
                    {
                      ...invitation,
                      'status': 'Active',
                      'isOnDutyNow': false,
                    }
                  ])
                : '[]',
          );
        }
        return MockHttpResponse(statusCode: 200, body: '{}');
      });

      await tester.pumpWidget(createTestApp(const StaffAffiliationsScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Accept'));
      await tester.pumpAndSettle();

      expect(accepted, isTrue);
      expect(find.text('Asiri Central Hospital'), findsOneWidget);
      expect(find.text('Accept'), findsNothing);
    });

    testWidgets('4. API error surfaces a dismissible error banner', (tester) async {
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/staff/invitations') ||
            uri.path.contains('/staff/my-affiliations')) {
          return MockHttpResponse(
            statusCode: 500,
            body: jsonEncode({'message': 'Staff service unavailable'}),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '{}');
      });

      await tester.pumpWidget(createTestApp(const StaffAffiliationsScreen()));
      await tester.pumpAndSettle();

      expect(find.textContaining('Staff service unavailable'), findsOneWidget);
    });
  });
}
