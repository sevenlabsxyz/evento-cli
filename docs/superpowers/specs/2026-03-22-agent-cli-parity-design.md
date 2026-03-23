# Evento CLI Agent Parity Design

Date: 2026-03-22
Repo: `evento-cli`
Scope: design only, `evento-cli` changes only

## Summary

`evento-cli` should become an agent-oriented command surface for Evento. The CLI is not primarily a human-first product CLI. It exists so an agent that installs the CLI and a related `SKILL.md` can authenticate and perform most non-wallet, API-backed Evento workflows through named commands.

The end state is:

- singular, named command families
- stable machine-readable output
- inline JSON for structured payloads
- file upload support for binary endpoints
- broad coverage of confirmed `evento-api` `origin/main` routes
- raw transport retained internally, but not as the primary parity experience

This design does not require changes to `evento-api` or `evento-client`.

## Goals

- Give agents a stable, named CLI surface over Evento’s existing API.
- Prefer named commands over raw HTTP path/method invocation.
- Support both simple commands and structured payloads cleanly.
- Support upload flows already exposed by `evento-api`.
- Keep output deterministic for agent consumption.
- Keep the implementation inside `evento-cli` only.

## Non-Goals

- Wallet or Breez-related flows.
- Browser-only or visual UX behavior.
- Fixing missing or drifting API routes in other repos.
- Matching `evento-client` UI terminology exactly when the API shape differs.
- Optimizing for human CLI ergonomics over agent clarity.

## Constraints

- Only `evento-cli` may be modified.
- Command families must be singular.
- Latest `evento-api` `origin/main` is the source of truth for supported flows.
- Latest `evento-client` may inform workflow priority, but not route truth.
- If a route does not exist in `evento-api` `origin/main`, the CLI should not invent it.

## Current State

Current `evento-cli` `origin/main` provides:

- `auth login`
- `auth status`
- `auth token`
- `auth logout`
- `user me`
- `events list|get|create|update|delete|rsvp`
- raw `api` passthrough

Current limitations:

- JSON-centric request model
- no file upload support
- tiny named command surface relative to Evento’s API surface
- no agent-oriented command taxonomy for registration, notifications, campaigns, lists, comments, invites, email blasts, or API keys

## API Truth Source

The design should be implemented against `evento-api` `origin/main`, not the currently checked out feature branches in the workspace.

Observed latest-main conditions on 2026-03-22:

- `evento-api` local branch is behind `origin/main`
- `evento-client` local branch is behind `origin/main`
- `evento-cli` local `main` is behind `origin/main`

Implication:

- parity work must use fetched `origin/main` refs as the design baseline
- previously observed path mismatches must be re-verified against main before implementation

## Command Design Principles

### 1. Singular nouns

Top-level nouns should be singular:

- `profile`
- `event`
- `registration`
- `notification`
- `campaign`
- `api-key`

This keeps the command surface regular and easier for agents to memorize.

### 2. Named commands first

The agent-facing path should be named commands, not raw HTTP calls. A low-level transport may still exist internally, and `evento api` may remain as a debug or escape hatch, but it is not the primary parity interface.

### 3. Positionals for identity, inline JSON for structure

Inputs should follow this model:

- positional args for required identifiers
- direct flags for simple booleans or scalars
- `--data '<json>'` for structured inline payloads
- `--data-file <path>` for larger or reusable structured payloads
- `--file <path>` for binary upload bodies

Examples:

```bash
evento event get evt_123
evento event cancel evt_123 --send-emails
evento event comment add evt_123 --data '{"message":"see you there"}'
evento registration submission deny evt_123 reg_123 --data '{"reason":"Incomplete profile"}'
evento event create --data-file ./event.json
evento event gallery upload evt_123 --file ./photo.jpg
```

### 4. Stable output contract

The CLI should keep deterministic output for agents:

- JSON by default for non-TTY or explicit `--format json`
- success envelope remains predictable
- failure envelope remains predictable
- binary uploads still return parsed JSON when the API responds with JSON
- text fallback only when the endpoint genuinely returns non-JSON

### 5. Shared transport underneath

Even with named commands, request execution should still flow through shared transport primitives:

- auth resolution
- retries and timeout handling
- JSON serialization
- raw file streaming
- content-type overrides
- JSON vs text response parsing

This avoids duplicating HTTP logic across command families.

## Proposed Command Families

### `profile`

Representative actions:

- `profile get`
- `profile update`
- `profile upload-avatar`
- `profile follow`
- `profile unfollow`
- `profile list list`
- `profile list create`
- `profile list update`
- `profile list delete`
- `profile interest list`
- `profile interest add`
- `profile interest remove`
- `profile prompt list`
- `profile prompt create`
- `profile prompt update`
- `profile prompt delete`
- `profile prompt reorder`
- `profile pinned-event get`
- `profile pinned-event set`
- `profile badge list`

### `event`

Representative actions:

- `event list`
- `event get`
- `event create`
- `event update`
- `event delete`
- `event publish`
- `event cancel`
- `event save`
- `event unsave`
- `event host list`
- `event host remove`
- `event cohost invite`
- `event cohost invite list`
- `event invite send`
- `event invite list`
- `event comment list`
- `event comment add`
- `event comment edit`
- `event comment delete`
- `event gallery list`
- `event gallery upload`
- `event gallery delete`
- `event rsvp get`
- `event rsvp upsert`
- `event rsvp remove-guest`
- `event email-blast list`
- `event email-blast create`
- `event email-blast update`
- `event email-blast cancel`

### `registration`

Representative actions:

