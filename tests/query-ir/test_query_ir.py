#!/usr/bin/env python3
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "packages/query-ir/v1.schema.json"
ERROR_SCHEMA = ROOT / "packages/query-ir/v1-error.schema.json"
FIXTURES = ROOT / "packages/query-ir/fixtures"

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def assert_contains(value, needle):
    text = json.dumps(value, ensure_ascii=False)
    if needle.lower() in text.lower():
        raise AssertionError(f"engine-specific token leaked into fixture: {needle}")

schema = json.loads(SCHEMA.read_text())
error_schema = json.loads(ERROR_SCHEMA.read_text())
assert schema["$id"].endswith("/v1.schema.json")
assert error_schema["$id"].endswith("/v1-error.schema.json")
assert schema["properties"]["version"]["const"] == "v1"
assert schema["properties"]["kind"]["const"] == "graph_query"

try:
    import jsonschema
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--disable-pip-version-check", "jsonschema==4.23.0"])
    import jsonschema

jsonschema.Draft202012Validator.check_schema(schema)
jsonschema.Draft202012Validator.check_schema(error_schema)

valid = [
    ("person-knows.json", "798288f3b3fe1fceeb28d14282e43e7925febf21908faa10da01f6943fbe83dc"),
    ("two-hop.json", "44bc217af1729b14732600a6710f97799e4634ddab55bb9ece0f680667dda8c1"),
]
for filename, expected_hash in valid:
    value = json.loads((FIXTURES / filename).read_text())
    errors = list(jsonschema.Draft202012Validator(schema).iter_errors(value))
    assert not errors, f"{filename} failed validation: {errors}"
    for token in ("cypher", "match (", "select ", "ag_catalog", "sql "):
        assert_contains(value, token)
    digest = hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()
    assert digest == expected_hash, f"{filename} hash changed: {digest}"

invalid = json.loads((FIXTURES / "invalid-engine-leak.json").read_text())
assert list(jsonschema.Draft202012Validator(schema).iter_errors(invalid)), "invalid fixture unexpectedly passed"

error = json.loads((FIXTURES / "error.json").read_text())
assert not list(jsonschema.Draft202012Validator(error_schema).iter_errors(error)), "error fixture failed v1 error schema"

print("stage-05-query-ir-ok")
