import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

export interface TokenBlock {
  selector: string
  properties: Record<string, string>
}

export interface ParsedTokens {
  blocks: TokenBlock[]
  version: string
  exportedAt: string
}

export type ThemeVariant =
  | { kind: 'root' }
  | { kind: 'data-theme'; theme: 'light' | 'dark' }
  | { kind: 'density'; density: 'compact' }

const VERSION = '0.1.0'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cssPath = resolve(__dirname, '../index.css')
const tokensCss = readFileSync(cssPath, 'utf-8')

function extractBlocks(cssText: string): TokenBlock[] {
  const blocks: TokenBlock[] = []
  const selectorRegex = /([\w[\]="'\-., :>+*~().]+)\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = selectorRegex.exec(cssText)) !== null) {
    const selector = match[1].trim()
    const body = match[2]
    const props: Record<string, string> = {}
    const propRegex = /(--[\w-]+)\s*:\s*([^;]+)\s*;/g
    let propMatch: RegExpExecArray | null

    while ((propMatch = propRegex.exec(body)) !== null) {
      props[propMatch[1]] = propMatch[2].trim()
    }

    if (Object.keys(props).length > 0) {
      blocks.push({ selector, properties: props })
    }
  }

  return blocks
}

export function parseTokens(): ParsedTokens {
  const allBlocks = extractBlocks(tokensCss)
  return {
    blocks: allBlocks,
    version: VERSION,
    exportedAt: new Date().toISOString(),
  }
}

export function getVariantLabel(variant: ThemeVariant): string {
  switch (variant.kind) {
    case 'root':
      return ':root (default dark)'
    case 'data-theme':
      return `[data-theme="${variant.theme}"]`
    case 'density':
      return `[data-density="${variant.density}"]`
  }
}

export function getVariantSelector(variant: ThemeVariant): string {
  switch (variant.kind) {
    case 'root':
      return ':root'
    case 'data-theme':
      return `[data-theme="${variant.theme}"]`
    case 'density':
      return `[data-density="${variant.density}"]`
  }
}

export function tokensToCss(blocks: TokenBlock[], variant: ThemeVariant): string {
  const selector = getVariantSelector(variant)
  const targetBlock = blocks.find((b) => b.selector === selector)
  const lines: string[] = []

  lines.push('/*')
  lines.push(' * Veritasor Design Tokens — CSS Custom Properties')
  lines.push(` * Version: ${VERSION}`)
  lines.push(` * Exported: ${new Date().toISOString()}`)
  lines.push(` * Scope: ${getVariantLabel(variant)}`)
  lines.push(' *')
  lines.push(' * Paste this block into src/index.css or share with other teams.')
  lines.push(' * All tokens use the existing Veritasor design-token naming convention.')
  lines.push(' */')
  lines.push('')

  if (!targetBlock) {
    lines.push(`/* No tokens found for selector: ${selector} */`)
    return lines.join('\n')
  }

  lines.push(`${selector} {`)
  for (const [name, value] of Object.entries(targetBlock.properties)) {
    lines.push(`  ${name}: ${value};`)
  }
  lines.push('}')
  lines.push('')

  if (variant.kind === 'root') {
    const densityBlock = blocks.find((b) => b.selector === '[data-density="compact"]')
    if (densityBlock) {
      lines.push('/* Compact density variant (apply [data-density="compact"] on <html>) */')
      lines.push('')
      lines.push('[data-density="compact"] {')
      for (const [name, value] of Object.entries(densityBlock.properties)) {
        lines.push(`  ${name}: ${value};`)
      }
      lines.push('}')
      lines.push('')
    }
  }

  return lines.join('\n')
}