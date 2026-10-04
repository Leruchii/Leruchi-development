# Vibe UI Tokens

Use semantic tokens only. Component code must not introduce raw hex/rgb colors or Tailwind palette colors.

Approved semantic roles include:
- background: `bg-background`
- card: `bg-card`
- popover: `bg-popover`
- muted/accent: `bg-muted`, `bg-accent`
- foreground: `text-foreground`, `text-muted-foreground`, `text-foreground-lighter`
- emphasis: `text-primary`
- borders: `border-border`, `border-border-control`
- focus: `ring-ring`
- solid primary: `bg-primary-solid`, `text-primary-solid-foreground`
- status: `text-warning`, `text-info`, `bg-destructive`, `text-destructive-foreground`

Theme implementation must map these semantic roles to VibePlatform OKLCH CSS variables. Dark is the default; light is activated through the documented theme selector.

If a required treatment cannot be expressed by an existing semantic token, stop and record a token-gap decision instead of adding a local color.
