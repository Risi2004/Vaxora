import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/patient/presentation/widgets/book_appointment_sheet.dart';
import 'test_helpers.dart';

void main() {
  setUp(() {
    mockUserAndToken();
  });

  tearDown(() {
    HttpOverrides.global = null;
  });

  group('Booking Management - Form Validation, Slots & Creation', () {
    // Scenario 4: Booking form validation works
    testWidgets('4. Form validation displays error banner when required hospital is missing', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      // Mock empty schedules so hospital is not selected
      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/schedule/available')) {
          return MockHttpResponse(statusCode: 200, body: '[]');
        }
        if (uri.path.contains('/inventory/vaccines')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {'id': 'v1', 'name': 'COVID-19 mRNA Booster'},
            ]),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: BookAppointmentSheet(onAppointmentBooked: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap Confirm slot with no hospital schedule selected
      final confirmBtn = find.widgetWithText(FilledButton, 'Confirm slot');
      expect(confirmBtn, findsOneWidget);
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      // Error banner should appear
      expect(find.text('Please select a valid hospital.'), findsOneWidget);
    });

    // Scenario 5: Available dates and time slots are displayed
    testWidgets('5. Available dates and 20-minute time slots are rendered as selectable chips', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockSchedules = [
        {
          'id': 'sched-1',
          'hospitalUserId': 'hosp-user-1',
          'hospitalName': 'National Hospital Colombo',
          'vaccineName': 'COVID-19 mRNA Booster',
          'price': 0.0,
          'formattedPrice': 'Free',
        }
      ];

      final mockSlots = [
        {'slot': '09:00 AM - 09:20 AM', 'availableCapacity': 10},
        {'slot': '09:20 AM - 09:40 AM', 'availableCapacity': 8},
        {'slot': '09:40 AM - 10:00 AM', 'availableCapacity': 5},
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/schedule/available')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSchedules));
        }
        if (uri.path.contains('/inventory/vaccines')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {'id': 'v1', 'name': 'COVID-19 mRNA Booster'},
            ]),
          );
        }
        if (uri.path.contains('/appointments/available-slots')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSlots));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: BookAppointmentSheet(onAppointmentBooked: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify date container is displayed with calendar icon
      expect(find.byIcon(Icons.calendar_today_outlined), findsOneWidget);

      // Verify slot chips are displayed
      expect(find.byType(ChoiceChip), findsNWidgets(3));
      expect(find.text('09:00 AM - 09:20 AM'), findsOneWidget);
      expect(find.text('09:20 AM - 09:40 AM'), findsOneWidget);
      expect(find.text('09:40 AM - 10:00 AM'), findsOneWidget);

      // Selecting the second slot updates selection
      await tester.tap(find.text('09:20 AM - 09:40 AM'));
      await tester.pumpAndSettle();

      final chip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, '09:20 AM - 09:40 AM'),
      );
      expect(chip.selected, isTrue);
    });

    // Scenario 6: Successful booking is handled correctly
    testWidgets('6. Successful booking invokes callback, dispatches API request, and closes sheet', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockSchedules = [
        {
          'id': 'sched-1',
          'hospitalUserId': 'hosp-user-1',
          'hospitalName': 'National Hospital Colombo',
          'vaccineName': 'COVID-19 mRNA Booster',
          'price': 0.0,
          'formattedPrice': 'Free',
        }
      ];

      final mockSlots = [
        {'slot': '10:00 AM - 10:20 AM', 'availableCapacity': 10},
      ];

      final bookedAppointmentResponse = {
        'id': 'apt-new-778899',
        'referenceNumber': 'VAX-2026-7788',
        'vaccineName': 'COVID-19 mRNA Booster',
        'hospitalName': 'National Hospital Colombo',
        'appointmentDate': '2026-10-25',
        'timeSlot': '10:00 AM - 10:20 AM',
        'status': 'Confirmed',
        'fee': 0.0,
        'isPaid': true,
      };

      Map<String, dynamic>? bookedData;
      bool apiWasCalled = false;

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/schedule/available')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSchedules));
        }
        if (uri.path.contains('/inventory/vaccines')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {'id': 'v1', 'name': 'COVID-19 mRNA Booster'},
            ]),
          );
        }
        if (uri.path.contains('/appointments/available-slots')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSlots));
        }
        if (uri.path == '/api/appointments' && method == 'POST') {
          apiWasCalled = true;
          return MockHttpResponse(statusCode: 200, body: jsonEncode(bookedAppointmentResponse));
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: Builder(
              builder: (ctx) => TextButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: ctx,
                    isScrollControlled: true,
                    builder: (_) => BookAppointmentSheet(
                      onAppointmentBooked: (data) => bookedData = data,
                    ),
                  );
                },
                child: const Text('Open Sheet'),
              ),
            ),
          ),
        ),
      );

      // Open sheet
      await tester.tap(find.text('Open Sheet'));
      await tester.pumpAndSettle();

      // Tap Confirm slot
      await tester.tap(find.widgetWithText(FilledButton, 'Confirm slot'));
      await tester.pumpAndSettle();

      // Verify API was called
      expect(apiWasCalled, isTrue);

      // Verify callback received the expected booking data
      expect(bookedData, isNotNull);
      expect(bookedData!['vaccineName'], 'COVID-19 mRNA Booster');
      expect(bookedData!['status'], 'Confirmed');

      // Verify bottom sheet dismissed
      expect(find.byType(BookAppointmentSheet), findsNothing);
    });

    // Scenario 7: Booking API failure displays an error
    testWidgets('7. Booking API failure displays error message banner', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockSchedules = [
        {
          'id': 'sched-1',
          'hospitalUserId': 'hosp-user-1',
          'hospitalName': 'National Hospital Colombo',
          'vaccineName': 'COVID-19 mRNA Booster',
          'price': 0.0,
          'formattedPrice': 'Free',
        }
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/schedule/available')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSchedules));
        }
        if (uri.path.contains('/inventory/vaccines')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {'id': 'v1', 'name': 'COVID-19 mRNA Booster'},
            ]),
          );
        }
        if (uri.path == '/api/appointments' && method == 'POST') {
          return MockHttpResponse(
            statusCode: 400,
            body: jsonEncode({'message': 'This slot has already reached maximum capacity.'}),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: BookAppointmentSheet(onAppointmentBooked: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Submit booking
      await tester.tap(find.widgetWithText(FilledButton, 'Confirm slot'));
      await tester.pumpAndSettle();

      // Error message from server should be displayed
      expect(find.text('This slot has already reached maximum capacity.'), findsOneWidget);

      // Sheet should remain open so user can pick another slot
      expect(find.byType(BookAppointmentSheet), findsOneWidget);
    });

    // Scenario 8b: Loading state is displayed during booking submission
    testWidgets('8b. Displays progress indicator on CTA button while booking submission is in progress', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockSchedules = [
        {
          'id': 'sched-1',
          'hospitalUserId': 'hosp-user-1',
          'hospitalName': 'National Hospital Colombo',
          'vaccineName': 'COVID-19 mRNA Booster',
          'price': 0.0,
          'formattedPrice': 'Free',
        }
      ];

      HttpOverrides.global = TestMockHttpOverrides((method, uri, body) async {
        if (uri.path.contains('/schedule/available')) {
          return MockHttpResponse(statusCode: 200, body: jsonEncode(mockSchedules));
        }
        if (uri.path.contains('/inventory/vaccines')) {
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode([
              {'id': 'v1', 'name': 'COVID-19 mRNA Booster'},
            ]),
          );
        }
        if (uri.path == '/api/appointments' && method == 'POST') {
          await Future.delayed(const Duration(milliseconds: 600));
          return MockHttpResponse(
            statusCode: 200,
            body: jsonEncode({
              'id': 'apt-1',
              'vaccineName': 'COVID-19 mRNA Booster',
              'hospitalName': 'National Hospital Colombo',
              'appointmentDate': '2026-10-25',
              'timeSlot': '10:00 AM - 10:20 AM',
              'status': 'Confirmed',
            }),
          );
        }
        return MockHttpResponse(statusCode: 200, body: '[]');
      });

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: BookAppointmentSheet(onAppointmentBooked: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap Confirm slot
      await tester.tap(find.widgetWithText(FilledButton, 'Confirm slot'));
      // Pump initial frame of submission
      await tester.pump();

      // Confirm button child changes to CircularProgressIndicator
      expect(find.descendant(
        of: find.byType(FilledButton),
        matching: find.byType(CircularProgressIndicator),
      ), findsOneWidget);

      // Finish pending response
      await tester.pumpAndSettle();
    });
  });
}
