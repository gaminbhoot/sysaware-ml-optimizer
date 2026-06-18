import os
import pytest

# Configure environment variables for test execution
os.environ["SYSAWARE_ALLOW_UNSAFE_LOAD"] = "true"
os.environ["SYSAWARE_BIND"] = "127.0.0.1"
# Ensure we don't accidentally enable production security behaviors that would require keys in tests
os.environ["ENV"] = "test"
os.environ["SYSAWARE_ENV"] = "test"
