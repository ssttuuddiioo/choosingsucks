import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/supabase'

// Lazy-initialized singleton — avoids crashing during static prerendering
// when env vars aren't available yet
let supabaseBrowserClient: ReturnType<typeof createClient<Database>> | null = null

export function createBrowserClient() {
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient<Database>(
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
  return supabaseBrowserClient
}

// Backward-compatible export — proxies to the lazy singleton
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get: (_, prop) => (createBrowserClient() as any)[prop],
})
