import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyToken = 'vaxora_auth_token';
  static const String _keyUser = 'vaxora_auth_user';
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  static Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _keyToken, value: token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
  }

  static Future<String?> getToken() async {
    final secureToken = await _secureStorage.read(key: _keyToken);
    if (secureToken != null && secureToken.isNotEmpty) return secureToken;

    // Migrate tokens written by older app versions out of plain preferences.
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_keyToken);
    if (legacyToken != null && legacyToken.isNotEmpty) {
      await _secureStorage.write(key: _keyToken, value: legacyToken);
      await prefs.remove(_keyToken);
    }
    return legacyToken;
  }

  static Future<void> saveUser(Map<String, dynamic> userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUser, jsonEncode(userJson));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_keyUser);
    if (str == null || str.isEmpty) return null;
    try {
      return jsonDecode(str) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: _keyToken);
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
  }
}
