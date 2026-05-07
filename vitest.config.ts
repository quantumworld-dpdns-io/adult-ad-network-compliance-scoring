import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@adult-ad-net/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@adult-ad-net/audit-log': path.resolve(__dirname, 'packages/audit-log/src/index.ts'),
      '@adult-ad-net/scoring-engine': path.resolve(__dirname, 'packages/scoring-engine/src/index.ts'),
      '@adult-ad-net/fraud-detector': path.resolve(__dirname, 'packages/fraud-detector/src/index.ts'),
      '@adult-ad-net/campaign-manager': path.resolve(__dirname, 'packages/campaign-manager/src/index.ts'),
      '@adult-ad-net/consent-manager': path.resolve(__dirname, 'packages/consent-manager/src/index.ts'),
      '@adult-ad-net/age-gate-verifier': path.resolve(__dirname, 'packages/age-gate-verifier/src/index.ts'),
      '@adult-ad-net/ad-server': path.resolve(__dirname, 'packages/ad-server/src/index.ts'),
      '@adult-ad-net/affiliate-tracker': path.resolve(__dirname, 'packages/affiliate-tracker/src/index.ts'),
      '@adult-ad-net/settlement': path.resolve(__dirname, 'packages/settlement/src/index.ts'),
      '@adult-ad-net/web3-anchor': path.resolve(__dirname, 'packages/web3-anchor/src/index.ts'),
      '@adult-ad-net/dashboard-api': path.resolve(__dirname, 'packages/dashboard-api/src/index.ts'),
      '@adult-ad-net/notification': path.resolve(__dirname, 'packages/notification/src/index.ts'),
      '@adult-ad-net/identity': path.resolve(__dirname, 'packages/identity/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    deps: {
      inline: ['drizzle-orm'],
    },
  },
});
