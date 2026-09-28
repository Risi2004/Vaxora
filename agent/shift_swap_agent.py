"""
Vaxora ShiftSwapAgent
---------------------
Small staff-facing agent that helps a doctor / nurse describe a shift they
cannot make. The agent's job is to be a friendly intake worker:

- Confirm which shift is affected
- Capture a short reason
- Optionally ask for a preferred replacement or window
- Return a structured swap request that the hospital reviews on their side

We deliberately do NOT expose hospital coverage tools here — a staff member
should not be able to browse the full hospital roster. The hospital sees the
request in their Staff-tab cover inbox and does the actual reassignment.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

try:
    from .config import settings
except ImportError:  # pragma: no cover - package/script dual import
    from config import settings

logger = logging.getLogger("vaxora-shift-swap-agent")

SHIFT_SWAP_SYSTEM_PROMPT = """You are the Vaxora Shift Swap Assistant for doctors and nurses.
Reply to the staff member only. Never describe your reasoning, rules, or a thinking process.

Your only job: help them log a cover request.

Rules:
- 1–2 short sentences. Empathetic. No bullet lists. No analysis.
- A reason is optional. Shift id, date, and time window are enough to confirm the request is logged.
- Do not mention shift IDs, UUIDs, or internal fields in your reply.
- Never promise a named replacement — the hospital chooses.
- Never suggest cancelling the clinic. Frame it as "your hospital will find cover".
- If the message is not about shift cover, say: "I can only help with shift swap requests."
"""

_THINKING_PREFIXES = (
    "here's a thinking process",
    "here is a thinking process",
    "thinking process:",
    "<think>",
)


def _strip_thinking(content: Any) -> str:
    text = content if isinstance(content, str) else ""
    if "</think>" in text:
        text = text.split("</think>", 1)[-1]
    stripped = text.strip()
    lower = stripped.lower()
    if any(lower.startswith(prefix) or prefix in lower[:80] for prefix in _THINKING_PREFIXES):
        return ""
    return stripped


def _logged_confirmation(patient_info: Optional[Dict[str, Any]]) -> str:
    hospital = (patient_info or {}).get("hospitalName") or "your hospital"
    return (
        f"Got it — I've logged a cover request for that shift. "
        f"{hospital} will review it and find someone to cover."
    )


class ShiftSwapAgent:
    """
    Very small stateless agent. Persistence is handled by the .NET
    ShiftSwapService, which stores a hospital-scoped cover request so
    the hospital Staff tab can approve or decline it.
    """

    name = "ShiftSwapAgent"

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            timeout=45.0,
        )
        self.model = settings.openrouter_model

    async def run(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        patient_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Only user + assistant turns are safe to forward.
        clean_messages = [
            {"role": m.get("role", "user"), "content": str(m.get("content", ""))}
            for m in messages
            if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()
        ]

        proposal = _build_swap_proposal(clean_messages, patient_info)
        user_turns = [m for m in clean_messages if m.get("role") == "user"]
        # Seeded first message already has the shift — confirm and log without
        # asking the model, which otherwise dumps its chain-of-thought.
        if proposal and proposal.get("shiftId") and len(user_turns) == 1:
            return {
                "agent": self.name,
                "role": "assistant",
                "content": _logged_confirmation(patient_info),
                "proposals": [proposal],
                "suggestedFollowUps": [
                    "Anything the hospital should know?",
                    "Send a preferred replacement's name",
                ],
            }

        conversation: List[Dict[str, Any]] = [
            {"role": "system", "content": SHIFT_SWAP_SYSTEM_PROMPT}
        ]
        if patient_info:
            conversation.append(
                {
                    "role": "system",
                    "content": (
                        "Requester context: "
                        f"Name={patient_info.get('name')}, "
                        f"Role=staff, "
                        f"HospitalName={patient_info.get('hospitalName') or 'unknown'}"
                    ),
                }
            )
        conversation.extend(clean_messages)

        try:
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=conversation,
                temperature=0.2,
                max_tokens=160,
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            message = completion.choices[0].message
            reply = _strip_thinking(getattr(message, "content", None))
        except Exception as exc:  # pragma: no cover - remote LLM
            logger.error("ShiftSwapAgent LLM call failed: %s", exc)
            reply = ""

        if not reply:
            reply = (
                _logged_confirmation(patient_info)
                if proposal and proposal.get("shiftId")
                else "Tell me which shift you need covered and I’ll log it for the hospital."
            )

        proposals = [proposal] if proposal else None

        return {
            "agent": self.name,
            "role": "assistant",
            "content": reply or "Your swap request has been logged.",
            "proposals": proposals,
            "suggestedFollowUps": [
                "Anything the hospital should know?",
                "Send a preferred replacement's name",
            ],
        }


# ---------------------------------------------------------------------------
# Structuring helpers — we scrape the user's first message for common fields
# so hospital-side inbox rows show a tidy summary without an extra tool call.
# ---------------------------------------------------------------------------

_UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_TIME_RANGE_RE = re.compile(
    r"\b(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})\b", re.IGNORECASE
)
_REASON_RE = re.compile(r"reason\s*[:\-]\s*(.+)", re.IGNORECASE)


def _build_swap_proposal(
    messages: List[Dict[str, Any]],
    patient_info: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Extract structured swap info from the conversation so it can be
    stored on the workflow row that the hospital sees."""
    user_texts = [m["content"] for m in messages if m.get("role") == "user"]
    if not user_texts:
        return None

    blob = "\n".join(user_texts)
    shift_id = _first_match(_UUID_RE, blob)
    date_match = _first_match(_DATE_RE, blob)
    time_match = _TIME_RANGE_RE.search(blob)
    reason_match = _REASON_RE.search(blob)

    return {
        "kind": "ShiftSwapRequest",
        "shiftId": shift_id,
        "shiftDate": date_match,
        "shiftWindow": (
            f"{time_match.group(1)}–{time_match.group(2)}" if time_match else None
        ),
        "reason": (reason_match.group(1).strip() if reason_match else None),
        "requester": {
            "name": (patient_info or {}).get("name"),
            "hospitalName": (patient_info or {}).get("hospitalName"),
        },
        "conversationSnippet": user_texts[-1][:280] if user_texts else None,
        "status": "PendingHospitalReview",
    }


def _first_match(pattern: re.Pattern[str], text: str) -> Optional[str]:
    m = pattern.search(text)
    return m.group(0) if m else None


shift_swap_agent = ShiftSwapAgent()

__all__ = ["shift_swap_agent", "ShiftSwapAgent"]
