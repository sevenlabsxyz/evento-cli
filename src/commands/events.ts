import { readFile } from 'node:fs/promises';
import { usageError } from '../errors.js';
import { httpRequest } from '../http/client.js';
import type { RuntimeContext } from '../types.js';
import { parseJsonObjectOrArray } from '../utils/json.js';

async function resolvePayload(command: string, data?: string, dataFile?: string): Promise<unknown> {
  if (data && dataFile) {
    throw usageError('Conflicting flags: --data and --data-file cannot be used together.', command);
  }
  if (!data && !dataFile) {
    throw usageError(
      'Missing required payload: provide --data <json> or --data-file <path>.',
      command
    );
  }
  if (data) {
    return parseJsonObjectOrArray(data);
  }
  try {
    const raw = await readFile(dataFile ?? '', 'utf8');
    return parseJsonObjectOrArray(raw);
  } catch {
    throw usageError(`Invalid argument: --data-file path "${dataFile}" is not readable.`, command);
  }
}

export async function runEventsList(
  ctx: RuntimeContext,
  limit?: number,
  offset?: number,
  q?: string
): Promise<unknown> {
  return httpRequest(ctx, 'events list', 'GET', '/v1/events', {
    query: { limit, offset, q }
  });
}

export async function runEventsGet(ctx: RuntimeContext, eventId: string): Promise<unknown> {
  return httpRequest(ctx, 'events get', 'GET', `/v1/events/${eventId}`);
}

export async function runEventsCreate(
  ctx: RuntimeContext,
  data?: string,
  dataFile?: string
): Promise<unknown> {
  const payload = await resolvePayload('events create', data, dataFile);
  return httpRequest(ctx, 'events create', 'POST', '/v1/events', { body: payload });
}

export async function runEventsUpdate(
  ctx: RuntimeContext,
  eventId: string,
  data?: string,
  dataFile?: string
): Promise<unknown> {
  const payload = await resolvePayload('events update', data, dataFile);
  if (typeof payload === 'object' && payload !== null && Object.keys(payload as Record<string, unknown>).length === 0) {
    throw usageError('Invalid argument: payload must include at least one updatable field.', 'events update');
  }
  return httpRequest(ctx, 'events update', 'PATCH', `/v1/events/${eventId}`, { body: payload });
}

export async function runEventsDelete(ctx: RuntimeContext, eventId: string): Promise<unknown> {
  return httpRequest(ctx, 'events delete', 'DELETE', `/v1/events/${eventId}`);
}

export async function runEventsRsvp(
  ctx: RuntimeContext,
  eventId: string,
  data?: string,
  dataFile?: string
): Promise<unknown> {
  const payload = await resolvePayload('events rsvp', data, dataFile);
  const status = (payload as { status?: string }).status;
  if (!status || !['yes', 'no', 'maybe'].includes(status)) {
    throw usageError('Invalid argument: status must be one of yes|no|maybe.', 'events rsvp');
  }
  return httpRequest(ctx, 'events rsvp', 'POST', `/v1/events/${eventId}/rsvp`, { body: payload });
}
