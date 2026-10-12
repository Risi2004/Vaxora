String twoDigits(int n) => n.toString().padLeft(2, '0');

/// Local calendar date as `yyyy-MM-dd` (API DateOnly style).
String formatDateOnly(DateTime dt) {
  final d = DateTime(dt.year, dt.month, dt.day);
  return '${d.year}-${twoDigits(d.month)}-${twoDigits(d.day)}';
}

/// Hospital wall-clock time (Sri Lanka, UTC+05:30) regardless of device timezone.
DateTime hospitalNow() {
  final shifted = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
  return DateTime(shifted.year, shifted.month, shifted.day, shifted.hour, shifted.minute, shifted.second);
}

String todayIsoDate() => formatDateOnly(hospitalNow());

/// Minutes from midnight for the last clock in a slot like `09:40 AM - 10:00 AM`
/// or `09:00 – 12:00`.
int? parseSlotEndMinutes(String? timeSlot) {
  final matches = RegExp(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', caseSensitive: false)
      .allMatches(timeSlot?.trim() ?? '');
  if (matches.isEmpty) return null;
  final last = matches.last;
  var hour = int.tryParse(last.group(1) ?? '') ?? -1;
  final minute = int.tryParse(last.group(2) ?? '') ?? -1;
  if (hour < 0 || minute < 0) return null;
  final meridiem = (last.group(3) ?? '').toUpperCase();
  if (meridiem == 'PM' && hour < 12) hour += 12;
  if (meridiem == 'AM' && hour == 12) hour = 0;
  return hour * 60 + minute;
}

/// Unchecked-in desk rows whose slot has already ended (hospital clock).
bool isMissedDeskSlot({
  required bool isCheckedIn,
  required String deskStatus,
  required String? timeSlot,
  DateTime? now,
}) {
  if (isCheckedIn) return false;
  if (deskStatus != 'waiting' && deskStatus != 'awaiting_payment') return false;
  final endMinutes = parseSlotEndMinutes(timeSlot);
  if (endMinutes == null) return false;
  final clock = now ?? hospitalNow();
  return clock.hour * 60 + clock.minute >= endMinutes;
}

/// True once a shift on [shiftDate] (yyyy-MM-dd) has reached its start time
/// ([startTime] like "08:00" or "08:00:00"), in hospital wall-clock time.
/// [now] defaults to [hospitalNow]; tests pass a fixed clock.
bool hasShiftStarted(String shiftDate, String? startTime, {DateTime? now}) {
  final clock = now ?? hospitalNow();
  final day = shiftDate.length >= 10 ? shiftDate.substring(0, 10) : shiftDate;
  if (day.isEmpty) return false;
  final cmp = day.compareTo(formatDateOnly(clock));
  if (cmp < 0) return true;
  if (cmp > 0) return false;
  final match =
      RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(startTime?.trim() ?? '');
  if (match == null) return false;
  final startMinutes =
      int.parse(match.group(1)!) * 60 + int.parse(match.group(2)!);
  return clock.hour * 60 + clock.minute >= startMinutes;
}

DateTime startOfLocalDay(DateTime dt) => DateTime(dt.year, dt.month, dt.day);

DateTime addDays(DateTime dt, int days) => startOfLocalDay(dt).add(Duration(days: days));

/// Inclusive week window starting today (default 7 days: today → +6).
({String from, String to}) weekRangeFromToday({int days = 7}) {
  final start = startOfLocalDay(hospitalNow());
  final end = addDays(start, days - 1);
  return (from: formatDateOnly(start), to: formatDateOnly(end));
}

/// Inclusive week window offset by [weekOffset] (0 = this week Mon–Sun style from today span).
({String from, String to}) weekRangeOffset(int weekOffset, {int days = 7}) {
  final start = addDays(startOfLocalDay(hospitalNow()), weekOffset * days);
  final end = addDays(start, days - 1);
  return (from: formatDateOnly(start), to: formatDateOnly(end));
}

/// Friendly label for an API shift date string.
String shiftDayHeading(String shiftDate) {
  final parsed = DateTime.tryParse(shiftDate);
  if (parsed == null) return shiftDate;

  final day = startOfLocalDay(parsed);
  final today = startOfLocalDay(hospitalNow());
  final tomorrow = addDays(today, 1);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  final weekday = weekdays[day.weekday - 1];
  final label = '$weekday, ${day.day} ${months[day.month - 1]}';

  if (day == today) return 'Today · $label';
  if (day == tomorrow) return 'Tomorrow · $label';
  return label;
}
