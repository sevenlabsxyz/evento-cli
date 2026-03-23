# 2026-03-22 API Parity Audit

Scope:

- route truth source: `evento-api` `origin/main`
- implementation scope: `evento-cli` only
- excluded: wallet/Breez flows

## Reachable from CLI after this change

- `profile`: get, update, avatar upload, follow state, follow/unfollow, interests, lists, prompts, pinned event, badges, cohost invites
- `event`: list/get/create/update/delete, publish/cancel, feed/following/for-you, drafts, user events, hosts, invites, cohost invites, comments, gallery, RSVPs, guests, email blasts
- `registration`: settings, questions, submissions, current-user registration, submit
- `notification`: feed, get, seen/read/archive, bulk actions, mark-all actions
- `campaign`: event campaign, profile campaign, feeds, pledge intents, pledge status
- `api-key`: list/create/revoke

## Known backend blockers

- Username availability still appears client-only from the CLI perspective. `evento-client` calls `/v1/user/check-username`, but no matching `evento-api` route was confirmed during this audit.

## Notes

- The CLI now exposes named singular command families as the primary agent surface.
- `evento api` remains available as a low-level passthrough, including inline JSON, JSON files, file uploads, content-type overrides, and `--no-auth`.
