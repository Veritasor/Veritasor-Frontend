import type { ThemeVersion } from './types'

/**
 * "Veritasor Classic v1.0" — the older design-system release.
 *
 * Intentionally includes a few tokens that were later retired (e.g.
 * `--accent-warm-strong`, `--density-comfortable-padding`) so the diff
 * viewer can demonstrate the `removed` state.
 */
export const VERSION_A: ThemeVersion = {
  id: 'classic-v1',
  name: 'Veritasor Classic v1.0',
  description:
    'First stable design-system release. Established the dark-first palette and the original comfort/compact density scheme.',
  releasedAt: '2025-01-15',
  tokens: [
    // ── Background & surfaces
    { name: '--bg', value: '#07111f', category: 'background', cssType: 'color' },
    { name: '--surface', value: 'rgba(11, 22, 39, 0.82)', category: 'background', cssType: 'color' },
    { name: '--surface-strong', value: '#0f1b30', category: 'background', cssType: 'color' },
    { name: '--surface-soft', value: 'rgba(148, 163, 184, 0.1)', category: 'background', cssType: 'color' },

    // ── Borders
    { name: '--border', value: 'rgba(148, 163, 184, 0.2)', category: 'border', cssType: 'color' },
    { name: '--border-strong', value: 'rgba(96, 165, 250, 0.4)', category: 'border', cssType: 'color' },

    // ── Text
    { name: '--text', value: '#f8fbff', category: 'text', cssType: 'color' },
    { name: '--muted', value: '#adc0d9', category: 'text', cssType: 'color' },

    // ── Accent
    { name: '--accent', value: '#5eead4', category: 'accent', cssType: 'color' },
    { name: '--accent-strong', value: '#2dd4bf', category: 'accent', cssType: 'color' },
    { name: '--accent-warm', value: '#f59e0b', category: 'accent', cssType: 'color' },
    { name: '--accent-warm-strong', value: '#b45309', category: 'accent', cssType: 'color' },

    // ── Status
    { name: '--danger', value: '#fb7185', category: 'status', cssType: 'color' },
    { name: '--danger-soft', value: 'rgba(251, 113, 133, 0.14)', category: 'status', cssType: 'color' },
    { name: '--success', value: '#34d399', category: 'status', cssType: 'color' },
    { name: '--warning', value: '#fbbf24', category: 'status', cssType: 'color' },

    // ── Spacing
    { name: '--space-1', value: '0.25rem', category: 'spacing', cssType: 'length' },
    { name: '--space-2', value: '0.5rem', category: 'spacing', cssType: 'length' },
    { name: '--space-3', value: '0.75rem', category: 'spacing', cssType: 'length' },
    { name: '--space-4', value: '1rem', category: 'spacing', cssType: 'length' },
    { name: '--space-6', value: '1.5rem', category: 'spacing', cssType: 'length' },
    { name: '--space-8', value: '2rem', category: 'spacing', cssType: 'length' },

    // ── Typography
    { name: '--text-xs', value: '0.75rem', category: 'typography', cssType: 'length' },
    { name: '--text-sm', value: '0.85rem', category: 'typography', cssType: 'length' },
    { name: '--text-base', value: '1rem', category: 'typography', cssType: 'length' },
    { name: '--leading-normal', value: '1.5', category: 'typography', cssType: 'number' },

    // ── Radius
    { name: '--radius-sm', value: '0.5rem', category: 'radius', cssType: 'length' },
    { name: '--radius-md', value: '1rem', category: 'radius', cssType: 'length' },

    // ── Density (Classic naming)
    { name: '--density-comfortable-padding', value: '1rem', category: 'density', cssType: 'length' },
    { name: '--density-comfortable-gap', value: '0.75rem', category: 'density', cssType: 'length' },
    { name: '--density-badge-font', value: '0.82rem', category: 'density', cssType: 'length' },

    // ── Shadow
    { name: '--shadow-lg', value: '0 18px 40px rgba(2, 6, 23, 0.45)', category: 'shadow', cssType: 'complex' },
  ],
}

/**
 * "Veritasor Modern v2.0" — the newer design-system release.
 *
 * Re-tunes the palette for higher contrast, adds `--focus-ring` and
 * `--shadow-glow`, normalizes the spacing scale, and replaces the
 * "comfortable" density tokens with a single `--density-padding` token.
 */
