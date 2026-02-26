import {
  chmod,
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { runtimeError } from '../errors.js';
import type { Credentials } from '../types.js';
import { resolveStoragePaths } from './paths.js';
import { nowIso, sleep } from '../utils/time.js';

function validateCredentials(value: unknown): Credentials {
  if (!value || typeof value !== 'object') {
    throw new Error('schema_invalid');
  }
  const c = value as Record<string, unknown>;
  if (
    c.version !== 1 ||
    typeof c.profile !== 'string' ||
    typeof c.access_token !== 'string' ||
    typeof c.refresh_token !== 'string' ||
    typeof c.expires_at !== 'string' ||
    c.token_type !== 'bearer' ||
    typeof c.updated_at !== 'string'
  ) {
    throw new Error('schema_invalid');
  }
  return c as unknown as Credentials;
}

async function ensureStorageDir(): Promise<void> {
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  await mkdir(paths.configDir, { recursive: true, mode: 0o700 });
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await ensureStorageDir();
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  const start = Date.now();

  while (Date.now() - start < 5000) {
    try {
      const handle = await open(paths.lockPath, 'wx');
      try {
        return await fn();
      } finally {
        await handle.close();
        await rm(paths.lockPath, { force: true });
      }
    } catch {
      await sleep(100 + Math.floor(Math.random() * 50));
    }
  }

  throw runtimeError('Credential lock timeout', 'storage', {
    code: 'lock_contention_refresh_failed',
    category: 'auth',
    retryable: false,
    status: null,
    details: { command: 'storage', endpoint: null }
  });
}

export async function readCredentials(profile: string): Promise<Credentials | null> {
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  try {
    const metadata = await stat(paths.credentialsPath);
    if ((metadata.mode & 0o777) !== 0o600) {
      throw runtimeError(
        'Credential file mode is insecure. Run chmod 0600 ~/.evento/credentials.json.',
        'storage',
        {
          code: 'credentials_permissions_invalid',
          category: 'auth',
          retryable: false,
          status: null,
          details: { command: 'storage', endpoint: null }
        }
      );
    }

    const raw = await readFile(paths.credentialsPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const credentials = validateCredentials(parsed);
    if (credentials.profile !== profile) {
      return null;
    }
    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        const backup = await readFile(paths.credentialsBackupPath, 'utf8');
        const restored = validateCredentials(JSON.parse(backup));
        await writeCredentials(restored);
        return restored.profile === profile ? restored : null;
      } catch {
        throw runtimeError('Failed to recover credentials: invalid_json', 'storage', {
          code: 'invalid_json',
          category: 'parse',
          retryable: false,
          status: null,
          details: { command: 'storage', endpoint: null }
        });
      }
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    if (error instanceof Error && error.name === 'CliError') {
      throw error;
    }
    throw runtimeError('Failed to read credentials', 'storage', {
      code: 'corrupt_credentials',
      category: 'auth',
      retryable: false,
      status: null,
      details: { command: 'storage', endpoint: null }
    });
  }
}

export async function writeCredentials(input: Omit<Credentials, 'updated_at'> & { updated_at?: string }): Promise<void> {
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  await withLock(async () => {
    await ensureStorageDir();
    const payload: Credentials = {
      ...input,
      updated_at: input.updated_at ?? nowIso()
    };

    const tempPath = `${paths.credentialsPath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
    await chmod(tempPath, 0o600);
    await rename(tempPath, paths.credentialsPath);
    await chmod(paths.credentialsPath, 0o600);

    await copyFile(paths.credentialsPath, paths.credentialsBackupPath);
  });
}

export async function clearCredentials(profile: string): Promise<void> {
  const current = await readCredentials(profile);
  if (!current) {
    return;
  }
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  await withLock(async () => {
    await rm(paths.credentialsPath, { force: true });
  });
}
