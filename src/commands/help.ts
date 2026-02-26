export function rootHelp(): string {
  return [
    'Usage: evento [global-flags] <command> [args]',
    '',
    'Global flags:',
    '  --format <json|text>',
    '  --profile <name>',
    '  --base-url <url>',
    '  --help, -h',
    '  --version, -V, -v',
    '',
    'Commands:',
    '  auth login [--email <email>] [--otp]',
    '  auth status',
    '  auth logout',
    '  auth token',
    '  user me',
    '  events list [--limit <n>] [--offset <n>] [--q <search>]',
    '  events get <event-id>',
    '  events create (--data <json> | --data-file <path>)',
    '  events update <event-id> (--data <json> | --data-file <path>)',
    '  events delete <event-id>',
    '  events rsvp <event-id> (--data <json> | --data-file <path>)',
    '  api <METHOD> <PATH> [--data <json> | --data-file <path>] [--limit <n>] [--offset <n>] [--q <search>]'
  ].join('\n');
}
