// src/supabaseClient.js
// ─────────────────────────────────────────────────────────────
// Single shared Supabase client used across the whole app.
// Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your
// Vercel environment variables (and local .env file).
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
