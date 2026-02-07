import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/supabase'

// Server-side Supabase client with service role key (falls back to anon key if not set)
export function createServerClient() {
  const key = env.supabase.serviceRoleKey || env.supabase.anonKey
  return createClient<Database>(
    env.supabase.url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}


