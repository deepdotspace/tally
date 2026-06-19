import { defineConfig } from 'vitest/config'

/*
 * Vitest config for the pure unit specs (src/**\/*.test.ts). Kept separate from
 * vite.config.ts on purpose: the app config carries the Cloudflare + dep-prebundle
 * plugins that vitest cannot drive, so loading it crashes the unit run. The unit
 * specs exercise pure helpers (no SDK, no Workers), so a plain node environment is
 * all they need. The Playwright e2e specs under tests/ are excluded; they run via
 * `deepspace test e2e`, not here.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
