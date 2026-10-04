# API contracts

- [DECIDED] All data requests go through the approved Graph API / client architecture.
- [DECIDED] Errors shown to users: human-readable failure, request ID where available, retry. Never SQL, stack traces or credentials, except on explicitly developer-facing surfaces.
- [PROPOSED] Responses indicate when result limits/truncation apply.
- [UNKNOWN] Endpoint list, auth model, pagination, error schema, versioning.
- [UNKNOWN] JavaScript SDK surface (Prompt 10) and CLI commands (Prompt 11).
