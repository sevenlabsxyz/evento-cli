import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadEnvFiles } from '../../src/config/load-env.js';

describe('loadEnvFiles', () => {
  it('loads .env.local values when process env is unset', async () => {
    const dir = join(tmpdir(), `evento-cli-env-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, '.env.local'),
      [
        '# comment',
        'EVENTO_API_BASE_URL=https://api.example.com',
        'EVENTO_SUPABASE_URL="https://project.supabase.co"',
        'EVENTO_SUPABASE_ANON_KEY=anon-key'
      ].join('\n')
    );

    delete process.env.EVENTO_API_BASE_URL;
    delete process.env.EVENTO_SUPABASE_URL;
    delete process.env.EVENTO_SUPABASE_ANON_KEY;

    loadEnvFiles({ cwd: dir, force: true });

    expect(process.env.EVENTO_API_BASE_URL).toBe('https://api.example.com');
    expect(process.env.EVENTO_SUPABASE_URL).toBe('https://project.supabase.co');
    expect(process.env.EVENTO_SUPABASE_ANON_KEY).toBe('anon-key');
  });

  it('does not override already-set process env values', async () => {
    const dir = join(tmpdir(), `evento-cli-env-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '.env.local'), 'EVENTO_API_BASE_URL=https://from-file.example.com\n');

    process.env.EVENTO_API_BASE_URL = 'https://from-env.example.com';
    loadEnvFiles({ cwd: dir, force: true });

    expect(process.env.EVENTO_API_BASE_URL).toBe('https://from-env.example.com');
    delete process.env.EVENTO_API_BASE_URL;
  });

  it('loads from .env when .env.local is absent', async () => {
    const dir = join(tmpdir(), `evento-cli-env-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '.env'), 'EVENTO_FORMAT=json\n');

    delete process.env.EVENTO_FORMAT;
    loadEnvFiles({ cwd: dir, force: true });

    expect(process.env.EVENTO_FORMAT).toBe('json');
    delete process.env.EVENTO_FORMAT;
  });

  it('loads from secondary search directory when cwd has no env file', async () => {
    const cwdDir = join(tmpdir(), `evento-cli-env-cwd-${randomUUID()}`);
    const packageDir = join(tmpdir(), `evento-cli-env-pkg-${randomUUID()}`);
    await mkdir(cwdDir, { recursive: true });
    await mkdir(packageDir, { recursive: true });
    await writeFile(join(packageDir, '.env.local'), 'EVENTO_SUPABASE_URL=https://from-secondary.supabase.co\n');

    delete process.env.EVENTO_SUPABASE_URL;
    loadEnvFiles({ cwd: cwdDir, searchDirs: [cwdDir, packageDir], force: true });

    expect(process.env.EVENTO_SUPABASE_URL).toBe('https://from-secondary.supabase.co');
    delete process.env.EVENTO_SUPABASE_URL;
  });
});
