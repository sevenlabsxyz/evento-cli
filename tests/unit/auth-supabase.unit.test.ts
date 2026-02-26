import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authLogin } from '../../src/auth/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { writeCredentials } from '../../src/storage/credentials.js';
import type { RuntimeContext } from '../../src/types.js';

const questionMock = vi.fn(async () => '123456');

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

vi.mock('../../src/storage/credentials.js', () => ({
  writeCredentials: vi.fn()
}));

vi.mock('node:readline/promises', () => ({
  default: {
    createInterface: () => ({
      question: questionMock,
      close: vi.fn()
    })
  }
}));

function ctx(overrides?: Partial<RuntimeContext['config']>): RuntimeContext {
  return {
    commandName: 'auth login',
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
    stdin: { isTTY: true } as NodeJS.ReadStream
  };
}

describe('authLogin OTP path', () => {
  beforeEach(() => {
    questionMock.mockReset();
    questionMock.mockResolvedValue('123456');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails when supabase config missing', async () => {
    await expect(
      authLogin(ctx({ supabaseUrl: undefined, supabaseAnonKey: undefined }), 'user@example.com', true)
    ).rejects.toMatchObject({ payload: { code: 'usage_error' } });
  });

  it('fails on invalid email', async () => {
    vi.mocked(createClient).mockReturnValue({ auth: {} } as unknown as ReturnType<typeof createClient>);
    await expect(authLogin(ctx(), 'not-an-email', true)).rejects.toMatchObject({
      payload: { code: 'usage_error' }
    });
  });

  it('fails when signInWithOtp returns error', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: new Error('otp send failed') }),
        verifyOtp: vi.fn()
      }
    } as unknown as ReturnType<typeof createClient>);

    await expect(authLogin(ctx(), 'user@example.com', true)).rejects.toMatchObject({
      payload: { code: 'otp_verification_failed' }
    });
  });

  it('fails when verifyOtp returns error', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('bad code') })
      }
    } as unknown as ReturnType<typeof createClient>);

    await expect(authLogin(ctx(), 'user@example.com', true)).rejects.toMatchObject({
      payload: { code: 'otp_verification_failed' }
    });
  });

  it('writes credentials and returns otp success', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'a1',
              refresh_token: 'r1',
              expires_at: Math.floor(Date.now() / 1000) + 1800,
              user: { id: 'user_1' }
            }
          },
          error: null
        })
      }
    } as unknown as ReturnType<typeof createClient>);

    const result = await authLogin(ctx(), 'user@example.com', true);
    expect(result.method).toBe('otp');
    expect(result.credentials.access_token).toBe('a1');
    expect(writeCredentials).toHaveBeenCalledTimes(1);
  });
});
