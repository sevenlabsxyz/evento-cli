import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let loaded = false;

function parseValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1);
    return unquoted.replace(/\\n/g, '\n');
  }
  return trimmed;
}

function applyEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    if (process.env[key] !== undefined) {
      continue;
    }
    const rawValue = trimmed.slice(separator + 1);
    process.env[key] = parseValue(rawValue);
  }
}

export function loadEnvFiles(options?: { cwd?: string; force?: boolean; searchDirs?: string[] }): void {
  if (loaded && !options?.force) {
    return;
  }
  const cwd = options?.cwd ?? process.cwd();
  const searchDirs = options?.searchDirs ?? [cwd];

  const seen = new Set<string>();
  for (const dir of searchDirs) {
    if (seen.has(dir)) {
      continue;
    }
    seen.add(dir);
    applyEnvFile(join(dir, '.env.local'));
    applyEnvFile(join(dir, '.env'));
  }
  loaded = true;
}
