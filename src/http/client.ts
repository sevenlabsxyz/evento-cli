import { runtimeError } from '../errors.js';
import type { RuntimeContext } from '../types.js';
import { parseJsonObjectOrArray, safeJsonParse } from '../utils/json.js';
import { sleep } from '../utils/time.js';
import { getValidCredentials } from '../session/refresh.js';

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface HttpRequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  rawBody?: string | Uint8Array;
  auth?: boolean;
  contentType?: string;
  fileNameQueryParam?: string;
  sourceFileName?: string;
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === 'AbortError' ||
    /ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket/i.test(error.message)
  );
}

export async function httpRequest(
  ctx: RuntimeContext,
  command: string,
  method: string,
  path: string,
  options: HttpRequestOptions = {}
): Promise<unknown> {
  const needsAuth = options.auth ?? true;

  let finalPath = path;
  if (!finalPath.startsWith('/')) {
    throw runtimeError(`Invalid path: "${finalPath}". Path must begin with /.`, command, {
      code: 'usage_error',
      category: 'usage_error',
      status: null,
      retryable: false,
      details: { command, endpoint: null }
    });
  }
  if (finalPath.includes('..')) {
    throw runtimeError(`Invalid path: "${finalPath}". Path traversal sequences are not allowed.`, command, {
      code: 'usage_error',
      category: 'usage_error',
      status: null,
      retryable: false,
      details: { command, endpoint: null }
    });
  }

  const url = new URL(`${ctx.config.apiBaseUrl}${finalPath}`);
  const query = options.query ?? {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  if (options.fileNameQueryParam && options.sourceFileName) {
    url.searchParams.set(options.fileNameQueryParam, options.sourceFileName);
  }

  const headers: Record<string, string> = {
    accept: 'application/json'
  };

  if (needsAuth) {
    const credentials = await getValidCredentials(ctx);
    headers.authorization = `Bearer ${credentials.access_token}`;
  }

  let body: string | Blob | undefined;
  if (options.rawBody !== undefined) {
    if (typeof options.rawBody === 'string') {
      body = options.rawBody;
    } else {
      const bytes = new Uint8Array(options.rawBody.byteLength);
      bytes.set(options.rawBody);
      body = new Blob([bytes.buffer]);
    }
    if (options.contentType) {
      headers['content-type'] = options.contentType;
    }
  } else if (options.body !== undefined) {
    parseJsonObjectOrArray(JSON.stringify(options.body));
    body = JSON.stringify(options.body);
    headers['content-type'] = options.contentType ?? 'application/json';
  }

  const maxAttempts = ctx.config.retryAttempts + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ctx.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const text = await response.text();
      const parsed = safeJsonParse(text) as
        | { success?: boolean; message?: string; data?: unknown }
        | null;

      if (!response.ok || (parsed && parsed.success === false)) {
        const message = parsed?.message ?? (text || `HTTP ${response.status} ${response.statusText}`);
        const retryable = RETRYABLE_STATUS.has(response.status);

        if (retryable && attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 100);
          await sleep(ctx.config.retryDelayMs * attempt + jitter);
          continue;
        }

        throw runtimeError(message, command, {
          code: 'HTTP_REQUEST_FAILED',
          category: 'http',
          status: response.status,
          retryable,
          requestId: response.headers.get('x-request-id'),
          details: {
            command,
            endpoint: `${method} ${path}`,
            method,
            url: url.toString(),
            attempt,
            maxAttempts
          }
        });
      }

      if (parsed) {
        return parsed;
      }

      return text;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'CliError') {
        throw error;
      }

      const retryable = isRetryableNetworkError(error);
      if (retryable && attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 100);
        await sleep(ctx.config.retryDelayMs * attempt + jitter);
        continue;
      }

      throw runtimeError(error instanceof Error ? error.message : 'Network request failed', command, {
        code: error instanceof Error && error.name === 'AbortError' ? 'request_timeout' : 'network_error',
        category: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network',
        status: null,
        retryable,
        details: {
          command,
          endpoint: `${method} ${path}`,
          method,
          url: url.toString(),
          attempt,
          maxAttempts
        }
      });
    }
  }

  throw runtimeError('Unexpected request failure', command, {
    code: 'network_error',
    category: 'network',
    status: null,
    retryable: false,
    details: { command, endpoint: `${method} ${path}` }
  });
}
