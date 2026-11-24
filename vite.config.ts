import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const PREVIEW_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all backend API routes (e.g. /api/onboarding/*, /api/v1/preferences/density)
      '/api/': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': PREVIEW_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
        'src/hooks/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/state/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/utils/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/services/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/store/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/i18n/config.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      include: [
        'src/components/AuthShell.tsx',
        'src/components/TopAppBar.tsx',
        'src/components/Layout.tsx',
        'src/components/AttestationConfirmModal.tsx',
        'src/components/SearchFilter.tsx',
        'src/components/SubmitButton.tsx',
        'src/components/CookieConsentContext.tsx',
        'src/components/CookieBanner.tsx',
        'src/components/SkeletonLoader.tsx',
        'src/pages/Login.tsx',
        'src/pages/Signup.tsx',
        'src/pages/ForgotPassword.tsx',
        'src/pages/Dashboard.tsx',
        'src/pages/Attestations.tsx',
        'src/components/a11y/A11yAuditPanel.tsx',
        'src/hooks/**/*.{ts,tsx}',
        'src/state/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        'src/i18n/config.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },
})
