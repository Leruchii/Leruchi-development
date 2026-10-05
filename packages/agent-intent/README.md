# VibeDB Agent Intent v1

Agent Intent is a closed, provider-neutral admission and routing envelope around one canonical VibeDB IR.

It does not replace Query IR, Retrieval IR, Context IR or Mutation IR. It gives agents and future LLM adapters one machine-readable contract for declaring which canonical VibeDB operation they intend to perform.

Stage 27 is **non-executing**. Intent explanation deterministically returns required capabilities, read/write/destructive/idempotent semantics, approval requirements and a canonical intent hash.

Natural-language interpretation is not an authorization boundary and is not implemented in this stage.

## Flow

Agent / future LLM adapter
→ Agent Intent
→ trusted ExecutionContext preflight
→ canonical target IR validation
→ bounded intent explanation
→ no execution

Future execution must continue through the existing Query/Retrieval/Context/Mutation boundaries; Agent Intent must never become a second executor.
