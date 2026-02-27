# evento-cli

Agent-ready CLI for Evento API with JSON-first output, profile/config support, Supabase auth login, and release automation.

## What this gives you

- Full command surface for `auth`, `user`, `events`, and raw `api` passthrough
- Deterministic machine output (`--format json`) for agent workflows
- Local credential/session persistence with refresh support
- Unit + integration + smoke tests with enforced coverage gates
- CI workflow and publish workflow for npm releases

## Requirements

- Node.js `>= 20.11.0`
- pnpm `>= 10`

## Install and run locally

From this folder (`evento-cli/`):

```bash
pnpm install
pnpm build
node dist/cli.js --help
```

From monorepo root:

```bash
pnpm --dir evento-cli install
pnpm --dir evento-cli build
node evento-cli/dist/cli.js --help
```

## Configuration

The CLI resolves config in this order:

1. CLI flags
2. Environment variables
3. `~/.evento/config.json` profile settings
4. Built-in defaults

### Environment files

The runtime automatically loads:

1. `.env.local`
2. `.env`

It checks both current working directory and the package directory, and never overwrites env vars already set in the shell.

### Recommended `.env.local`

```bash
EVENTO_API_BASE_URL=https://evento.so/api
EVENTO_SUPABASE_URL=https://<project>.supabase.co
EVENTO_SUPABASE_ANON_KEY=<anon-key>
EVENTO_FORMAT=json
EVENTO_PROFILE=default
EVENTO_API_TIMEOUT_MS=15000
EVENTO_API_RETRY_ATTEMPTS=2
EVENTO_API_RETRY_DELAY_MS=250
```

### Optional `~/.evento/config.json`

```json
{
  "version": 1,
  "activeProfile": "default",
  "profiles": {
    "default": {
      "apiBaseUrl": "https://evento.so/api",
      "supabaseUrl": "https://<project>.supabase.co",
      "supabaseAnonKey": "<anon-key>",
      "timeoutMs": 15000,
      "retryAttempts": 2,
      "retryDelayMs": 250
    }
  }
}
```

## Command reference

### Global flags

- `--format <json|text>`
- `--profile <name>`
- `--base-url <url>`
- `--help`, `-h`
- `--version`, `-V`, `-v`

### Auth

```bash
evento auth login [--email <email>] [--otp]
evento auth status
evento auth token
evento auth logout
```

Examples:

```bash
node dist/cli.js --format json auth login --email you@example.com --otp
node dist/cli.js --format json auth status
node dist/cli.js --format json auth token
node dist/cli.js --format json auth logout
```

### User

```bash
evento user me
```

Example:

```bash
node dist/cli.js --format json user me
```

### Events

```bash
evento events list [--limit <n>] [--offset <n>] [--q <search>]
evento events get <event-id>
evento events create (--data <json> | --data-file <path>)
evento events update <event-id> (--data <json> | --data-file <path>)
evento events delete <event-id>
evento events rsvp <event-id> (--data <json> | --data-file <path>)
```

Examples:

```bash
node dist/cli.js --format json events list --limit 5
node dist/cli.js --format json events get evt_123
node dist/cli.js --format json events create --data '{"title":"Launch","startsAt":"2026-03-01T10:00:00Z"}'
node dist/cli.js --format json events update evt_123 --data-file ./event-update.json
node dist/cli.js --format json events rsvp evt_123 --data '{"status":"yes"}'
node dist/cli.js --format json events delete evt_123
```

### API passthrough

```bash
evento api <METHOD> <PATH> [--data <json> | --data-file <path>] [--limit <n>] [--offset <n>] [--q <search>]
```

Examples:

```bash
node dist/cli.js --format json api GET /v1/user
node dist/cli.js --format json api GET /v1/events --limit 10 --offset 0 --q btc
node dist/cli.js --format json api POST /v1/events --data-file ./event.json
```

## Output and exit semantics

- Non-TTY defaults to JSON output
- `stdout` carries JSON success/failure envelopes in JSON mode
- `stderr` is used for text-mode errors and interactive prompts

Exit codes:

- `0`: success
- `1`: runtime failure (http/network/auth/timeout/parse)
- `2`: usage/config/argument errors

## Local state files

- Config: `~/.evento/config.json`
- Credentials: `~/.evento/credentials.json`
- Backup: `~/.evento/credentials.json.bak`
- Lock file: `~/.evento/credentials.lock`

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:smoke
pnpm test
pnpm build
pnpm verify
```

Coverage thresholds are enforced in the test gate.

## CI and release

Workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/release-please.yml`
- `.github/workflows/publish.yml`

Release notes:

- `release-please` manages version/changelog pull requests
- publish workflow runs verify + release checks before npm publish
- publish requires npm auth (trusted publishing or `NPM_TOKEN` secret)

## Troubleshooting

### `Missing required configuration: EVENTO_SUPABASE_URL`

Set `EVENTO_SUPABASE_URL` and `EVENTO_SUPABASE_ANON_KEY` in `.env.local` or config profile.

### `ENEEDAUTH` while publishing

Provide npm authentication:

- Local: `npm adduser`
- GitHub Actions: set repository secret `NPM_TOKEN`

### `Unknown command` or flag issues

Run:

```bash
node dist/cli.js --help
```
