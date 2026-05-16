import sqlite3
import json
import os
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../data/telemetry.db"))

@contextmanager
def get_db():
    """Context manager for database connections with performance optimizations."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    try:
        # Performance: Enable WAL mode for better concurrent read/writes
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id TEXT,
                model_hash TEXT,
                hardware_profile TEXT,
                goal TEXT,
                latency_range TEXT,
                memory_mb REAL,
                decode_tokens_per_sec REAL,
                prefill_latency_ms REAL,
                timestamp DATETIME,
                last_seen DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS blacklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id TEXT,
                backend TEXT,
                reason TEXT,
                timestamp DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fleet_nodes (
                machine_id TEXT PRIMARY KEY,
                hardware_profile TEXT,
                status TEXT,
                last_seen DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pending_nodes (
                machine_id TEXT PRIMARY KEY,
                status TEXT,
                timestamp DATETIME
            )
        """)

        # Senior ML Engineer: Model Registry for Versioning and Reference Baselining
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_registry (
                model_hash TEXT PRIMARY KEY,
                model_name TEXT,
                reference_latency REAL,
                reference_memory_mb REAL,
                reference_throughput REAL,
                metadata TEXT,
                timestamp DATETIME
            )
        """)
        conn.commit()

def register_reference_model(model_hash: str, name: str, latency: float, memory: float, throughput: float = 0.0, metadata: dict = None):
    """Registers a model as a reference/baseline for drift detection."""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO model_registry (model_hash, model_name, reference_latency, reference_memory_mb, reference_throughput, metadata, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(model_hash) DO UPDATE SET
                model_name = excluded.model_name,
                reference_latency = excluded.reference_latency,
                reference_memory_mb = excluded.reference_memory_mb,
                reference_throughput = excluded.reference_throughput,
                metadata = excluded.metadata,
                timestamp = excluded.timestamp
        """, (model_hash, name, latency, memory, throughput, json.dumps(metadata or {}), now))
        conn.commit()

def detect_drift(model_hash: str, current_latency: float, current_throughput: float = None) -> dict:
    """
    Senior ML Engineer Practice: Detect performance drift against reference baseline.
    Returns drift percentages and status.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_registry WHERE model_hash = ?", (model_hash,))
        row = cursor.fetchone()
        if not row:
            return {"status": "no_reference", "drift_detected": False}
        
        ref = dict(row)
        latency_drift = ((current_latency - ref['reference_latency']) / ref['reference_latency']) * 100
        
        throughput_drift = 0.0
        if current_throughput and ref['reference_throughput'] > 0:
            throughput_drift = ((current_throughput - ref['reference_throughput']) / ref['reference_throughput']) * 100

        # Thresholds: >10% latency increase or >10% throughput decrease is a warning
        is_drifting = latency_drift > 10 or (throughput_drift < -10 if current_throughput else False)
        
        return {
            "status": "success",
            "drift_detected": is_drifting,
            "latency_drift_pct": round(latency_drift, 2),
            "throughput_drift_pct": round(throughput_drift, 2),
            "reference_latency": ref['reference_latency'],
            "reference_throughput": ref['reference_throughput']
        }

def create_join_request(machine_id):
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO pending_nodes (machine_id, status, timestamp)
            VALUES (?, 'pending', ?)
            ON CONFLICT(machine_id) DO UPDATE SET timestamp = excluded.timestamp
        """, (machine_id, now))
        conn.commit()

def set_node_approval(machine_id, approved: bool):
    with get_db() as conn:
        cursor = conn.cursor()
        status = 'approved' if approved else 'rejected'
        cursor.execute("UPDATE pending_nodes SET status = ? WHERE machine_id = ?", (status, machine_id))
        conn.commit()

def get_node_join_status(machine_id) -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM pending_nodes WHERE machine_id = ?", (machine_id,))
        row = cursor.fetchone()
        return row[0] if row else "unknown"

def update_heartbeat(machine_id, hardware_profile=None, status="idle"):
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Update telemetry last_seen if it exists
        cursor.execute("UPDATE telemetry SET last_seen = ? WHERE machine_id = ?", (now, machine_id))
        
        # UPSERT into fleet_nodes
        if hardware_profile:
            cursor.execute("""
                INSERT INTO fleet_nodes (machine_id, hardware_profile, status, last_seen)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(machine_id) DO UPDATE SET
                    hardware_profile = excluded.hardware_profile,
                    status = excluded.status,
                    last_seen = excluded.last_seen
            """, (machine_id, json.dumps(hardware_profile), status, now))
        else:
            cursor.execute("""
                UPDATE fleet_nodes SET last_seen = ?, status = ? WHERE machine_id = ?
            """, (now, status, machine_id))
            
        conn.commit()

def get_active_nodes(minutes=2):
    with get_db() as conn:
        cursor = conn.cursor()
        # Find nodes seen in the last X minutes
        cursor.execute("""
            SELECT * FROM fleet_nodes 
            WHERE last_seen > datetime('now', ?)
        """, (f'-{minutes} minutes',))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            d = dict(row)
            d['hardware_profile'] = json.loads(d['hardware_profile'])
            results.append(d)
        return results

def delete_node(machine_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM fleet_nodes WHERE machine_id = ?", (machine_id,))
        cursor.execute("DELETE FROM telemetry WHERE machine_id = ?", (machine_id,))
        conn.commit()

def add_to_blacklist(machine_id, backend, reason):
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO blacklist (machine_id, backend, reason, timestamp)
            VALUES (?, ?, ?, ?)
        """, (machine_id, backend, reason, now))
        conn.commit()

def get_blacklist():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blacklist ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def insert_telemetry(machine_id, hardware_profile, goal, latency_range, memory_mb, model_hash="unknown", decode_tokens_per_sec=None, prefill_latency_ms=None):
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO telemetry (machine_id, model_hash, hardware_profile, goal, latency_range, memory_mb, decode_tokens_per_sec, prefill_latency_ms, timestamp, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            machine_id,
            model_hash,
            json.dumps(hardware_profile),
            goal,
            json.dumps(latency_range),
            memory_mb,
            decode_tokens_per_sec,
            prefill_latency_ms,
            now,
            now
        ))
        conn.commit()

def get_recent_telemetry(limit=50, offset=0):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ? OFFSET ?", (limit, offset))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            d = dict(row)
            d['hardware_profile'] = json.loads(d['hardware_profile'])
            d['latency_range'] = json.loads(d['latency_range'])
            results.append(d)
        return results

def clear_telemetry_history(range_type="all"):
    with get_db() as conn:
        cursor = conn.cursor()
        
        if range_type == "today":
            cursor.execute("DELETE FROM telemetry WHERE timestamp >= datetime('now', 'start of day')")
        elif range_type == "week":
            cursor.execute("DELETE FROM telemetry WHERE timestamp >= datetime('now', '-7 days')")
        elif range_type == "month":
            cursor.execute("DELETE FROM telemetry WHERE timestamp >= datetime('now', '-30 days')")
        else:  # all
            cursor.execute("DELETE FROM telemetry")
            
        conn.commit()

