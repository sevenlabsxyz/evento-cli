import { existsSync, readFileSync } from 'node:fs';
import { usageError } from '../errors.js';
import type { ConfigFile, GlobalFlags, ResolvedConfig } from '../types.js';
import { resolveStoragePaths } from '../storage/paths.js';

const DEFAULT_API_BASE_URL = 'https://evento.so/api';

function parseInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  key: string
): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw usageError(
      `Invalid configuration value for ${key}: expected ${min}-${max}, received ${value}`,
      'root'
    );
  }
  return parsed;
}

function readConfig(configPath: string): ConfigFile {
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf8')) as ConfigFile;
  } catch {
    throw usageError(`Invalid configuration file: ${configPath} contains invalid JSON`, 'root');
  }
}

export function resolveConfig(flags: GlobalFlags, isStdoutTty: boolean): ResolvedConfig {
  const paths = resolveStoragePaths(process.env.EVENTO_CONFIG_PATH);
  const config = readConfig(paths.configPath);

  const profile =
    flags.profile ?? process.env.EVENTO_PROFILE ?? config.activeProfile ?? 'default';

  const profiles = config.profiles ?? {};
  const selectedProfile = profiles[profile] ?? {};

  if (config.profiles && !(profile in config.profiles)) {
    const names = Object.keys(config.profiles);
    throw usageError(
      `Invalid profile: ${profile}. Available profiles: ${names.join(', ') || 'none'}`,
      'root'
    );
  }

  const rawFormat = flags.format ?? (process.env.EVENTO_FORMAT as 'json' | 'text' | undefined);
  if (rawFormat && rawFormat !== 'json' && rawFormat !== 'text') {
    throw usageError(
      `Invalid configuration value for EVENTO_FORMAT: expected json|text, received ${rawFormat}`,
      'root'
    );
  }

  const format = rawFormat ?? (isStdoutTty ? 'text' : 'json');

  const apiBaseUrl = (flags.baseUrl ??
    process.env.EVENTO_API_BASE_URL ??
    selectedProfile.apiBaseUrl ??
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, '');

  const timeoutMs = parseInteger(
    process.env.EVENTO_API_TIMEOUT_MS ??
      (selectedProfile.timeoutMs !== undefined ? String(selectedProfile.timeoutMs) : undefined),
    15000,
    1000,
    60000,
    'EVENTO_API_TIMEOUT_MS'
  );

  const retryAttempts = parseInteger(
    process.env.EVENTO_API_RETRY_ATTEMPTS ??
      (selectedProfile.retryAttempts !== undefined
        ? String(selectedProfile.retryAttempts)
        : undefined),
    2,
    0,
    5,
    'EVENTO_API_RETRY_ATTEMPTS'
  );

  const retryDelayMs = parseInteger(
    process.env.EVENTO_API_RETRY_DELAY_MS ??
      (selectedProfile.retryDelayMs !== undefined ? String(selectedProfile.retryDelayMs) : undefined),
    250,
    50,
    5000,
    'EVENTO_API_RETRY_DELAY_MS'
  );

  return {
    profile,
    format,
    apiBaseUrl,
    supabaseUrl: process.env.EVENTO_SUPABASE_URL ?? selectedProfile.supabaseUrl,
    supabaseAnonKey: process.env.EVENTO_SUPABASE_ANON_KEY ?? selectedProfile.supabaseAnonKey,
    timeoutMs,
    retryAttempts,
    retryDelayMs,
    configPath: paths.configPath
  };
}
