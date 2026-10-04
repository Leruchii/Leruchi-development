---
name: vibe-ui
description: Implement, modify, review, and test VibePlatform UI (dashboard and Graph Studio) using shadcn/ui, Base UI, Tailwind CSS v4 and the VibePlatform semantic tokens, page layouts and accessibility rules. Use whenever a task creates or changes user-facing UI.
---

# VibePlatform UI Skill

## Purpose

This skill defines how to implement VibePlatform UI.

VibePlatform UI is not generic shadcn UI.

It is a specific design system built from:

- shadcn/ui
- Base UI
- Tailwind CSS v4
- VibePlatform semantic OKLCH tokens
- Supabase-inspired dense application patterns
- VibePlatform page layouts
- VibePlatform accessibility rules

Read the relevant reference files before implementing UI.

## Required Reading

For a new UI feature, determine which references apply.

### Always

Read:

- `references/tokens.md`
- `references/page-layouts.md`

### Base UI components

Read:

- `references/base-ui.md`

### Graph UI

Read:

- `references/screen-specs.md`

### Accessibility or interaction changes

Read:

- `references/accessibility.md`

## Workflow

### Step 1 — Identify the page type

Every page must be classified:

- Type A — Settings/Form
- Type B — Data
- Type C — Canvas

Do not create a new page category without an explicit decision.

### Step 2 — Identify reusable patterns

Before creating a component, check whether an existing pattern already solves the problem.

Prefer:

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

Do not duplicate an existing pattern.

### Step 3 — Check primitives

Use shadcn components backed by Base UI.

Do not import Radix.

Do not manually port Radix examples.

When shadcn can generate the correct Base UI component, prefer the generated component.

### Step 4 — Implement using semantic tokens

Never choose colours directly.

Use VibePlatform semantic utilities.

Never introduce:

- hex
- rgb
- arbitrary colours
- Tailwind palette colours

### Step 5 — Respect layout constants

Use the established page container and spacing system.

Prefer container queries.

Do not introduce arbitrary pixel values unless they are already an approved VibePlatform layout constant.

### Step 6 — Implement all states

Every meaningful component/page must consider:

- loading
- empty
- error
- success
- disabled
- selected
- truncated where relevant

### Step 7 — Accessibility

Verify:

- keyboard navigation
- focus ring
- focus restoration
- aria labels
- table accessibility
- skip navigation
- colour-independent status

### Step 8 — Run the audit

Run:

`scripts/audit-baseui.sh src`

Fix all errors.

Review warnings.

Do not mark the task complete if the audit fails.

### Step 9 — Test both themes

Verify:

- dark
- light

Do not assume token correctness means browser-rendered correctness.

### Step 10 — Test responsive behaviour

Check:

- 360px
- 768px
- 1440px

Pay particular attention to:

- sidebars
- panel resizing
- tables
- dialogs
- popovers
- command menus
- graph canvas

## Base UI Rules

Use:

```tsx
import { Dialog } from '@base-ui/react/dialog'
```

not Radix.

Use:

```tsx
<DialogTrigger render={<Button />}>
```

not:

```tsx
<DialogTrigger asChild>
```

For links rendered through button-like primitives, use:

`nativeButton={false}`

when required.

For popups use the Base UI structure:

```
Portal
  Positioner
    Popup
```

Use Base UI state attributes rather than Radix state attributes.

## Token Rules

Approved semantic utilities include:

- `bg-background`
- `bg-card`
- `bg-popover`
- `bg-muted`
- `bg-accent`

- `text-foreground`
- `text-muted-foreground`
- `text-foreground-lighter`
- `text-primary`

- `border-border`
- `border-border-control`
- `ring-ring`

- `bg-primary-solid`
- `text-primary-solid-foreground`

- `text-warning`
- `text-info`

- `bg-destructive`
- `text-destructive-foreground`

If a required visual treatment cannot be represented by existing tokens, do not invent a component-local colour.

Flag the token gap.

## Page Layout Rules

Use:

- Type A: Settings/Form
- Type B: Data
- Type C: Canvas

Use the existing page-layout reference rather than inventing page structure.

## Graph UI Rules

Graph Explorer:

- 20% list
- 55% graph
- 25% inspector

Traversal Builder:

- 20% steps
- 55% results/graph
- 25% compiled query/spec

Policy Tester:

- 20% role/claims
- 55% request/results
- 25% policy explanation

Graph query UI must never become a free-form Cypher editor for normal users.

## Completion Checklist

Before reporting completion:

- [ ] Correct page type
- [ ] Existing patterns reused
- [ ] Semantic tokens only
- [ ] No Radix imports
- [ ] No asChild
- [ ] No Radix data-[state=...]
- [ ] No deprecated Base UI package
- [ ] Correct Base UI popup structure
- [ ] Correct resizable API
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Keyboard accessible
- [ ] Focus behaviour verified
- [ ] Dark theme
- [ ] Light theme
- [ ] 360px
- [ ] 768px
- [ ] 1440px
- [ ] scripts/audit-baseui.sh src passes
- [ ] Relevant tests pass
- [ ] Documentation updated
