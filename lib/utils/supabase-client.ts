import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/supabase'

// Client-side Supabase client with anon key
export function createBrowserClient() {
  return createClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}


