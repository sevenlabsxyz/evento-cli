import { clearCredentials } from '../storage/credentials.js';
import type { RuntimeContext } from '../types.js';
import { authLogin } from '../auth/supabase.js';
import { getValidCredentials } from '../session/refresh.js';

export async function runAuthLogin(
  ctx: RuntimeContext,
  email: string | undefined,
  otp: boolean
): Promise<{ profile: string; state: 'authenticated'; method: 'browser_callback' | 'otp'; expires_at: string; token_type: 'bearer' }> {
  const result = await authLogin(ctx, email, otp);
  return {
    profile: ctx.config.profile,
    state: 'authenticated',
    method: result.method,
    expires_at: result.credentials.expires_at,
    token_type: 'bearer'
  };
}

export async function runAuthStatus(
  ctx: RuntimeContext
): Promise<{ profile: string; authenticated: true; state: 'authenticated'; expires_at: string; refresh_attempt: 'not_needed' | 'succeeded' }> {
  const credentials = await getValidCredentials(ctx);
  return {
    profile: ctx.config.profile,
    authenticated: true,
    state: 'authenticated',
    expires_at: credentials.expires_at,
    refresh_attempt: 'succeeded'
  };
}

export async function runAuthLogout(ctx: RuntimeContext): Promise<{ profile: string; state: 'unauthenticated' }> {
  await clearCredentials(ctx.config.profile);
  return {
    profile: ctx.config.profile,
    state: 'unauthenticated'
  };
}

export async function runAuthToken(
  ctx: RuntimeContext
): Promise<{ profile: string; access_token: string; token_type: 'bearer'; expires_at: string; refresh_attempt: 'not_needed' | 'succeeded' }> {
  const credentials = await getValidCredentials(ctx);
  return {
    profile: ctx.config.profile,
    access_token: credentials.access_token,
    token_type: 'bearer',
    expires_at: credentials.expires_at,
    refresh_attempt: 'succeeded'
  };
}
