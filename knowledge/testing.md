# Testing

Status: VALIDATED through Stage 07 — Apache AGE Compiler

## Stage 07 executable coverage

.github/workflows/stage-07-age-compiler.yml proves:

- the VibeDB image builds and starts;
- the Stage 01 graph can be seeded;
- representative Query IR compiles into AGE prepared-statement SQL;
- declared parameters remain Cypher parameters;
- literal values are bound through generated parameters;
- malicious filter values do not appear in generated Cypher;
- malicious identifiers are rejected;
- duplicate output aliases are rejected;
- the generated one-hop query executes successfully against Apache AGE.

## Security rule

Compiler output is not an authorization boundary. Only validated IR reaches compilation in the intended architecture.

## Merge blocker

Stages 01 through 07 have executable repository/CI evidence.
