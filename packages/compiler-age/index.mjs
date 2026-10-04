const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function identifier(value, label) {
  if (typeof value !== "string" || !IDENT.test(value)) {
    throw new Error("INVALID_IDENTIFIER:" + label);
  }
  return value;
}

function field(value) {
  if (typeof value !== "string" || value.length === 0) throw new Error("INVALID_FIELD");
  const parts = value.split(".");
  if (!parts.every(part => IDENT.test(part))) throw new Error("INVALID_FIELD");
  return parts.join(".");
}

function sqlString(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

function dollarQuote(value) {
  const tag = "$vibe_cypher$";
  if (value.includes(tag)) throw new Error("INVALID_CYPHER_DELIMITER");
  return tag + "\n" + value + "\n" + tag;
}

function valueParameter(value, bindings, state) {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "param")) {
    identifier(value.param, "parameter");
    return "$" + value.param;
  }
  const name = "__vibe_literal_" + state.literalIndex++;
  bindings[name] = value;
  return "$" + name;
}

function compileFilter(filter, bindings, state) {
  const left = field(filter.field);
  if (filter.op === "is_null") return left + " IS NULL";
  const ops = {
    eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<=", lte: "<=",
    in: "IN", contains: "CONTAINS", starts_with: "STARTS WITH"
  };
  const op = ops[filter.op];
  if (!op) throw new Error("UNSUPPORTED_FILTER:" + filter.op);
  return left + " " + op + " " + valueParameter(filter.value, bindings, state);
}

function projectionAlias(item) {
  return item.alias ?? item.field.replaceAll(".", "_");
}

export function compileAge(ir) {
  identifier(ir.graph, "graph");
  identifier(ir.root.label, "root.label");
  identifier(ir.root.alias, "root.alias");

  const bindings = {};
  const state = { literalIndex: 0 };
  let cypher = "MATCH (" + ir.root.alias + ":" + ir.root.label + ")";

  let sourceAlias = ir.root.alias;
  for (const step of ir.steps) {
    identifier(step.edge, "edge");
    identifier(step.target.label, "target.label");
    identifier(step.target.alias, "target.alias");
    if (!["out","in","both"].includes(step.direction)) throw new Error("INVALID_DIRECTION");
    if (step.direction === "out") cypher += "-[:" + step.edge + "]->";
    else if (step.direction === "in") cypher += "<-[:" + step.edge + "]-";
    else cypher += "-[:" + step.edge + "]-";
    cypher += "(" + step.target.alias + ":" + step.target.label + ")";
    sourceAlias = step.target.alias;
  }

  if (ir.filters.length) {
    cypher += "\nWHERE " + ir.filters.map(f => compileFilter(f, bindings, state)).join(" AND ");
  }

  const outputs = ir.projection.map(item => {
    const source = field(item.field);
    const alias = identifier(projectionAlias(item), "projection.alias");
    return { source, alias };
  });

  cypher += "\nRETURN " + outputs.map(o => o.source + " AS " + o.alias).join(", ");

  if (ir.orderBy.length) {
    cypher += "\nORDER BY " + ir.orderBy.map(o => field(o.field) + " " + o.direction.toUpperCase()).join(", ");
  }
  if (ir.offset > 0) cypher += "\nSKIP " + ir.offset;
  cypher += "\nLIMIT " + ir.limit;

  const aliases = new Set();
  for (const output of outputs) {
    if (aliases.has(output.alias)) throw new Error("DUPLICATE_OUTPUT_ALIAS:" + output.alias);
    aliases.add(output.alias);
  }

  const sql = "SELECT * FROM cypher(" +
    sqlString(ir.graph) + ", " +
    dollarQuote(cypher) +
    ", $1) AS (" +
    outputs.map(o => o.alias + " agtype").join(", ") +
    ");";

  return {
    engine: "apache-age",
    version: "v1",
    sql,
    cypher,
    parameterNames: ir.parameters.map(p => p.name).concat(Object.keys(bindings)),
    literalBindings: bindings,
    columns: outputs.map(o => o.alias),
    sourceAliases: [ir.root.alias, ...ir.steps.map(s => s.target.alias)]
  };
}
