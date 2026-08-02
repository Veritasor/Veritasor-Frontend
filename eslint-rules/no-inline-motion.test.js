/**
 * Tests for the `veritasor/no-inline-motion` ESLint rule.
 *
 * The rule guards the reduced-motion fallback spec
 * (docs/uiux/reduced-motion-fallback-spec.md): inline `transition` /
 * `animation` in JSX style props cannot carry a prefers-reduced-motion
 * override, so they are flagged.
 */
import { RuleTester } from 'eslint'
import rule from './no-inline-motion.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
})

ruleTester.run('no-inline-motion', rule, {
  valid: [
    '<div />',
    '<div className="animated" />',
    '<div style={{ color: "red", margin: 4 }} />',
    '<div style={{ transform: "scale(1.06)" }} />',
    '<Component style={styles.panel} />',
    '<div style={{"--motion-duration-md": "200ms"}} />',
  ],
  invalid: [
    {
      code: '<div style={{ transition: "opacity 200ms ease" }} />',
      errors: [{ messageId: 'inlineMotion' }],
    },
    {
      code: '<div style={{ animation: "fade-in 1s forwards" }} />',
      errors: [{ messageId: 'inlineMotion' }],
    },
    {
      code: '<div style={{ transition: "all 0.2s", animation: "spin 1s infinite" }} />',
      errors: [
        { messageId: 'inlineMotion' },
        { messageId: 'inlineMotion' },
      ],
    },
  ],
})
