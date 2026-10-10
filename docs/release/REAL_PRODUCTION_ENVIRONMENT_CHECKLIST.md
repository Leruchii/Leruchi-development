# Real Production Environment Verification Checklist

**Purpose:** prove that the deployed Leruchi environment—not just CI—has the identity, database, security, monitoring, backup, and recovery controls needed for the intended workload.

**Current evidence boundary:** GitHub Actions on the development `main` branch has recently passed automated Stage 20 production-readiness checks and Stage 17 backup/recovery tests. These tests are useful engineering evidence, but they do not prove that the real staging or production account is configured correctly. Treat all environment-specific checks below as `NOT TESTED` until an authorized person records direct evidence.

## Status values

- `PASS` — the check was performed in the named environment and evidence was saved.
- `FAIL` — the check was performed and did not meet expectations.
- `BLOCKED` — access, a decision, or another prerequisite is missing.
- `NOT TESTED` — no direct evidence has been recorded.

Never put credentials, private keys, bearer tokens, database connection strings, customer data, or sensitive query results in this document.

## 0. Fill in the environment record first

Do not guess these values. The owner or deployment engineer must fill them in.

| Field | Value |
|---|---|
| Staging URL and cloud/account/project | NEEDS OWNER INPUT |
| Production URL and cloud/account/project | NEEDS OWNER INPUT |
| Deployment platform and deployment method | NEEDS OWNER INPUT |
| Production owner / on-call team | NEEDS OWNER INPUT |
| Identity provider and tenant/project | NEEDS OWNER INPUT |
| Production database/service identifier (not credentials) | NEEDS OWNER INPUT |
| Secret manager / key management system | NEEDS OWNER INPUT |
| Monitoring dashboard and alert destination | NEEDS OWNER INPUT |
| Current deployed version and commit SHA | NEEDS OWNER INPUT |
| Rollback runbook | NEEDS OWNER INPUT |
| Backup policy and target RPO/RTO | NEEDS OWNER INPUT |
| Approval/ticket for production tests | NEEDS OWNER INPUT |

**Owner action:** ask the person who operates the cloud/server to complete this table and identify the exact deployed commit. Do not send them secrets in chat.

## 1. Identify the running version

**Environment:** staging first; production read-only verification afterward.

1. Open the deployment platform's service/deployment page.
2. Find the active deployment and record the application version, commit SHA, deploy time, and status.
3. Compare the commit SHA to the intended reviewed Git commit. Do not rely on a branch name alone.
4. Confirm the public health/readiness endpoint reports healthy without exposing configuration or internal diagnostics.
5. Save a screenshot or deployment URL that does not reveal secrets.

**Expected:** the active deployment maps to an identifiable reviewed commit; health and readiness checks pass.

**If it fails:** stop rollout, identify the mismatch, and ask the deployment owner to reconcile the artifact and source before proceeding.

## 2. Identity provider and authentication

**Environment:** staging with test accounts; production only using approved, non-destructive tests.

1. Identify the configured identity provider and the intended issuer, audience, callback/redirect URLs, and logout URLs.
2. Sign in with an authorized test account and verify the expected user/tenant context.
3. Test an invalid, expired, wrong-audience, and revoked token using approved test tooling.
4. Verify logout/session expiry and service-to-service identity behavior.
5. Confirm secrets and tokens are redacted from application and proxy logs.

**Expected:** valid credentials work only in their intended scope; invalid, expired, revoked, or incorrectly scoped credentials are rejected.

**Evidence:** test run or ticket, environment, timestamp, result, and redacted logs.

**If it fails:** block release and involve the identity-provider administrator. Never paste a real token into an issue or report.

## 3. Signing keys and application secrets

1. Open the approved secret manager or deployment secret settings with an authorized administrator.
2. Verify required keys are injected at runtime and are not embedded in source, images, command history, or logs.
3. Confirm access is restricted to the minimum service identities and operators who need it.
4. Identify the owner, rotation procedure, emergency revocation procedure, and recovery procedure for signing/encryption keys.
5. Verify key rotation in staging and confirm old credentials stop working where rotation semantics require that.
6. Check repository secret scanning and image scanning results for the release commit.

**Expected:** no plaintext secrets in Git or logs; least-privilege access; documented and tested rotation/revocation.

**Evidence:** configuration review result and secret-manager audit event IDs only—not secret values.

**If it fails:** stop release, remove exposed credentials from active use, rotate through the approved owner process, and investigate exposure.

## 4. Authorization and tenant isolation

Use two test tenants and test data only.

1. Create or identify a test user in tenant A and another in tenant B.
2. Verify each user can read and mutate only permitted resources in their own tenant.
3. Attempt cross-tenant read, update, create relationship, and delete operations with tenant A's identity.
4. Test invalid tenant claims, client-supplied tenant overrides, revoked credentials, insufficient capabilities, and unauthorized administrative actions.
5. Repeat representative checks through the SDK/API and MCP when that interface is enabled.
6. Verify PostgreSQL row-level security remains enforced by the actual runtime role, not just by application code.
7. Confirm denial responses do not reveal another tenant's data through error messages or timing-sensitive debug output.

