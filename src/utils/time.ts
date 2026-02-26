export function nowIso(): string {
  return new Date().toISOString();
}

export function secondsUntil(isoTime: string): number {
  return Math.floor((new Date(isoTime).getTime() - Date.now()) / 1000);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
