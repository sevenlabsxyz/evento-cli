import type { CliErrorData, FailureEnvelope } from './types.js';

export class CliError extends Error {
  readonly exitCode: 1 | 2;
  readonly payload: CliErrorData;

  constructor(message: string, exitCode: 1 | 2, payload: CliErrorData) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.payload = payload;
  }
}

export function usageError(message: string, command: string): CliError {
  return new CliError(message, 2, {
    code: 'usage_error',
    category: 'usage_error',
    status: null,
    retryable: false,
    requestId: null,
    details: {
      command,
      endpoint: null,
      message
    }
  });
}

export function runtimeError(
  message: string,
  command: string,
  details: Partial<CliErrorData> = {}
): CliError {
  const category = details.category ?? 'runtime';
  return new CliError(message, 1, {
    code: details.code ?? 'runtime_error',
    category,
    status: details.status ?? null,
    retryable: details.retryable ?? false,
    requestId: details.requestId ?? null,
    details: {
      command,
      endpoint: details.details?.endpoint as string | null,
      ...(details.details ?? {})
    }
  });
}

export function toFailureEnvelope(error: CliError): FailureEnvelope {
  return {
    success: false,
    message: error.message,
    data: null,
    error: error.payload
  };
}
