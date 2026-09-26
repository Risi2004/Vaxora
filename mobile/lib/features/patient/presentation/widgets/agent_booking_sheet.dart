import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/agent_models.dart';
import '../../data/repositories/agent_repository.dart';
import 'appointment_card.dart';
import 'payhere_checkout_sheet.dart';

class AgentBookingSheet extends StatefulWidget {
  final VoidCallback? onAppointmentBooked;

  const AgentBookingSheet({super.key, this.onAppointmentBooked});

  static Future<void> show(BuildContext context, {VoidCallback? onAppointmentBooked}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AgentBookingSheet(onAppointmentBooked: onAppointmentBooked),
    );
  }

  @override
  State<AgentBookingSheet> createState() => _AgentBookingSheetState();
}

class _AgentBookingSheetState extends State<AgentBookingSheet> {
  final List<AgentMessage> _messages = [
    const AgentMessage(
      role: 'assistant',
      content:
          'Hello! 👋 I am your **Vaxora AI Booking Concierge**.\n\nI can help you:\n• 🔍 Find which hospitals have your required vaccine in stock\n• 📅 Discover clinic schedule dates & available 20-minute slots\n• 💉 Reserve your appointment with instant confirmation\n\nHow can I help you today?',
    ),
  ];

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  bool _isOnline = true;

  final List<String> _suggestedPrompts = [
    '🔍 Which hospitals have Pfizer COVID-19 vaccine?',
    '💉 Book next available slot for Influenza vaccine',
    '📅 Show my booked appointments',
    '🏥 What vaccines are available right now?',
  ];