export const VERSION_B: ThemeVersion = {
  id: 'modern-v2',
  name: 'Veritasor Modern v2.0',
  description:
    'Second-generation release. Higher-contrast palette, normalized spacing scale, focus-ring and shadow-glow primitives, and a simplified density token set.',
  releasedAt: '2026-04-08',
  tokens: [
    // ── Background & surfaces
    { name: '--bg', value: '#07111f', category: 'background', cssType: 'color' },
    { name: '--surface', value: 'rgba(11, 22, 39, 0.78)', category: 'background', cssType: 'color' },
    { name: '--surface-strong', value: '#102542', category: 'background', cssType: 'color' },
    { name: '--surface-soft', value: 'rgba(148, 163, 184, 0.12)', category: 'background', cssType: 'color' },

    // ── Borders
    { name: '--border', value: 'rgba(148, 163, 184, 0.24)', category: 'border', cssType: 'color' },
    { name: '--border-strong', value: 'rgba(96, 165, 250, 0.55)', category: 'border', cssType: 'color' },

    // ── Text
    { name: '--text', value: '#ffffff', category: 'text', cssType: 'color' },
    { name: '--muted', value: '#a8c1de', category: 'text', cssType: 'color' },

    // ── Accent
    { name: '--accent', value: '#5eead4', category: 'accent', cssType: 'color' },
    { name: '--accent-strong', value: '#14b8a6', category: 'accent', cssType: 'color' },
    { name: '--accent-warm', value: '#fb923c', category: 'accent', cssType: 'color' },
    // `--accent-warm-strong` removed in v2

    // ── Status
    { name: '--danger', value: '#fb7185', category: 'status', cssType: 'color' },
    { name: '--danger-soft', value: 'rgba(251, 113, 133, 0.16)', category: 'status', cssType: 'color' },
    { name: '--success', value: '#34d399', category: 'status', cssType: 'color' },
    // `--warning` removed in v2 — moved to a new `--caution` token
    { name: '--caution', value: '#fbbf24', category: 'status', cssType: 'color' },

    // ── Spacing — normalized scale
    { name: '--space-1', value: '0.25rem', category: 'spacing', cssType: 'length' },
    { name: '--space-2', value: '0.5rem', category: 'spacing', cssType: 'length' },
    { name: '--space-3', value: '0.75rem', category: 'spacing', cssType: 'length' },
    { name: '--space-4', value: '1rem', category: 'spacing', cssType: 'length' },
    { name: '--space-6', value: '1.5rem', category: 'spacing', cssType: 'length' },
    { name: '--space-8', value: '2rem', category: 'spacing', cssType: 'length' },

    // ── Typography
    { name: '--text-xs', value: '0.78rem', category: 'typography', cssType: 'length' },
    { name: '--text-sm', value: '0.9rem', category: 'typography', cssType: 'length' },
    { name: '--text-base', value: '1rem', category: 'typography', cssType: 'length' },
    { name: '--leading-normal', value: '1.55', category: 'typography', cssType: 'number' },

    // ── Radius — increased
    { name: '--radius-sm', value: '0.75rem', category: 'radius', cssType: 'length' },
    { name: '--radius-md', value: '1.25rem', category: 'radius', cssType: 'length' },

    // ── Density (Modern naming — replaced the comfortable-* tokens)
    { name: '--density-padding', value: '1rem', category: 'density', cssType: 'length' },
    { name: '--density-gap', value: '0.75rem', category: 'density', cssType: 'length' },
    { name: '--density-badge-font', value: '0.85rem', category: 'density', cssType: 'length' },

    // ── Shadow — added glow, kept lg unchanged
    { name: '--shadow-lg', value: '0 28px 60px rgba(2, 6, 23, 0.45)', category: 'shadow', cssType: 'complex' },
    { name: '--shadow-glow', value: '0 0 24px rgba(94, 234, 212, 0.18)', category: 'shadow', cssType: 'complex' },

    // ── New focus-ring token (not present in v1)
    { name: '--focus-ring', value: '2px solid var(--accent)', category: 'border', cssType: 'complex' },
  ],
}
