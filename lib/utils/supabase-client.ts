import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/supabase'

// Create a single instance that's reused everywhere
const supabaseBrowserClient = createClient<Database>(
  env.supabase.url,
  env.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Export the singleton instance directly
export const supabase = supabaseBrowserClient

// Keep the function for backward compatibility, but return the same instance
export function createBrowserClient() {
  return supabaseBrowserClient
}


