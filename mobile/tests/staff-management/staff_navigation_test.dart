import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/staff/presentation/screens/staff_main_screen.dart';

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

  MockHttpResponse emptyOk(String method, Uri uri, dynamic body) {
    if (uri.path.contains('/staff/')) {
      return MockHttpResponse(statusCode: 200, body: '[]');
    }
    return MockHttpResponse(statusCode: 200, body: '{}');
  }

  Future<void> pumpMain(WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(createTestApp(const StaffMainScreen()));
    await tester.pumpAndSettle();
  }

  Finder bottomNavItem(String label) => find
      .ancestor(
        of: find.text(label),
        matching: find.byType(InkWell),
      )
      .last;

  group('Staff Management - Navigation', () {
    testWidgets('1. Bottom nav switches Home → Shifts → Hospitals', (tester) async {
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async => emptyOk(method, uri, body));

      await pumpMain(tester);

      expect(find.text('STAFF HOME'), findsOneWidget);

      await tester.tap(bottomNavItem('Shifts'));
      await tester.pumpAndSettle();
      expect(find.textContaining('My Shifts'), findsWidgets);
      expect(find.text('CLINICAL ROSTER'), findsOneWidget);

      await tester.tap(bottomNavItem('Hospitals'));
      await tester.pumpAndSettle();
      expect(find.text('Your affiliations'), findsOneWidget);
      expect(find.text('HOSPITAL NETWORK'), findsOneWidget);
    });

    testWidgets('2. Home quick-access My shifts navigates to Shifts tab', (tester) async {
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async => emptyOk(method, uri, body));

      await pumpMain(tester);

      expect(find.text('My shifts'), findsOneWidget);
      await tester.tap(find.text('My shifts'));
      await tester.pumpAndSettle();

      expect(find.text('CLINICAL ROSTER'), findsOneWidget);
      expect(find.textContaining('My Shifts'), findsWidgets);
    });

    testWidgets('3. Pending invitation badge appears on Hospitals tab', (tester) async {
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/staff/invitations')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {
                'affiliationId': 'aff-pending-1',
                'hospitalUserId': 'hosp-1',
                'hospitalName': 'Royal Hospitals',
                'staffUserId': 'doctor-user-1',
                'staffName': 'Dr Kasun Silva',
                'staffRole': 'DOCTOR',
                'status': 'Pending',
                'dutyStatus': 'OffDuty',
                'isOnDutyNow': false,
              }
            ]),
          );
        }
        if (uri.path.contains('/staff/')) {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        return MockHttpResponse(statusCode: 200, body: '{}');
      });

      await pumpMain(tester);

      expect(find.byType(Badge), findsWidgets);

      await tester.tap(bottomNavItem('Hospitals'));
      await tester.pumpAndSettle();
      expect(find.text('Royal Hospitals'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
    });
  });
}
