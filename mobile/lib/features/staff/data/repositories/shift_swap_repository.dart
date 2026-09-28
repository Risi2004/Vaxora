import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_constants.dart';

/// One turn of a Shift Swap chat.
class ShiftSwapReply {
  final String content;
  final List<Map<String, dynamic>> proposals;

  const ShiftSwapReply({required this.content, required this.proposals});

  factory ShiftSwapReply.fromJson(Map<String, dynamic> json) {
    final content = json['content']?.toString().trim() ?? '';
    final raw = json['proposals'];
    final proposals = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    return ShiftSwapReply(content: content, proposals: proposals);
  }
}

/// Thin wrapper over `/agent/chat` that always targets the ShiftSwapAgent.
class ShiftSwapRepository {
  ShiftSwapRepository._();

  static Future<ShiftSwapReply> chat(
    List<Map<String, String>> messages,
  ) async {
    final response = await ApiClient.post(
      ApiConstants.agentChat,
      body: {
        'messages': messages,
        'targetAgent': 'ShiftSwapAgent',
      },
    );
    if (response is Map<String, dynamic>) {
      return ShiftSwapReply.fromJson(response);
    }
    throw ApiException('Unexpected agent response.');
  }
}
