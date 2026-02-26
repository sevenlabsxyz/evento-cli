import { readFile } from 'node:fs/promises';
import { usageError } from '../errors.js';
import { httpRequest } from '../http/client.js';
import type { RuntimeContext } from '../types.js';
import { parseJsonObjectOrArray } from '../utils/json.js';

async function resolvePayload(command: string, data?: string, dataFile?: string): Promise<unknown | undefined> {
  if (data && dataFile) {
    throw usageError('Conflicting flags: --data and --data-file cannot be used together.', command);
  }
  if (!data && !dataFile) {
    return undefined;
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

export async function runApiCall(
  ctx: RuntimeContext,
  method: string,
  path: string,
  data?: string,
  dataFile?: string,
  limit?: number,
  offset?: number,
  q?: string
): Promise<unknown> {
  const payload = await resolvePayload('api', data, dataFile);
  if (['POST', 'PUT', 'PATCH'].includes(method) && payload === undefined) {
    throw usageError('Missing required payload: provide --data <json> or --data-file <path>.', 'api');
  }

  return httpRequest(ctx, 'api', method, path, {
    body: payload,
    query: {
      limit,
      offset,
      q
    }
  });
}
