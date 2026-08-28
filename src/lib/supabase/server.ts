import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Client Supabase para uso em Server Components e Server Actions.
 *
 * Sem o generic <Database> de propósito: o schema hand-written em
 * types/database.ts não cobre Views/Functions/Enums, o que faz o
 * supabase-js colapsar os tipos de insert/update para `never`. Os
 * pontos de leitura já fazem cast pros tipos de app (Usuario, Empresa,
 * Unidade). Troque para o Database gerado via
 * `supabase gen types typescript` (ver README) quando ele existir.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // chamado a partir de um Server Component: ignorado,
            // o middleware cuida de renovar a sessão.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ver comentário acima.
          }
        },
      },
    }
  );
}

/** Client com a service role — só para ações administrativas no servidor. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createRawClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
