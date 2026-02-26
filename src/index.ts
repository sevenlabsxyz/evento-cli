import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { usageError } from './errors.js';
import { parseArgs } from './parse.js';
import { loadEnvFiles } from './config/load-env.js';
import { resolveConfig } from './config/resolve.js';
import type { RuntimeContext } from './types.js';
import { printError, printNoOutputSuccess, printSuccess } from './output/print.js';
import { rootHelp } from './commands/help.js';
import { runAuthLogin, runAuthLogout, runAuthStatus, runAuthToken } from './commands/auth.js';
import {
  runEventsCreate,
  runEventsDelete,
  runEventsGet,
  runEventsList,
  runEventsRsvp,
  runEventsUpdate
} from './commands/events.js';
import { runUserMe } from './commands/user.js';
import { runApiCall } from './commands/api.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readVersion(): string {
  const pkgPath = join(PACKAGE_ROOT, 'package.json');
  const parsed = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
  return parsed.version ?? '0.0.0';
}

export async function runCli(
  argv: string[],
  io: Pick<RuntimeContext, 'stdout' | 'stderr' | 'stdin'> = {
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin
  }
): Promise<number> {
  loadEnvFiles({ cwd: process.cwd(), searchDirs: [process.cwd(), PACKAGE_ROOT] });

  let ctx: RuntimeContext | undefined;
  const fallbackFormat = (() => {
    const idx = argv.indexOf('--format');
    if (idx >= 0 && argv[idx + 1] === 'json') {
      return 'json' as const;
    }
    if (idx >= 0 && argv[idx + 1] === 'text') {
      return 'text' as const;
    }
    if (process.env.EVENTO_FORMAT === 'json') {
      return 'json' as const;
    }
    if (process.env.EVENTO_FORMAT === 'text') {
      return 'text' as const;
    }
    return io.stdout.isTTY ? 'text' : 'json';
  })();
  try {
    const { flags, command } = parseArgs(argv);
    const config = resolveConfig(flags, Boolean(io.stdout.isTTY));

    ctx = {
      config,
      commandName:
        command.family === 'meta' ? command.action : `${command.family}${'action' in command ? ` ${command.action}` : ''}`,
      ...io
    };

    if (command.family === 'meta') {
      if (command.action === 'help') {
        io.stdout.write(`${rootHelp()}\n`);
        return 0;
      }
      if (command.action === 'version') {
        io.stdout.write(`evento/${readVersion()}\n`);
        return 0;
      }
      if (command.action === 'unknown') {
        throw usageError(
          `Unknown command: "${command.unknownToken}". Run evento --help for usage.`,
          'root'
        );
      }
    }

    if (command.family === 'auth') {
      if (command.action === 'login') {
        const data = await runAuthLogin(ctx, command.email, command.otp);
        printSuccess(ctx, { command: 'auth login', ...data });
        return 0;
      }
      if (command.action === 'status') {
        const data = await runAuthStatus(ctx);
        printSuccess(ctx, { command: 'auth status', ...data });
        return 0;
      }
      if (command.action === 'logout') {
        const data = await runAuthLogout(ctx);
        if (ctx.config.format === 'json') {
          printSuccess(ctx, { command: 'auth logout', ...data });
        } else {
          printNoOutputSuccess(ctx);
        }
        return 0;
      }
      if (command.action === 'token') {
        const data = await runAuthToken(ctx);
        if (ctx.config.format === 'json') {
          printSuccess(ctx, { command: 'auth token', ...data });
        } else {
          io.stdout.write(`${data.access_token}\n`);
        }
        return 0;
      }
    }

    if (command.family === 'user' && command.action === 'me') {
      const payload = await runUserMe(ctx);
      printSuccess(ctx, payload);
      return 0;
    }

    if (command.family === 'events') {
      if (command.action === 'list') {
        const payload = await runEventsList(ctx, command.limit, command.offset, command.q);
        printSuccess(ctx, payload);
        return 0;
      }
      if (command.action === 'get') {
        const payload = await runEventsGet(ctx, command.eventId);
        printSuccess(ctx, payload);
        return 0;
      }
      if (command.action === 'create') {
        const payload = await runEventsCreate(ctx, command.data, command.dataFile);
        printSuccess(ctx, payload);
        return 0;
      }
      if (command.action === 'update') {
        const payload = await runEventsUpdate(ctx, command.eventId, command.data, command.dataFile);
        printSuccess(ctx, payload);
        return 0;
      }
      if (command.action === 'delete') {
        const payload = await runEventsDelete(ctx, command.eventId);
        printSuccess(ctx, payload);
        return 0;
      }
      if (command.action === 'rsvp') {
        const payload = await runEventsRsvp(ctx, command.eventId, command.data, command.dataFile);
        printSuccess(ctx, payload);
        return 0;
      }
    }

    if (command.family === 'api') {
      const payload = await runApiCall(
        ctx,
        command.method,
        command.path,
        command.data,
        command.dataFile,
        command.limit,
        command.offset,
        command.q
      );
      printSuccess(ctx, payload);
      return 0;
    }

    throw usageError('Unknown command. Run evento --help for usage.', 'root');
  } catch (error) {
    const context: RuntimeContext =
      ctx ?? {
        config: {
          profile: 'default',
          format: fallbackFormat,
          apiBaseUrl: 'https://evento.so/api',
          timeoutMs: 15000,
          retryAttempts: 2,
          retryDelayMs: 250,
          configPath: '~/.evento/config.json'
        },
        commandName: 'root',
        ...io
      };
    return printError(context, error);
  }
}
