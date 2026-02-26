import { createClient } from '@supabase/supabase-js';
import { runtimeError } from '../errors.js';
import type { Credentials, RuntimeContext } from '../types.js';
import { readCredentials, writeCredentials } from '../storage/credentials.js';
import { secondsUntil } from '../utils/time.js';

export async function getValidCredentials(ctx: RuntimeContext): Promise<Credentials> {
  const current = await readCredentials(ctx.config.profile);
  if (!current) {
    throw runtimeError("No active credentials. Run 'evento auth login'.", ctx.commandName, {
      code: 'auth_required',
      category: 'auth',
      status: null,
      retryable: false,
      details: {
        command: ctx.commandName,
        endpoint: null
      }
    });
  }

  const secs = secondsUntil(current.expires_at);
  if (secs > 120) {
    return current;
  }

  if (!ctx.config.supabaseUrl || !ctx.config.supabaseAnonKey) {
    throw runtimeError('Missing required configuration: EVENTO_SUPABASE_URL or EVENTO_SUPABASE_ANON_KEY.', ctx.commandName, {
      code: 'auth_config_missing',
      category: 'auth',
      status: null,
      retryable: false,
      details: {
        command: ctx.commandName,
        endpoint: null
      }
    });
  }

  const supabase = createClient(ctx.config.supabaseUrl, ctx.config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const { data: setData, error: setError } = await supabase.auth.setSession({
    access_token: current.access_token,
    refresh_token: current.refresh_token
  });

  if (setError || !setData.session) {
    throw runtimeError("Session expired; refresh attempt failed. Please re-auth with 'evento auth login'.", ctx.commandName, {
      code: 'auth_expired',
      category: 'auth',
      status: null,
      retryable: false,
      details: { command: ctx.commandName, endpoint: null }
    });
  }

  if (secondsUntil(setData.session.expires_at ? new Date(setData.session.expires_at * 1000).toISOString() : current.expires_at) > 120) {
    return current;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session) {
    throw runtimeError("Session expired; refresh attempt failed. Please re-auth with 'evento auth login'.", ctx.commandName, {
      code: 'auth_expired',
      category: 'auth',
      status: null,
      retryable: false,
      details: { command: ctx.commandName, endpoint: null }
    });
  }

  const session = refreshData.session;
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
