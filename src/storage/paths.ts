import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface StoragePaths {
  configDir: string;
  configPath: string;
  credentialsPath: string;
  credentialsBackupPath: string;
  lockPath: string;
}

export function resolveStoragePaths(configPathOverride?: string): StoragePaths {
  const configDir = join(homedir(), '.evento');
  const configPath = configPathOverride ? resolve(configPathOverride) : join(configDir, 'config.json');
  return {
    configDir,
    configPath,
    credentialsPath: join(configDir, 'credentials.json'),
    credentialsBackupPath: join(configDir, 'credentials.json.bak'),
    lockPath: join(configDir, 'credentials.lock')
  };
}
