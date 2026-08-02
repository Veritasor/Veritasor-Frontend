/**
 * Tests for motion token CSS custom properties defined in src/index.css.
 *
 * Uses parseTokens() to read the actual compiled CSS, so any accidental
 * removal or rename of a token causes a test failure.
 *
 * Coverage:
 *  - All duration tokens defined with correct values
 *  - All easing tokens defined with correct values
 *  - All distance tokens defined
 *  - ThemeSwitcher CSS class uses motion token reference (not hardcoded px/ms)
 *  - Toast animation classes reference motion token variables
 *  - @media (prefers-reduced-motion) block exists and overrides animation
 *  - The --motion-easing-exit alias equals --motion-easing-accelerate
 */

import { describe, it, expect } from 'vitest'
import { parseTokens } from '../utils/parseTokens'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cssPath = resolve(__dirname, '../index.css')
const rawCss = readFileSync(cssPath, 'utf-8')

function getRootTokens() {
  const result = parseTokens()
  const root = result.blocks.find((b) => b.selector === ':root')
  if (!root) throw new Error(':root block not found in parsed tokens')
  return root.properties
}

/* ─── Duration tokens ────────────────────────────────────────────────────── */

describe('Motion tokens — duration', () => {
  it('defines --motion-duration-none as 0ms', () => {
    expect(getRootTokens()['--motion-duration-none']).toBe('0ms')
  })

  it('defines --motion-duration-xs as 80ms', () => {
    expect(getRootTokens()['--motion-duration-xs']).toBe('80ms')
  })

  it('defines --motion-duration-sm as 140ms', () => {
    expect(getRootTokens()['--motion-duration-sm']).toBe('140ms')
  })

  it('defines --motion-duration-md as 200ms', () => {
    expect(getRootTokens()['--motion-duration-md']).toBe('200ms')
  })

  it('defines --motion-duration-lg as 280ms', () => {
    expect(getRootTokens()['--motion-duration-lg']).toBe('280ms')
  })

  it('defines --motion-duration-xl as 360ms', () => {
    expect(getRootTokens()['--motion-duration-xl']).toBe('360ms')
  })

  it('does not define durations longer than 360ms', () => {
    const tokens = getRootTokens()
    const durationTokens = Object.entries(tokens).filter(([k]) =>
      k.startsWith('--motion-duration-')
    )
    durationTokens.forEach(([name, val]) => {
      const ms = parseInt(val, 10)
      if (Number.isNaN(ms)) return // 0ms → 0, skip NaN
      expect(ms, `Token ${name} value ${val} exceeds 360ms`).toBeLessThanOrEqual(360)
    })
  })
})

/* ─── Easing tokens ──────────────────────────────────────────────────────── */

describe('Motion tokens — easing', () => {
  it('defines --motion-easing-standard as cubic-bezier(0.2, 0, 0, 1)', () => {
    expect(getRootTokens()['--motion-easing-standard']).toBe('cubic-bezier(0.2, 0, 0, 1)')
  })

  it('defines --motion-easing-decelerate as cubic-bezier(0.0, 0, 0.2, 1)', () => {
    expect(getRootTokens()['--motion-easing-decelerate']).toBe('cubic-bezier(0.0, 0, 0.2, 1)')
  })

  it('defines --motion-easing-accelerate as cubic-bezier(0.4, 0, 1, 1)', () => {
    expect(getRootTokens()['--motion-easing-accelerate']).toBe('cubic-bezier(0.4, 0, 1, 1)')
  })

  it('--motion-easing-exit is an alias equal to --motion-easing-accelerate', () => {
    const tokens = getRootTokens()
    expect(tokens['--motion-easing-exit']).toBe(tokens['--motion-easing-accelerate'])
  })

  it('defines --motion-easing-linear as linear', () => {
    expect(getRootTokens()['--motion-easing-linear']).toBe('linear')
  })

  it('defines --motion-easing-spring as cubic-bezier(0.34, 1.56, 0.64, 1)', () => {
    expect(getRootTokens()['--motion-easing-spring']).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
  })
})

/* ─── Distance tokens ────────────────────────────────────────────────────── */

describe('Motion tokens — distance', () => {
  it('defines --motion-distance-xs as 4px', () => {
    expect(getRootTokens()['--motion-distance-xs']).toBe('4px')
  })

  it('defines --motion-distance-sm as 8px', () => {
    expect(getRootTokens()['--motion-distance-sm']).toBe('8px')
  })

  it('defines --motion-distance-md as 16px', () => {
    expect(getRootTokens()['--motion-distance-md']).toBe('16px')
  })

  it('does not define distance tokens larger than 16px', () => {
    const tokens = getRootTokens()
    const distanceTokens = Object.entries(tokens).filter(([k]) =>
      k.startsWith('--motion-distance-')
    )
    distanceTokens.forEach(([name, val]) => {
      const px = parseInt(val, 10)
      expect(px, `Token ${name} value ${val} exceeds 16px`).toBeLessThanOrEqual(16)
    })
  })
})

