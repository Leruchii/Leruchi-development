# Product Naming Review — Leruchi

Status: **BLOCKED FOR PUBLIC BRAND LOCK — OWNER/COUNSEL DECISION REQUIRED**
Review date: 2026-10-09

## Decision

Keep `Leruchi` as an internal engineering identifier only while the naming decision is unresolved. Do not treat it as a cleared, defensible public product brand and do not publish the OSS release under that brand until formal clearance is documented.

The available engineering research records direct collision/discoverability concerns, including reported database-related uses of Leruchi/vibeDB, references to `leruchi.dev` and `leruchi.me`, and overlapping developer/database projects. These reports are signals of risk, not legal findings. Search-engine results and package-name checks cannot establish trademark rights or freedom to operate.

## Screening performed / limits

- Reviewed the existing engineering naming review and the candidate's references to database-related uses and overlapping package/project namespaces.
- Public web search did not return authoritative, complete trademark clearance for the intended launch markets.
- Search-engine results are not a substitute for official trademark-register searches. No claim is made that a trademark is available or unavailable.
- Domain search snippets and third-party checkers are not a reservation or registrar confirmation. No domain purchase or registration has been performed.
- npm package availability is separate from trademark rights and from availability on PyPI, GitHub, MCP directories, container registries and other ecosystems.

## Required resolution before public release

1. Search official trademark registers for the intended launch markets, including confusingly similar marks in software, database, developer-tool and infrastructure classes; have qualified counsel assess relevant goods/services and risk.
2. Confirm the intended domains at an accredited registrar and evaluate confusingly similar domains/handles.
3. Check exact and similar names in npm (including scoped names), PyPI, GitHub organizations/repositories, MCP directories, Docker/OCI registries and relevant package indexes.
4. Record source URLs, date, search terms, jurisdiction/classes and counsel's disposition in this decision.
5. If counsel cannot clear Leruchi, choose a more distinctive candidate and complete a controlled migration before public publication. Do not do blind global replacement: map command names, package IDs, URLs, environment variables, container/image names, telemetry, API metadata, docs, examples, migrations and legacy aliases.
6. Rebuild and audit the exact release artifact after any rename.

## Engineering recommendation

Given the recorded direct-name collision signals, the safer recommendation is **prepare to rename before public OSS publication rather than assuming Leruchi is clear**. Do not select a replacement solely from a quick web search. A shortlist must undergo the same trademark/domain/package/namespace checks and be approved before it becomes canonical.

## Gate

Public brand lock and release remain blocked until a documented keep/rename decision is supported by authoritative register searches, namespace checks and appropriate legal review. This record is an engineering risk assessment, not legal advice or a trademark opinion.
