import "server-only";

function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const serverEnv = {
  instagramAccessToken: () => requireEnv("INSTAGRAM_ACCESS_TOKEN"),
  instagramVerifyToken: () => requireEnv("INSTAGRAM_VERIFY_TOKEN"),
  openRouterApiKey: () => requireEnv("OPENROUTER_API_KEY"),
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  aiModel: () => process.env.AI_MODEL ?? "google/gemma-3-12b-it:free",
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
};

