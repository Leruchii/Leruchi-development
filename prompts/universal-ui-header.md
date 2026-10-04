# Universal VibePlatform UI Prompt Header

Put this at the top of every build prompt that could touch UI.

---

## VibePlatform UI Requirements

If this task creates, modifies, or affects user-facing UI, the implementation MUST follow the VibePlatform UI system.

Before implementation:

1. Read AGENTS.md.
2. Read the relevant VibePlatform knowledge files.
3. Load/use the vibe-ui skill.
4. Read the relevant UI references.
5. Inspect existing components and patterns before creating new ones.

The UI stack is:

- Next.js
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Base UI
- lucide-react
- React Hook Form
- Zod
- Sonner

Do not introduce Radix UI.

Do not use:

- `@radix-ui/*`
- `radix-ui`
- `@base-ui-components/react`
- `asChild`
- Radix `data-[state=...]`
- Radix CSS variables
- raw hex colours
- Tailwind palette colours
- arbitrary colour values

Use VibePlatform semantic design tokens.

Every page must use exactly one approved page type:

- Type A — Settings/Form
- Type B — Data
- Type C — Canvas

Use existing shared patterns before creating new components.

UI must support:

- loading
- empty
- error
- keyboard navigation
- visible focus
- accessibility labels
- light theme
- dark theme
- 360px
- 768px
- 1440px

Before declaring UI work complete:

`scripts/audit-baseui.sh src`

must pass.

Do not claim completion without evidence.
