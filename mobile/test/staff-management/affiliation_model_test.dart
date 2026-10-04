import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/staff/data/models/affiliation_model.dart';

void main() {
  group('Staff Management - AffiliationModel', () {
    test('parses JSON and exposes pending/active helpers', () {
      final pending = AffiliationModel.fromJson({
        'affiliationId': 'a1',
        'hospitalUserId': 'h1',
        'hospitalName': 'Royal Hospitals',
        'staffUserId': 's1',
        'staffName': 'Dr Kasun',
        'staffRole': 'DOCTOR',
        'status': 'Pending',
        'dutyStatus': 'OffDuty',
        'isOnDutyNow': false,
      });

      expect(pending.isPending, isTrue);
      expect(pending.isActive, isFalse);
      expect(pending.hospitalName, 'Royal Hospitals');

      final active = AffiliationModel.fromJson({
        'affiliationId': 'a2',
        'hospitalUserId': 'h2',
        'hospitalName': 'NHSL',
        'staffUserId': 's1',
        'staffName': 'Dr Kasun',
        'staffRole': 'DOCTOR',
        'status': 'ACTIVE',
        'dutyStatus': 'OnDuty',
        'isOnDutyNow': true,
      });

      expect(active.isActive, isTrue);
      expect(active.isPending, isFalse);
      expect(active.isOnDutyNow, isTrue);
    });
  });
}
