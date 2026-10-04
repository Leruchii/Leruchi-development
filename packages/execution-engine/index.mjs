import { createHash, randomUUID } from "node:crypto";
import {assertTrustedExecutionContext,postgresRequestClaims} from "../execution-context/index.mjs";

export class ExecutionError extends Error {
  constructor(code, message, details = undefined, requestId = randomUUID()) {
    super(message);
    this.name = "ExecutionError";
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
  toJSON() {
    return {
      version: "v1",
      code: this.code,
      message: this.message,
      request_id: this.requestId,
      ...(this.details === undefined ? {} : { details: this.details })
    };
  }
}

function collectParameterRefs(value, refs = new Set()) {
  if (Array.isArray(value)) value.forEach(child => collectParameterRefs(child, refs));
  else if (value && typeof value === "object") {
    if (typeof value.param === "string") refs.add(value.param);
    Object.values(value).forEach(child => collectParameterRefs(child, refs));
  }
  return refs;
}

function normalizeRows(result, columns) {
  const rows = Array.isArray(result.rows) ? result.rows : [];
  return rows.map(row => {
    if (Array.isArray(row)) {
      const output = {};
      columns.forEach((column, index) => { output[column] = parseAgtype(row[index]); });
      return output;
    }
    return Object.fromEntries(columns.map(column => [column, parseAgtype(row[column])]));
  });
}

function parseAgtype(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

export function createPgExecutor(client, context) {
  return {
    async begin() {
      assertTrustedExecutionContext(context);
      await client.query("BEGIN");
      try {
        await client.query("SELECT set_config($1, $2, true)", ["request.jwt.claims", JSON.stringify(postgresRequestClaims(context))]);
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
      }
    },
    async execute(compiled, parameterMap) {
      return this.executeBound({
        ...compiled,
        sql: compiled.sql,
        values: [JSON.stringify(parameterMap)]
      });
    },
    async executeBound(compiled) {
      const statementName = "vibe_" + createHash("sha256").update(compiled.sql).digest("hex").slice(0, 20);
      return client.query({
        name: statementName,
        text: compiled.sql,
        values: compiled.values,
        rowMode: "array"
      });
    },
    async commit() { await client.query("COMMIT"); },
    async rollback() { await client.query("ROLLBACK"); }
  };
}

export async function executeGraphQuery({
  ir,
  context,
  catalog,
  requestParameters = {},
  limits,
  validate,
  compile,
  db,
  requestId = randomUUID()
}) {
  try { assertTrustedExecutionContext(context); } catch (error) {
    throw new ExecutionError("UNTRUSTED_CONTEXT", "Trusted execution context is required", undefined, requestId);
  }

  const validation = validate(ir, context, catalog, limits);
  if (!validation.ok) {
    throw new ExecutionError("VALIDATION_FAILED", "Query validation failed", validation.errors, requestId);
  }

  const declared = new Map(ir.parameters.map(parameter => [parameter.name, parameter]));
  for (const key of Object.keys(requestParameters)) {
    if (!declared.has(key)) {
      throw new ExecutionError("UNDECLARED_PARAMETER", "Request contains an undeclared parameter", { parameter: key }, requestId);
    }
  }

  const references = collectParameterRefs(ir.filters);
  for (const parameter of references) {
    if (!Object.hasOwn(requestParameters, parameter)) {
      throw new ExecutionError("MISSING_PARAMETER", "A referenced query parameter is missing", { parameter }, requestId);
    }
  }

  for (const [name, declaration] of declared) {
    if (declaration.required && !Object.hasOwn(requestParameters, name) && !references.has(name)) {
      throw new ExecutionError("MISSING_PARAMETER", "A required query parameter is missing", { parameter: name }, requestId);
    }
  }

  const compiled = compile(ir);
  const parameterMap = { ...compiled.literalBindings, ...requestParameters };
  for (const key of Object.keys(compiled.literalBindings)) {
    if (Object.hasOwn(requestParameters, key)) {
      throw new ExecutionError("PARAMETER_COLLISION", "Request parameter collides with an internal binding", { parameter: key }, requestId);
    }
  }

  let began = false;
  try {
    await db.begin();
    began = true;
    const result = await db.execute(compiled, parameterMap);
    await db.commit();
    began = false;
    return {
      version: "v1",
      request_id: requestId,
      columns: compiled.columns,
      rows: normalizeRows(result, compiled.columns),
      count: Array.isArray(result.rows) ? result.rows.length : 0
    };
  } catch (cause) {
    if (began) {
      try { await db.rollback(); } catch {}
    }
    throw new ExecutionError("DATABASE_EXECUTION_FAILED", "Query execution failed", undefined, requestId);
  }
}
