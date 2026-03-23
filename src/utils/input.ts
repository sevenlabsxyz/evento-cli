import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import { usageError } from '../errors.js';
import { parseJsonObjectOrArray } from './json.js';
import { detectContentType } from './mime.js';

export interface ResolvedJsonInput {
  kind: 'json';
  value: unknown;
}

export interface ResolvedFileInput {
  kind: 'file';
  value: Buffer;
  filePath: string;
  fileName: string;
  contentType: string;
}

export type ResolvedInput = ResolvedJsonInput | ResolvedFileInput | undefined;

export async function resolveJsonInput(
  command: string,
  data?: string,
  dataFile?: string
): Promise<unknown | undefined> {
  if (data && dataFile) {
    throw usageError('Conflicting flags: --data and --data-file cannot be used together.', command);
  }
  if (data) {
    return parseJsonObjectOrArray(data);
  }
  if (!dataFile) {
    return undefined;
  }
  try {
    const raw = await readFile(dataFile, 'utf8');
    return parseJsonObjectOrArray(raw);
  } catch {
    throw usageError(`Invalid argument: --data-file path "${dataFile}" is not readable.`, command);
  }
}

export async function resolveFileInput(
  command: string,
  filePath?: string,
  contentType?: string
): Promise<ResolvedFileInput | undefined> {
  if (!filePath) {
    return undefined;
  }

  try {
    const value = await readFile(filePath);
    return {
      kind: 'file',
      value,
      filePath,
      fileName: basename(filePath),
      contentType: contentType ?? detectContentType(filePath)
    };
  } catch {
    throw usageError(`Invalid argument: --file path "${filePath}" is not readable.`, command);
  }
}
