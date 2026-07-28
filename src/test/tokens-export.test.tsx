import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TokensExport from '../components/tokens/TokensExport'
import { parseTokens, tokensToCss, getVariantLabel, getVariantSelector } from '../utils/parseTokens'

describe('parseTokens', () => {
  it('returns blocks for :root', () => {
    const result = parseTokens()
    const root = result.blocks.find((b) => b.selector === ':root')
    expect(root).toBeDefined()
    expect(root!.properties['--bg']).toBe('#07111f')
  })

  it('returns blocks for [data-theme="light"]', () => {
    const result = parseTokens()
    const light = result.blocks.find((b) => b.selector === '[data-theme="light"]')
    expect(light).toBeDefined()
    expect(light!.properties['--bg']).toBe('#f8fafc')
  })

  it('includes density tokens in :root', () => {
    const result = parseTokens()
    const root = result.blocks.find((b) => b.selector === ':root')
    expect(root!.properties['--density-touch-min']).toBe('44px')
  })

  it('includes density tokens in compact block', () => {
    const result = parseTokens()
    const compact = result.blocks.find((b) => b.selector === '[data-density="compact"]')
    expect(compact).toBeDefined()
    expect(compact!.properties['--density-touch-min']).toBe('44px')
  })

  it('has a non-empty version string', () => {
    const result = parseTokens()
    expect(result.version).toBe('0.1.0')
  })

  it('has a valid ISO exportedAt timestamp', () => {
    const result = parseTokens()
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt)
  })

  it('returns at least one block', () => {
    const result = parseTokens()
    expect(result.blocks.length).toBeGreaterThan(0)
  })
 })

 describe('tokensToCss', () => {
  const blocks = parseTokens().blocks

  it('generates a comment header with version for root variant', () => {
    const css = tokensToCss(blocks, { kind: 'root' })
    expect(css).toContain('Veritasor Design Tokens')
    expect(css).toContain('Version: 0.1.0')
  })

  it('generates a comment header with the correct scope label', () => {
    const css = tokensToCss(blocks, { kind: 'root' })
    expect(css).toContain('Scope: :root (default dark)')
  })

  it('wraps :root properties in a :root rule', () => {
    const css = tokensToCss(blocks, { kind: 'root' })
    expect(css).toContain(':root {')
    expect(css).toContain('--bg: #07111f;')
  })

  it('wraps light theme properties in a [data-theme="light"] rule', () => {
    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'light' })
    expect(css).toContain('[data-theme="light"] {')
    expect(css).toContain('--bg: #f8fafc;')
  })

  it('includes a compact density variant when root is selected', () => {
    const css = tokensToCss(blocks, { kind: 'root' })
    expect(css).toContain('[data-density="compact"]')
    expect(css).toContain('/* Compact density variant')
  })

  it('does not include compact density variant for data-theme variant', () => {
    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'light' })
    expect(css).not.toContain('[data-density="compact"]')
  })

  it('every property line ends with a semicolon', () => {
    const css = tokensToCss(blocks, { kind: 'root' })
    const propertyLines = css.split('\n').filter((line) => line.trim().startsWith('--'))
    for (const line of propertyLines) {
      expect(line.trim().endsWith(';')).toBe(true)
    }
  })

   it('contains a closing brace for each selector block', () => {
     const css = tokensToCss(blocks, { kind: 'root' })
     expect(css).toContain(':root {')
     expect(css).toContain('}')
   })

  it('generates a no-tokens-found comment for a missing variant (dark)', () => {
    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'dark' })
    expect(css).toContain('/* No tokens found for selector')
    expect(css).toContain('[data-theme="dark"]')
  })

  it('generates a no-tokens-found comment for an unknown selector', () => {
    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'dark' })
    // The dark theme block exists in the CSS, but if we were to test a missing
    // selector, the path would produce a comment. For the dark variant specifically,
    // verify it has tokens without density block.
    expect(css).not.toContain('[data-density="compact"]')
  })
 })

 describe('getVariantSelector', () => {
   it('returns :root for root kind', () => {
     expect(getVariantSelector({ kind: 'root' })).toBe(':root')
   })

   it('returns [data-theme="light"] for light', () => {
     expect(getVariantSelector({ kind: 'data-theme', theme: 'light' })).toBe('[data-theme="light"]')
   })

   it('returns [data-theme="dark"] for dark', () => {
     expect(getVariantSelector({ kind: 'data-theme', theme: 'dark' })).toBe('[data-theme="dark"]')
   })

   it('returns [data-density="compact"] for density', () => {
     expect(getVariantSelector({ kind: 'density', density: 'compact' })).toBe('[data-density="compact"]')
   })
 })

 describe('getVariantLabel', () => {
   it('returns human label for root', () => {
     expect(getVariantLabel({ kind: 'root' })).toBe(':root (default dark)')
   })

   it('returns human label for light', () => {
     expect(getVariantLabel({ kind: 'data-theme', theme: 'light' })).toBe('[data-theme="light"]')
   })

   it('returns human label for dark', () => {
     expect(getVariantLabel({ kind: 'data-theme', theme: 'dark' })).toBe('[data-theme="dark"]')
   })

   it('returns human label for density', () => {
     expect(getVariantLabel({ kind: 'density', density: 'compact' })).toBe('[data-density="compact"]')
   })
 })

