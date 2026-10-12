import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/patient/data/models/medical_history_model.dart';

void main() {
  group('PatientMedicalHistoryRecordModel.fromJson', () {
    test('parses a full record into every field', () {
      final model = PatientMedicalHistoryRecordModel.fromJson({
        'id': 'rec-1',
        'patientProfileId': 'prof-1',
        'title': 'Type 2 Diabetes Mellitus',
        'description': 'Diagnosed during routine screening',
        'icd10Code': 'E11',
        'recordType': 'Diagnosis',
        'severity': 'Moderate',
        'status': 'Chronic',
        'diagnosedAt': '2024-03-15T00:00:00Z',
        'createdAt': '2026-01-01T10:00:00Z',
        'recordedByName': 'Dr. Silva',
      });

      expect(model.id, 'rec-1');
      expect(model.patientProfileId, 'prof-1');
      expect(model.title, 'Type 2 Diabetes Mellitus');
      expect(model.description, 'Diagnosed during routine screening');
      expect(model.icd10Code, 'E11');
      expect(model.recordType, 'Diagnosis');
      expect(model.severity, 'Moderate');
      expect(model.status, 'Chronic');
      expect(model.diagnosedAt?.year, 2024);
      expect(model.recordedByName, 'Dr. Silva');
    });

    test('title defaults to em-dash when missing', () {
      final model = PatientMedicalHistoryRecordModel.fromJson({
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.title, '—');
    });

    test(
      'recordType defaults to Other and severity/status have safe defaults',
      () {
        final model = PatientMedicalHistoryRecordModel.fromJson({
          'createdAt': '2026-01-01T00:00:00Z',
        });
        expect(model.recordType, 'Other');
        expect(model.severity, 'Mild');
        expect(model.status, 'Active');
        expect(model.description, isNull);
        expect(model.icd10Code, isNull);
        expect(model.diagnosedAt, isNull);
      },
    );

    test('unreadable date returns null instead of throwing', () {
      final model = PatientMedicalHistoryRecordModel.fromJson({
        'diagnosedAt': 'not-a-date',
        'createdAt': '2026-01-01T00:00:00Z',
      });
      expect(model.diagnosedAt, isNull);
    });
  });

  group('PatientMedicalHistoryTimelineModel.fromJson', () {
    test('parses the timeline with nested records', () {
      final model = PatientMedicalHistoryTimelineModel.fromJson({
        'patientProfileId': 'prof-1',
        'totalRecords': 2,
        'activeConditions': 1,
        'criticalOrSevere': 0,
        'records': [
          {
            'id': 'r1',
            'title': 'Hypertension',
            'recordType': 'Diagnosis',
            'severity': 'Moderate',
            'status': 'Active',
            'createdAt': '2026-01-01T00:00:00Z',
          },
          {
            'id': 'r2',
            'title': 'Penicillin',
            'recordType': 'Allergy',
            'severity': 'Severe',
            'status': 'Active',
            'createdAt': '2026-01-01T00:00:00Z',
          },
        ],
      });

      expect(model.patientProfileId, 'prof-1');
      expect(model.totalRecords, 2);
      expect(model.activeConditions, 1);
      expect(model.criticalOrSevere, 0);
      expect(model.records.length, 2);
      expect(model.records.first.title, 'Hypertension');
      expect(model.records.last.recordType, 'Allergy');
    });

    test('empty records list when records field is missing', () {
      final model = PatientMedicalHistoryTimelineModel.fromJson({
        'patientProfileId': 'prof-1',
      });
      expect(model.records, isEmpty);
      expect(model.totalRecords, 0);
      expect(model.activeConditions, 0);
      expect(model.criticalOrSevere, 0);
    });

    test('non-map entries inside the records list are filtered out', () {
      final model = PatientMedicalHistoryTimelineModel.fromJson({
        'records': [
          {
            'id': 'r1',
            'title': 'A',
            'recordType': 'Diagnosis',
            'severity': 'Mild',
            'status': 'Active',
            'createdAt': '2026-01-01T00:00:00Z',
          },
          'not a map',
          42,
          null,
        ],
      });
      expect(model.records.length, 1);
      expect(model.records.first.id, 'r1');
    });
  });
}
