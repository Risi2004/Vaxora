import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('VaxoraApp smoke test loads landing screen', (WidgetTester tester) async {
    await tester.pumpWidget(const VaxoraApp());
    expect(
      find.text('Vaccine booking and records for Sri Lanka'),
      findsOneWidget,
    );
  });
}