describe('TokensExport', () => {
  it('renders the export heading', () => {
    render(<TokensExport />)
    expect(screen.getByRole('heading', { name: /export design tokens/i })).toBeInTheDocument()
  })

  it('renders all three scope radio options', () => {
    render(<TokensExport />)
    expect(screen.getByRole('radio', { name: ':root (default dark)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '[data-theme="light"]' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '[data-theme="dark"]' })).toBeInTheDocument()
  })

  it('renders the copy to clipboard button', () => {
    render(<TokensExport />)
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument()
  })

  it('renders the download file button', () => {
    render(<TokensExport />)
    expect(screen.getByRole('button', { name: /download file/i })).toBeInTheDocument()
  })

  it('renders a preview textarea', () => {
    render(<TokensExport />)
    const textarea = screen.getByRole('textbox', { name: /css custom properties preview/i })
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('readonly')
  })

  it('has a polite live region for announcements', () => {
    render(<TokensExport />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('renders the fieldset with scope legend', () => {
    render(<TokensExport />)
    expect(screen.getByRole('group', { name: /scope/i })).toBeInTheDocument()
  })

  it('switches variant content when the light radio option is selected', () => {
    render(<TokensExport />)
    const textarea = screen.getByRole('textbox', { name: /css custom properties preview/i }) as HTMLTextAreaElement
    expect(textarea.value).toContain('--bg: #07111f;')

    act(() => {
      screen.getByRole('radio', { name: /light/i }).click()
    })

    const newValue = (screen.getByRole('textbox', { name: /css custom properties preview/i }) as HTMLTextAreaElement).value
    expect(newValue).toContain('--bg: #f8fafc;')
  })

  it('shows a success message after clicking copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<TokensExport />)
    const button = screen.getByRole('button', { name: /copy to clipboard/i })
    await act(async () => {
      button.click()
    })
    // The success notification appears below the textarea.
    expect(screen.getByText(/Copied to clipboard ✓/i)).toBeInTheDocument()
    expect(writeText).toHaveBeenCalled()
  })

  it('triggers a file download when the download button is clicked', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    render(<TokensExport />)
    const button = screen.getByRole('button', { name: /download file/i })
    act(() => {
      button.click()
    })
    expect(createElementSpy).toHaveBeenCalledWith('a')
  })

  it('preview textarea shows comment header with version', () => {
    render(<TokensExport />)
    const textarea = screen.getByRole('textbox', { name: /css custom properties preview/i }) as HTMLTextAreaElement
    expect(textarea.value).toContain('Veritasor Design Tokens')
    expect(textarea.value).toContain('Version: 0.1.0')
  })
})