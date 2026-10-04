# Build Prompt 13 — VibePlatform Graph Studio

## Mission

Build the VibePlatform Graph Studio dashboard.

The Graph Studio is a core developer experience surface for the VibePlatform graph system.

It must make graph exploration and graph querying understandable without exposing unsafe database primitives to normal users.

## Required Context

Before implementation, read:

- AGENTS.md

- knowledge/product.md
- knowledge/architecture.md
- knowledge/database.md
- knowledge/security.md
- knowledge/graph-model.md
- knowledge/query-ir.md
- knowledge/api-contracts.md

- vibe-ui/SKILL.md
- vibe-ui/references/base-ui.md
- vibe-ui/references/tokens.md
- vibe-ui/references/page-layouts.md
- vibe-ui/references/screen-specs.md
- vibe-ui/references/accessibility.md

Inspect the existing repository before creating files.

Reuse existing UI components and patterns.

## UI Architecture

The Graph Studio uses the VibePlatform application shell.

It must contain:

- skip link
- header
- project switcher
- breadcrumbs
- command/search entry
- theme control
- account menu
- icon rail
- Graph section sidebar
- main workspace
- optional inspector/assistant panel

Canvas pages must fill the available height.

Do not place Graph Explorer inside a normal max-width page container.

## Graph Studio Areas

Implement:

- Graph Explorer
- Graph Schema
- Traversal Builder

Policy Tester may be implemented as part of the Policies area rather than Graph Studio if the existing routing architecture requires it.

## Graph Explorer

Use Type C canvas layout.

Default layout:

20% | 55% | 25%

### Left panel

Show:

- vertex labels
- edge labels/types
- counts
- search by ID

### Centre

Provide:

- graph visualization
- zoom
- fit
- layout control
- bounded depth control
- result limit

### Right panel

Show:

- selected node/edge
- ID
- label/type
- properties
- outgoing/incoming edge information
- expand neighbours
- copy ID

Always show the active result cap.

Default:

100

Maximum:

1000

When the limit is reached, show a visible truncation notice.

## Graph Schema

Provide a clear representation of:

- vertex labels
- edge labels
- relationships
- relevant properties
- counts where available

Do not invent graph metadata.

Use the Schema Catalog as the authoritative source.

## Traversal Builder

Use Type C layout.

Left:

```
Start node
↓
Edge
Direction
Depth range
Target label
↓
...
```

Centre:

- result table
- graph preview

Right:

- compiled query
- JSON traversal specification

Both the compiled query and JSON specification are read-only.

Normal users must NOT receive a free-text Cypher editor.

The client sends the structured traversal specification.

The backend owns compilation and security validation.

## Security

The Graph Studio must never contain browser-side service credentials.

All data requests must flow through the approved Graph API/client architecture.

Respect PostgreSQL RLS.

Never bypass RLS merely to simplify UI development.

The UI must not assume that hiding an item is equivalent to authorisation.

The backend remains authoritative.

## UI System

Use the vibe-ui skill.

Use only VibePlatform semantic tokens.

Do not use:

- `bg-blue-500`
- `text-gray-500`
- `border-zinc-700`
- `#ffffff`
- `#000000`

or other raw colours.

Do not introduce arbitrary spacing values.

Use the established layout constants.

Use Base UI, not Radix.

## Loading

Use skeletons matching the geometry of:

- graph canvas
- left label list
- inspector
- result table

Do not use a full-page spinner.

## Empty State

Examples:

No graph selected:

- explanatory message
- primary action to select/create a graph

No nodes:

- explanatory message
- relevant action

No traversal results:

- concise explanation
- suggestion for modifying traversal

## Error State

Show:

- human-readable failure
- request ID
- retry action

Never expose:

- SQL
- stack traces
- internal database credentials
- sensitive backend details

unless the specific developer-facing surface explicitly permits it.

## Responsive Behaviour

Test:

- 360px
- 768px
- 1440px

At smaller sizes:

- collapse the icon rail/sidebar appropriately
- preserve access to graph controls
- turn inspector into an appropriate sheet/overlay where necessary

Do not allow panels to create unusable horizontal overflow.

## Accessibility

Verify:

- keyboard navigation
- visible focus
- screen reader labels
- graph controls have accessible names
- icon-only buttons have aria-label
- dialogs/sheets restore focus
- colour is not the sole state indicator

## Graph Canvas Spike

Do not assume a graph rendering library.

If no graph library has been selected, create a small isolated spike first.

Benchmark:

- 1,000 nodes
- 3,000 edges
- dragging
- zooming
- selection
- basic layout
- frame rate
- bundle size
- mid-range mobile behaviour

Record the result in the knowledge base.

Do not silently turn a hypothesis into an architectural decision.

## Acceptance Criteria

The feature is complete only when:

- [ ] Graph Explorer works
- [ ] Graph Schema works
- [ ] Traversal Builder works
- [ ] correct Type C layouts are used
- [ ] Graph API integration works
- [ ] Schema Catalog integration works
- [ ] no free-text Cypher for normal users
- [ ] result limits are visible
- [ ] truncation is visible
- [ ] loading states exist
- [ ] empty states exist
- [ ] error states exist
- [ ] keyboard navigation works
- [ ] light theme works
- [ ] dark theme works
- [ ] 360px tested
- [ ] 768px tested
- [ ] 1440px tested
- [ ] no raw colours
- [ ] no arbitrary styling
- [ ] no Radix imports
- [ ] no asChild
- [ ] no Radix state selectors
- [ ] scripts/audit-baseui.sh src passes
- [ ] relevant tests pass
- [ ] documentation updated

Report evidence for each acceptance criterion.
