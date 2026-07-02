import os
import secrets
from pathlib import Path

# --- Load .env if present ---
_project_root = Path(__file__).resolve().parent.parent.parent.parent
_env_path = _project_root / ".env"
if _env_path.exists():
    with open(_env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if line.startswith("export "):
                    line = line[7:].strip()
                if "=" in line:
                    key, val = line.split("=", 1)
                    val = val.strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    os.environ[key.strip()] = val

# --- Environment Configurations ---
ENV = os.getenv("ENV") or os.getenv("SYSAWARE_ENV") or "development"
IS_PRODUCTION = ENV.lower() == "production"
IS_DEV = ENV.lower() == "development"
IS_TEST = ENV.lower() == "test"

# Host Bind Config
SYSAWARE_BIND = os.getenv("SYSAWARE_BIND", "127.0.0.1")

# API Authentication Key
SYSAWARE_API_KEY = os.getenv("SYSAWARE_API_KEY")
if not SYSAWARE_API_KEY:
    if IS_DEV:
        SYSAWARE_API_KEY = "sysaware_" + secrets.token_hex(16)
        is_loopback = SYSAWARE_BIND.strip().lower() in ["127.0.0.1", "localhost", "::1"]
        if is_loopback:
            print("\n" + "!" * 60)
            print(f"WARNING: No SYSAWARE_API_KEY was provided.")
            print(f"Generated a secure random API key for this session:")
            print(f"  {SYSAWARE_API_KEY}")
            print("Please set SYSAWARE_API_KEY in your environment to use a persistent key.")
            print("!" * 60 + "\n")
        else:
            raise RuntimeError("SECURITY ERROR: Auto-generated API key cannot be used when bound to a non-loopback interface.")
    elif IS_TEST and os.getenv("SYSAWARE_DISABLE_AUTH_FOR_TESTS") == "true":
        SYSAWARE_API_KEY = None
    else:
        raise RuntimeError(f"SECURITY ERROR: SYSAWARE_API_KEY is not set in environment (ENV={ENV}).")

# Admin Key
SYSAWARE_ADMIN_KEY = os.getenv("SYSAWARE_ADMIN_KEY")
if not SYSAWARE_ADMIN_KEY:
    if SYSAWARE_API_KEY:
        SYSAWARE_ADMIN_KEY = SYSAWARE_API_KEY
    else:
        if IS_DEV:
            SYSAWARE_ADMIN_KEY = "sysaware_admin_" + secrets.token_hex(16)
            is_loopback = SYSAWARE_BIND.strip().lower() in ["127.0.0.1", "localhost", "::1"]
            if is_loopback:
                print("\n" + "!" * 60)
                print(f"WARNING: No SYSAWARE_ADMIN_KEY was provided.")
                print(f"Generated a secure random ADMIN API key for this session:")
                print(f"  {SYSAWARE_ADMIN_KEY}")
                print("Please set SYSAWARE_ADMIN_KEY in your environment to use a persistent admin key.")
                print("!" * 60 + "\n")
            else:
                raise RuntimeError("SECURITY ERROR: Auto-generated ADMIN key cannot be used when bound to a non-loopback interface.")
        elif IS_TEST and os.getenv("SYSAWARE_DISABLE_AUTH_FOR_TESTS") == "true":
            SYSAWARE_ADMIN_KEY = None
        else:
            raise RuntimeError(f"SECURITY ERROR: SYSAWARE_ADMIN_KEY is not set in environment (ENV={ENV}).")

# CORS Origins
cors_origins_env = os.getenv("SYSAWARE_CORS_ORIGINS")
if cors_origins_env:
    CORS_ORIGINS = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# Allowed Proxy Hosts
allowed_proxies_env = os.getenv("SYSAWARE_ALLOWED_PROXIES")
if allowed_proxies_env:
    ALLOWED_PROXIES = [h.strip() for h in allowed_proxies_env.split(",") if h.strip()]
else:
    ALLOWED_PROXIES = ["127.0.0.1", "localhost"]

# Timeouts
AUTOTUNE_STREAM_TIMEOUT = 600
DIAGNOSTIC_STREAM_TIMEOUT = 300
RUNNER_TUNE_STREAM_TIMEOUT = 300
CHAT_STREAM_TIMEOUT = 120

# Allowed Model Directories
allowed_model_dirs_env = os.getenv("SYSAWARE_ALLOWED_MODEL_DIRS")
if allowed_model_dirs_env:
    ALLOWED_MODEL_DIRS = [os.path.realpath(d.strip()) for d in allowed_model_dirs_env.split(",") if d.strip()]
else:
    cwd = os.getcwd()
    pkg_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ALLOWED_MODEL_DIRS = [
        os.path.realpath(os.path.join(cwd, "models")),
        os.path.realpath(os.path.join(pkg_dir, "dummy_models"))
    ]
    if not IS_PRODUCTION:
        ALLOWED_MODEL_DIRS.append(os.path.realpath(os.path.join(cwd, "artifacts")))

# Unsafe Load Allowed
SYSAWARE_ALLOW_UNSAFE_LOAD = os.getenv("SYSAWARE_ALLOW_UNSAFE_LOAD", "false").lower() == "true"
