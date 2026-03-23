import { usageError } from './errors.js';
import { findCommandDefinition, type CommandDefinition, type ParsedNamedCommand } from './manifest.js';
import type { GlobalFlags, OutputFormat, ParsedCommand } from './types.js';

const GLOBALS = new Set(['--format', '--profile', '--base-url', '--help', '--version', '-h', '-V', '-v']);
const API_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

function readFlagValue(args: string[], index: number, flag: string, command: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw usageError(`Missing required argument for ${flag}.`, command);
  }
  return value;
}

function readInt(flag: string, value: string, command: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw usageError(`Invalid argument: ${flag} must be a non-negative integer.`, command);
  }
  return parsed;
}

function collectFlags(tokens: string[]): { flags: GlobalFlags; rest: string[] } {
  const flags: GlobalFlags = {};
  const rest: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!GLOBALS.has(token)) {
      rest.push(...tokens.slice(i));
      break;
    }
    if (token === '--help' || token === '-h') {
      flags.help = true;
      i += 1;
      continue;
    }
    if (token === '--version' || token === '-V' || token === '-v') {
      flags.version = true;
      i += 1;
      continue;
    }
    const value = readFlagValue(tokens, i, token, 'root');
    if (token === '--format') {
      if (value !== 'json' && value !== 'text') {
        throw usageError('Invalid flag value: --format must be json or text.', 'root');
      }
      flags.format = value as OutputFormat;
    } else if (token === '--profile') {
      flags.profile = value;
    } else if (token === '--base-url') {
      flags.baseUrl = value;
    }
    i += 2;
  }
  return { flags, rest };
}

function parseDataFlags(
  args: string[],
  command: string
): { data?: string; dataFile?: string; rest: string[] } {
  let data: string | undefined;
  let dataFile: string | undefined;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--data') {
      data = readFlagValue(args, i, token, command);
      i += 1;
      continue;
    }
    if (token === '--data-file') {
      dataFile = readFlagValue(args, i, token, command);
      i += 1;
      continue;
    }
    rest.push(token);
  }
  if (data && dataFile) {
    throw usageError('Conflicting flags: --data and --data-file cannot be used together.', command);
  }
  return { data, dataFile, rest };
}

function parseLegacyEvents(rest: string[]): ParsedCommand {
  const sub = rest[1];
  if (sub === 'list') {
    let limit: number | undefined;
    let offset: number | undefined;
    let q: string | undefined;
    for (let i = 2; i < rest.length; i += 1) {
      if (rest[i] === '--limit') {
        limit = readInt('--limit', readFlagValue(rest, i, '--limit', 'events list'), 'events list');
        i += 1;
        continue;
      }
      if (rest[i] === '--offset') {
        offset = readInt('--offset', readFlagValue(rest, i, '--offset', 'events list'), 'events list');
        i += 1;
        continue;
      }
      if (rest[i] === '--q') {
        q = readFlagValue(rest, i, '--q', 'events list');
        i += 1;
        continue;
      }
      throw usageError(`Unknown flag: "${rest[i]}". Run evento events --help for usage.`, 'events list');
    }
    return { family: 'events', action: 'list', limit, offset, q };
  }

  if (sub === 'get' || sub === 'delete') {
    const eventId = rest[2];
    if (!eventId) {
      throw usageError('Missing required argument: event-id. Run evento events --help.', `events ${sub}`);
    }
    return { family: 'events', action: sub, eventId };
  }

  if (sub === 'create') {
    const parsed = parseDataFlags(rest.slice(2), 'events create');
    return { family: 'events', action: 'create', data: parsed.data, dataFile: parsed.dataFile };
  }

  if (sub === 'update' || sub === 'rsvp') {
    const eventId = rest[2];
    if (!eventId) {
      throw usageError('Missing required argument: event-id. Run evento events --help.', `events ${sub}`);
    }
    const parsed = parseDataFlags(rest.slice(3), `events ${sub}`);
    return {
      family: 'events',
      action: sub,
      eventId,
      data: parsed.data,
      dataFile: parsed.dataFile
    };
  }

  throw usageError(`Unknown subcommand: "${sub ?? ''}" for events. Run evento events --help.`, 'events');
}

