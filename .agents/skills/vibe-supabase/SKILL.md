---
name: vibe-supabase
description: Integrate and validate Supabase compatibility services around VibePlatform without weakening PostgreSQL/RLS security.
---

# Vibe Supabase Skill

Supabase services are compatibility infrastructure, not the Vibe product boundary.

## Rules

- PostgreSQL/RLS remains the authoritative security boundary.
- Reuse Supabase Auth, PostgREST, Realtime, Storage, and pooling only where they reduce duplication.
- Pin service image versions.
- Auth-issued JWTs must be cryptographically verified before their claims influence RLS.
- Never treat a client-controlled GUC as authoritative.
- Never expose service_role or other RLS-bypass credentials to clients or AI agents.
- PostgREST schemas must be explicitly allowlisted.
- Each enabled service requires executable health and security evidence.
- A container starting is not compatibility proof.
- Keep compatibility configuration separate from the core Vibe database image where practical.

## Stage 03

The core compatibility gate is:

Auth starts against Vibe PostgreSQL -> PostgREST verifies signed JWT -> verified request.jwt.claims reaches PostgreSQL -> RLS enforces tenant isolation.

Realtime, Storage, and Supavisor may remain explicit candidates until their own executable health/security tests exist.

## Workflow

1. Read AGENTS.md and relevant knowledge.
2. Inspect the Vibe database roles and RLS policies.
3. Pin compatible service versions.
4. Add the smallest compatibility configuration.
5. Add health checks.
6. Add adversarial security checks.
7. Run CI.
8. Update knowledge only with evidence.