**Expected:** every unauthorized action is denied and no tenant B data is returned to tenant A.

**Evidence:** test IDs, sanitized request/result summaries, logs, and the deployed commit SHA.

**If it fails:** block release and treat it as a security incident or release-blocking defect. Do not run destructive cross-tenant tests against customer data.

## 5. Database, extensions, and network boundaries

1. Confirm the actual database service, region, TLS configuration, private network rules, and allowed source identities.
2. Confirm the application connects using its least-privilege runtime role; it must not require a PostgreSQL superuser for normal requests.
3. Verify the required migrations are applied and the database schema version matches the deployed application.
4. Verify required extensions (including Apache AGE and pgvector where used by that deployment) are present at supported versions.
5. Confirm connection pool limits, timeouts, statement/resource limits, and connection exhaustion alerts.
6. From an approved location, verify an unauthorized network path cannot connect to the database.
7. Confirm database audit/error logs do not expose credentials or sensitive payloads.

**Expected:** only approved services can connect, required schema/extensions match, and the application works with least privilege.

**Evidence:** sanitized database version/extension inventory, migration status, and network-policy evidence.

**If it fails:** do not expose the database publicly as a workaround. Ask the database/cloud administrator to correct access and repeat the test.

## 6. SQL, graph, and vector behavior

Run a small, documented test suite against staging and only approved safe probes against production.

1. Insert/read/update/delete a disposable relational record within an authorized test schema.
2. Run a supported graph traversal and a supported graph mutation using the documented API/IR.
3. Verify query parameters are bound rather than interpolated into executable SQL/Cypher.
4. Verify invalid schema names, unsupported operations, excessive depth/limits, and timeout conditions are rejected safely.
5. Where vector retrieval is enabled, verify a known test fixture returns expected ranked results.
6. Check transaction rollback after a controlled staging failure and confirm no partial mutation remains.
7. Compare results to the supported capability contract; do not infer full SQL or graph compatibility from a few tests.

**Expected:** supported operations return expected results, unsupported/unsafe requests are rejected, and transactions preserve consistency.

## 7. MCP and AI-agent permissions

Perform only if MCP/agent access is deployed.

1. Connect with a dedicated test identity and record which tools are discoverable.
2. Verify tool calls carry the authenticated user's/agent's trusted tenant and capability context.
3. Verify no MCP client receives a database superuser or unrestricted service-role credential.
4. Test denied tool calls, malformed inputs, timeout behavior, revoked credentials, and audit-event creation.
5. Verify destructive or high-impact operations follow configured preview/approval policies.
6. Attempt a controlled cross-tenant access test using synthetic data.

**Expected:** MCP has no authorization bypass; tool visibility and execution are limited to the identity's grants.

**If MCP is not deployed:** mark `NOT TESTED — not deployed`, not `PASS`.

## 8. Observability and alert delivery

1. Trigger a harmless test request with a correlation/request ID.
2. Confirm logs, metrics, traces, and audit events appear in the correct dashboards.
3. Trigger a documented test alert or use the monitoring platform's test-alert feature.
4. Confirm the intended on-call person/team receives it and can acknowledge it.
5. Verify alerts exist for elevated error rates, unhealthy dependencies, database connection exhaustion, failed backups, and relevant security events.
6. Inspect sample logs to confirm tokens, passwords, private keys, and sensitive customer payloads are redacted.

**Expected:** operators can find the request and the test alert reaches the intended recipient.

**Evidence:** dashboard links, alert event ID, recipient confirmation, and timestamps.

## 9. Backup and restore

CI has exercised a database restore in a test harness; that is not evidence of a real production restore.

1. Ask the database/cloud owner for the configured backup schedule, retention period, encryption, access policy, and target recovery point objective (RPO) and recovery time objective (RTO).
2. Record the last successful production backup time and its status from the actual backup system.
3. Restore a backup into an isolated recovery environment using the documented runbook.
4. Verify migrations, extensions, representative records, tenant isolation, and application connectivity in the restored environment.
5. Measure actual restore duration and the age of the latest recoverable data.
6. Record evidence and clean up the recovery environment under the approved procedure.

**Expected:** restore completes within the agreed RTO and data loss is within the agreed RPO.

**If it fails:** block production sign-off and repair the backup/restore runbook before claiming recovery readiness. Never test restoration by overwriting production.

## 10. Deployment, migration, and rollback

1. Deploy the reviewed release candidate to staging using the normal pipeline.
2. Confirm pre-deployment checks, migration ordering, readiness, and smoke tests.
3. Exercise a documented failure/rollback scenario in staging.
4. Verify rollback does not leave incompatible database migrations or corrupt data.
5. Confirm who approves a production rollout, how traffic is shifted, how success is measured, and which conditions trigger rollback.
6. Perform a production deployment only with the organization's explicit authorization and change window.
7. After an authorized rollout, run safe smoke tests and monitor errors, latency, and security alerts.

