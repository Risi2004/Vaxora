"""
Structured planning helper.
Every agent run begins with a plan. The plan is stored in workflow state.
"""
import json
import re
from typing import Dict, Any, List


def extract_plan_from_response(content: str) -> List[Dict[str, Any]]:
    """
    Extract a `"plan": [...]` array from the LLM's first response.
    Falls back to a default plan if the LLM didn't produce one.
    """
    if not content:
        return []

    # Try to find JSON block
    match = re.search(r'\{[^{}]*"plan"\s*:\s*\[.*?\]\s*\}', content, re.DOTALL)
    if not match:
        # try any JSON object
        match = re.search(r'\{.*\}', content, re.DOTALL)

    if match:
        try:
            data = json.loads(match.group(0))
            plan = data.get("plan") or data.get("steps") or []
            if isinstance(plan, list):
                normalized = []
                for i, step in enumerate(plan, 1):
                    if isinstance(step, str):
                        normalized.append({"step": i, "action": step, "status": "pending"})
                    elif isinstance(step, dict):
                        step.setdefault("step", i)
                        step.setdefault("status", "pending")
                        normalized.append(step)
                return normalized
        except json.JSONDecodeError:
            pass

    return []


RESTOCK_DEFAULT_PLAN = [
    {"step": 1, "action": "Fetch current inventory summary", "status": "pending"},
    {"step": 2, "action": "Fetch per-batch stock levels", "status": "pending"},
    {"step": 3, "action": "Fetch vaccine master thresholds", "status": "pending"},
    {"step": 4, "action": "Compute reorder quantities using deterministic rules", "status": "pending"},
    {"step": 5, "action": "Validate proposals against business rules", "status": "pending"},
    {"step": 6, "action": "Propose purchase order — requires admin approval", "status": "pending"},
]

EXPIRY_DEFAULT_PLAN = [
    {"step": 1, "action": "Scan batches expiring within threshold", "status": "pending"},
    {"step": 2, "action": "Fetch audit trail for most urgent batches", "status": "pending"},
    {"step": 3, "action": "Assign priority based on expiry window + quantity", "status": "pending"},
    {"step": 4, "action": "Validate each action against deterministic rules", "status": "pending"},
    {"step": 5, "action": "Propose expiry action plan — requires admin approval", "status": "pending"},
]


def mark_step(plan: List[Dict[str, Any]], step_num: int, status: str = "completed"):
    for step in plan:
        if step.get("step") == step_num:
            step["status"] = status
            break
    return plan