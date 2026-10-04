# VibePlatform AI Engineering Constitution — UI Rules

## UI Engineering Rules

The VibePlatform dashboard and Graph Studio use:

- Next.js
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Base UI
- lucide-react
- React Hook Form
- Zod
- Sonner for toast notifications

Base UI is the primitive layer.

Radix UI is NOT permitted in VibePlatform UI code.

The project must use the VibePlatform vibe-ui skill whenever implementing, modifying, reviewing, or testing UI.

## 1. UI is a System, Not Page-by-Page Styling

Do not invent visual styling independently for individual pages.

Every page must use the shared:

- design tokens
- page layouts
- app shell
- UI primitives
- UI patterns
- spacing rules
- typography rules
- accessibility rules
- loading/empty/error states

Build reusable patterns once and compose pages from them.

Preferred shared patterns include:

- PageHeader
- PageContainer
- PageSection
- MetricCard
- FilterBar
- CommandMenu
- CodeBlock
- EmptyState
- DataTable
- ShimmeringLoader

## 2. Colour Rules

Never hard-code colours in components.

Never use:

- hex colours
- RGB colours
- HSL colours
- Tailwind palette colours such as `bg-blue-500`
- arbitrary colour values

Use VibePlatform semantic tokens.

Approved examples:

- `bg-background`
- `bg-card`
- `bg-popover`
- `bg-muted`
- `bg-accent`
- `text-foreground`
- `text-muted-foreground`
- `text-foreground-lighter`
- `border-border`
- `border-border-control`
- `ring-ring`
- `bg-primary-solid`
- `text-primary-solid-foreground`
- `text-primary`
- `text-warning`
- `text-info`
- `bg-destructive`

Colour changes must be made through the VibePlatform token system.

Do not modify component colours to compensate for a token problem.

## 3. Token Rules

The design system is based on semantic OKLCH tokens.

The primary branding control is:

`--hue`

The default hue is currently 250.

The hue is a placeholder and may be changed centrally.

Do not redesign individual component colours when rebranding.

The token system controls:

- surface
- foreground
- muted foreground
- tertiary foreground
- card
- popover
- borders
- primary
- destructive
- warning
- info
- focus ring
- elevation

Elevation is primarily represented through lightness rather than heavy shadows.

## 4. Density Rules

Use the established VibePlatform density system.

Tables:

- 28px row height

Inputs:

- 28px small
- 40px default
- 44px large

Buttons:

- h-9 compact
- h-10 default
- h-11 large

Radii:

- 4px small
- 8px large
- 16px extra large

Icons:

- 12px
- 16px
- 18px

Spacing:

- 4px
- 8px
- 16px
- 32px
- 64px

Typography:

- Inter for interface text
- Source Code Pro or equivalent monospace for code, IDs and keys

Do not invent arbitrary spacing unless it is explicitly part of an approved layout constant.

## 5. Layout Rules

Every page must be classified as exactly one of:

### Type A — Settings/Form

Use for:

- project settings
- API keys
- JWT configuration
- auth providers
- billing
- database settings

Use PageLayout and PageSection.

Default maximum width:

1200px.

Use the established 4/8 column relationship.

### Type B — Data

Use for:

- users
- storage
- logs
- policy lists
- project data

Structure:

- Page header
- Optional tabs
- Filter bar
- Primary action
- Table
- Pagination/infinite scroll

Tables use 28px rows and sticky headers.

Small record details should generally open in a side sheet rather than navigating away.

### Type C — Canvas

Use for:

- Graph Explorer
- Traversal Builder
- SQL Editor
- Table Editor
- Policy Tester
- other workspace-style editors

Canvas pages must not use a normal page container.

They fill the available height.

Default panel proportions:

- list: 20%
- canvas: 55%
- inspector: 25%

Use:

`ResizablePanelGroup orientation="horizontal"`

Never use `direction`.

## 6. App Shell

Every signed-in VibePlatform page uses the shared application shell.

Structure:

- Skip link
- Optional banner
- Header
- Icon rail
- Section sidebar
- Main content
- Optional right panel

The shell:

- occupies the viewport
- does not scroll
- allows the main content to scroll independently

The main content must have:

`id="main"`

The skip link must be the first focusable element.

The right panel is optional and may contain:

- assistant
- inspector
- logs

Below the xl breakpoint it may become an overlay.

## 7. Container Rules

Use Tailwind v4 container queries.

Do not design pages exclusively around viewport breakpoints.

Approved container sizes:

- small: 768px
- default: 1200px
- large: 1600px
- full: unrestricted

Approved horizontal padding:

- `px-4`
- `@lg:px-6`
- `@xl:px-10`

Use:

`@container`

on page wrappers.

## 8. Base UI Rules

Never introduce Radix code.

Forbidden:

- `@radix-ui/*`
- `radix-ui`
- `@base-ui-components/react`
- `asChild`
- Radix `data-[state=...]`
- Radix CSS variables

