import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(url && serviceRoleKey);

// Server-only client. NEVER import this from a client component or expose
// the resulting instance through the network. In archive mode the real
// Supabase env vars may be absent, so use an inert placeholder client and
// let archive-safe pages short-circuit before making queries.
export const supabaseAdmin = createClient(
  url ?? "https://archive-mode.supabase.co",
  serviceRoleKey ?? "archive-mode-placeholder",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