function parseApi(rest: string[]): ParsedCommand {
  const method = (rest[1] ?? '').toUpperCase();
  const path = rest[2];
  if (!method) {
    throw usageError('Missing required argument: METHOD. Run evento api --help.', 'api');
  }
  if (!path) {
    throw usageError('Missing required argument: PATH. Run evento api --help.', 'api');
  }
  if (!API_METHODS.has(method)) {
    throw usageError(
      `Invalid HTTP method: "${method}". Accepted: GET, POST, PUT, PATCH, DELETE, HEAD.`,
      'api'
    );
  }
  if (!path.startsWith('/')) {
    throw usageError(`Invalid path: "${path}". Path must begin with /.`, 'api');
  }
  if (path.includes('..')) {
    throw usageError(`Invalid path: "${path}". Path traversal sequences are not allowed.`, 'api');
  }

  const payloadParsed = parseDataFlags(rest.slice(3), 'api');
  const left = payloadParsed.rest;
  let file: string | undefined;
  let contentType: string | undefined;
  let noAuth = false;
  let limit: number | undefined;
  let offset: number | undefined;
  let q: string | undefined;

  for (let i = 0; i < left.length; i += 1) {
    const token = left[i];
    if (token === '--file') {
      file = readFlagValue(left, i, token, 'api');
      i += 1;
      continue;
    }
    if (token === '--content-type') {
      contentType = readFlagValue(left, i, token, 'api');
      i += 1;
      continue;
    }
    if (token === '--no-auth') {
      noAuth = true;
      continue;
    }
    if (token === '--limit') {
      limit = readInt('--limit', readFlagValue(left, i, token, 'api'), 'api');
      i += 1;
      continue;
    }
    if (token === '--offset') {
      offset = readInt('--offset', readFlagValue(left, i, token, 'api'), 'api');
      i += 1;
      continue;
    }
    if (token === '--q') {
      q = readFlagValue(left, i, token, 'api');
      i += 1;
      continue;
    }
    throw usageError(`Unknown flag: "${token}". Run evento api --help for usage.`, 'api');
  }

  if (payloadParsed.data && file) {
    throw usageError('Conflicting flags: --data/--data-file cannot be used with --file.', 'api');
  }
  if (contentType && !file) {
    throw usageError('Invalid argument: --content-type requires --file.', 'api');
  }

  return {
    family: 'api',
    action: 'call',
    method,
    path,
    data: payloadParsed.data,
    dataFile: payloadParsed.dataFile,
    file,
    contentType,
    noAuth,
    limit,
    offset,
    q
  };
}