- `registration settings get`
- `registration settings update`
- `registration question list`
- `registration question create`
- `registration question update`
- `registration question delete`
- `registration question reorder`
- `registration submission list`
- `registration submission get`
- `registration submission approve`
- `registration submission deny`
- `registration submit`
- `registration my get`

### `notification`

Representative actions:

- `notification feed`
- `notification get`
- `notification seen`
- `notification read`
- `notification archive`
- `notification bulk-seen`
- `notification bulk-read`
- `notification mark-all-seen`
- `notification mark-all-read`

### `campaign`

Representative actions:

- `campaign event get`
- `campaign event create`
- `campaign event update`
- `campaign event feed`
- `campaign profile get`
- `campaign profile create`
- `campaign profile update`
- `campaign profile feed`
- `campaign pledge create-event`
- `campaign pledge create-profile`
- `campaign pledge status`

### `api-key`

Representative actions:

- `api-key list`
- `api-key create`
- `api-key revoke`

## Input Model

### Required forms

The CLI should support all of the following:

#### Direct command

```bash
evento event publish evt_123
evento notification read notif_123
```

#### Inline JSON

```bash
evento event comment add evt_123 --data '{"message":"hello"}'
evento registration submission deny evt_123 reg_123 --data '{"reason":"Incomplete profile"}'
```

#### JSON file

```bash
evento event create --data-file ./event.json
evento event email-blast create evt_123 --data-file ./blast.json
```

#### Binary file

```bash
evento profile upload-avatar --file ./avatar.png
evento event gallery upload evt_123 --file ./photo.jpg
```

### Recommended parsing rules

- `--data` and `--data-file` remain mutually exclusive
- `--file` is mutually exclusive with `--data` and `--data-file`
- `--content-type` may override detected MIME type for `--file`
- commands should reject ambiguous input combinations early

## Transport Enhancements

The shared transport layer should gain:

- raw body support
- file body support
- content-type override support
- optional response mode fallback when body is not JSON

Minimum additions:

- `bodyType: 'json' | 'raw' | 'file'`
- `bodyPath?: string`
- `rawBody?: string | Uint8Array`
- `contentType?: string`

The named command layer should not know HTTP details beyond:

- method
- path
- payload mapping
- whether the action expects JSON or file input

## Upload Support

Upload parity is required because `evento-api` already supports it.

Relevant existing backend patterns include:

- profile image upload
- event cover upload
- event gallery upload

CLI design requirements:

- accept `--file`
- derive MIME type from extension when possible
- allow `--content-type` override
- preserve auth headers/session behavior
- parse JSON upload success responses like any other command

## Roadmap

### Phase 1: Latest-main parity audit

Produce a route-to-command matrix from `evento-api` `origin/main`.

For each route:

- map to a command family and action
- classify request type:
  - simple
  - structured JSON
  - upload
- classify output type:
  - JSON
  - text
- mark whether the flow is in scope or blocked

Deliverable:

- one parity matrix checked into `evento-cli`

### Phase 2: Transport upgrades

Upgrade the transport to support:

- inline JSON
- JSON file payloads
- binary file uploads
- content type override
- JSON and text response modes

Deliverable:

- named commands can rely on a transport that reaches the required API shapes

### Phase 3: Implement named command families

Implement command families in this order:

1. `profile`
2. `event`
3. `registration`
4. `notification`
5. `campaign`
6. `api-key`

Priority within each family:

- read operations first
- simple write operations second
- complex write/upload flows third

Deliverable:

- near-complete named command coverage for non-wallet, API-backed flows

### Phase 4: Agent guidance

Add or update the related `SKILL.md` so an agent knows:

- which commands exist
- how to pass inline JSON
- when to use files
- how errors are returned

Deliverable:

- agent can install CLI + skill and operate Evento reliably

### Phase 5: Parity tests

Add tests that prove:

- named command parses correctly
- payload maps to the correct route
- transport handles JSON and file bodies
- output envelopes remain stable

Deliverable:

- regression protection for parity and transport behavior

## Known Blockers

These are not to be fixed in `evento-cli`, but they must be documented during implementation:

- client flows that call routes not present in `evento-api` `origin/main`
- any route or behavior that exists only in `evento-client`
- any wallet/Breez workflow

At design time, username availability appears to be one such blocker because `evento-client` calls `/v1/user/check-username` while that route was not found in `evento-api` `origin/main`.

## Testing Strategy

Testing should be layered:

### Unit

- parser behavior
- input validation
- command-to-route mapping
- MIME/content-type selection

### Integration

- named commands invoke the correct HTTP call
- file uploads produce the expected request shape
- JSON and text responses are handled correctly

### Smoke

- representative end-to-end command paths still work after build

Suggested smoke coverage:

- `profile get`
- `event list`
- `event comment add ... --data ...`
- `event gallery upload ... --file ...`
- `registration submission list ...`
- `notification feed`

## Recommended Implementation Order

1. write the parity matrix against `evento-api` `origin/main`
2. add transport support for `--file` and response-mode fallback
3. add new parser abstractions for named command families
4. implement `profile` and `event`
5. implement `registration`
6. implement `notification`, `campaign`, `api-key`
7. write agent-facing `SKILL.md`
8. lock parity with tests

## Open Questions

- Should `evento api` remain documented publicly, or become an intentionally low-profile escape hatch?
- Should some nested actions be flattened if the parser becomes too complex?
- Should the parity matrix be hand-maintained markdown, generated markdown, or machine-readable JSON?

## Recommendation

Keep `evento api` as a low-level fallback, but build the primary surface around singular named command families. Use inline JSON as the default structured input path, with files only when payload size or binary data makes them necessary.
