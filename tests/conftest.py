import os
import pytest
from fastapi.testclient import TestClient

# Configure environment variables for test execution
os.environ["SYSAWARE_ALLOW_UNSAFE_LOAD"] = "true"
os.environ["SYSAWARE_BIND"] = "127.0.0.1"
os.environ["ENV"] = "test"
os.environ["SYSAWARE_ENV"] = "test"
os.environ["SYSAWARE_API_KEY"] = "test_key"
os.environ["SYSAWARE_ADMIN_KEY"] = "admin_test_key"

# Patch TestClient to automatically add X-API-Key header in test environment
original_request = TestClient.request
original_stream = TestClient.stream

def _inject_auth_header(self, kwargs):
    headers = kwargs.get("headers") or {}
    headers_lower = {k.lower() for k in headers.keys()}
    if "x-api-key" not in headers_lower and "authorization" not in headers_lower:
        headers = dict(headers)
        headers["X-API-Key"] = "test_key"
        kwargs["headers"] = headers

def patched_request(self, method, url, *args, **kwargs):
    if getattr(self, "no_auth_inject", False):
        return original_request(self, method, url, *args, **kwargs)
    _inject_auth_header(self, kwargs)
    return original_request(self, method, url, *args, **kwargs)

def patched_stream(self, method, url, *args, **kwargs):
    if getattr(self, "no_auth_inject", False):
        return original_stream(self, method, url, *args, **kwargs)
    _inject_auth_header(self, kwargs)
    return original_stream(self, method, url, *args, **kwargs)

TestClient.request = patched_request
TestClient.stream = patched_stream
