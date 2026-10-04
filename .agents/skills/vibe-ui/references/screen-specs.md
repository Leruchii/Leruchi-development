# Graph Studio Screen Specifications

## Graph Explorer
Type C. Three regions: 20% label/edge navigation, 55% graph canvas, 25% inspector.

Left:
- labels and edge types from Schema Catalog;
- counts only when supplied by an approved API;
- ID search.

Center:
- bounded depth control: default 2, maximum 6;
- result cap: default 100, maximum 1000;
- zoom, fit and layout controls;
- explicit truncation state when cap is reached.

Right:
- selected node/edge identity;
- label/type;
- properties returned by the Graph API;
- incoming/outgoing relationships;
- expand neighbours;
- copy ID.

## Graph Schema
Type B/Data. Schema Catalog is authoritative. Never invent labels, edges or properties.

## Traversal Builder
Type C. Left structured traversal steps; center result table/graph preview; right read-only compiled query and JSON specification.

Normal users never receive a free-form Cypher editor.

## State requirements
Every page must define loading, empty, error and success/selected states. Error state includes request ID and retry action without SQL, stack traces or credentials.
