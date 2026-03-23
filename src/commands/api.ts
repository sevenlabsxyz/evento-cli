import { usageError } from '../errors.js';
import { httpRequest } from '../http/client.js';
import type { RuntimeContext } from '../types.js';
import { resolveFileInput, resolveJsonInput } from '../utils/input.js';

export async function runApiCall(
  ctx: RuntimeContext,
  method: string,
  path: string,
  data?: string,
  dataFile?: string,
  file?: string,
  contentType?: string,
  noAuth?: boolean,
  limit?: number,
  offset?: number,
  q?: string
): Promise<unknown> {
  const payload = await resolveJsonInput('api', data, dataFile);
  const fileInput = await resolveFileInput('api', file, contentType);

  if (payload !== undefined && fileInput) {
    throw usageError('Conflicting flags: --data/--data-file cannot be used with --file.', 'api');
  }

  if (['POST', 'PUT', 'PATCH'].includes(method) && payload === undefined && !fileInput) {
    throw usageError('Missing required payload: provide --data <json>, --data-file <path>, or --file <path>.', 'api');
  }

  return httpRequest(ctx, 'api', method, path, {
    body: payload,
    rawBody: fileInput?.value,
    contentType: fileInput?.contentType,
    sourceFileName: fileInput?.fileName,
    auth: noAuth ? false : undefined,
    query: {
      limit,
      offset,
      q
    }
  });
}
