import axe, { type ElementContext, type Result, type RunOptions } from 'axe-core'
import { expect } from 'vitest'

function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return ''

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.html}\n    ${node.failureSummary ?? ''}`)
        .join('\n')
      return `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}\n${nodes}`
    })
    .join('\n\n')
}

export async function runAxe(
  context: ElementContext,
  options: RunOptions = {},
) {
  return axe.run(context, {
    ...options,
    rules: {
      // JSDOM does not compute layout/canvas styles needed for color-contrast checks.
      'color-contrast': { enabled: false },
      ...options.rules,
    },
  })
}

export async function expectNoAxeViolations(
  context: ElementContext,
  options?: RunOptions,
) {
  const results = await runAxe(context, options)
  expect(results.violations, formatViolations(results.violations)).toEqual([])
  return results
}
