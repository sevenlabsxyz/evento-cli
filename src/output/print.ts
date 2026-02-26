import { CliError, toFailureEnvelope } from '../errors.js';
import type { RuntimeContext, SuccessEnvelope } from '../types.js';

export function printSuccess<T>(ctx: RuntimeContext, data: T, text?: string): void {
  if (ctx.config.format === 'json') {
    const payload: SuccessEnvelope<T> = {
      success: true,
      data
    };
    ctx.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  if (text) {
    ctx.stdout.write(`${text}\n`);
    return;
  }

  if (typeof data === 'string') {
    ctx.stdout.write(`${data}\n`);
    return;
  }

  ctx.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function printNoOutputSuccess(ctx: RuntimeContext): void {
  if (ctx.config.format === 'json') {
    ctx.stdout.write('{"success":true,"data":null}\n');
  }
}

export function printError(ctx: RuntimeContext, error: unknown): 1 | 2 {
  const normalized =
    error instanceof CliError
      ? error
      : new CliError('Unexpected runtime error', 1, {
          code: 'runtime_error',
          category: 'runtime',
          status: null,
          retryable: false,
          requestId: null,
          details: {
            command: ctx.commandName,
            endpoint: null
          }
        });

  if (ctx.config.format === 'json') {
    const envelope = toFailureEnvelope(normalized);
    ctx.stdout.write(`${JSON.stringify(envelope)}\n`);
  } else {
    ctx.stderr.write(`${normalized.message}\n`);
  }

  return normalized.exitCode;
}
