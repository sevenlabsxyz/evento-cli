export function parseJsonObjectOrArray(input: string): unknown {
  const parsed = JSON.parse(input);
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('JSON payload must be an object or array.');
  }
  return parsed;
}

export function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
