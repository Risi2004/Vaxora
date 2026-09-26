import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../models/agent_models.dart';

class AgentRepository {
  static Future<bool> checkHealth() async {
    try {
      final res = await ApiClient.get(ApiConstants.agentHealth);
      if (res is Map<String, dynamic> && res['online'] == true) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  static Future<AgentMessage> sendMessage({
    required List<AgentMessage> conversationHistory,
  }) async {
    final UserModel? user = await AuthRepository.getCurrentUser();

    final payloadMessages = conversationHistory
        .where((m) => (m.role == 'user' || m.role == 'assistant') && m.content.trim().isNotEmpty)
        .map((m) => {
              'role': m.role,
              'content': m.content.length > 4000 ? m.content.substring(0, 4000) : m.content,
            })
        .toList();

    final patientInfo = user != null
        ? {
            'name': user.name,
            'email': user.email,
            'nic': user.nicNumber ?? '',
            'hospitalName': '',
          }
        : null;

    final response = await ApiClient.post(
      ApiConstants.agentChat,
      body: {
        'messages': payloadMessages,
        'patientInfo': patientInfo,
        'targetAgent': 'BookingAgent',
      },
    );

    if (response is Map<String, dynamic>) {
      final content = response['content']?.toString() ?? 'I have processed your request.';

      AgentProposal? proposal;
      if (response['proposal'] != null && response['proposal'] is Map<String, dynamic>) {
        proposal = AgentProposal.fromJson(response['proposal'] as Map<String, dynamic>);
      }

      AgentBooking? booking;
      if (response['booking'] != null && response['booking'] is Map<String, dynamic>) {
        booking = AgentBooking.fromJson(response['booking'] as Map<String, dynamic>);
      }

      Map<String, dynamic>? cancellation;
      if (response['cancellation'] != null && response['cancellation'] is Map<String, dynamic>) {
        cancellation = response['cancellation'] as Map<String, dynamic>;
      }

      return AgentMessage(
        role: 'assistant',
        content: content,
        proposal: proposal,
        booking: booking,
        cancellation: cancellation,
      );
    }

    throw ApiException('Invalid response format received from AI agent gateway.');
  }
}
