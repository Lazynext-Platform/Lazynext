import { NextResponse } from 'next/server'

// This webhook is no longer needed.
// User creation and workspace setup is handled by Supabase database triggers.
// See lib/db/migrations/00001_supabase_init.sql — handle_new_user() function.
//
// If you need to handle additional Supabase auth events, use Supabase webhooks
// configured in the Supabase Dashboard → Database → Webhooks.

export async function POST() {
  return NextResponse.json({ message: 'Auth webhooks are handled by Supabase database triggers.' })
}
