import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../data/models/shift_model.dart';
import '../../data/repositories/shift_swap_repository.dart';
import 'staff_common_widgets.dart';

/// Chat sheet: a staff member asks the ShiftSwapAgent to help arrange cover
/// for a specific shift. The agent's response — plus the proposal blob it
/// returns — is persisted server-side as an AgentWorkflow so the hospital
/// can review the request from their side.
class ShiftSwapSheet extends StatefulWidget {
  final ShiftModel shift;
  final String hospitalName;

  const ShiftSwapSheet({
    super.key,
    required this.shift,
    required this.hospitalName,
  });

  static Future<void> show(
    BuildContext context, {
    required ShiftModel shift,
    required String hospitalName,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ShiftSwapSheet(
        shift: shift,
        hospitalName: hospitalName,
      ),
    );
  }

  @override
  State<ShiftSwapSheet> createState() => _ShiftSwapSheetState();
}

class _ShiftSwapSheetState extends State<ShiftSwapSheet> {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final List<_ChatTurn> _turns = [];
  bool _sending = false;
  bool _requestLogged = false;

  @override
  void initState() {
    super.initState();
    _seedFirstMessage();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _seedFirstMessage() {
    final s = widget.shift;
    final booth = (s.boothOrStation?.trim().isNotEmpty ?? false)
        ? s.boothOrStation!.trim()
        : 'Unassigned booth';
    final seed =
        'I need someone to cover my shift at ${widget.hospitalName}. '
        'Shift ID: ${s.shiftId}. Date: ${s.shiftDate}. '
        'Window: ${s.timeRangeLabel}. Booth: $booth.';
    _sendMessage(seed, hideBubble: false);
  }

  Future<void> _sendMessage(String text, {bool hideBubble = false}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _sending) return;

    setState(() {
      _sending = true;
      if (!hideBubble) {
        _turns.add(_ChatTurn.user(trimmed));
      } else {
        _turns.add(_ChatTurn.user(trimmed));
      }
    });
    _scrollToEnd();

    try {
      final wireMessages = _turns
          .where((t) => t.role == 'user' || t.role == 'assistant')
          .map((t) => {'role': t.role, 'content': t.text})
          .toList();

      final reply = await ShiftSwapRepository.chat(wireMessages);
      if (!mounted) return;
      setState(() {
        _turns.add(_ChatTurn.assistant(reply.content));
        _sending = false;
        if (reply.proposals.isNotEmpty) _requestLogged = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _turns.add(
          _ChatTurn.assistant(
            e is ApiException
                ? e.message
                : 'The assistant is unavailable right now. Try again in a moment.',
            isError: true,
          ),
        );
        _sending = false;
      });
    }
    _scrollToEnd();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _submit() async {
    final text = _input.text;
    _input.clear();
    await _sendMessage(text);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: StaffSurfaces.appBarBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: StaffSurfaces.chipNeutralBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 12),
              _Header(shift: widget.shift, hospitalName: widget.hospitalName),
              if (_requestLogged) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF6EE7B7)),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.check_circle,
                          size: 16,
                          color: Color(0xFF047857),
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Request logged. Your hospital will review it.',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF047857),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                  itemCount: _turns.length + (_sending ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == _turns.length) {
                      return const _TypingBubble();
                    }
                    return _MessageBubble(turn: _turns[i]);
                  },
                ),
              ),
              _Composer(
                controller: _input,
                sending: _sending,
                onSend: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatTurn {
  final String role; // "user" | "assistant"
  final String text;
  final bool isError;
  _ChatTurn.user(this.text)
      : role = 'user',
        isError = false;
  _ChatTurn.assistant(this.text, {this.isError = false}) : role = 'assistant';
}

class _Header extends StatelessWidget {
  final ShiftModel shift;
  final String hospitalName;

  const _Header({required this.shift, required this.hospitalName});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: StaffSurfaces.softPanelDeep,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.swap_horiz,
              color: StaffSurfaces.brandSoft,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Request shift cover',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: StaffSurfaces.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$hospitalName · ${shift.shiftDate} · ${shift.timeRangeLabel}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: StaffSurfaces.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.close, color: StaffSurfaces.textSecondary),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final _ChatTurn turn;
  const _MessageBubble({required this.turn});

  @override
  Widget build(BuildContext context) {
    final isUser = turn.role == 'user';
    final align = isUser ? Alignment.centerRight : Alignment.centerLeft;
    final bg = isUser
        ? StaffSurfaces.cta
        : (turn.isError ? const Color(0xFFFEF2F2) : StaffSurfaces.softPanel);
    final fg = isUser
        ? Colors.white
        : (turn.isError
            ? const Color(0xFFB91C1C)
            : StaffSurfaces.textPrimary);
    final border = isUser
        ? Colors.transparent
        : (turn.isError
            ? const Color(0xFFFECACA)
            : StaffSurfaces.cardBorder);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Align(
        alignment: align,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(14),
                topRight: const Radius.circular(14),
                bottomLeft: Radius.circular(isUser ? 14 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 14),
              ),
              border: Border.all(color: border),
            ),
            child: Text(
              turn.text,
              style: TextStyle(
                fontSize: 13.5,
                height: 1.4,
                color: fg,
                fontWeight: isUser ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: StaffSurfaces.softPanel,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: StaffSurfaces.cardBorder),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: StaffSurfaces.brandSoft,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Assistant is typing…',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: StaffSurfaces.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: StaffSurfaces.divider)),
        color: StaffSurfaces.appBarBg,
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.newline,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: StaffSurfaces.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Add a reason or preferred replacement…',
                hintStyle: const TextStyle(
                  color: StaffSurfaces.textMutedSoft,
                  fontWeight: FontWeight.w500,
                ),
                filled: true,
                fillColor: StaffSurfaces.softPanel,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: StaffSurfaces.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide:
                      BorderSide(color: StaffSurfaces.brandSoft, width: 1.4),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: sending ? StaffSurfaces.softPanelDeep : StaffSurfaces.cta,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: sending ? null : onSend,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Icon(
                  Icons.send_rounded,
                  color: sending
                      ? StaffSurfaces.textMutedSoft
                      : Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
