import { createClient } from '@supabase/supabase-js'

const isBrowser = typeof window !== 'undefined'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: isBrowser,
      detectSessionInUrl: false,
    },
  })

export { supabase }