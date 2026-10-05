"""Rule-based Agentic AI evaluation helpers (no LLM-as-judge required)."""

from .staff_scheduling_golden import (
    ALLOWED_STAFF_TOOLS,
    FORBIDDEN_WRITE_TOOLS as FORBIDDEN_STAFF_WRITE_TOOLS,
    evaluate_trajectory as evaluate_staff_trajectory,
    GOLDEN_CASES as STAFF_GOLDEN_CASES,
)
from .booking_golden import (
    ALLOWED_BOOKING_TOOLS,
    FORBIDDEN_WRITE_TOOLS as FORBIDDEN_BOOKING_WRITE_TOOLS,
    REQUIRED_BOOKING_PROPOSAL_FIELDS,
    REQUIRED_CANCELLATION_PROPOSAL_FIELDS,
    validate_booking_proposal,
    evaluate_trajectory as evaluate_booking_trajectory,
    evaluate_all as evaluate_all_booking,
    GOLDEN_CASES as BOOKING_GOLDEN_CASES,
)

__all__ = [
    "ALLOWED_STAFF_TOOLS",
    "FORBIDDEN_STAFF_WRITE_TOOLS",
    "evaluate_staff_trajectory",
    "STAFF_GOLDEN_CASES",
    "ALLOWED_BOOKING_TOOLS",
    "FORBIDDEN_BOOKING_WRITE_TOOLS",
    "REQUIRED_BOOKING_PROPOSAL_FIELDS",
    "REQUIRED_CANCELLATION_PROPOSAL_FIELDS",
    "validate_booking_proposal",
    "evaluate_booking_trajectory",
    "evaluate_all_booking",
    "BOOKING_GOLDEN_CASES",
]
