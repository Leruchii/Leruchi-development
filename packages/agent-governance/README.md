# Leruchi Agent Governance Core

Agent Governance v1 is a small, engine-neutral foundation for representing an AI agent's identity, ownership, delegation, scoped capabilities, mandates and revocation state.

It is deliberately **not** an identity provider, credential issuer, blockchain registry, autonomous authorization engine, or execution path.

## Contract

`createAgentIdentity()` establishes a stable application-level agent identity and owner relationship.

`createAgentMandate()` and `createDelegation()` describe bounded authority granted to an agent.

`revokeGovernanceRecord()` provides a common revocation transition.

`authorizeAgentAction()` evaluates the supplied governance records against required capabilities and an optional resource. It returns a bounded allow/deny decision and **never executes an operation or grants capabilities**.

The existing ExecutionContext, Graph API, Query/Mutation IR, planner and Secure Execution Engine remain authoritative for actual authorization and execution.

## Security boundary

Callers must not treat governance records as proof of authentication. A trusted backend must establish the identity and authority records before calling the decision helper.

No tenant identity, credential, raw SQL/Cypher, parameter values or engine details are part of this contract.
