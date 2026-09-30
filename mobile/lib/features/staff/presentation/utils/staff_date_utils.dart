String twoDigits(int n) => n.toString().padLeft(2, '0');

/// Local calendar date as `yyyy-MM-dd` (API DateOnly style).
String formatDateOnly(DateTime dt) {
  final d = DateTime(dt.year, dt.month, dt.day);
  return '${d.year}-${twoDigits(d.month)}-${twoDigits(d.day)}';
}

String todayIsoDate() => formatDateOnly(DateTime.now());

DateTime startOfLocalDay(DateTime dt) => DateTime(dt.year, dt.month, dt.day);

DateTime addDays(DateTime dt, int days) => startOfLocalDay(dt).add(Duration(days: days));

/// Inclusive week window starting today (default 7 days: today → +6).
({String from, String to}) weekRangeFromToday({int days = 7}) {
  final start = startOfLocalDay(DateTime.now());
  final end = addDays(start, days - 1);
  return (from: formatDateOnly(start), to: formatDateOnly(end));
}

/// Inclusive week window offset by [weekOffset] (0 = this week Mon–Sun style from today span).
({String from, String to}) weekRangeOffset(int weekOffset, {int days = 7}) {
  final start = addDays(startOfLocalDay(DateTime.now()), weekOffset * days);
  final end = addDays(start, days - 1);
  return (from: formatDateOnly(start), to: formatDateOnly(end));
}

/// Friendly label for an API shift date string.
String shiftDayHeading(String shiftDate) {
  final parsed = DateTime.tryParse(shiftDate);
  if (parsed == null) return shiftDate;

  final day = startOfLocalDay(parsed);
  final today = startOfLocalDay(DateTime.now());
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