  @override
  void initState() {
    super.initState();
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    final online = await AgentRepository.checkHealth();
    if (mounted) {
      setState(() => _isOnline = online);
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? textToSend]) async {
    final text = (textToSend ?? _textController.text).trim();
    if (text.isEmpty || _isLoading) return;

    final userMsg = AgentMessage(role: 'user', content: text);
    setState(() {
      _messages.add(userMsg);
      _isLoading = true;
    });
    if (textToSend == null) {
      _textController.clear();
    }
    _scrollToBottom();

    try {
      final response = await AgentRepository.sendMessage(
        conversationHistory: _messages,
      );

      if (mounted) {
        setState(() {
          _messages.add(response);
          _isLoading = false;
        });
        _scrollToBottom();

        if (response.booking != null && response.booking!.success) {
          widget.onAppointmentBooked?.call();
          if (!response.booking!.isFree && response.booking!.payherePayload != null) {
            _launchPayHere(response.booking!);
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(
            AgentMessage(
              role: 'assistant',
              content: '⚠️ **Connection Note**: $e',
              isError: true,
            ),
          );
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _approveProposal(AgentProposal proposal) {
    final prompt =
        'I approve and confirm booking for ${proposal.vaccineName} at ${proposal.hospitalName} on ${proposal.appointmentDate} at ${proposal.timeSlot}. Please proceed with booking.';
    _sendMessage(prompt);
  }

  void _launchPayHere(AgentBooking booking) {
    final aptMap = booking.appointment ?? {};
    final rawId = aptMap['id']?.toString() ?? aptMap['Id']?.toString() ?? '';
    final aptId = rawId.isNotEmpty && rawId.length >= 8
        ? 'VAX-${rawId.substring(0, 8).toUpperCase()}'
        : (aptMap['referenceNumber']?.toString() ?? 'VAX-APT');
    final fee = (aptMap['fee'] as num?)?.toDouble() ??
        ((booking.payherePayload?['amount'] as num?)?.toDouble() ?? 0.0);

    final appointment = PatientAppointment(
      id: aptId,
      rawId: rawId,
      vaccineName: aptMap['vaccineName']?.toString() ?? 'Vaccine',
      hospitalName: aptMap['hospitalName']?.toString() ?? 'Hospital',
      location: aptMap['hospitalName']?.toString() ?? 'Hospital Center',
      date: aptMap['appointmentDate']?.toString() ?? '',
      time: aptMap['timeSlot']?.toString() ?? '',
      doctorName: aptMap['doctorName']?.toString() ?? 'Assigned Medical Staff',
      status: 'PendingPayment',
      fee: fee,
      isPaid: false,
    );

    PayHereCheckoutSheet.show(
      context,
      appointment: appointment,
      onPaymentSuccess: () {
        widget.onAppointmentBooked?.call();
        if (mounted) {
          setState(() {
            _messages.add(
              const AgentMessage(
                role: 'assistant',
                content: '🎉 **Payment Verified Successfully!**\nYour vaccination appointment is now fully confirmed.',
              ),
            );
          });
          _scrollToBottom();
        }
      },
    );
  }

  void _declineProposal() {
    _sendMessage("I want to decline this booking proposal. Let's look for other options or dates.");
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text('🤖', style: TextStyle(fontSize: 20)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AI Booking Concierge',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textTitle,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _isOnline ? AppColors.success : const Color(0xFFF59E0B),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isOnline ? 'Online • Automated Booking Assistant' : 'Connecting • Agent Ready',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.borderLight),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg.role == 'user';
                return _buildMessageItem(msg, isUser);
              },
            ),
          ),

          // Suggested prompt chips
          if (_messages.length <= 2 && !_isLoading)
            Container(
              height: 44,
              margin: const EdgeInsets.symmetric(vertical: 4),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                itemCount: _suggestedPrompts.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final prompt = _suggestedPrompts[index];
                  return ActionChip(
                    label: Text(
                      prompt,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryDark),
                    ),
                    backgroundColor: const Color(0xFFF1F5F9),
                    side: const BorderSide(color: AppColors.borderLight),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    onPressed: () => _sendMessage(prompt),
                  );
                },
              ),
            ),

          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Row(
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Agent is checking schedules & vaccine stock...',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.borderLight)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: InputDecoration(
                        hintText: 'Ask AI to find vaccines or book slots...',
                        hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: AppColors.borderLight),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: AppColors.borderLight),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                      onSubmitted: (val) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: _isLoading ? null : () => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(AgentMessage msg, bool isUser) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) ...[
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: msg.isError ? Colors.red.shade50 : AppColors.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(msg.isError ? '⚠️' : '🤖', style: const TextStyle(fontSize: 15)),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser
                        ? AppColors.primary
                        : (msg.isError ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC)),
                    borderRadius: BorderRadius.circular(16).copyWith(
                      bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(16),
                      bottomLeft: !isUser ? const Radius.circular(2) : const Radius.circular(16),
                    ),
                    border: Border.all(
                      color: isUser
                          ? AppColors.primary
                          : (msg.isError ? const Color(0xFFFCA5A5) : AppColors.borderLight),
                    ),
                  ),
                  child: _buildFormattedText(
                    msg.content,
                    isUser,
                    isError: msg.isError,
                  ),
                ),
              ),
            ],
          ),

          // Interactive Proposal Card
          if (msg.proposal != null) ...[
            const SizedBox(height: 10),
            _buildProposalCard(msg.proposal!),
          ],

          // Booking Confirmation Success Card
          if (msg.booking != null && msg.booking!.success) ...[
            const SizedBox(height: 10),
            _buildBookingSuccessCard(msg.booking!),
          ],
        ],
      ),
    );
  }

  Widget _buildFormattedText(String text, bool isUser, {bool isError = false}) {
    if (text.isEmpty) return const SizedBox.shrink();

    final lines = text.split('\n');
    final List<Widget> widgets = [];

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];
      final trimmed = line.trim();

      if (trimmed.isEmpty) {
        widgets.add(const SizedBox(height: 6));
        continue;
      }

      final leadingSpaces = line.length - line.trimLeft().length;
      final indentPadding = leadingSpaces >= 2 ? 14.0 : 0.0;

      final isBullet = (trimmed.startsWith('- ') ||
          trimmed.startsWith('• ') ||
          (trimmed.startsWith('* ') && !trimmed.startsWith('**')));

      final numMatch = RegExp(r'^(\d+)\.\s+(.*)').firstMatch(trimmed);
      final isHeader = trimmed.startsWith('#');

      if (isBullet) {
        final content = trimmed.substring(2).trim();
        widgets.add(
          Padding(
            padding: EdgeInsets.only(left: 4 + indentPadding, top: 2, bottom: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 6, right: 8),
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isUser
                        ? Colors.white70
                        : (isError ? Colors.red.shade700 : AppColors.primary),
                    shape: BoxShape.circle,
                  ),
                ),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      children: _parseInlineMarkdown(
                        content,
                        isUser,
                        isError: isError,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else if (numMatch != null) {
        final numStr = numMatch.group(1)!;
        final content = numMatch.group(2)!;
        widgets.add(
          Padding(
            padding: EdgeInsets.only(left: 4 + indentPadding, top: 3, bottom: 3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 22,
                  child: Text(
                    '$numStr.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isUser
                          ? Colors.white
                          : (isError ? Colors.red.shade900 : AppColors.primary),
                    ),
                  ),
                ),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      children: _parseInlineMarkdown(
                        content,
                        isUser,
                        isError: isError,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else if (isHeader) {
        final headerText = trimmed.replaceFirst(RegExp(r'^#+\s*'), '');
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 6, bottom: 4),
            child: RichText(
              text: TextSpan(
                children: _parseInlineMarkdown(
                  headerText,
                  isUser,
                  isError: isError,
                  fontSize: 14,
                  isBold: true,
                ),
              ),
            ),
          ),
        );
      } else {
        widgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: RichText(
              text: TextSpan(
                children: _parseInlineMarkdown(
                  line,
                  isUser,
                  isError: isError,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: widgets,
    );
  }

  List<InlineSpan> _parseInlineMarkdown(
    String text,
    bool isUser, {
    bool isError = false,
    double fontSize = 13,
    bool isBold = false,
  }) {
    final List<InlineSpan> spans = [];
    final baseColor = isUser
        ? Colors.white
        : (isError ? Colors.red.shade900 : AppColors.textTitle);
    final boldColor = isUser
        ? Colors.white
        : (isError ? Colors.red.shade900 : const Color(0xFF0F172A));
    final baseStyle = TextStyle(
      fontSize: fontSize,
      height: 1.45,
      color: baseColor,
      fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
    );

    final regex = RegExp(r'(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)');
    int lastIndex = 0;

    for (final match in regex.allMatches(text)) {
      if (match.start > lastIndex) {
        spans.add(
          TextSpan(
            text: text.substring(lastIndex, match.start),
            style: baseStyle,
          ),
        );
      }

      final matchedText = match.group(0)!;
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        spans.add(
          TextSpan(
            text: matchedText.substring(2, matchedText.length - 2),
            style: baseStyle.copyWith(
              fontWeight: FontWeight.w700,
              color: boldColor,
            ),
          ),
        );
      } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: isUser ? Colors.white24 : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                matchedText.substring(1, matchedText.length - 1),
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: fontSize * 0.9,
                  color: isUser ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
            ),
          ),
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        spans.add(
          TextSpan(
            text: matchedText.substring(1, matchedText.length - 1),
            style: baseStyle.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      }

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      spans.add(
        TextSpan(
          text: text.substring(lastIndex),
          style: baseStyle,
        ),
      );
    }

    return spans;
  }

  Widget _buildProposalCard(AgentProposal p) {
    return Container(
      margin: const EdgeInsets.only(left: 38, top: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.event_available, color: AppColors.success, size: 18),
              SizedBox(width: 6),
              Text(
                'Proposed Appointment Slot',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF166534)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '💉 ${p.vaccineName}',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textTitle),
          ),
          const SizedBox(height: 2),
          Text('🏥 ${p.hospitalName}', style: const TextStyle(fontSize: 12, color: AppColors.textBody)),
          const SizedBox(height: 2),
          Text('📅 ${p.appointmentDate} at ${p.timeSlot}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.brandBlue)),
          if (p.fee > 0) ...[
            const SizedBox(height: 2),
            Text('💳 Fee: LKR ${p.fee.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : () => _approveProposal(p),
                  icon: const Icon(Icons.check_circle_outline, size: 16),
                  label: const Text('Confirm & Book'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _isLoading ? null : _declineProposal,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                child: const Text('Decline', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBookingSuccessCard(AgentBooking b) {
    return Container(
      margin: const EdgeInsets.only(left: 38, top: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.success, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.verified, color: AppColors.success, size: 20),
              SizedBox(width: 8),
              Text(
                'Appointment Confirmed!',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF065F46)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            b.message ?? 'Your appointment has been registered in the National Immunization registry.',
            style: const TextStyle(fontSize: 12, color: Color(0xFF047857), height: 1.4),
          ),
          if (!b.isFree && b.payherePayload != null) ...[
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: () => _launchPayHere(b),
              icon: const Icon(Icons.payment, size: 16),
              label: const Text('Pay with PayHere'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
