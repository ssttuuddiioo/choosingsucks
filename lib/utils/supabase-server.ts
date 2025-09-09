import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/supabase'

// Server-side Supabase client with service role key
export function createServerClient() {
  return createClient<Database>(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}


