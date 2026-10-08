# Stage 31 — OSS Core Readiness Gate

Status: VALIDATED — technical readiness gate passed on exact candidate code head `43b8f0eac4fcbadc3789883c7c18e2bb02a1e6ff`.

## Purpose

Stage 31 defines an executable release-readiness gate for the public Leruchi Core repository. It does not publish Core by itself.

The gate exists so the public repository is produced from an explicit allowlist rather than by copying the private development repository wholesale.

## Public contract

The public Core release may contain:

- self-hostable runtime and developer tooling;
- public SDK/CLI/REST/Graph/MCP contracts;
- Query IR, Mutation IR, Retrieval IR and planner contracts that are part of the OSS product;
- tests, migrations and public documentation required to build and use Core;
- public GitHub workflows needed to validate the OSS tree.

The public release must not contain:

- internal architecture/control documents;
- private build prompts or agent instructions;
- private product/competitive strategy;
- Cloud/Enterprise implementation or commercial operations;
- credentials, tokens, private keys or environment secrets;
- tenant-specific fixtures or private operational data.

## Release mechanics

1. Build a release candidate from the private development repository using an explicit allowlist.
2. Run the OSS readiness audit against that candidate.
3. Run the full repository regression matrix on the exact candidate source.
4. Review the generated candidate contents.
5. Publish the sanitized candidate to the public Leruchi repository only after the gate is green.
6. Tag the public release from the exact published commit.

The public repository remains separate. Internal files are never made public merely because they exist in the development repository.

## Security invariants

- No credential, token, secret, private key or tenant-specific data may enter the candidate.
- No Cloud/Enterprise dependency may become a Core runtime dependency.
- Agent/MCP features retain the same validation, authorization, RLS and approval boundaries as the private development build.
- Trace/replay remains diagnostic and non-executing.

## Exit gate

Stage 31 is VALIDATED only when:

- the release manifest and audit are executable;
- the candidate contains only explicitly allowed paths;
- forbidden private/security content is rejected;
- Node.js 20 is rejected and Node.js 24 remains the project baseline;
- public package metadata is coherent;
- the exact candidate passes the relevant product and architecture regression matrix;
- the public repository publication procedure is documented and tested without publishing;
- BUILD_STATE and BUILD_PLAN identify the next action as the OSS publication stage.

## Product naming gate

Before Stage 32 public publication, the product naming clearance review in `knowledge/decisions/product-naming-review.md` must be completed. Leruchi remains the provisional engineering name; this does not block Stage 31 technical work, but public brand lock must wait for the documented clearance decision.

## Explicit non-goal

Do not publish the public Leruchi repository during Stage 31. Publication is a separate controlled stage after this readiness gate.
## License decision

**Selected license: Apache License 2.0 (Apache-2.0).**

Apache-2.0 is the approved license for Leruchi Core's public OSS release. The repository root includes the standard Apache-2.0 LICENSE file, and the root package metadata declares the SPDX identifier `Apache-2.0`. This decision applies to the Leruchi Core OSS release boundary; private Cloud/Enterprise code remains outside that public release.

The license decision resolves the license-selection blocker. The technical Stage 31 readiness gate is validated: the candidate readiness audit passed on the exact candidate and the post-fast-forward regression matrix completed 57/57 successfully. Formal product-name clearance remains a separate blocker to public publication; this decision does not authorize publication.

