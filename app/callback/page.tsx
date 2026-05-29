'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { exchangeCode } from '@/lib/spotify'

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const handled = useRef(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

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
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[spotify callback]', msg)
        setErrMsg(msg)
        // Give the user a moment to see it, then go back to retry
        setTimeout(() => router.replace('/'), 4000)
      })
  }, [params, router])

  if (errMsg) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-400/80 text-sm font-caveat tracking-wide text-center">Connection failed — retrying…</p>
        <p className="text-white/25 text-xs font-mono text-center max-w-sm break-words">{errMsg}</p>
      </main>
    )
  }

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
