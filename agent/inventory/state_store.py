"""
Workflow state persistence for inventory agents.
Stores every agent execution: objective, plan, steps, tool calls, validation, outcome.
Uses SQLite (built-in, no extra deps) for durable storage.
"""
import sqlite3
import json
import uuid
import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("vaxora-inventory-state")

DB_PATH = Path(tempfile.gettempdir()) / "vaxora_agent_state.db"


def _init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS workflow_state (
            workflow_id TEXT PRIMARY KEY,
            agent_name TEXT NOT NULL,
            user_id TEXT,
            objective TEXT,
            plan_json TEXT,
            steps_json TEXT,
            tool_calls_json TEXT,
            validation_json TEXT,
            errors_json TEXT,
            approval_status TEXT DEFAULT 'not_required',
            final_outcome TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_agent_created 
        ON workflow_state (agent_name, created_at DESC)
    """)
    conn.commit()
    conn.close()


_init_db()


class WorkflowStateStore:
    def create(self, agent_name: str, user_id: Optional[str], objective: str) -> str:
        workflow_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            """INSERT INTO workflow_state 
               (workflow_id, agent_name, user_id, objective, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (workflow_id, agent_name, user_id or "anonymous", objective, now, now),
        )
        conn.commit()
        conn.close()
        logger.info(f"[state] Created workflow {workflow_id} for {agent_name}")
        return workflow_id

    def update(self, workflow_id: str, **fields):
        if not fields:
            return
        now = datetime.now(timezone.utc).isoformat()
        allowed = {"plan_json", "steps_json", "tool_calls_json", "validation_json",
                   "errors_json", "approval_status", "final_outcome"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        updates["updated_at"] = now

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [workflow_id]

        conn = sqlite3.connect(DB_PATH)
        conn.execute(f"UPDATE workflow_state SET {set_clause} WHERE workflow_id = ?", values)
        conn.commit()
        conn.close()

    def set_plan(self, workflow_id: str, plan: List[Dict[str, Any]]):
        self.update(workflow_id, plan_json=json.dumps(plan))

    def append_step(self, workflow_id: str, step: Dict[str, Any]):
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            "SELECT steps_json FROM workflow_state WHERE workflow_id = ?", (workflow_id,)
        ).fetchone()
        steps = json.loads(row[0]) if row and row[0] else []
        steps.append(step)
        self.update(workflow_id, steps_json=json.dumps(steps))
        conn.close()

    def append_tool_call(self, workflow_id: str, tool_name: str, args: Dict, result: Any):
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            "SELECT tool_calls_json FROM workflow_state WHERE workflow_id = ?", (workflow_id,)
        ).fetchone()
        calls = json.loads(row[0]) if row and row[0] else []
        calls.append({
            "tool": tool_name,
            "args": args,
            "result_preview": str(result)[:500],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self.update(workflow_id, tool_calls_json=json.dumps(calls))
        conn.close()

    def set_validation(self, workflow_id: str, results: List[Dict[str, Any]]):
        self.update(workflow_id, validation_json=json.dumps(results))

    def set_approval(self, workflow_id: str, status: str):
        self.update(workflow_id, approval_status=status)

    def set_outcome(self, workflow_id: str, outcome: str):
        self.update(workflow_id, final_outcome=outcome)

    def get(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM workflow_state WHERE workflow_id = ?", (workflow_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    def list_recent(self, agent_name: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        if agent_name:
            rows = conn.execute(
                "SELECT * FROM workflow_state WHERE agent_name = ? ORDER BY created_at DESC LIMIT ?",
                (agent_name, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM workflow_state ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


state_store = WorkflowStateStore()