import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/index.js';
import { createTestIo } from '../helpers/io.js';

describe('api integration', () => {
  let home: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    home = join(tmpdir(), `evento-cli-${randomUUID()}`);
    process.env.HOME = home;
    process.env.EVENTO_PROFILE = 'default';
    process.env.EVENTO_FORMAT = 'json';
    process.env.EVENTO_API_BASE_URL = 'https://evento.so/api';

    const configDir = join(home, '.evento');
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, 'config.json'),
      JSON.stringify({
        version: 1,
        activeProfile: 'default',
        profiles: {
          default: {
            apiBaseUrl: 'https://evento.so/api'
          }
        }
      })
    );

    await writeFile(
      join(configDir, 'credentials.json'),
      JSON.stringify({
        version: 1,
        profile: 'default',
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        token_type: 'bearer',
        updated_at: new Date().toISOString()
      })
    );
    await chmod(join(configDir, 'credentials.json'), 0o600);

    fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          message: 'ok',
          data: [{ id: 'evt_1' }]
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EVENTO_PROFILE;
    delete process.env.EVENTO_FORMAT;
    delete process.env.EVENTO_API_BASE_URL;
  });

  it('calls events list successfully', async () => {
    const harness = createTestIo();
    const code = await runCli(['events', 'list', '--limit', '10'], harness.io);
    const io = harness.read();
    expect(code).toBe(0);
    expect(io.stdout).toContain('"success":true');
    expect(io.stdout).toContain('evt_1');
  });

  it('calls named profile get successfully', async () => {
    const harness = createTestIo();
    const code = await runCli(['profile', 'get'], harness.io);
    const io = harness.read();
    expect(code).toBe(0);
    expect(io.stdout).toContain('"success":true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(firstCall[0].toString()).toContain('/v1/user');
  });

  it('uploads a file through a named command', async () => {
    const imagePath = join(home, 'photo.png');
    await writeFile(imagePath, Buffer.from([1, 2, 3]));

    const harness = createTestIo();
    const code = await runCli(['event', 'gallery', 'upload', 'evt_1', '--file', imagePath], harness.io);
    const io = harness.read();

    expect(code).toBe(0);
    expect(io.stdout).toContain('"success":true');
    const firstCall = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(firstCall[0].toString()).toContain('/v1/events/evt_1/gallery/upload?filename=photo.png');
    expect(firstCall[1].method).toBe('POST');
    expect((firstCall[1].headers as Record<string, string>)['content-type']).toBe('image/png');
    expect(firstCall[1].body).toBeInstanceOf(Blob);
  });

  it('returns usage error for invalid api path', async () => {
    const harness = createTestIo();
    const code = await runCli(['api', 'GET', 'v1/events'], harness.io);
    const io = harness.read();
    expect(code).toBe(2);
    expect(io.stdout).toContain('usage_error');
  });
});
