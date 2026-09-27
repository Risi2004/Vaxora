import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../../../../core/services/storage_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  static Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await ApiClient.post(
      ApiConstants.login,
      body: {'email': email.trim(), 'password': password},
    );

    if (response is Map<String, dynamic>) {
      final token = response['token']?.toString();
      if (token != null && token.isNotEmpty) {
        await StorageService.saveToken(token);
      }

      if (response['user'] != null &&
          response['user'] is Map<String, dynamic>) {
        final userMap = response['user'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userMap);
        await StorageService.saveUser(user.toJson());
        return user;
      }
    }

    throw ApiException(
      'Malformed response received from authentication server.',
    );
  }

  static Future<Map<String, dynamic>> registerPatient({
    required String email,
    required String password,
    required String fullName,
    required String nicNumber,
    required String dateOfBirth,
    String? phoneNumber,
  }) async {
    final fields = <String, String>{
      'Email': email.trim(),
      'Password': password,
      'FullName': fullName.trim(),
      'NicNumber': nicNumber.trim(),
      'DateOfBirth': dateOfBirth,
    };

    if (phoneNumber != null && phoneNumber.trim().isNotEmpty) {
      fields['PhoneNumber'] = phoneNumber.trim();
    }

    final response = await ApiClient.postMultipart(
      ApiConstants.signupPatient,
      fields: fields,
    );

    if (response is Map<String, dynamic>) {
      return response;
    }

    return {'message': 'Patient registration submitted successfully.'};
  }

  static Future<UserModel?> getCurrentUser() async {
    final cached = await StorageService.getUser();
    if (cached != null) {
      return UserModel.fromJson(cached);
    }

    try {
      final response = await ApiClient.get(ApiConstants.currentUser);
      if (response is Map<String, dynamic>) {
        final user = UserModel.fromJson(response);
        await StorageService.saveUser(user.toJson());
        return user;
      }
    } catch (_) {}

    return null;
  }

  static Future<UserModel> updateProfile({
    String? fullName,
    String? phoneNumber,
    DateTime? dateOfBirth,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName.trim();
    if (phoneNumber != null) body['phoneNumber'] = phoneNumber.trim();
    if (dateOfBirth != null)
      body['dateOfBirth'] = dateOfBirth.toIso8601String();

    // Send the update.
    await ApiClient.put(ApiConstants.updateProfile, body: body);

    // The PUT response may be a partial user object. Always re-fetch
    // the full user from /auth/me so we don't lose patientProfileId,
    // nicNumber, registrationNumber etc.
    try {
      final fresh = await ApiClient.get(ApiConstants.currentUser);
      if (fresh is Map<String, dynamic>) {
        final user = UserModel.fromJson(fresh);
        await StorageService.saveUser(user.toJson());
        return user;
      }
    } catch (_) {
      // Fall through to the merged-cache fallback
    }

    // Fallback: merge the new values into the cached user and return that.
    final cached = await StorageService.getUser();
    if (cached != null) {
      final merged = Map<String, dynamic>.from(cached);
      if (fullName != null) merged['name'] = fullName.trim();
      if (phoneNumber != null) merged['phoneNumber'] = phoneNumber.trim();
      if (dateOfBirth != null)
        merged['dateOfBirth'] = dateOfBirth.toIso8601String();
      await StorageService.saveUser(merged);
      return UserModel.fromJson(merged);
    }

    throw ApiException('Profile updated but could not refresh user data.');
  }

  static Future<void> logout() async {
    await StorageService.clearAuth();
  }
}
