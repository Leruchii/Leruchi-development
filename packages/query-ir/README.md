# Vibe Query IR v1

Vibe Query IR is the engine-neutral contract between client intent and Vibe execution.

## Contract

The v1 graph query contains:

- version and kind;
- graph identifier;
- root label/alias;
- ordered traversal steps;
- edge direction;
- target label/alias;
- declarative filters;
- projections;
- ordering;
- limit/offset;
- depth;
- typed parameter declarations.

The IR contains no SQL, Cypher, AGE expressions, database credentials or executable fragments.

## Canonical serialization

Canonical JSON is:

1. UTF-8 encoded;
2. object keys sorted lexicographically at every nesting level;
3. arrays preserved in semantic order;
4. compact JSON with no insignificant whitespace;
5. JSON null/boolean/number/string semantics preserved by the JSON serializer.

SHA-256 of the canonical UTF-8 bytes is the reference digest.

Golden fixtures:

- person-knows: 798288f3b3fe1fceeb28d14282e43e7925febf21908faa10da01f6943fbe83dc
- two-hop: 44bc217af1729b14732600a6710f97799e4634ddab55bb9ece0f680667dda8c1

## Versioning

Breaking changes require a new IR version. Additive fields are not silently accepted by v1 because unknown fields are rejected.

## Boundary

Query IR expresses intent. Schema validation, tenant authorization, cost/depth/result guardrails, planning and engine compilation happen after this boundary.