**Expected:** the deployment is traceable to a commit, migrations are safe for the rollout strategy, and rollback is demonstrated.

## 11. Operational ownership and incident response

Confirm and document named roles (not personal secrets):

- Service/application owner: NEEDS OWNER INPUT
- Cloud/network owner: NEEDS OWNER INPUT
- Database/backup owner: NEEDS OWNER INPUT
- Identity/key owner: NEEDS OWNER INPUT
- Security incident contact: NEEDS OWNER INPUT
- On-call escalation route: NEEDS OWNER INPUT
- Release approver: NEEDS OWNER INPUT
- Runbook and incident ticket locations: NEEDS OWNER INPUT

Verify that the responsible people can access the runbooks and know how to disable credentials, restrict traffic, restore data, and roll back a release.

## 12. Evidence and sign-off table

Copy one row per test and keep the evidence sanitized.

| Check | Environment | Exact action/test | Expected result | Actual result | Evidence link / run ID | Responsible role | Status |
|---|---|---|---|---|---|---|---|
| Deployed commit and health | Staging | Record SHA and health check | Intended SHA; healthy | NOT RECORDED | NEEDS OWNER INPUT | Deployment engineer | NOT TESTED |
| Identity and token validation | Staging | Valid/invalid/revoked token tests | Correct accept/reject | NOT RECORDED | NEEDS OWNER INPUT | Identity engineer | NOT TESTED |
| Key custody and rotation | Staging | Review manager and rotate test key | Least privilege; rotation works | NOT RECORDED | NEEDS OWNER INPUT | Security/platform engineer | NOT TESTED |
| Tenant isolation | Staging | Cross-tenant negative tests | All unauthorized requests denied | NOT RECORDED | NEEDS OWNER INPUT | Application/security engineer | NOT TESTED |
| DB network and least privilege | Staging | Connection/role/network review | Restricted and least privilege | NOT RECORDED | NEEDS OWNER INPUT | Database/cloud engineer | NOT TESTED |
| SQL/graph operations | Staging | Supported smoke suite | Correct and bounded results | NOT RECORDED | NEEDS OWNER INPUT | Application engineer | NOT TESTED |
| MCP/agent policy | Staging | Authorized and denied tool calls | No bypass | NOT RECORDED | NEEDS OWNER INPUT | AI/platform engineer | NOT TESTED |
| Alerts and redaction | Staging | Test alert and inspect logs | Alert delivered; no secrets | NOT RECORDED | NEEDS OWNER INPUT | SRE/security engineer | NOT TESTED |
| Production backup restore | Recovery environment | Restore latest approved backup | Meets RPO/RTO | NOT RECORDED | NEEDS OWNER INPUT | Database/DevOps engineer | NOT TESTED |
| Rollback drill | Staging | Run rollback runbook | Service recovers safely | NOT RECORDED | NEEDS OWNER INPUT | Release/DevOps engineer | NOT TESTED |
| Production smoke checks | Production | Approved non-destructive probes | Healthy and monitored | NOT RECORDED | NEEDS OWNER INPUT | Service owner | NOT TESTED |

Do not change a status to `PASS` until the evidence link, environment, result, and responsible role are recorded.

## What I Need to Do as the Project Owner

1. **Identify your operator.** Ask who controls the cloud account, deployment pipeline, production database, identity provider, and monitoring. If that is you, use the relevant provider consoles; otherwise assign the steps to the authorized engineer.
2. **Ask them to fill in Section 0.** They should give you service names and evidence links, not passwords or secret values.
3. **Ask for a staging verification session.** Have the engineer walk through Sections 1–8 and 10 with test data. Require a row in the evidence table for every check.
4. **Ask for a real restore drill.** Specifically request the last successful production backup, an isolated restore, measured recovery time, and the evidence that the restored data is usable.
5. **Ask for a rollback drill.** It must be demonstrated in staging, with the runbook and result linked.
6. **Review failures.** A red or blocked result means the relevant owner must fix the problem and repeat the test. Do not approve production based on a verbal “it should work.”
7. **Approve a production change window.** Only after staging, restore, alerting, and rollback evidence is reviewed should the authorized release approver decide whether to deploy.
8. **Keep repository visibility unchanged for now.** This checklist does not change GitHub visibility. After the currently required workflows reach terminal states, you can handle the visibility change separately as planned.

### Production readiness decision

**Current status: BLOCKED / NOT YET VERIFIED IN THE REAL ENVIRONMENT.** The development CI has passed automated production-readiness and backup/recovery checks, but this checklist contains no fabricated production evidence. Change this status only after the real environment's required evidence is recorded and the authorized owner signs off.
