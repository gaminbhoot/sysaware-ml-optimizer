import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = "telemetry.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Performance: Enable WAL mode for better concurrent read/writes
    # This allows the dashboard to read while the CLI is writing
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    
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
    conn.commit()
    conn.close()

def create_join_request(machine_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO pending_nodes (machine_id, status, timestamp)
        VALUES (?, 'pending', ?)
        ON CONFLICT(machine_id) DO UPDATE SET timestamp = excluded.timestamp
    """, (machine_id, now))
    conn.commit()
    conn.close()

def set_node_approval(machine_id, approved: bool):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    status = 'approved' if approved else 'rejected'
    cursor.execute("UPDATE pending_nodes SET status = ? WHERE machine_id = ?", (status, machine_id))
    conn.commit()
    conn.close()

def get_node_join_status(machine_id) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM pending_nodes WHERE machine_id = ?", (machine_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else "unknown"

def update_heartbeat(machine_id, hardware_profile=None, status="idle"):
    conn = sqlite3.connect(DB_PATH)
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
    conn.close()

def get_active_nodes(minutes=2):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Find nodes seen in the last X minutes
    # SQLite datetime functions handle ISO8601 strings well if formatted correctly
    cursor.execute("""
        SELECT * FROM fleet_nodes 
        WHERE last_seen > datetime('now', ?)
    """, (f'-{minutes} minutes',))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        d = dict(row)
        d['hardware_profile'] = json.loads(d['hardware_profile'])
        results.append(d)
    return results

def delete_node(machine_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fleet_nodes WHERE machine_id = ?", (machine_id,))
    cursor.execute("DELETE FROM telemetry WHERE machine_id = ?", (machine_id,))
    conn.commit()
    conn.close()

def add_to_blacklist(machine_id, backend, reason):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO blacklist (machine_id, backend, reason, timestamp)
        VALUES (?, ?, ?, ?)
    """, (machine_id, backend, reason, now))
    conn.commit()
    conn.close()

def get_blacklist():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM blacklist ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def insert_telemetry(machine_id, hardware_profile, goal, latency_range, memory_mb, model_hash="unknown", decode_tokens_per_sec=None, prefill_latency_ms=None):
    conn = sqlite3.connect(DB_PATH)
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
    conn.close()

def get_recent_telemetry(limit=50):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        d = dict(row)
        d['hardware_profile'] = json.loads(d['hardware_profile'])
        d['latency_range'] = json.loads(d['latency_range'])
        results.append(d)
    return results

def clear_telemetry_history(range_type="all"):
    conn = sqlite3.connect(DB_PATH)
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
    conn.close()
