"""
Deterministic business-rule validation for inventory agent outputs.
These checks run BEFORE any proposal is shown to the user.
Non-negotiable — LLM output must pass all rules.
"""
from typing import Dict, Any, List, Tuple


def validate_restock_proposal(proposal: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Returns (is_valid, list_of_errors)."""
    errors = []

    required_fields = ["vaccine_id", "vaccine_name", "current_stock",
                       "recommended_quantity", "reason", "urgency"]
    for field in required_fields:
        if field not in proposal:
            errors.append(f"Missing required field: {field}")

    qty = proposal.get("recommended_quantity", 0)
    if not isinstance(qty, (int, float)) or qty <= 0:
        errors.append("recommended_quantity must be a positive number")
    if isinstance(qty, (int, float)) and qty > 100000:
        errors.append("recommended_quantity exceeds sane limit (100000)")

    urgency = proposal.get("urgency", "").lower()
    if urgency not in ("low", "medium", "high"):
        errors.append(f"urgency must be low/medium/high, got: {urgency}")

    current = proposal.get("current_stock", 0)
    threshold = proposal.get("threshold")
    if threshold is not None and current > threshold * 1.5 and qty > 0:
        errors.append(f"Cannot restock '{proposal.get('vaccine_name')}': stock ({current}) is above safety level ({threshold})")

    return (len(errors) == 0, errors)


def validate_expiry_action(action: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []

    required_fields = ["batch_id", "lot_number", "vaccine_name",
                       "quantity_available", "expiry_date", "days_until_expiry",
                       "priority", "recommended_action"]
    for field in required_fields:
        if field not in action:
            errors.append(f"Missing required field: {field}")

    priority = action.get("priority", "").lower()
    if priority not in ("critical", "high", "medium", "low"):
        errors.append(f"priority must be critical/high/medium/low, got: {priority}")

    recommended = action.get("recommended_action", "").lower()
    if recommended not in ("dispense_first", "transfer", "dispose", "no_action"):
        errors.append(f"recommended_action invalid: {recommended}")

    days = action.get("days_until_expiry")
    if isinstance(days, int):
        if days < 0:
            errors.append("days_until_expiry is negative — batch already expired")
        if days > 60:
            errors.append("days_until_expiry > 60 — batch outside expiry window")

    if recommended == "dispose" and isinstance(days, int) and days > 14:
        errors.append("Refusing to propose disposal for batch with >14 days left")

    return (len(errors) == 0, errors)


def compute_reorder_quantity(current_stock: int, threshold: int) -> int:
    """Deterministic restock math. Never let the LLM do arithmetic."""
    target = threshold * 2
    raw = target - current_stock
    if raw <= 0:
        return 0
    return ((raw + 49) // 50) * 50


def compute_urgency(current_stock: int, threshold: int) -> str:
    if threshold <= 0:
        return "low"
    if current_stock <= threshold:
        return "high"
    if current_stock <= threshold * 1.5:
        return "medium"
    return "low"


def compute_expiry_priority(days_until_expiry: int, quantity: int) -> str:
    if days_until_expiry <= 14 or quantity > 500:
        return "critical"
    if days_until_expiry <= 30:
        return "high"
    if days_until_expiry <= 60:
        return "medium"
    return "low"