import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
      include: [
        'src/components/AuthShell.tsx',
        'src/components/TopAppBar.tsx',
        'src/components/Layout.tsx',
        'src/components/AttestationConfirmModal.tsx',
        'src/components/IncidentBanner.tsx',
        'src/pages/Login.tsx',
        'src/pages/Signup.tsx',
        'src/pages/ForgotPassword.tsx',
        'src/pages/Dashboard.tsx',
      ],
    },
  },
})
