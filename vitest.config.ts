import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90
      },
      include: [
        'src/parse.ts',
        'src/config/resolve.ts',
        'src/http/client.ts',
        'src/session/refresh.ts'
      ]
    }
  }
});
