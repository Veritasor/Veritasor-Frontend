/**
 * Type definitions for the design-tokens admin diff viewer.
 *
 * A *token* is an atomic CSS-custom-property-like design primitive. Tokens are
 * grouped into logical categories (background, text, etc.) and have a css type
 * that drives how the viewer renders their before/after values (color tokens
 * draw as a swatch; non-color tokens draw as a monospace string).
 *
 * A *theme version* is a named, dated snapshot of every token that belongs to
 * a given release of the design system. Comparing two theme versions produces
 * a *TokenDiffResult* — a list of added / removed / changed tokens.
 */

export const TOKEN_CATEGORIES = [
  'background',
  'border',
  'text',
  'accent',
  'status',
  'spacing',
  'typography',
  'radius',
  'density',
  'shadow',
] as const

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number]

/**
 * Render classification for a token's value.
 * - `color`     → may be displayed as a swatch (hex / rgb / rgba)
 * - `length`    → has a CSS length value (rem / px / %)
 * - `number`    → unitless number (e.g. 1.05)
 * - `font-family` → font stack
 * - `complex`   → multi-declaration value (box-shadow, transition), shown as text
 */
export type TokenCssType =
  | 'color'
  | 'length'
  | 'number'
  | 'font-family'
  | 'complex'

export type Token = {
  /** CSS variable name e.g. `--bg` — also the diff key. */
  name: string
  /** Raw value as declared. */
  value: string
  category: TokenCategory
  cssType: TokenCssType
}

export type ThemeVersion = {
  id: string
  name: string
  description: string
  /** ISO date string — release date of this version. */
  releasedAt: string
  tokens: Token[]
}

export const DIFF_STATUSES = ['added', 'removed', 'changed'] as const

export type TokenDiffStatus = (typeof DIFF_STATUSES)[number]

export type TokenDiffEntry = {
  name: string
  category: TokenCategory
  cssType: TokenCssType
  status: TokenDiffStatus
  /** Present for `changed` and `removed` — the value the token had in A. */
  before?: Token
  /** Present for `changed` and `added` — the value the token has in B. */
  after?: Token
}

export type TokenDiffSummary = {
  added: number
  removed: number
  changed: number
}

export type TokenDiffResult = {
  versionA: ThemeVersion
  versionB: ThemeVersion
  entries: TokenDiffEntry[]
  summary: TokenDiffSummary
}
