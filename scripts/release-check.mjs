import { existsSync } from 'node:fs';

const required = ['GITHUB_ACTIONS'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required release context: ${missing.join(', ')}`);
  process.exit(1);
}

const hasTrustedPublishing = process.env.NPM_CONFIG_PROVENANCE === 'true';
const hasNpmToken = Boolean(process.env.NPM_TOKEN);

if (!hasTrustedPublishing && !hasNpmToken) {
  console.error('Missing release auth: enable trusted publishing or set NPM_TOKEN.');
  process.exit(1);
}

if (!existsSync('package.json')) {
  console.error('release:check must run from evento-cli package root.');
  process.exit(1);
}

console.log('release:check passed');
