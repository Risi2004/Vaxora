"""
Tool implementations for inventory agents.
Each tool calls the Vaxora .NET backend via HTTP.
Tools NEVER bypass auth — token from the request is passed through.
"""
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

try:
    from ..config import settings
except ImportError:
    from config import settings


async def _api_get(endpoint: str, token: Optional[str] = None, params: Optional[Dict] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers, params=params)
        r.raise_for_status()
        return r.json()


# ================== TOOL IMPLEMENTATIONS ==================

async def tool_get_inventory_summary(token: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = await _api_get("/inventory/summary", token=token)
        return {"success": True, "summary": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_stock_levels(token: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = await _api_get("/inventory/batches", token=token)
        return {"success": True, "batches": data, "count": len(data) if isinstance(data, list) else 0}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_vaccines(token: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = await _api_get("/inventory/vaccines", token=token)
        return {"success": True, "vaccines": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_expiring_batches(days_threshold: int = 60, token: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = await _api_get(
            "/inventory/batches/expiring",
            token=token,
            params={"daysThreshold": days_threshold},
        )
        enriched = []
        now = datetime.now(timezone.utc)
        for b in data or []:
            expiry_str = b.get("expiry")
            try:
                expiry = datetime.strptime(expiry_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days = (expiry - now).days
            except Exception:
                days = None
            enriched.append({**b, "daysUntilExpiry": days})
        return {"success": True, "batches": enriched, "count": len(enriched)}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_batch_audit(batch_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    try:
        data = await _api_get(f"/inventory/batches/{batch_id}/audit", token=token)
        return {"success": True, "audit": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ================== APPROVAL-GATED TOOLS ==================
# These tools DO NOT execute the real action. They build a proposal
# that the frontend displays with an "Approve" button. Only after
# approval does the actual API call happen (via a separate endpoint).

async def tool_propose_restock_order(
    vaccine_id: str,
    vaccine_name: str,
    current_stock: int,
    recommended_quantity: int,
    reason: str,
    urgency: str,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Returns a proposal object. Does NOT create a real order."""
    return {
        "success": True,
        "status": "proposal_pending_user_approval",
        "proposal_type": "restock_order",
        "proposal": {
            "vaccine_id": vaccine_id,
            "vaccine_name": vaccine_name,
            "current_stock": current_stock,
            "recommended_quantity": recommended_quantity,
            "reason": reason,
            "urgency": urgency,
            "action_label": "Approve Restock Order",
        },
    }


async def tool_propose_expiry_action(
    actions: List[Dict[str, Any]],
    summary: str,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Returns a proposal object. Does NOT execute disposal/transfer."""
    return {
        "success": True,
        "status": "proposal_pending_user_approval",
        "proposal_type": "expiry_action_plan",
        "proposal": {
            "actions": actions,
            "summary": summary,
            "action_label": "Approve Expiry Action Plan",
        },
    }


# ================== TOOL SCHEMAS (OpenAI function-calling) ==================

RESTOCK_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory_summary",
            "description": "Get overall inventory totals: total vials, doses, low-stock count, expiring count.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_levels",
            "description": "Get per-batch stock levels for the hospital's current inventory.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_vaccines",
            "description": "Get master list of vaccines with their default minimum thresholds and dosing info.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_restock_order",
            "description": "Propose a restock purchase order for admin approval. This pauses the workflow until the user approves or rejects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vaccine_id": {"type": "string", "description": "Vaccine GUID"},
                    "vaccine_name": {"type": "string"},
                    "current_stock": {"type": "integer"},
                    "recommended_quantity": {"type": "integer", "description": "Vials to order"},
                    "reason": {"type": "string", "description": "Why this quantity is recommended"},
                    "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": ["vaccine_id", "vaccine_name", "current_stock",
                             "recommended_quantity", "reason", "urgency"],
            },
        },
    },
]


EXPIRY_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_expiring_batches",
            "description": "Get batches expiring within the given number of days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days_threshold": {"type": "integer", "description": "Days window, default 60"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_batch_audit",
            "description": "Get the audit trail for a specific batch (restock, wastage, issues).",
            "parameters": {
                "type": "object",
                "properties": {
                    "batch_id": {"type": "string", "description": "Batch GUID"}
                },
                "required": ["batch_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_expiry_action",
            "description": "Propose an action plan for expiring batches (dispense_first / transfer / dispose) for admin approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "batch_id": {"type": "string"},
                                "lot_number": {"type": "string"},
                                "vaccine_name": {"type": "string"},
                                "quantity_available": {"type": "integer"},
                                "expiry_date": {"type": "string"},
                                "days_until_expiry": {"type": "integer"},
                                "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                                "recommended_action": {"type": "string", "enum": ["dispense_first", "transfer", "dispose"]},
                            },
                        },
                    },
                    "summary": {"type": "string", "description": "Human-readable summary of the plan"},
                },
                "required": ["actions", "summary"],
            },
        },
    },
]