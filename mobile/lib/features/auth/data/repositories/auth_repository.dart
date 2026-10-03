import 'package:image_picker/image_picker.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../../../../core/services/storage_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  /// Persist API user payload + normalized fields so photo URLs are not dropped.
  static Future<void> _persistUser(
    UserModel user, [
    Map<String, dynamic>? raw,
  ]) async {
    final merged = <String, dynamic>{...?raw, ...user.toJson()};

    // Never let a null model field wipe a photo URL that came from the API payload.
    final fromModel = user.profilePhotoUrl?.trim();
    final fromRawTop =
        raw?['profilePhotoUrl']?.toString().trim() ??
        raw?['ProfilePhotoUrl']?.toString().trim();
    String? fromDetails;
    final details = raw?['profileDetails'] ?? raw?['ProfileDetails'];
    if (details is Map) {
      fromDetails =
          details['profilePhotoUrl']?.toString().trim() ??
          details['ProfilePhotoUrl']?.toString().trim() ??
          details['logoUrl']?.toString().trim() ??
          details['LogoUrl']?.toString().trim();
    }

    final photo =
        [
          fromModel,
          fromRawTop,
          fromDetails,
          merged['profilePhotoUrl']?.toString().trim(),
        ].firstWhere(
          (v) => v != null && v.isNotEmpty && v.toLowerCase() != 'null',
          orElse: () => null,
        );

    if (photo != null) {
      merged['profilePhotoUrl'] = photo;
    } else {
      merged.remove('profilePhotoUrl');
    }

    await StorageService.saveUser(merged);
  }

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
        final userMap = Map<String, dynamic>.from(
          response['user'] as Map<String, dynamic>,
        );
        final user = UserModel.fromJson(userMap);
        await _persistUser(user, userMap);
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

  static Future<UserModel?> getCurrentUser({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = await StorageService.getUser();
      if (cached != null) {
        return UserModel.fromJson(cached);
      }
    }

    try {
      final response = await ApiClient.get(ApiConstants.currentUser);
      if (response is Map<String, dynamic>) {
        final raw = Map<String, dynamic>.from(response);
        final user = UserModel.fromJson(raw);
        await _persistUser(user, raw);
        return user;
      }
    } catch (_) {
      if (!forceRefresh) return null;
      final cached = await StorageService.getUser();
      if (cached != null) return UserModel.fromJson(cached);
      rethrow;
    }

    return null;
  }

  static Future<UserModel> updateProfile({
    String? fullName,
    String? phoneNumber,
    DateTime? dateOfBirth,
    String? specialization,
    String? hospitalName,
    String? hospitalType,
    String? operatingHours,
    String? address,
    String? district,
    String? province,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName.trim();
    if (phoneNumber != null) body['phoneNumber'] = phoneNumber.trim();
    if (dateOfBirth != null) {
      body['dateOfBirth'] = dateOfBirth.toIso8601String();
    }
    if (specialization != null) body['specialization'] = specialization.trim();
    if (hospitalName != null) body['hospitalName'] = hospitalName.trim();
    if (hospitalType != null) body['hospitalType'] = hospitalType.trim();
    if (operatingHours != null) body['operatingHours'] = operatingHours.trim();
    if (address != null) body['address'] = address.trim();
    if (district != null) body['district'] = district.trim();
    if (province != null) body['province'] = province.trim();

    final response = await ApiClient.put(
      ApiConstants.updateProfile,
      body: body,
    );

    // Preferred path: the PUT response carries the full user DTO (with
    // profileDetails). Parse it directly and cache via the standard helper.
    if (response is Map<String, dynamic> &&
        response.containsKey('profileDetails')) {
      final raw = Map<String, dynamic>.from(response);
      final user = UserModel.fromJson(raw);
      await _persistUser(user, raw);
      return user;
    }

    // Fallback 1: re-fetch /auth/me. This guarantees we get the full user
    // shape even if PUT returned a partial payload — without it, we can
    // accidentally wipe patientProfileId / nicNumber / registrationNumber.
    try {
      final fresh = await ApiClient.get(ApiConstants.currentUser);
      if (fresh is Map<String, dynamic>) {
        final raw = Map<String, dynamic>.from(fresh);
        final user = UserModel.fromJson(raw);
        await _persistUser(user, raw);
        return user;
      }
    } catch (_) {
      // Fall through to cache merge
    }

    // Fallback 2: merge the new values into the cached user.
    final cached = await StorageService.getUser();
    if (cached != null) {
      final merged = Map<String, dynamic>.from(cached);
      if (fullName != null) merged['name'] = fullName.trim();
      if (phoneNumber != null) merged['phoneNumber'] = phoneNumber.trim();
      if (dateOfBirth != null) {
        merged['dateOfBirth'] = dateOfBirth.toIso8601String();
      }
      if (specialization != null) merged['specialization'] = specialization.trim();
      if (hospitalName != null) merged['name'] = hospitalName.trim();
      final details = Map<String, dynamic>.from(
        (merged['profileDetails'] as Map?)?.cast<String, dynamic>() ?? const {},
      );
      if (specialization != null) details['specialization'] = specialization.trim();
      if (hospitalName != null) details['hospitalName'] = hospitalName.trim();
      if (phoneNumber != null && hospitalName != null) {
        details['contactNumber'] = phoneNumber.trim();
      }
      if (hospitalType != null) details['hospitalType'] = hospitalType.trim();
      if (operatingHours != null) details['operatingHours'] = operatingHours.trim();
      if (address != null) details['address'] = address.trim();
      if (district != null) details['district'] = district.trim();
      if (province != null) details['province'] = province.trim();
      if (details.isNotEmpty) merged['profileDetails'] = details;
      await StorageService.saveUser(merged);
      return UserModel.fromJson(merged);
    }

    throw ApiException('Profile updated but could not refresh user data.');
  }

  static Future<UserModel> updateProfilePhoto(XFile photo) async {
    final response = await ApiClient.postMultipartFile(
      ApiConstants.updateProfilePhoto,
      fieldName: 'photo',
      bytes: await photo.readAsBytes(),
      filename: photo.name,
    );

    if (response is Map<String, dynamic>) {
      final raw = Map<String, dynamic>.from(response);
      final user = UserModel.fromJson(raw);
      await _persistUser(user, raw);
      return user;
    }

    throw ApiException('Profile photo uploaded but the response was invalid.');
  }

  static Future<void> logout() async {
    await StorageService.clearAuth();
  }
}