/* ─── ThemeSwitcher CSS — uses motion tokens not raw values ─────────────── */

describe('ThemeSwitcher CSS — motion token adoption', () => {
  it('.theme-option transition references --motion-duration-xs', () => {
    // Find the .theme-option rule block
    const ruleMatch = rawCss.match(/\.theme-option\s*\{([^}]*)\}/)
    expect(ruleMatch, '.theme-option rule not found').not.toBeNull()
    const ruleBody = ruleMatch![1]
    expect(ruleBody).toContain('--motion-duration-xs')
  })

  it('.theme-option transition references --motion-easing-standard', () => {
    const ruleMatch = rawCss.match(/\.theme-option\s*\{([^}]*)\}/)
    expect(ruleMatch, '.theme-option rule not found').not.toBeNull()
    const ruleBody = ruleMatch![1]
    expect(ruleBody).toContain('--motion-easing-standard')
  })

  it('.theme-option does not use a hardcoded 120ms duration', () => {
    const ruleMatch = rawCss.match(/\.theme-option\s*\{([^}]*)\}/)
    expect(ruleMatch, '.theme-option rule not found').not.toBeNull()
    const ruleBody = ruleMatch![1]
    expect(ruleBody).not.toContain('120ms')
  })

  it('.theme-option does not use bare "ease" keyword for its transition', () => {
    const ruleMatch = rawCss.match(/\.theme-option\s*\{([^}]*)\}/)
    expect(ruleMatch, '.theme-option rule not found').not.toBeNull()
    const ruleBody = ruleMatch![1]
    // Must not be "ease" alone — must come through a var reference
    const transitionLine = ruleBody.match(/transition:[^;]+;/)?.[0] ?? ''
    // "ease" as a bare keyword (not inside "ease-in", "ease-out", "cubic-bezier")
    expect(transitionLine).not.toMatch(/\bease\b(?!-in|-out|-in-out|[\w-])/)
  })
})

/* ─── Toast animation CSS — uses motion token variables ─────────────────── */

describe('Toast animation CSS — motion token adoption', () => {
  it('.toast-entering animation references --motion-duration-lg', () => {
    expect(rawCss).toContain('animation: toast-enter var(--motion-duration-lg)')
  })

  it('.toast-entering uses --motion-easing-spring', () => {
    expect(rawCss).toContain('var(--motion-easing-spring)')
  })

  it('.toast-exiting animation references --motion-duration-sm', () => {
    expect(rawCss).toContain('animation: toast-exit var(--motion-duration-sm)')
  })

  it('.toast-exiting uses --motion-easing-exit (or accelerate)', () => {
    // Either the alias or the canonical name is acceptable
    const usesAlias = rawCss.includes('var(--motion-easing-exit)')
    const usesCanonical = rawCss.includes('var(--motion-easing-accelerate)')
    expect(usesAlias || usesCanonical).toBe(true)
  })

  it('toast-enter keyframe uses --motion-distance-md for translateX', () => {
    expect(rawCss).toContain('var(--motion-distance-md)')
  })

  it('toast-enter keyframe uses --motion-distance-xs for overshoot', () => {
    expect(rawCss).toContain('var(--motion-distance-xs)')
  })
})

/* ─── prefers-reduced-motion override ───────────────────────────────────── */

