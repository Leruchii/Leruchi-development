# Vibe Query Planner

The planner is the engine-selection boundary between validated Vibe Query IR and a compiler.

It keeps the public query contract engine-neutral. A deployment registers the engines and capabilities it actually supports; the planner selects the preferred compatible engine or a declared fallback.

The planner does not compile SQL/Cypher, authorize tenants, or execute queries. Those responsibilities remain with the existing validation, compiler and Secure Execution Engine boundaries.
