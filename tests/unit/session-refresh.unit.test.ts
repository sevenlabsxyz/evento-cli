import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeContext } from '../../src/types.js';
import { getValidCredentials } from '../../src/session/refresh.js';
import { readCredentials, writeCredentials } from '../../src/storage/credentials.js';
import { createClient } from '@supabase/supabase-js';

vi.mock('../../src/storage/credentials.js', () => ({
  readCredentials: vi.fn(),
  writeCredentials: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

function ctx(overrides?: Partial<RuntimeContext['config']>): RuntimeContext {
  return {
    commandName: 'auth status',
    config: {
      profile: 'default',
      format: 'json',
      apiBaseUrl: 'https://evento.so/api',
      timeoutMs: 15000,
      retryAttempts: 2,
      retryDelayMs: 250,
      configPath: '~/.evento/config.json',
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'anon',
      ...overrides
    },
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin
  };
}

function credentials(expiresInSeconds: number) {
  return {
    version: 1 as const,
    profile: 'default',
    access_token: 'a0',
    refresh_token: 'r0',
    expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    token_type: 'bearer' as const,
    updated_at: new Date().toISOString()
  };
}

describe('getValidCredentials', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails when no credentials exist', async () => {
    vi.mocked(readCredentials).mockResolvedValue(null);
    await expect(getValidCredentials(ctx())).rejects.toMatchObject({
      payload: { code: 'auth_required' }
    });
  });

  it('returns current credentials when not near expiry', async () => {
    const current = credentials(600);
    vi.mocked(readCredentials).mockResolvedValue(current);

    const result = await getValidCredentials(ctx());
    expect(result).toEqual(current);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('fails if refresh needed but supabase config missing', async () => {
    vi.mocked(readCredentials).mockResolvedValue(credentials(10));
    await expect(
      getValidCredentials(ctx({ supabaseUrl: undefined, supabaseAnonKey: undefined }))
    ).rejects.toMatchObject({ payload: { code: 'auth_config_missing' } });
  });

  it('fails when setSession fails', async () => {
    vi.mocked(readCredentials).mockResolvedValue(credentials(10));
    vi.mocked(createClient).mockReturnValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('bad') }),
        refreshSession: vi.fn()
      }
    } as unknown as ReturnType<typeof createClient>);

    await expect(getValidCredentials(ctx())).rejects.toMatchObject({
      payload: { code: 'auth_expired' }
    });
  });

  it('returns current when setSession indicates token now valid', async () => {
    const current = credentials(10);
    vi.mocked(readCredentials).mockResolvedValue(current);
    const setSession = vi.fn().mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null
    });
    const refreshSession = vi.fn();
    vi.mocked(createClient).mockReturnValue({
      auth: {
        setSession,
        refreshSession
      }
    } as unknown as ReturnType<typeof createClient>);

    const result = await getValidCredentials(ctx());
    expect(result).toEqual(current);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(writeCredentials).not.toHaveBeenCalled();
  });

  it('refreshes and writes new credentials', async () => {
    vi.mocked(readCredentials).mockResolvedValue(credentials(10));
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'a1',
          refresh_token: 'r1',
          expires_at: Math.floor(Date.now() / 1000) + 1800,
          user: { id: 'user_1' }
        }
      },
      error: null
    });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({
          data: { session: { expires_at: Math.floor(Date.now() / 1000) + 30 } },
          error: null
        }),
        refreshSession
      }
    } as unknown as ReturnType<typeof createClient>);

    const result = await getValidCredentials(ctx());
    expect(result.access_token).toBe('a1');
    expect(result.refresh_token).toBe('r1');
    expect(writeCredentials).toHaveBeenCalledTimes(1);
  });

  it('fails when refreshSession fails', async () => {
    vi.mocked(readCredentials).mockResolvedValue(credentials(10));
    vi.mocked(createClient).mockReturnValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({
          data: { session: { expires_at: Math.floor(Date.now() / 1000) + 10 } },
          error: null
        }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('bad') })
      }
    } as unknown as ReturnType<typeof createClient>);

    await expect(getValidCredentials(ctx())).rejects.toMatchObject({
      payload: { code: 'auth_expired' }
    });
  });
});
