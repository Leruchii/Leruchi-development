# @vibeplatform/sdk

The Vibe JavaScript SDK exposes Vibe graph intent without exposing Apache AGE, Cypher, SQL, database credentials, or tenant identifiers.

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
import { createClient } from "@vibeplatform/sdk";

const vibe = createClient({ baseUrl: "https://api.example" });

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
const query = vibe.graph("vibe_security").query("Account")
  .select(["name"])
  .eq("name", { param: "name" });

query.bind("name", "string", "Alice");
await query.execute();
```

The default HTTP transport uses `POST /v1/graph/query` and `POST /v1/graph/mutations`. These routes are an SDK transport contract; a production server implementation is validated by the API/Graph API stage, not by this SDK stage.
