import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveConfig } from '../../src/config/resolve.js';

describe('resolveConfig', () => {
  let home: string;

  beforeEach(async () => {
    home = join(tmpdir(), `evento-cli-config-${randomUUID()}`);
    process.env.HOME = home;
    const dir = join(home, '.evento');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({
        version: 1,
        activeProfile: 'default',
        profiles: {
          default: {
            apiBaseUrl: 'https://evento.so/api',
            timeoutMs: 15000,
            retryAttempts: 2,
            retryDelayMs: 250,
            supabaseUrl: 'https://project.supabase.co',
            supabaseAnonKey: 'anon'
          }
        }
      })
    );
  });

  afterEach(() => {
    delete process.env.EVENTO_FORMAT;
    delete process.env.EVENTO_PROFILE;
    delete process.env.EVENTO_API_BASE_URL;
    delete process.env.EVENTO_API_TIMEOUT_MS;
    delete process.env.EVENTO_API_RETRY_ATTEMPTS;
    delete process.env.EVENTO_API_RETRY_DELAY_MS;
    delete process.env.EVENTO_SUPABASE_URL;
    delete process.env.EVENTO_SUPABASE_ANON_KEY;
  });

  it('uses non-tty default json format', () => {
    const config = resolveConfig({}, false);
    expect(config.format).toBe('json');
  });

  it('uses explicit format flag', () => {
    const config = resolveConfig({ format: 'text' }, false);
    expect(config.format).toBe('text');
  });

  it('uses env overrides for base url and retries', () => {
    process.env.EVENTO_API_BASE_URL = 'https://api.example.com/';
    process.env.EVENTO_API_RETRY_ATTEMPTS = '5';
    process.env.EVENTO_API_RETRY_DELAY_MS = '300';
    const config = resolveConfig({}, true);
    expect(config.apiBaseUrl).toBe('https://api.example.com');
    expect(config.retryAttempts).toBe(5);
    expect(config.retryDelayMs).toBe(300);
  });

  it('throws on invalid format', () => {
    process.env.EVENTO_FORMAT = 'xml';
    expect(() => resolveConfig({}, true)).toThrowError(/EVENTO_FORMAT/);
  });

  it('throws on invalid timeout range', () => {
    process.env.EVENTO_API_TIMEOUT_MS = '999';
    expect(() => resolveConfig({}, true)).toThrowError(/EVENTO_API_TIMEOUT_MS/);
  });

  it('throws on unknown selected profile', () => {
    process.env.EVENTO_PROFILE = 'missing';
    expect(() => resolveConfig({}, true)).toThrowError(/Invalid profile/);
  });
});
