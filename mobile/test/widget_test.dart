import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('VaxoraApp smoke test loads landing screen', (WidgetTester tester) async {
    await tester.pumpWidget(const VaxoraApp());
    expect(find.text('Book Your Vaccine In few Minutes'), findsOneWidget);
  });
}
