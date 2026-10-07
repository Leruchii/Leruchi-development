# OWASP ASVS 5.0.0 Security Verification

Status: ACTIVE RELEASE GATE

Leruchi Core adopts the stable OWASP Application Security Verification Standard (ASVS) 5.0.0 as its application-security verification baseline. ASVS 5.0.0 is the stable release; bleeding-edge ASVS content is not used as the release contract.

## Verification posture
- Baseline: ASVS Level 2 for applicable Leruchi Core/API/MCP/SDK/CLI functionality.
- Level 3: tracked as additional high-assurance controls where the product threat model warrants them.
- A requirement is not satisfied merely because an architectural intention exists. It requires executable evidence, a reviewed security decision, or an explicit not-applicable scope decision.
- Conditional chapters become required when the corresponding web, browser, file, OAuth/OIDC or HTTP deployment surface is released.
- Security regressions are release blockers.

## Existing security foundations
Leruchi already has executable security evidence for major boundaries, including PostgreSQL RLS/tenant isolation, non-superuser runtime roles, canonical Query/Mutation IR validation, centralized secure execution, MCP capability/approval controls, audit redaction and agent governance.

These tests are evidence inputs to the ASVS mapping; they do not automatically satisfy every ASVS requirement.

## Automated gate
The verifier checks the pinned ASVS version and complete 17-chapter profile, repository credential/private-key patterns, Node.js 24-only workflow policy, and avoidance of broad contents:write workflow permissions.

The verifier is deliberately conservative. It does not mark cryptography, TLS, authentication, browser security or operational controls as passed merely from static inspection. Those require dedicated executable evidence.

## Current compliance claim
Until every applicable Level 2 requirement has mapped evidence, the correct claim is "ASVS 5.0.0-aligned / verification in progress", not full ASVS compliance.


## Stage 32 verification correction

The initial profile draft used an incorrect pre-5.0 chapter mapping. It was corrected against the official OWASP ASVS 5.0.0 requirement structure before treating the gate as evidence. The canonical chapter model now uses V1 Encoding and Sanitization, V2 Validation and Business Logic, V3 Web Frontend Security, V4 API and Web Service, V5 File Handling, V6 Authentication, V7 Session Management, V8 Authorization, V9 Self-contained Tokens, V10 OAuth and OIDC, V11 Cryptography, V12 Secure Communication, V13 Configuration, V14 Data Protection, V15 Secure Coding and Architecture, V16 Security Logging and Error Handling, and V17 WebRTC. Applicability is explicit: core API/MCP/authentication/security chapters are required; OAuth/OIDC, file handling and WebRTC remain conditional until their corresponding product surfaces are released.

The Stage 32 verifier also had a self-detection defect: its private-key regex matched its own source. That was corrected by constructing the detection signature without embedding the complete signature in the scanned source. A regression assertion now protects that behavior.
