import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** The server's Supabase client, created on first use with the secret key. Server code only. */
export function supabase(): SupabaseClient {
  client ??= createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
    auth: { persistSession: false },
  });
  return client;
}
