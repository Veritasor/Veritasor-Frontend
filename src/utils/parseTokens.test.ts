import { describe, it, expect } from 'vitest'
import {
  getVariantLabel,
  getVariantSelector,
  tokensToCss,
  type TokenBlock,
  type ThemeVariant,
} from './parseTokens'

describe('parseTokens utilities - Focused TokenBlock Coverage', () => {
  describe('TokenBlock interface behavior', () => {
    it('creates TokenBlock with valid selector and properties', () => {
      const tokenBlock: TokenBlock = {
        selector: ':root',
        properties: {
          '--color-primary': '#000000',
          '--spacing-unit': '8px'
        }
      }

      expect(tokenBlock.selector).toBe(':root')
      expect(tokenBlock.properties).toEqual({
        '--color-primary': '#000000',
        '--spacing-unit': '8px'
      })
      expect(Object.keys(tokenBlock.properties)).toHaveLength(2)
    })

    it('handles TokenBlock with empty properties object', () => {
      const tokenBlock: TokenBlock = {
        selector: '.empty',
        properties: {}
      }

      expect(tokenBlock.selector).toBe('.empty')
      expect(tokenBlock.properties).toEqual({})
      expect(Object.keys(tokenBlock.properties)).toHaveLength(0)
    })

    it('handles TokenBlock with complex selector patterns', () => {
      const complexSelectors = [
        ':root',
        '[data-theme="light"]',
        '[data-theme="dark"]',
        '[data-theme="high-contrast"]',
        '[data-density="compact"]',
        '.theme-option[data-value="light"]',
        'media (prefers-color-scheme: light)',
        '.button:hover',
        '.app-nav-link.is-active'
      ]

      complexSelectors.forEach(selector => {
        const tokenBlock: TokenBlock = {
          selector,
          properties: { '--test': 'value' }
        }
        expect(tokenBlock.selector).toBe(selector)
      })
    })

    it('handles TokenBlock with CSS custom property values', () => {
      const tokenBlock: TokenBlock = {
        selector: ':root',
        properties: {
          '--color-hex': '#ffffff',
          '--color-rgb': 'rgb(255, 255, 255)',
          '--color-rgba': 'rgba(255, 255, 255, 0.8)',
          '--size-px': '16px',
          '--size-rem': '1rem',
          '--size-percent': '100%',
          '--size-calc': 'calc(100% - 2rem)',
          '--size-clamp': 'clamp(1rem, 5vw, 3rem)',
          '--duration': '300ms',
          '--easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
          '--shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
          '--font': '"Inter", sans-serif'
        }
      }

      expect(tokenBlock.properties['--color-hex']).toBe('#ffffff')
      expect(tokenBlock.properties['--size-calc']).toBe('calc(100% - 2rem)')
      expect(tokenBlock.properties['--size-clamp']).toBe('clamp(1rem, 5vw, 3rem)')
      expect(tokenBlock.properties['--font']).toBe('"Inter", sans-serif')
    })
  })

  describe('ThemeVariant type behavior', () => {
    it('handles root variant type', () => {
      const variant: ThemeVariant = { kind: 'root' }

      expect(variant.kind).toBe('root')
      expect('theme' in variant).toBe(false)
      expect('density' in variant).toBe(false)
    })

    it('handles data-theme light variant type', () => {
      const variant: ThemeVariant = { kind: 'data-theme', theme: 'light' }

      expect(variant.kind).toBe('data-theme')
      expect(variant.theme).toBe('light')
      expect('density' in variant).toBe(false)
    })

    it('handles data-theme dark variant type', () => {
      const variant: ThemeVariant = { kind: 'data-theme', theme: 'dark' }

      expect(variant.kind).toBe('data-theme')
      expect(variant.theme).toBe('dark')
      expect('density' in variant).toBe(false)
    })

    it('handles density compact variant type', () => {
      const variant: ThemeVariant = { kind: 'density', density: 'compact' }

      expect(variant.kind).toBe('density')
      expect(variant.density).toBe('compact')
      expect('theme' in variant).toBe(false)
    })
  })

  describe('getVariantLabel() - Label generation behavior', () => {
    it('generates correct labels for all variant types', () => {
      expect(getVariantLabel({ kind: 'root' })).toBe(':root (default dark)')
      expect(getVariantLabel({ kind: 'data-theme', theme: 'light' })).toBe('[data-theme="light"]')
      expect(getVariantLabel({ kind: 'data-theme', theme: 'dark' })).toBe('[data-theme="dark"]')
      expect(getVariantLabel({ kind: 'density', density: 'compact' })).toBe('[data-density="compact"]')
    })

    it('handles variant label consistency', () => {
      const variants: ThemeVariant[] = [
        { kind: 'root' },
        { kind: 'data-theme', theme: 'light' },
        { kind: 'data-theme', theme: 'dark' },
        { kind: 'density', density: 'compact' }
      ]

      variants.forEach(variant => {
        const label = getVariantLabel(variant)
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getVariantSelector() - Selector generation behavior', () => {
    it('generates correct selectors for all variant types', () => {
      expect(getVariantSelector({ kind: 'root' })).toBe(':root')
      expect(getVariantSelector({ kind: 'data-theme', theme: 'light' })).toBe('[data-theme="light"]')
      expect(getVariantSelector({ kind: 'data-theme', theme: 'dark' })).toBe('[data-theme="dark"]')
      expect(getVariantSelector({ kind: 'density', density: 'compact' })).toBe('[data-density="compact"]')
    })

    it('ensures selector format consistency', () => {
      const variants: ThemeVariant[] = [
        { kind: 'root' },
        { kind: 'data-theme', theme: 'light' },
        { kind: 'data-theme', theme: 'dark' },
        { kind: 'density', density: 'compact' }
      ]

      variants.forEach(variant => {
        const selector = getVariantSelector(variant)
        expect(typeof selector).toBe('string')
        expect(selector.length).toBeGreaterThan(0)
        expect(selector).toMatch(/^(:root|\[[\w-]+="[\w-]+"\])$/)
      })
    })
  })
  describe('tokensToCss() - CSS generation behavior', () => {
    const mockBlocks: TokenBlock[] = [
      {
        selector: ':root',
        properties: {
          '--color-primary': '#000000',
          '--spacing-unit': '8px',
        },
      },
      {
        selector: '[data-theme="light"]',
        properties: {
          '--color-primary': '#ffffff',
        },
      },
      {
        selector: '[data-density="compact"]',
        properties: {
          '--spacing-unit': '4px',
        },
      },
    ]

    it('generates valid CSS with proper structure', () => {
      const variant: ThemeVariant = { kind: 'root' }
      const result = tokensToCss(mockBlocks, variant)

      expect(result).toContain('/*')
      expect(result).toContain('Veritasor Design Tokens — CSS Custom Properties')
      expect(result).toContain('Version: 0.1.0')
      expect(result).toContain('Exported:')
      expect(result).toContain(':root {')
      expect(result).toContain('--color-primary: #000000;')
      expect(result).toContain('--spacing-unit: 8px;')
      expect(result).toContain('}')
    })

    it('includes density variant for root selector only', () => {
      const variant: ThemeVariant = { kind: 'root' }
      const result = tokensToCss(mockBlocks, variant)

      expect(result).toContain('/* Compact density variant')
      expect(result).toContain('[data-density="compact"] {')
      expect(result).toContain('--spacing-unit: 4px;')
    })

    it('excludes density variant for non-root selectors', () => {
      const variant: ThemeVariant = { kind: 'data-theme', theme: 'light' }
      const result = tokensToCss(mockBlocks, variant)

      expect(result).not.toContain('/* Compact density variant')
      expect(result).not.toContain('[data-density="compact"] {')
    })

    it('handles missing selector gracefully', () => {
      const variant: ThemeVariant = { kind: 'data-theme', theme: 'dark' }
      const result = tokensToCss(mockBlocks, variant)

      expect(result).toContain('No tokens found for selector: [data-theme="dark"]')
      expect(result).toContain('Version: 0.1.0')
    })

    it('handles empty blocks array', () => {
      const variant: ThemeVariant = { kind: 'root' }
      const result = tokensToCss([], variant)

      expect(result).toContain('No tokens found for selector: :root')
      expect(result).toContain('/*')
      expect(result).toContain('*/')
    })

    it('generates properly formatted and indented CSS', () => {
      const variant: ThemeVariant = { kind: 'root' }
      const result = tokensToCss(mockBlocks, variant)

      expect(result).toContain('  --color-primary: #000000;')
      expect(result).toContain('  --spacing-unit: 8px;')
      const lines = result.split('\n')
      const propertyLines = lines.filter(line => line.includes('--'))
      propertyLines.forEach(line => {
        expect(line).toMatch(/^ {2}--[\w-]+: .+;$/)
      })
    })
  })
  describe('Edge cases and error handling', () => {
    it('handles variant selector matching edge cases', () => {
      const blocks: TokenBlock[] = [
        { selector: ':root', properties: { '--root': 'value' } },
        { selector: '[data-theme="light"]', properties: { '--light': 'value' } },
      ]

      expect(tokensToCss(blocks, { kind: 'root' })).toContain('--root: value;')
      expect(tokensToCss(blocks, { kind: 'data-theme', theme: 'light' })).toContain('--light: value;')
      expect(tokensToCss(blocks, { kind: 'data-theme', theme: 'dark' })).toContain('No tokens found')
    })

    it('validates property preservation integrity', () => {
      const originalProps = {
        '--color': '#ff0000',
        '--size': '16px',
        '--duration': '300ms'
      }
      
      const blocks: TokenBlock[] = [
        { selector: ':root', properties: originalProps }
      ]
      
      const result = tokensToCss(blocks, { kind: 'root' })
      
      expect(result).toContain('--color: #ff0000;')
      expect(result).toContain('--size: 16px;')
      expect(result).toContain('--duration: 300ms;')
    })

    it('preserves complex property values', () => {
      const complexBlocks: TokenBlock[] = [
        {
          selector: ':root',
          properties: {
            '--complex-calc': 'calc(100vh - var(--header, 60px))',
            '--gradient': 'linear-gradient(45deg, red, blue)',
            '--shadow': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
            '--font-stack': '"Inter", "Helvetica Neue", sans-serif'
          }
        }
      ]
      const variant: ThemeVariant = { kind: 'root' }
      const result = tokensToCss(complexBlocks, variant)

      expect(result).toContain('--complex-calc: calc(100vh - var(--header, 60px));')
      expect(result).toContain('--gradient: linear-gradient(45deg, red, blue);')
      expect(result).toContain('--shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);')
      expect(result).toContain('--font-stack: "Inter", "Helvetica Neue", sans-serif;')
    })
  })

  describe('Production contract compliance', () => {
    it('maintains public API contract for TokenBlock', () => {
      const tokenBlock: TokenBlock = {
        selector: ':root',
        properties: { '--test': 'value' }
      }
      
      expect(tokenBlock).toHaveProperty('selector')
      expect(tokenBlock).toHaveProperty('properties')
      expect(typeof tokenBlock.selector).toBe('string')
      expect(typeof tokenBlock.properties).toBe('object')
    })

    it('maintains public API contract for ThemeVariant', () => {
      const variants: ThemeVariant[] = [
        { kind: 'root' },
        { kind: 'data-theme', theme: 'light' },
        { kind: 'data-theme', theme: 'dark' },
        { kind: 'density', density: 'compact' }
      ]
      
      variants.forEach(variant => {
        expect(variant).toHaveProperty('kind')
        expect(typeof variant.kind).toBe('string')
        
        if (variant.kind === 'data-theme') {
          expect(variant).toHaveProperty('theme')
          expect(['light', 'dark']).toContain(variant.theme)
        }
        if (variant.kind === 'density') {
          expect(variant).toHaveProperty('density')
          expect(variant.density).toBe('compact')
        }
      })
    })

    it('ensures deterministic CSS generation for same inputs', () => {
      const blocks: TokenBlock[] = [
        { selector: ':root', properties: { '--prop': 'value' } }
      ]
      
      const result1 = tokensToCss(blocks, { kind: 'root' })
      const result2 = tokensToCss(blocks, { kind: 'root' })
      
      const timestamp1 = result1.match(/Exported: ([^\n]+)/)?.[1]
      const timestamp2 = result2.match(/Exported: ([^\n]+)/)?.[1]
      
      const normalized1 = result1.replace(timestamp1!, 'TIMESTAMP')
      const normalized2 = result2.replace(timestamp2!, 'TIMESTAMP')
      
      expect(normalized1).toBe(normalized2)
    })
  })
})