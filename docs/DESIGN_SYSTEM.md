# SysAware Design System (Luxury Noir)

## Overview
A "Premium Dark Minimalist" design system built for high-performance ML optimization tools. Focuses on deep blacks (#050505), glass-morphism, and a tiered typography pairing of "Nistha" and "Quicksand".

## Design Tokens

### Colors (mapped from `:root`)
- **Background**: `var(--color-bg-base)` (#050505) - The primary canvas color.
- **Surface**: `var(--color-bg-surface)` (#111111) - For secondary surface layers.
- **Glass**: `var(--color-bg-glass)` (rgba(255, 255, 255, 0.02)) - Primary background for cards.
- **Accent Emerald**: `var(--color-accent-emerald)` (#10B981) - Success and primary action indicator.
- **Silver**: `var(--color-text-secondary)` (#E0E0E0) - High readability body text.
- **Muted**: `var(--color-text-muted)` (#9CA3AF) - Secondary text and inactive states.

### Typography
- **Display**: "Nistha", serif - For primary headers and luxury branding.
- **Serif**: "Merriweather", serif (Italic) - For luxury subheadings and emphasis.
- **Sans**: "Quicksand", sans-serif - Primary body font for readability.
- **Mono**: "JetBrains Mono", monospace - For technical telemetry and machine IDs.

### Spacing (8pt Grid)
Tokens range from `--space-1` (4px) to `--space-12` (48px).

## Components

### Card
The foundational layout container. Implements a 24px backdrop blur and subtle white border.
- **Usage**: `import { Card } from '@/components/ui/Card';`
- **Performance**: Wrapped in `React.memo` to prevent re-renders unless props change.

### Badge
Small status indicators with semantic variants.
- **Variants**: `success`, `warning`, `error`, `neutral`.
- **Usage**: `import { Badge } from '@/components/ui/Badge';`

### DataValue
Optimized display for metric/telemetry data points.
- **Props**: `value`, `label`, `unit`, `trend`.
- **Usage**: `import { DataValue } from '@/components/ui/DataValue';`

## Accessibility Standards
- **Contrast**: All text elements must maintain WCAG AA compliance against the #050505 background.
- **Semantics**: Use `Badge` for status roles. Use `DataValue` for metric regions.
- **Interaction**: Buttons and interactive cards must have clearly defined focus states (ring-emerald/50).

## Implementation Rules
1. **No Ad-hoc Colors**: Always use Tailwind tokens (`bg-background`, `text-silver`) or CSS variables.
2. **Memoization First**: Since the backend streams SSE data at high frequency, all atomic UI components must be memoized.
3. **Class Merging**: Use the `cn()` utility from `@/lib/utils` for all conditional class logic.
