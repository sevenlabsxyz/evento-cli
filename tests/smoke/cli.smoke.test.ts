import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('cli smoke', () => {
  it('prints help from built artifact', async () => {
    const { stdout } = await execFileAsync(process.execPath, ['dist/cli.js', '--help'], {
      cwd: process.cwd()
    });
    expect(stdout).toContain('Usage: evento');
  });

  it('prints version from built artifact', async () => {
    const { stdout } = await execFileAsync(process.execPath, ['dist/cli.js', '--version'], {
      cwd: process.cwd()
    });
    expect(stdout.trim()).toBe('evento/1.0.0');
  });
});
