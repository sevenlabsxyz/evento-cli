import { COMMAND_DEFINITIONS, formatCommandPattern } from './manifest.js';

const FAMILY_ORDER = ['auth', 'profile', 'event', 'registration', 'notification', 'campaign', 'api-key', 'api'];

export function rootHelp(): string {
  const grouped = new Map<string, string[]>();
  for (const definition of COMMAND_DEFINITIONS) {
    const family = definition.tokens[0];
    if (!grouped.has(family)) {
      grouped.set(family, []);
    }
    grouped.get(family)?.push(`  ${formatCommandPattern(definition)}`);
  }

  const lines = [
    'Usage: evento [global-flags] <command> [args]',
    '',
    'Global flags:',
    '  --format <json|text>',
    '  --profile <name>',
    '  --base-url <url>',
    '  --help, -h',
    '  --version, -V, -v',
    '',
    'Auth:',
    '  auth login [--email <email>] [--otp]',
    '  auth status',
    '  auth logout',
    '  auth token',
    ''
  ];

  for (const family of FAMILY_ORDER) {
    if (family === 'auth' || family === 'api') continue;
    const entries = grouped.get(family);
    if (!entries || entries.length === 0) continue;
    lines.push(`${family[0].toUpperCase()}${family.slice(1)}:`);
    lines.push(...entries);
    lines.push('');
  }

  lines.push('Passthrough:');
  lines.push('  api <METHOD> <PATH> [--data <json> | --data-file <path> | --file <path>] [--content-type <mime>] [--limit <n>] [--offset <n>] [--q <search>] [--no-auth]');
  lines.push('');
  lines.push('Input modes:');
  lines.push(`  Inline JSON: evento event comment add evt_123 --data '{"message":"hello"}'`);
  lines.push('  File upload: evento event gallery upload evt_123 --file ./photo.jpg');

  return lines.join('\n');
}
