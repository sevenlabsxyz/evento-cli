import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpRequest } from '../../src/http/client.js';
import type { RuntimeContext } from '../../src/types.js';
import { getValidCredentials } from '../../src/session/refresh.js';

vi.mock('../../src/session/refresh.js', () => ({
  getValidCredentials: vi.fn()
}));

function createContext(): RuntimeContext {
  return {
    commandName: 'test',
    config: {
      profile: 'default',
      format: 'json',
      apiBaseUrl: 'https://evento.so/api',
      timeoutMs: 100,
      retryAttempts: 2,
      retryDelayMs: 0,
      configPath: '~/.evento/config.json'
    },
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin
  };
}

describe('httpRequest', () => {
  beforeEach(() => {
    vi.mocked(getValidCredentials).mockResolvedValue({
      version: 1,
      profile: 'default',
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      token_type: 'bearer',
      updated_at: new Date().toISOString()
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('builds request with auth, query, and body', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const ctx = createContext();
    const result = await httpRequest(ctx, 'events create', 'POST', '/v1/events', {
      query: { limit: 1, q: 'btc' },
      body: { title: 'X' }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = (fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>)[0];
    expect(firstCall).toBeDefined();
    const url = firstCall[0];
    const options = firstCall[1];
    expect(url.toString()).toContain('/v1/events?limit=1&q=btc');
    expect(options.headers).toMatchObject({
      authorization: 'Bearer token',
      'content-type': 'application/json'
    });
    expect(result).toMatchObject({ success: true, data: { ok: true } });
  });

  it('retries retryable http status then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'temporary' }), { status: 503 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const ctx = createContext();
    const result = await httpRequest(ctx, 'events list', 'GET', '/v1/events');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ success: true });
  });

  it('throws non-retryable http error with normalized data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ success: false, message: 'not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json', 'x-request-id': 'rid' }
        })
      )
    );

    const ctx = createContext();
    await expect(httpRequest(ctx, 'events get', 'GET', '/v1/events/404')).rejects.toMatchObject({
      exitCode: 1,
      payload: {
        code: 'HTTP_REQUEST_FAILED',
        category: 'http',
        status: 404,
        requestId: 'rid'
      }
    });
  });

  it('throws parse failure for non-json success body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<html>ok</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      )
    );

    const ctx = createContext();
    await expect(httpRequest(ctx, 'events list', 'GET', '/v1/events')).rejects.toMatchObject({
      payload: {
        code: 'HTTP_RESPONSE_PARSE_FAILED',
        category: 'parse'
      }
    });
  });

  it('retries network errors and fails with network_error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET socket hang up'))
      .mockRejectedValueOnce(new Error('ECONNRESET socket hang up'))
      .mockRejectedValueOnce(new Error('ECONNRESET socket hang up'));
    vi.stubGlobal('fetch', fetchMock);

    const ctx = createContext();
    await expect(httpRequest(ctx, 'events list', 'GET', '/v1/events')).rejects.toMatchObject({
      payload: {
        code: 'network_error',
        category: 'network',
        retryable: true
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('skips auth header when auth=false', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const ctx = createContext();
    await httpRequest(ctx, 'public', 'GET', '/v1/public', { auth: false });
    const firstCall = (fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>)[0];
    expect(firstCall).toBeDefined();
    const options = firstCall[1];
    expect((options.headers as Record<string, string>).authorization).toBeUndefined();
    expect(getValidCredentials).not.toHaveBeenCalled();
  });
});
