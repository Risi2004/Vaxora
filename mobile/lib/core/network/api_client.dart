import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_constants.dart';
import '../services/storage_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiClient {
  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final headers = <String, String>{};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    }
    final token = await StorageService.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<dynamic> get(String endpoint, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}$endpoint').replace(queryParameters: queryParams);
    final headers = await _getHeaders();

    try {
      final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 30));
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unable to connect to Vaxora server ($e). Please ensure backend is running at ${ApiConstants.baseUrl}');
    }
  }

  static Future<dynamic> post(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = await _getHeaders();

    try {
      final response = await http
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 45));
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unable to connect to Vaxora server ($e). Please ensure backend is running at ${ApiConstants.baseUrl}');
    }
  }

  static Future<dynamic> postMultipart(
    String endpoint, {
    required Map<String, String> fields,
  }) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final token = await StorageService.getToken();

    try {
      final request = http.MultipartRequest('POST', uri);
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.fields.addAll(fields);

      final streamedResponse = await request.send().timeout(const Duration(seconds: 45));
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unable to connect to Vaxora server ($e). Please ensure backend is running at ${ApiConstants.baseUrl}');
    }
  }

  static dynamic _processResponse(http.Response response) {
    dynamic jsonBody;
    try {
      jsonBody = jsonDecode(response.body);
    } catch (_) {
      jsonBody = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonBody;
    }

    String errorMsg = 'Server responded with error (${response.statusCode})';
    if (jsonBody is Map<String, dynamic>) {
      if (jsonBody.containsKey('message') && jsonBody['message'] != null) {
        errorMsg = jsonBody['message'].toString();
      } else if (jsonBody.containsKey('error') && jsonBody['error'] != null) {
        errorMsg = jsonBody['error'].toString();
      } else if (jsonBody.containsKey('title') && jsonBody['title'] != null) {
        errorMsg = jsonBody['title'].toString();
      }
    }
    throw ApiException(errorMsg, response.statusCode);
  }
}
