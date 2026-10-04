import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/core/services/storage_service.dart';
import 'package:mobile/features/patient/presentation/widgets/appointment_card.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockHttpResponse {
  final int statusCode;
  final String body;
  final Map<String, String> headers;

  MockHttpResponse({
    this.statusCode = 200,
    required this.body,
    this.headers = const {'content-type': 'application/json; charset=utf-8'},
  });
}

class TestMockHttpOverrides extends HttpOverrides {
  final Future<MockHttpResponse> Function(String method, Uri uri, dynamic body) handler;

  TestMockHttpOverrides(this.handler);

  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return _TestMockHttpClient(handler);
  }
}

class _TestMockHttpClient implements HttpClient {
  final Future<MockHttpResponse> Function(String method, Uri uri, dynamic body) handler;

  _TestMockHttpClient(this.handler);

  @override
  bool autoUncompress = true;

  @override
  void close({bool force = false}) {}

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    return _TestMockHttpRequest(method, url, handler);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestMockHttpRequest implements HttpClientRequest {
  final String method;
  final Uri uri;
  final Future<MockHttpResponse> Function(String method, Uri uri, dynamic body) handler;
  final StringBuffer _buffer = StringBuffer();

  _TestMockHttpRequest(this.method, this.uri, this.handler);

  @override
  bool followRedirects = true;

  @override
  int maxRedirects = 5;

  @override
  int contentLength = -1;

  @override
  bool persistentConnection = false;

  @override
  final HttpHeaders headers = _TestMockHttpHeaders();

  @override
  void write(Object? obj) {
    _buffer.write(obj);
  }

  @override
  void add(List<int> data) {
    _buffer.write(utf8.decode(data));
  }

  @override
  Future<dynamic> addStream(Stream<List<int>> stream) async {
    await for (final chunk in stream) {
      _buffer.write(utf8.decode(chunk));
    }
  }

  @override
  Future<HttpClientResponse> close() async {
    final res = await handler(method, uri, _buffer.toString());
    return _TestMockHttpResponse(res);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestMockHttpHeaders implements HttpHeaders {
  final Map<String, List<String>> _headers = {};

  _TestMockHttpHeaders([Map<String, String>? initial]) {
    if (initial != null) {
      initial.forEach((k, v) => set(k, v));
    }
  }

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {
    _headers[name.toLowerCase()] = [value.toString()];
  }

  @override
  void forEach(void Function(String name, List<String> values) action) {
    _headers.forEach(action);
  }

  @override
  List<String>? operator [](String name) => _headers[name.toLowerCase()];

  @override
  String? value(String name) {
    final list = _headers[name.toLowerCase()];
    if (list == null || list.isEmpty) return null;
    return list.first;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestMockHttpResponse extends Stream<List<int>> implements HttpClientResponse {
  final MockHttpResponse response;

  _TestMockHttpResponse(this.response);

  @override
  int get statusCode => response.statusCode;

  @override
  int get contentLength => utf8.encode(response.body).length;

  @override
  HttpHeaders get headers => _TestMockHttpHeaders(response.headers);

  @override
  String get reasonPhrase => 'OK';

  @override
  bool get isRedirect => false;

  @override
  List<RedirectInfo> get redirects => const [];

  @override
  bool get persistentConnection => false;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.value(utf8.encode(response.body)).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void mockUserAndToken({
  String token = 'test-token-123',
  String id = 'patient-user-1',
  String name = 'Amara Perera',
  String role = 'PATIENT',
  String registrationNumber = 'VAX-P-10023',
  String nicNumber = '199512345678',
}) {
  FlutterSecureStorage.setMockInitialValues({'vaxora_auth_token': token});
  SharedPreferences.setMockInitialValues({
    'vaxora_auth_user': jsonEncode({
      'id': id,
      'name': name,
      'role': role,
      'registrationNumber': registrationNumber,
      'nicNumber': nicNumber,
      'profilePhotoUrl': null,
    }),
  });
}

void clearMockAuth() {
  FlutterSecureStorage.setMockInitialValues({});
  SharedPreferences.setMockInitialValues({});
}

PatientAppointment createTestAppointment({
  String id = 'VAX-APT-01',
  String rawId = 'raw-uuid-1',
  String vaccineName = 'COVID-19 mRNA Booster (Moderna / Pfizer)',
  String hospitalName = 'National Hospital Colombo',
  String location = 'Assigned Vaccination Center',
  String date = '2026-10-15',
  String time = '09:00 AM - 09:20 AM',
  String doctorName = 'Medical Officer',
  String status = 'Confirmed',
  double fee = 0.0,
  bool isPaid = true,
}) {
  return PatientAppointment(
    id: id,
    rawId: rawId,
    vaccineName: vaccineName,
    hospitalName: hospitalName,
    location: location,
    date: date,
    time: time,
    doctorName: doctorName,
    status: status,
    fee: fee,
    isPaid: isPaid,
  );
}

Widget createTestApp(Widget child) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    home: child,
  );
}
