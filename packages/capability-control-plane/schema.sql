-- Apply with a dedicated migration role. Runtime DB credentials should receive
-- only the grants required by the control-plane store, never schema ownership.
CREATE SCHEMA IF NOT EXISTS capability_control;

CREATE TABLE IF NOT EXISTS capability_control.grants (
  jti text PRIMARY KEY,
  subject text NOT NULL,
  tenant_id text NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  grant_claims jsonb NOT NULL,
  CHECK (length(jti) BETWEEN 1 AND 200),
  CHECK (length(subject) BETWEEN 1 AND 500),
  CHECK (length(tenant_id) BETWEEN 1 AND 200),
  CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS capability_grants_tenant_expiry_idx
  ON capability_control.grants (tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS capability_grants_active_expiry_idx
  ON capability_control.grants (expires_at)
  WHERE revoked_at IS NULL;

REVOKE ALL ON SCHEMA capability_control FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA capability_control FROM PUBLIC;
