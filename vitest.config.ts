/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Tests live in tests/ for app-level code, and colocated next to
    // their source under packages/*/src for publishable workspace
    // packages (canonical pattern for the SDK monorepo path).
    include: [
      'tests/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
