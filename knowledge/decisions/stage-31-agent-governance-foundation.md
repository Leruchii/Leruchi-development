# Stage 31A — Agent Governance Foundation

Status: IMPLEMENTED — NOT YET VALIDATED

## Decision

Leruchi Core adopts a small engine-neutral Agent Governance v1 foundation before public OSS release.

The foundation represents:
- agent identity;
- explicit owner relationship;
- bounded capabilities;
- delegation;
- mandates;
- revocation;
- deterministic allow/deny decisions.

## Why this belongs in Core

These concepts make Leruchi more useful to developers building AI-agent systems without requiring a hosted identity network. They fit the existing ExecutionContext, capability, graph authorization, Agent Intent and Agent Trace contracts.

## Security boundary

Agent Governance is a decision/data contract, not an authentication system and not an execution authority. The trusted backend remains responsible for establishing the identity and authority records. Actual authorization and execution continue through ExecutionContext, IR validation, planner and Secure Execution Engine.

Governance decisions are bounded and non-executing.

## Explicitly deferred

- DIDs and W3C Verifiable Credentials;
- blockchain or external immutable ledgers;
- global agent reputation;
- hardware-rooted agent identity;
- regulatory/legal ontology infrastructure;
- hosted Agent Passport / Compliance Graph products.

Those may become future Leruchi Cloud/Enterprise capabilities after Core contracts have evidence.

## Validation gate

Before merging:
1. focused Agent Governance tests pass;
2. adversarial capability, revocation, expiry and resource-scope tests pass;
3. architecture regression audit confirms no second execution or authorization boundary;
4. Stage 31 OSS boundary remains intact;
5. Node 24-only policy remains intact;
6. BUILD_STATE records exact evidence and the next action.
