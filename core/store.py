import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = "telemetry.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT,
            hardware_profile TEXT,
            goal TEXT,
            latency_range TEXT,
            memory_mb REAL,
            decode_tokens_per_sec REAL,
            prefill_latency_ms REAL,
            timestamp DATETIME
        )
    """)
    conn.commit()
    conn.close()

def insert_telemetry(machine_id, hardware_profile, goal, latency_range, memory_mb, decode_tokens_per_sec=None, prefill_latency_ms=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry (machine_id, hardware_profile, goal, latency_range, memory_mb, decode_tokens_per_sec, prefill_latency_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        machine_id,
        json.dumps(hardware_profile),
        goal,
        json.dumps(latency_range),
        memory_mb,
        decode_tokens_per_sec,
        prefill_latency_ms,
        datetime.now(timezone.utc).isoformat()
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
