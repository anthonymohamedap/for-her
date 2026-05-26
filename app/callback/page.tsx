'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { exchangeCode } from '@/lib/spotify'

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      router.replace('/')
      return
    }

    exchangeCode(code)
      .then(() => router.replace('/'))
      .catch(() => router.replace('/'))
  }, [params, router])

  return (
    <main className="fixed inset-0 bg-black flex items-center justify-center">
      <p className="text-white/40 text-sm font-caveat tracking-wide">Connecting to Spotify…</p>
    </main>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <main className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading…</p>
      </main>
    }>
      <CallbackInner />
    </Suspense>
  )
}
