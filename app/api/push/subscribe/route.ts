import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { subscription, identity } = await req.json()
    if (!subscription || !identity) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { identity, subscription, updated_at: new Date().toISOString() },
        { onConflict: 'identity' }
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[push/subscribe]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
