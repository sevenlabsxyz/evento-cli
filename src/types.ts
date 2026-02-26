export type OutputFormat = 'json' | 'text';

export interface CliErrorData {
  code: string;
  category: 'http' | 'network' | 'timeout' | 'auth' | 'parse' | 'cancelled' | 'usage_error' | 'runtime';
  status: number | null;
  retryable: boolean;
  requestId: string | null;
  details: {
    command: string;
    endpoint: string | null;
    [key: string]: unknown;
  };
}

export interface FailureEnvelope {
  success: false;
  message: string;
  data: null;
  error: CliErrorData;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ProfileConfig {
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface ConfigFile {
  version?: number;
  activeProfile?: string;
  profiles?: Record<string, ProfileConfig>;
}

export interface ResolvedConfig {
  profile: string;
  format: OutputFormat;
  apiBaseUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  configPath: string;
}

export interface Credentials {
  version: 1;
  profile: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: 'bearer';
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export type ParsedCommand =
  | { family: 'meta'; action: 'help' | 'version' | 'unknown'; unknownToken?: string }
  | { family: 'auth'; action: 'login'; email?: string; otp: boolean }
  | { family: 'auth'; action: 'status' | 'logout' | 'token' }
  | { family: 'user'; action: 'me' }
  | {
      family: 'events';
      action: 'list';
      limit?: number;
      offset?: number;
      q?: string;
    }
  | { family: 'events'; action: 'get' | 'delete'; eventId: string }
  | {
      family: 'events';
      action: 'create';
      data?: string;
      dataFile?: string;
    }
  | {
      family: 'events';
      action: 'update' | 'rsvp';
      eventId: string;
      data?: string;
      dataFile?: string;
    }
  | {
      family: 'api';
      action: 'call';
      method: string;
      path: string;
      data?: string;
      dataFile?: string;
      limit?: number;
      offset?: number;
      q?: string;
    };

export interface GlobalFlags {
  format?: OutputFormat;
  profile?: string;
  baseUrl?: string;
  help?: boolean;
  version?: boolean;
}

export interface RuntimeContext {
  config: ResolvedConfig;
  commandName: string;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
}
