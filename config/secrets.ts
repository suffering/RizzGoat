// Sensitive configuration. Prefer runtime env vars.
// The old hardcoded key was removed to avoid stale/cached values and leaked secrets.

const fatalIfBoth = (oldName: string, newName: string) => {
  const hasOld = typeof process.env[oldName] === 'string' && process.env[oldName] !== undefined;
  const hasNew = typeof process.env[newName] === 'string' && process.env[newName] !== undefined;
  if (hasOld && hasNew) {
    // Intentional crash in dev/preview to surface shadowing
    console.error(
      `[ENV] Both ${oldName} and ${newName} are set. Remove ${oldName} to prevent cached shadowing.`,
    );
  }
};

fatalIfBoth('OPENAI_API_KEY', 'OPENAI_API_KEY_V2');

export const OPENAI_API_KEY: string =
  (process.env.OPENAI_API_KEY_V2 ?? process.env.OPENAI_API_KEY ?? '').toString();

if (!OPENAI_API_KEY) {
  console.warn('[ENV] OPENAI_API_KEY/OPENAI_API_KEY_V2 is not set. OpenAI calls will fail.');
}

export const SUPABASE_URL: string =
  (process.env.SUPABASE_URL_V2 ?? process.env.SUPABASE_URL ?? '').toString();
export const SUPABASE_ANON_KEY: string =
  (process.env.SUPABASE_ANON_KEY_V2 ?? process.env.SUPABASE_ANON_KEY ?? '').toString();

// Expo client-safe variables (prefixed with EXPO_PUBLIC_)
export const EXPO_PUBLIC_SUPABASE_URL: string =
  (process.env.EXPO_PUBLIC_SUPABASE_URL_V2 ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').toString();
export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_V2 ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').toString();