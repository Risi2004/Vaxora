import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/patient/presentation/screens/patient_profile_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../booking-management/test_helpers.dart';

/// Seeds a patient user with the exact shape the profile screen reads from
/// StorageService.getUser() — including the nested `profileDetails.id`
/// that the medical history loader looks for.
void seedPatientUser({
  String name = 'Amara Perera',
  String email = 'amara@vaxora.lk',
  String? profileId,
}) {
  FlutterSecureStorage.setMockInitialValues({
    'vaxora_auth_token': 'test-token',
  });
  SharedPreferences.setMockInitialValues({
    'vaxora_auth_user': jsonEncode({
      'id': 'patient-user-1',
      'name': name,
      'email': email,
      'role': 'PATIENT',
      'status': 'Active',
      'registrationNumber': 'VAX-P-10023',
      'nicNumber': '199512345678',
      'dateOfBirth': '1995-01-01T00:00:00Z',
      'profileDetails': profileId != null ? {'id': profileId} : null,
      'profilePhotoUrl': null,
    }),
  });
}

Map<String, dynamic> _historyRecord({
  String id = 'r1',
  String title = 'Hypertension',
  String recordType = 'Diagnosis',
  String severity = 'Moderate',
  String status = 'Active',
  String? icd10 = 'I10',
}) {
  return {
    'id': id,
    'title': title,
    'recordType': recordType,
    'severity': severity,
    'status': status,
    'icd10Code': icd10,
    'createdAt': '2026-01-01T00:00:00Z',
  };
}

void main() {
  tearDown(() {
    HttpOverrides.global = null;
  });

  group(
    'PatientProfileScreen - Patient mobile profile with medical history',
    () {
      // 1. Renders profile header with user name
      testWidgets('renders profile header and personal info from cached user', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser();

        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        // Name renders in both the avatar header and the editable name field
        expect(find.text('Amara Perera'), findsWidgets);
        // Registry number renders in both the header line and the registry row
        expect(find.textContaining('VAX-P-10023'), findsWidgets);
        expect(find.text('Personal Information'), findsOneWidget);
      });

      // 2. All sections render
      testWidgets('renders all profile sections', (tester) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser();

        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Personal Information'), findsOneWidget);
        expect(find.text('Medical & Clinical Registry'), findsOneWidget);
        expect(find.text('Medical History'), findsOneWidget);
        expect(find.text('Emergency Contact'), findsOneWidget);
      });

      // 3. Medical history empty state when no records
      testWidgets(
        'medical history card shows empty state when timeline is empty',
        (tester) async {
          tester.view.physicalSize = const Size(1080, 2400);
          tester.view.devicePixelRatio = 1.0;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);

          seedPatientUser(profileId: 'profile-guid-1');

          HttpOverrides.global = TestMockHttpOverrides((
            method,
            uri,
            body,
          ) async {
            if (uri.path.contains(
              '/patient-medical-history/patients/profile-guid-1/timeline',
            )) {
              return MockHttpResponse(
                statusCode: 200,
                body: jsonEncode({
                  'patientProfileId': 'profile-guid-1',
                  'totalRecords': 0,
                  'activeConditions': 0,
                  'criticalOrSevere': 0,
                  'records': [],
                }),
              );
            }
            return MockHttpResponse(statusCode: 200, body: '{}');
          });

          await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
          await tester.pumpAndSettle();

          expect(find.text('No medical history on file yet.'), findsOneWidget);
        },
      );

      // 4. Medical history records render grouped
      testWidgets('medical history renders records grouped by type', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser(profileId: 'profile-guid-1');

        final records = [
          _historyRecord(
            id: 'r1',
            title: 'Type 2 Diabetes',
            recordType: 'Diagnosis',
            severity: 'Moderate',
            status: 'Chronic',
            icd10: 'E11',
          ),
          _historyRecord(
            id: 'r2',
            title: 'Penicillin',
            recordType: 'Allergy',
            severity: 'Severe',
            status: 'Active',
            icd10: null,
          ),
        ];

        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          if (uri.path.contains(
            '/patient-medical-history/patients/profile-guid-1/timeline',
          )) {
            return MockHttpResponse(
              statusCode: 200,
              body: jsonEncode({
                'patientProfileId': 'profile-guid-1',
                'totalRecords': 2,
                'activeConditions': 2,
                'criticalOrSevere': 1,
                'records': records,
              }),
            );
          }
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Type 2 Diabetes'), findsOneWidget);
        expect(find.text('Penicillin'), findsOneWidget);
        expect(find.text('DIAGNOSIS'), findsOneWidget);
        expect(find.text('ALLERGY'), findsOneWidget);
        expect(find.textContaining('ICD-10: E11'), findsOneWidget);
      });

      // 5. Record count header updates from timeline
      testWidgets('medical history header shows record count from timeline', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser(profileId: 'profile-guid-1');

        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          if (uri.path.contains(
            '/patient-medical-history/patients/profile-guid-1/timeline',
          )) {
            return MockHttpResponse(
              statusCode: 200,
              body: jsonEncode({
                'patientProfileId': 'profile-guid-1',
                'totalRecords': 3,
                'activeConditions': 1,
                'criticalOrSevere': 0,
                'records': [
                  _historyRecord(id: 'r1', title: 'A', recordType: 'Diagnosis'),
                  _historyRecord(id: 'r2', title: 'B', recordType: 'Diagnosis'),
                  _historyRecord(id: 'r3', title: 'C', recordType: 'Allergy'),
                ],
              }),
            );
          }
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        expect(find.text('3 records'), findsOneWidget);
      });

      // 6. Missing profileId → empty state, no API call
      testWidgets('no history call when cached user has no profile id', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser(); // no profileId

        var historyCalled = false;
        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          if (uri.path.contains('/patient-medical-history/')) {
            historyCalled = true;
          }
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        expect(historyCalled, false);
        expect(find.text('No medical history on file yet.'), findsOneWidget);
      });

      // 7. Server error on history → graceful empty state
      testWidgets(
        'history API error leaves card in empty state without crashing',
        (tester) async {
          tester.view.physicalSize = const Size(1080, 2400);
          tester.view.devicePixelRatio = 1.0;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);

          seedPatientUser(profileId: 'profile-guid-1');

          HttpOverrides.global = TestMockHttpOverrides((
            method,
            uri,
            body,
          ) async {
            if (uri.path.contains('/patient-medical-history/')) {
              return MockHttpResponse(
                statusCode: 500,
                body: jsonEncode({'message': 'Internal server error'}),
              );
            }
            return MockHttpResponse(statusCode: 200, body: '{}');
          });

          await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
          await tester.pumpAndSettle();

          expect(find.text('No medical history on file yet.'), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );

      // 8. Log out and Delete Account buttons render
      testWidgets('log out and delete account actions render on profile', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        seedPatientUser();

        HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
          return MockHttpResponse(statusCode: 200, body: '{}');
        });

        await tester.pumpWidget(createTestApp(const PatientProfileScreen()));
        await tester.pumpAndSettle();

        expect(find.widgetWithText(FilledButton, 'Log out'), findsOneWidget);
        expect(
          find.widgetWithText(FilledButton, 'Delete Account'),
          findsOneWidget,
        );
        expect(
          find.widgetWithText(OutlinedButton, 'Export health pass (PDF)'),
          findsOneWidget,
        );
      });
    },
  );
}
