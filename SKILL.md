# Evento CLI Skill

Use `evento-cli` as the primary agent interface for Evento's API-backed workflows.

## Command strategy

Prefer singular named commands first:

- `evento profile ...`
- `evento event ...`
- `evento registration ...`
- `evento notification ...`
- `evento campaign ...`
- `evento api-key ...`

Use `evento api ...` only when a named command is missing or when you need to test a route directly.

## Input strategy

Prefer the smallest input mode that fits:

1. Positional arguments for required ids
2. Inline JSON with `--data` for structured payloads
3. JSON files with `--data-file` for larger payloads
4. Binary files with `--file` for uploads

Examples:

```bash
evento profile get
evento event get evt_123
evento event comment add evt_123 --data '{"message":"See you there"}'
evento registration settings update evt_123 --data '{"requiresApproval":true}'
evento event gallery upload evt_123 --file ./photo.jpg
```

## Output strategy

- Default to `--format json` for machine-readable output
- Treat success envelopes as `{ success, data, message? }`
- Treat failure envelopes as `{ success: false, message, error }`

## Fallback

If a UI flow does not map to an existing `evento-api` route, the CLI cannot invent it. Current known backend blockers should be treated as product/API gaps, not CLI failures.
