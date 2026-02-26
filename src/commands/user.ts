import { httpRequest } from '../http/client.js';
import type { RuntimeContext } from '../types.js';

export async function runUserMe(ctx: RuntimeContext): Promise<unknown> {
  return httpRequest(ctx, 'user me', 'GET', '/v1/user');
}
