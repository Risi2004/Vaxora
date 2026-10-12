import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/patient/data/models/feedback_model.dart';

void main() {
  group('FeedbackModel.fromJson', () {
    test('parses full payload into every field', () {
      final model = FeedbackModel.fromJson({
        'id': 'fb-1',
        'userId': 'user-1',
        'isAnonymous': false,
        'submitterName': 'John Doe',
        'submitterEmail': 'john@example.com',
        'submitterPhone': '0771234567',
        'hospitalName': 'National Hospital Colombo',
        'category': 'Vaccination Service',
        'subject': 'Great service',
        'message': 'Quick and professional.',
        'rating': 5,
        'status': 'Resolved',
        'adminResponse': 'Thanks!',
        'repliedAt': '2026-10-01T12:00:00Z',
        'internalNotes': 'Handled by admin',
        'createdAt': '2026-09-30T10:00:00Z',
        'updatedAt': '2026-10-01T12:00:00Z',
      });

      expect(model.id, 'fb-1');
      expect(model.userId, 'user-1');
      expect(model.isAnonymous, false);
      expect(model.submitterName, 'John Doe');
      expect(model.submitterEmail, 'john@example.com');
      expect(model.submitterPhone, '0771234567');
      expect(model.hospitalName, 'National Hospital Colombo');
      expect(model.category, 'Vaccination Service');
      expect(model.subject, 'Great service');
      expect(model.message, 'Quick and professional.');
      expect(model.rating, 5);
      expect(model.status, 'Resolved');
      expect(model.adminResponse, 'Thanks!');
      expect(model.repliedAt, isNotNull);
      expect(model.internalNotes, 'Handled by admin');
      expect(model.createdAt.year, 2026);
      expect(model.updatedAt, isNotNull);
    });

    test('isAnonymous defaults to false when missing', () {
      final model = FeedbackModel.fromJson({
        'id': 'x',
        'userId': 'u',
        'message': 'm',
        'rating': 5,
        'status': 'New',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.isAnonymous, false);
    });

    test('isAnonymous is honoured when true', () {
      final model = FeedbackModel.fromJson({
        'isAnonymous': true,
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.isAnonymous, true);
    });

    test('safe defaults fill in when fields are missing', () {
      final model = FeedbackModel.fromJson({
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.id, '');
      expect(model.userId, '');
      expect(model.submitterName, isNull);
      expect(model.submitterEmail, isNull);
      expect(model.submitterPhone, isNull);
      expect(model.hospitalName, isNull);
      expect(model.category, 'General Feedback');
      expect(model.subject, isNull);
      expect(model.message, '');
      expect(model.rating, 5);
      expect(model.status, 'New');
      expect(model.adminResponse, isNull);
      expect(model.repliedAt, isNull);
      expect(model.internalNotes, isNull);
      expect(model.updatedAt, isNull);
    });

    test('rating casts a numeric value to int', () {
      final model = FeedbackModel.fromJson({
        'rating': 4.9,
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.rating, 4);
    });

    test('isResolved returns true for RESOLVED in any case', () {
      final model = FeedbackModel.fromJson({
        'status': 'RESOLVED',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.isResolved, true);
    });

    test('isResolved returns false for every other status', () {
      for (final status in ['New', 'InReview', 'Escalated', 'inreview']) {
        final model = FeedbackModel.fromJson({
          'status': status,
          'createdAt': '2026-01-01T00:00:00Z',
        });
        expect(model.isResolved, false, reason: 'status=$status');
      }
    });

    test('createdAt falls back to DateTime.now() when missing', () {
      final before = DateTime.now().subtract(const Duration(seconds: 1));
      final model = FeedbackModel.fromJson({});
      expect(model.createdAt.isAfter(before), true);
    });
  });
}
