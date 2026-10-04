# Unknowns and contradictions

## Contradictions / inconsistencies in the source
1. Build order: the numbered list puts Graph Studio (13) after SDK, CLI and Realtime; the revised roadmap puts UI primitives, App Shell and Graph Studio before the SDK and Realtime. Decide which governs.
2. Skill naming: the first repo tree has vibe-rls; later trees use vibe-security and drop vibe-rls. Also "15 skills" vs "start with five".
3. Result cap: AGENTS UI rules section 13 leaves default/max blank; Prompt 13 says 100 / 1000.
4. Depth: UI guide default 2 and architecture maximum 6 vs Prompt 13 "bounded" with no values; backend contract not validated.
5. Realtime (Prompt 12) requires Studio behaviour but Studio is Prompt 13.
6. Original plan v1.0 vs evolved plan: it is unclear which original decisions (Supabase reuse, T1–T12, ArangoDB/SurrealDB, licensing) remain. Prompt 03 implies Supabase compatibility survives.

## Important UNKNOWN decisions
- Names/boundaries of the five planes.
- Graph canvas library (spike required).
- Query IR schema; recursive-CTE fallback rules.
- RLS design over AGE data; scoped-capability model for AI/MCP.
- Pinned versions, roles and privilege matrix.
- Brand hue (250 is a placeholder).

## Missing source material
- Evolved Architecture Plan document; original Architecture Plan v1.0.
- Base AI Engineering Constitution; build prompts 00, 02–12, 14–20.
- UI guide and vibe-ui references (tokens, page layouts, screen specs, accessibility, base-ui) and audit script.
