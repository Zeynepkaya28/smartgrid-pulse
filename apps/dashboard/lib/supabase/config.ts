/**
 * Shared Supabase client settings.
 *
 * The auth cookie name is fixed: @supabase/ssr would otherwise derive it from the URL
 * host, and in Docker the server reaches Supabase via host.docker.internal while the
 * browser uses 127.0.0.1 — two names, so the server would never see the session.
 */
export const AUTH_COOKIE_NAME = "sb-smartgrid-auth-token";