function parseNamed(definition: CommandDefinition, matchedTokens: string[], rest: string[]): ParsedNamedCommand {
  const args = rest.slice(matchedTokens.length);
  const positionals = definition.positionals ?? [];
  const positionalValues: string[] = [];
  const options: ParsedNamedCommand['options'] = {};
  const flagsByName = new Map((definition.flags ?? []).map((flag) => [flag.name, flag]));
  const commandName = definition.tokens.join(' ');

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (!token.startsWith('--')) {
      positionalValues.push(token);
      continue;
    }

    if (token === '--data' || token === '--data-file') {
      if (!definition.acceptsJson) {
        throw usageError(`Unknown flag: "${token}". Run evento --help for usage.`, commandName);
      }
      const value = readFlagValue(args, i, token, commandName);
      if (token === '--data') {
        options.data = value;
      } else {
        options.dataFile = value;
      }
      i += 1;
      continue;
    }

    if (token === '--file' || token === '--content-type') {
      if (!definition.acceptsFile) {
        throw usageError(`Unknown flag: "${token}". Run evento --help for usage.`, commandName);
      }
      const value = readFlagValue(args, i, token, commandName);
      if (token === '--file') {
        options.file = value;
      } else {
        options.contentType = value;
      }
      i += 1;
      continue;
    }

    if (token === '--no-auth') {
      options.noAuth = true;
      continue;
    }

    const flag = flagsByName.get(token.slice(2));
    if (!flag) {
      throw usageError(`Unknown flag: "${token}". Run evento --help for usage.`, commandName);
    }
    if (flag.type === 'boolean') {
      options[flag.name] = true;
      continue;
    }
    options[flag.name] = readFlagValue(args, i, token, commandName);
    i += 1;
  }

  if (options.data && options.dataFile) {
    throw usageError('Conflicting flags: --data and --data-file cannot be used together.', commandName);
  }
  if ((options.data || options.dataFile) && options.file) {
    throw usageError('Conflicting flags: --data/--data-file cannot be used with --file.', commandName);
  }
  if (options.contentType && !options.file) {
    throw usageError('Invalid argument: --content-type requires --file.', commandName);
  }

  if (positionalValues.length < positionals.length) {
    throw usageError(
      `Missing required argument: ${positionals[positionalValues.length]}. Run evento --help for usage.`,
      commandName
    );
  }
  if (positionalValues.length > positionals.length) {
    throw usageError(`Unexpected argument: "${positionalValues[positionals.length]}".`, commandName);
  }

  return {
    family: 'named',
    definitionId: definition.id,
    commandPath: definition.tokens,
    positionals: Object.fromEntries(positionals.map((name, index) => [name, positionalValues[index]])),
    options
  };
}

export function parseArgs(argv: string[]): { flags: GlobalFlags; command: ParsedCommand } {
  const { flags, rest } = collectFlags(argv);
  if (flags.help) {
    return { flags, command: { family: 'meta', action: 'help' } };
  }
  if (flags.version) {
    return { flags, command: { family: 'meta', action: 'version' } };
  }

  const family = rest[0];
  if (!family) {
    return { flags, command: { family: 'meta', action: 'help' } };
  }

  if (family === 'auth') {
    const sub = rest[1];
    if (!sub) {
      throw usageError('Missing required argument: subcommand. Run evento auth --help.', 'auth');
    }
    if (sub === 'login') {
      let email: string | undefined;
      let otp = false;
      for (let i = 2; i < rest.length; i += 1) {
        if (rest[i] === '--email') {
          email = readFlagValue(rest, i, '--email', 'auth login');
          i += 1;
          continue;
        }
        if (rest[i] === '--otp') {
          otp = true;
          continue;
        }
        throw usageError(`Unknown flag: "${rest[i]}". Run evento auth --help for usage.`, 'auth login');
      }
      if (otp && !email) {
        throw usageError('Invalid argument: --otp requires --email.', 'auth login');
      }
      return { flags, command: { family: 'auth', action: 'login', email, otp } };
    }
    if (sub === 'status' || sub === 'logout' || sub === 'token') {
      if (rest.length > 2) {
        throw usageError(`Unknown flag: "${rest[2]}". Run evento auth --help for usage.`, `auth ${sub}`);
      }
      return { flags, command: { family: 'auth', action: sub } };
    }
    throw usageError(`Unknown subcommand: "${sub}" for auth. Run evento auth --help.`, 'auth');
  }

  if (family === 'user') {
    if (rest[1] !== 'me') {
      throw usageError(`Unknown subcommand: "${rest[1] ?? ''}" for user. Run evento user --help.`, 'user');
    }
    return { flags, command: { family: 'user', action: 'me' } };
  }

  if (family === 'events') {
    return { flags, command: parseLegacyEvents(rest) };
  }

  if (family === 'api') {
    return { flags, command: parseApi(rest) };
  }

  const named = findCommandDefinition(rest);
  if (named) {
    return {
      flags,
      command: parseNamed(named.definition, named.matchedTokens, rest)
    };
  }

  return {
    flags,
    command: { family: 'meta', action: 'unknown', unknownToken: family }
  };
}
