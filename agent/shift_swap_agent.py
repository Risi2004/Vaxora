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
request in their Agent workflow inbox and does the actual reassignment.
"""

from __future__ import annotations

import json
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
Your only job: help a staff member log a request for someone else to cover their shift.

Rules:
- Be short (2–3 sentences max) and empathetic.
- If the user's first message already contains a shift id, date and reason, acknowledge and confirm you have logged a swap request. Do not ask redundant questions.
- If key info is missing, ask ONE targeted follow-up (which shift, or a brief reason).
- Never promise a specific replacement — the hospital chooses. You only forward the request.
- Never suggest cancelling the appointment altogether. Always frame it as "your hospital will find cover".
- Refuse anything not related to shift cover. If asked, politely redirect: "I can only help with shift swap requests."
"""


class ShiftSwapAgent:
    """
    Very small stateless agent. Persistence is handled by the .NET
    AgentWorkflowService which stores the response's `proposals` JSON so
    the hospital can see the swap request in their workflow inbox.
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
                max_tokens=280,
            )
            reply = (completion.choices[0].message.content or "").strip()
        except Exception as exc:  # pragma: no cover - remote LLM
            logger.error("ShiftSwapAgent LLM call failed: %s", exc)
            reply = (
                "I could not reach the assistant just now. Your request has "
                "still been logged for your hospital to review."
            )

        proposal = _build_swap_proposal(clean_messages, patient_info)
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

# Re-exported so `import json` above stays used even if the module trims later.
_ = json
