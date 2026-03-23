import { usageError } from '../errors.js';
import { httpRequest } from '../http/client.js';
import { COMMAND_DEFINITIONS, type ParsedNamedCommand } from '../manifest.js';
import type { RuntimeContext } from '../types.js';
import { resolveFileInput, resolveJsonInput } from '../utils/input.js';

export async function runNamedCommand(ctx: RuntimeContext, command: ParsedNamedCommand): Promise<unknown> {
  const definition = COMMAND_DEFINITIONS.find((item) => item.id === command.definitionId);
  if (!definition) {
    throw usageError(`Unknown command definition: ${command.definitionId}`, 'root');
  }

  const jsonInput = await resolveJsonInput(definition.id, command.options.data, command.options.dataFile);
  const fileInput = await resolveFileInput(definition.id, command.options.file, command.options.contentType as string | undefined);

  if (!definition.acceptsJson && jsonInput !== undefined) {
    throw usageError('This command does not accept --data or --data-file.', definition.id);
  }
  if (!definition.acceptsFile && fileInput) {
    throw usageError('This command does not accept --file.', definition.id);
  }
  if (jsonInput !== undefined && fileInput) {
    throw usageError('Conflicting flags: --data/--data-file cannot be used with --file.', definition.id);
  }

  const built = definition.buildRequest({
    positionals: command.positionals,
    options: command.options
  });

  const requestOptions = { ...(built.options ?? {}) };

  if (requestOptions.body !== undefined && jsonInput !== undefined) {
    throw usageError('This command already derives its payload from positional arguments and cannot also accept --data.', definition.id);
  }
  if (requestOptions.rawBody !== undefined && fileInput) {
    throw usageError('This command already derives a raw body and cannot also accept --file.', definition.id);
  }

  if (jsonInput !== undefined) {
    requestOptions.body = jsonInput;
  }
  if (fileInput) {
    requestOptions.rawBody = fileInput.value;
    requestOptions.contentType = fileInput.contentType;
    requestOptions.sourceFileName = fileInput.fileName;
  }

  const hasBody = requestOptions.body !== undefined || requestOptions.rawBody !== undefined;
  if (definition.requiresBody && !hasBody) {
    if (definition.acceptsFile) {
      throw usageError('Missing required payload: provide --file <path>.', definition.id);
    }
    throw usageError('Missing required payload: provide --data <json> or --data-file <path>.', definition.id);
  }

  if (command.options.noAuth === true) {
    requestOptions.auth = false;
  }

  return httpRequest(ctx, definition.id, built.method, built.path, requestOptions);
}
