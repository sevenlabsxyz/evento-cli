import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import readline from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { runtimeError, usageError } from '../errors.js';
import type { Credentials, RuntimeContext } from '../types.js';
import { writeCredentials } from '../storage/credentials.js';

function createSupabase(ctx: RuntimeContext) {
  if (!ctx.config.supabaseUrl || !ctx.config.supabaseAnonKey) {
    throw usageError(
      `Missing required configuration: EVENTO_SUPABASE_URL. Set --profile, EVENTO_SUPABASE_URL, or profiles.${ctx.config.profile}.supabaseUrl in ~/.evento/config.json`,
      ctx.commandName
    );
  }

  return createClient(ctx.config.supabaseUrl, ctx.config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function promptInput(ctx: RuntimeContext, label: string): Promise<string> {
  if (!ctx.stdin.isTTY) {
    throw usageError(`Missing required argument: ${label}. Run evento auth login --help.`, ctx.commandName);
  }
  const rl = readline.createInterface({ input: ctx.stdin, output: ctx.stderr });
  const value = (await rl.question(`${label}: `)).trim();
  rl.close();
  return value;
}

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  await new Promise<void>((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve());
    child.on('exit', () => resolve());
  });
}

async function waitForCallbackCode(ctx: RuntimeContext): Promise<string> {
  const code = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        runtimeError('Auth callback timeout', ctx.commandName, {
          code: 'callback_timeout',
          category: 'auth',
          status: null,
          retryable: false,
          details: { command: ctx.commandName, endpoint: null }
        })
      );
    }, 120000);

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const callbackCode = url.searchParams.get('code');
      if (!callbackCode) {
        res.statusCode = 400;
        res.end('Missing code');
        clearTimeout(timeout);
        server.close();
        reject(
          runtimeError('Auth callback payload invalid', ctx.commandName, {
            code: 'callback_payload_invalid',
            category: 'auth',
            status: null,
            retryable: false,
            details: { command: ctx.commandName, endpoint: null }
          })
        );
        return;
      }
      res.statusCode = 200;
      res.end('Authentication complete. You can return to the CLI.');
      clearTimeout(timeout);
      server.close();
      resolve(callbackCode);
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        clearTimeout(timeout);
        server.close();
        reject(
          runtimeError('Callback listener failed', ctx.commandName, {
            code: 'callback_listener_failed',
            category: 'auth',
            status: null,
            retryable: false,
            details: { command: ctx.commandName, endpoint: null }
          })
        );
        return;
      }
      ctx.stderr.write(`Waiting for callback at http://localhost:${address.port}/auth/callback\n`);
    });
  });
  return code;
}

async function persistSession(ctx: RuntimeContext, session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string };
}): Promise<Credentials> {
  const next: Credentials = {
    version: 1,
    profile: ctx.config.profile,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: new Date((session.expires_at ?? Math.floor(Date.now() / 1000 + 3600)) * 1000).toISOString(),
    token_type: 'bearer',
    updated_at: new Date().toISOString(),
    metadata: {
      user_id: session.user.id
    }
  };
  await writeCredentials(next);
  return next;
}

export async function authLogin(ctx: RuntimeContext, emailArg: string | undefined, otp: boolean): Promise<{ method: 'browser_callback' | 'otp'; credentials: Credentials }> {
  const supabase = createSupabase(ctx);
  const email = emailArg ?? (await promptInput(ctx, 'Email'));
  if (!email.includes('@')) {
    throw usageError('Invalid argument: --email requires a valid email format.', ctx.commandName);
  }

  if (otp) {
    const { error: signError } = await supabase.auth.signInWithOtp({ email });
    if (signError) {
      throw runtimeError(signError.message, ctx.commandName, {
        code: 'otp_verification_failed',
        category: 'auth',
        status: null,
        retryable: false,
        details: { command: ctx.commandName, endpoint: null }
      });
    }
    const code = await promptInput(ctx, 'OTP Code');
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.session) {
      throw runtimeError(error?.message ?? 'OTP verification failed', ctx.commandName, {
        code: 'otp_verification_failed',
        category: 'auth',
        status: null,
        retryable: false,
        details: { command: ctx.commandName, endpoint: null }
      });
    }
    const credentials = await persistSession(ctx, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.session.user
    });
    return { method: 'otp', credentials };
  }

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'http://localhost:3000/auth/callback'
    }
  });
  await openBrowser('http://localhost:3000/auth/callback');

  try {
    const callbackCode = await waitForCallbackCode(ctx);
    const { data, error } = await supabase.auth.exchangeCodeForSession(callbackCode);
    if (error || !data.session) {
      throw runtimeError(error?.message ?? 'Token exchange failed', ctx.commandName, {
        code: 'token_exchange_failed',
        category: 'auth',
        status: null,
        retryable: false,
        details: { command: ctx.commandName, endpoint: null }
      });
    }
    const credentials = await persistSession(ctx, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.session.user
    });
    return { method: 'browser_callback', credentials };
  } catch {
    ctx.stderr.write('Callback failed or timed out, falling back to OTP.\n');
    const code = await promptInput(ctx, 'OTP Code');
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.session) {
      throw runtimeError(error?.message ?? 'OTP verification failed', ctx.commandName, {
        code: 'otp_verification_failed',
        category: 'auth',
        status: null,
        retryable: false,
        details: { command: ctx.commandName, endpoint: null }
      });
    }
    const credentials = await persistSession(ctx, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.session.user
    });
    return { method: 'otp', credentials };
  }
}