Use:

- `@base-ui/react`
- `render`
- Base UI state attributes
- Base UI CSS variables
- Positioner
- Popup
- Backdrop
- Tab
- Panel

For non-button rendered elements, use:

`nativeButton={false}`

where required.

## 9. Base UI State Rules

Use Base UI state attributes.

Examples:

- `data-open`
- `data-closed`
- `data-popup-open`
- `data-panel-open`
- `data-checked`
- `data-unchecked`
- `data-active`
- `data-starting-style`
- `data-ending-style`
- `data-highlighted`

Do not use Radix state selectors.

## 10. Popup Rules

Base UI popups must use the appropriate positioning structure.

Do not copy Radix popup structure blindly.

For popovers, menus and similar components, use:

- Portal
- Positioner
- Popup

Positioning properties such as:

- side
- align
- sideOffset

belong on the Positioner.

## 11. Accessibility

Every page must support:

- keyboard navigation
- visible focus
- skip navigation
- focus restoration
- screen-reader labels
- accessible tables
- accessible icon-only buttons
- status information that does not depend solely on colour

Icon-only buttons require:

`aria-label`

Tables require a caption or appropriate aria-label.

Dialogs must restore focus to their trigger.

## 12. UI States

Every meaningful UI must account for:

### Loading

Use a skeleton matching the final geometry.

Do not use a bare full-page spinner.

### Empty

Provide:

- icon
- concise explanation
- primary action
- documentation link where useful

### Error

Provide:

- what failed
- request ID where available
- retry action

Never display raw stack traces to users.

### Truncated

Graph and data views must clearly indicate when result limits have been reached.

## 13. Graph UI Rules

Graph Explorer is a Type C canvas.

It contains:

### Left

- labels
- edge types
- counts
- search

### Centre

- graph canvas
- zoom
- fit
- layout
- depth control

### Right

- selected node/edge inspector
- properties
- ID
- expand neighbours

Always show the row/result cap.

Default graph result cap:

Maximum:

Depth must remain bounded.

The current UI guide specifies a default depth of 2 for the Graph Explorer presentation and an architecture-level maximum of 6; implementation must follow the validated backend contract rather than silently changing these limits.

## 14. Traversal Builder Rules

Traversal Builder is Type C.

Left:

- start node
- edge
- direction
- depth range
- target label

Centre:

- result table
- graph preview

Right:

- compiled query
- JSON traversal specification
- copy controls

Compiled query and traversal specification are read-only.

Normal users must never receive a free-text Cypher editor.

Clients send a structured traversal specification.

The backend owns compilation.

## 15. Policy Tester Rules

Policy Tester is Type C.

Left:

- role selection
- JWT claims

Centre:

- request execution
- visible rows
- hidden rows

Right:

- policies that applied
- matching policy clause

Clearly explain that service_role bypasses RLS.

Never imply that Policy Tester can safely emulate service-role RLS behaviour.

## 16. UI Audit Is Mandatory

Before considering UI work complete, run:

`scripts/audit-baseui.sh src`

The audit must exit successfully.

Error findings include:

- Radix imports
- asChild
- Radix state selectors
- Radix CSS variables
- deprecated Base UI package
- delayDuration
- incorrect resizable direction
- incorrect checkbox indeterminate usage

Warnings must also be reviewed.

Do not increase existing UI lint violations.

The preferred ratchet direction is:

current violations <= previous violations

Never allow a UI change to increase technical debt without explicit approval.

## 17. UI Testing

Every UI implementation must be checked at:

- 360px
- 768px
- 1440px

and in:

- dark theme
- light theme

For interactive components verify:

- Keyboard-only operation
- Focus visibility
- Focus restoration
- Correct open/close behaviour
- Correct loading state
- Correct empty state
- Correct error state
- Correct responsive behaviour
- Correct semantic tokens
- Base UI audit

## 18. Source of Truth

When UI instructions conflict:

1. Repository implementation and tests
2. Current VibePlatform UI skill
3. VibePlatform knowledge base
4. Approved architecture decisions
5. This constitution
6. General framework knowledge

Do not silently invent a solution when VibePlatform-specific guidance is missing.

Mark the issue as an architectural or UI decision requiring validation.

## 19. Do Not Overbuild

Do not introduce a new:

- component library
- primitive library
- styling system
- colour system
- layout system
- graph canvas library

without an explicit architecture decision or spike.

Use the existing VibePlatform system first.

## 20. Definition of Done for UI

A UI feature is not complete merely because it renders.

It is complete when:

- the correct page type is used
- shared patterns are reused
- semantic tokens are used
- no raw colours exist
- no arbitrary layout values exist outside approved constants
- no Radix code exists
- Base UI patterns are correct
- loading/empty/error states exist
- keyboard navigation works
- focus behaviour works
- light and dark themes work
- responsive layouts work
- audit-baseui.sh passes
- relevant tests pass
- documentation/knowledge is updated
