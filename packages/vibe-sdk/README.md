# @leruchi/sdk

The Leruchi JavaScript SDK exposes Leruchi graph intent without exposing Apache AGE, Cypher, SQL, database credentials, or tenant identifiers.

## Contract

The SDK:
- builds Query IR v1 and Mutation IR v1;
- keeps parameter values separate from IR;
- rejects unsafe identifiers and unsupported operators client-side;
- caps client-side depth at 6 and results at 1000;
- sends authenticated requests through an injectable transport;
- does not decide authorization or tenant identity.

The server remains authoritative for Schema Catalog validation, capabilities, RLS, cost controls and execution.

## Example

```js
import { createClient } from "@leruchi/sdk";

const client = createClient({ baseUrl: "https://api.example", token: process.env.LERUCHI_TOKEN });

const result = await vibe
  .graph("vibe_security")
  .query("Account")
  .select(["name"])
  .eq("name", "Alice")
  .limit(25)
  .execute();

const created = await vibe
  .graph("vibe_security")
  .createVertex("Account", { name: "Alice" })
  .execute();
```

For explicit typed parameter binding:

```js
const query = client.graph("vibe_security").query("Account")
  .select(["name"])
  .eq("name", { param: "name" });

query.bind("name", "string", "Alice");
await query.execute();
```

The default HTTP transport uses `POST /v1/graph/query` and `POST /v1/graph/mutations`. These routes are an SDK transport contract; a production server implementation is validated by the API/Graph API stage, not by this SDK stage.


## Retrieval

The SDK exposes the same engine-neutral Retrieval IR used by the Graph API and MCP:

```js
const result = await client.retrieval()
  .graph(query.build().ir, { identityField: "id", candidateLimit: 50 })
  .vector({
    catalogRef: "documents.embedding",
    queryParameter: "embedding",
    topK: 20,
    identityField: "id"
  })
  .fusion({ vectorWeight: 1, graphWeight: 1 })
  .limits({ maxResults: 20, maxCost: 40 })
  .bind("embedding", "vector", [0.1, 0.2, 0.3])
  .execute();
```

The SDK validates the Retrieval IR shape before transport, but the server remains authoritative for capabilities, tenant identity, Schema Catalog access, RLS, cost controls, planning and execution. Retrieval results expose only the engine-neutral retrieval mode plus bounded fusion/limit metadata; physical engine names, SQL/Cypher, tenant identifiers, embeddings and credentials are not part of the public contract.
