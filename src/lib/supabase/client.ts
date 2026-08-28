import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase para uso em Client Components.
 * Sem o generic <Database> — ver o comentário em lib/supabase/server.ts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
