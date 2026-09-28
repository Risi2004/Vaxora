import 'package:add_2_calendar/add_2_calendar.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/shift_model.dart';

/// Adds shifts to the device calendar via the native insert UI (no Google share sheet).
class StaffCalendarSync {
  static const _prefsKey = 'staff_calendar_synced_shift_ids';

  static Future<Set<String>> syncedIds() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_prefsKey) ?? const []).toSet();
  }

  static Future<void> _markSynced(Iterable<String> ids) async {
    final prefs = await SharedPreferences.getInstance();
    final next = {...(prefs.getStringList(_prefsKey) ?? const []), ...ids};
    await prefs.setStringList(_prefsKey, next.toList());
  }

  static DateTime? _combine(String date, String time) {
    final d = DateTime.tryParse(date.trim());
    if (d == null) return null;
    final parts = time.trim().split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return DateTime(d.year, d.month, d.day, h, m);
  }

  static Event eventFor({
    required ShiftModel shift,
    required String hospitalName,
  }) {
    final start = _combine(shift.shiftDate, shift.startTime) ?? DateTime.now();
    var end = _combine(shift.shiftDate, shift.endTime) ??
        start.add(const Duration(hours: 4));
    if (!end.isAfter(start)) {
      end = start.add(const Duration(hours: 4));
    }

    final booth = (shift.boothOrStation?.trim().isNotEmpty ?? false)
        ? shift.boothOrStation!.trim()
        : 'Unassigned booth';
    final notes = (shift.notes?.trim().isNotEmpty ?? false)
        ? shift.notes!.trim()
        : '';

    return Event(
      title: 'Vaxora shift · $booth',
      description:
          'Hospital: $hospitalName\nBooth: $booth\nShift ID: ${shift.shiftId}'
          '${notes.isEmpty ? '' : '\n$notes'}\n\nManaged in Vaxora.',
      location: hospitalName,
      startDate: start,
      endDate: end,
      iosParams: const IOSParams(reminder: Duration(hours: 1)),
    );
  }

  static Future<bool> addShift({
    required ShiftModel shift,
    required String hospitalName,
  }) async {
    if (kIsWeb) {
      throw UnsupportedError('Calendar sync needs Android or iOS.');
    }

    final ok = await Add2Calendar.addEvent2Cal(
      eventFor(shift: shift, hospitalName: hospitalName),
    );
    if (ok && shift.shiftId.isNotEmpty) {
      await _markSynced([shift.shiftId]);
    }
    return ok;
  }

  static Future<int> addShifts({
    required List<ShiftModel> shifts,
    required String Function(ShiftModel shift) hospitalNameFor,
  }) async {
    if (shifts.isEmpty) return 0;
    if (kIsWeb) {
      throw UnsupportedError('Calendar sync needs Android or iOS.');
    }

    var added = 0;
    final synced = <String>[];
    for (final shift in shifts) {
      final ok = await Add2Calendar.addEvent2Cal(
        eventFor(shift: shift, hospitalName: hospitalNameFor(shift)),
      );
      if (ok) {
        added++;
        if (shift.shiftId.isNotEmpty) synced.add(shift.shiftId);
      }
    }
    if (synced.isNotEmpty) await _markSynced(synced);
    return added;
  }
}