describe('Motion CSS — prefers-reduced-motion override', () => {
  it('has a @media (prefers-reduced-motion: reduce) block', () => {
    expect(rawCss).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('reduced-motion toast-entering uses --motion-duration-xs (fade-only)', () => {
    // After the media query, the override should use xs duration
    const reducedBlock = rawCss.slice(rawCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedBlock).toContain('--motion-duration-xs')
  })

  it('reduced-motion toast enter keyframe contains only opacity, no transform', () => {
    // The reduced-motion block redefines @keyframes toast-enter later in the
    // file — take the LAST definition (the one inside the media query). The
    // body is matched with balanced, non-nested braces so the match stops at
    // the keyframe's end instead of swallowing the rest of the stylesheet.
    const kfMatches = rawCss.match(/@keyframes toast-enter\s*\{((?:[^{}]*\{[^{}]*\})+\s*)\}/g) ?? []
    const reducedKf = kfMatches[kfMatches.length - 1]
    expect(reducedKf, 'No reduced-motion toast-enter keyframe found').toBeDefined()
    expect(reducedKf).toContain('opacity')
    // The reduced-motion version must NOT add transform
    const stopRules = reducedKf.match(/\d+%\s*\{[^}]*\}/g) ?? []
    for (const rule of stopRules) {
      expect(rule, `Stop rule contains transform: ${rule}`).not.toContain('transform')
    }
  })

  it('skeleton animation falls back to pulse under reduced motion', () => {
    const reducedBlock = rawCss.slice(rawCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedBlock).toContain('pulse')
  })
})

/* ─── Reduced-motion fallback spec (docs/uiux/reduced-motion-fallback-spec.md) ── */

describe('Reduced-motion fallback spec — modal', () => {
  it('modal-in keyframe uses --motion-duration-md for default entrance', () => {
    expect(rawCss).toContain('animation: modal-in var(--motion-duration-md)')
  })

  it('modal-in keyframe animates opacity and a scale', () => {
    const kfMatch = rawCss.match(/@keyframes modal-in\s*\{((?:[^}]*}\s*[^}]*)+)\}/)
    expect(kfMatch, 'modal-in keyframe not found').not.toBeNull()
    expect(kfMatch![0]).toContain('opacity')
    expect(kfMatch![0]).toContain('scale')
  })

  it('reduced-motion modal-in collapses to opacity-only at --motion-duration-xs', () => {
    // The reduced-motion block redefines the keyframe — extract the LAST
    // @keyframes modal-in (the one inside the media query) using balanced,
    // non-nested braces so the match stops at the keyframe's end.
    const kfMatches = rawCss.match(/@keyframes modal-in\s*\{((?:[^{}]*\{[^{}]*\})+\s*)\}/g) ?? []
    const reducedKf = kfMatches[kfMatches.length - 1]
    expect(reducedKf, 'reduced-motion modal-in keyframe not found').toBeDefined()
    // from/to stops must only animate opacity — no transform/scale
    const stopRules = reducedKf.match(/(?:from|to)\s*\{[^{}]*\}/g) ?? []
    expect(stopRules.length).toBeGreaterThan(0)
    for (const rule of stopRules) {
      expect(rule).not.toContain('transform')
      expect(rule).not.toContain('scale')
      expect(rule).toContain('opacity')
    }
    // Reduced-motion modal rules run at --motion-duration-xs
    const reducedSection = rawCss.slice(rawCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedSection).toContain('animation: modal-in var(--motion-duration-xs) ease both;')
  })
})

describe('Reduced-motion fallback spec — progress (wizard + attestation)', () => {
  it('wizard-progress-item transition uses --motion-duration-md', () => {
    const ruleMatch = rawCss.match(/\.wizard-progress-item\s*\{([^}]*)\}/g) ?? []
    const transitionRule = ruleMatch.find((r) => r.includes('transition:'))
    expect(transitionRule, '.wizard-progress-item transition rule not found').toBeDefined()
    expect(transitionRule!).toContain('--motion-duration-md')
  })

  it('reduced-motion disables wizard-progress transitions and marker scale', () => {
    const reducedBlock = rawCss.slice(rawCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    const wizardOverride = reducedBlock.match(/\.wizard-progress-item,\s*\.wizard-progress-marker\s*\{([^}]*)\}/)
    expect(wizardOverride, 'wizard reduced-motion override not found').not.toBeNull()
    expect(wizardOverride![1]).toContain('transition: none')
    expect(reducedBlock).toContain('.wizard-progress-item.is-current .wizard-progress-marker')
    expect(reducedBlock).toContain('transform: none')
  })

  it('ap-step-panel transition uses --motion-duration-md and standard easing', () => {
    const ruleMatch = rawCss.match(/\.ap-step-panel\s*\{([^}]*)\}/)
    expect(ruleMatch, '.ap-step-panel rule not found').not.toBeNull()
    expect(ruleMatch![1]).toContain('--motion-duration-md')
    expect(ruleMatch![1]).toContain('--motion-easing-standard')
  })

  it('reduced-motion disables attestation progress transitions', () => {
    const reducedBlock = rawCss.slice(rawCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    const apOverride = reducedBlock.match(/\.ap-step,\s*\.ap-step-panel,\s*\.ap-chevron\s*\{([^}]*)\}/)
    expect(apOverride, 'attestation progress reduced-motion override not found').not.toBeNull()
    expect(apOverride![1]).toContain('transition: none')
  })
})

/* ─── Token naming convention ────────────────────────────────────────────── */

describe('Motion tokens — naming convention', () => {
  it('all motion tokens follow --motion-{category}-{scale} naming', () => {
    const tokens = getRootTokens()
    const motionTokens = Object.keys(tokens).filter((k) => k.startsWith('--motion-'))
    expect(motionTokens.length).toBeGreaterThanOrEqual(12)

    motionTokens.forEach((name) => {
      // Pattern: --motion-{word}-{word}
      expect(name).toMatch(/^--motion-[a-z]+-[a-z]+$/)
    })
  })

  it('all six easing tokens are present in :root', () => {
    const tokens = getRootTokens()
    const easingTokens = Object.keys(tokens).filter((k) =>
      k.startsWith('--motion-easing-')
    )
    expect(easingTokens).toContain('--motion-easing-standard')
    expect(easingTokens).toContain('--motion-easing-decelerate')
    expect(easingTokens).toContain('--motion-easing-accelerate')
    expect(easingTokens).toContain('--motion-easing-exit')
    expect(easingTokens).toContain('--motion-easing-linear')
    expect(easingTokens).toContain('--motion-easing-spring')
  })
})
