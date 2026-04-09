"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error("Missing Supabase browser environment variables.");
    }

    browserClient = createClient<Database>(url, anonKey);
  }

  return browserClient;
}

