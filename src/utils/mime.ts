import { extname } from 'node:path';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml'
};

export function detectContentType(filePath: string): string {
  return MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
