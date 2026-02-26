import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/index.js';
import { createTestIo } from '../helpers/io.js';
import { chdir, cwd } from 'node:process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('runCli meta commands', () => {
  it('prints help', async () => {
    const harness = createTestIo();
    const code = await runCli(['--help'], harness.io);
    const io = harness.read();
    expect(code).toBe(0);
    expect(io.stdout).toContain('Usage: evento');
  });

  it('returns usage error for unknown command in json mode', async () => {
    const harness = createTestIo();
    const code = await runCli(['--format', 'json', 'wat'], harness.io);
    const io = harness.read();
    expect(code).toBe(2);
    expect(io.stdout).toContain('"success":false');
    expect(io.stdout).toContain('usage_error');
  });

  it('prints version even when cwd is outside package', async () => {
    const originalCwd = cwd();
    const temp = join(tmpdir(), `evento-cli-cwd-${randomUUID()}`);
    await mkdir(temp, { recursive: true });
    chdir(temp);
    try {
      const harness = createTestIo();
      const code = await runCli(['--version'], harness.io);
      const io = harness.read();
      expect(code).toBe(0);
      expect(io.stdout).toContain('evento/');
    } finally {
      chdir(originalCwd);
    }
  });
});
