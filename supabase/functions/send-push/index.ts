import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:anthonymomed@gmail.com'

// Minimal Web Push / VAPID implementation for Deno
async function sendPush(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}, payload: string) {
  const { endpoint, keys } = subscription

  // Build VAPID JWT
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claims = btoa(JSON.stringify({ aud: audience, exp: now + 86400, sub: VAPID_SUBJECT })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${claims}`

  // Import private key
  const privBytes = Uint8Array.from(atob(VAPID_PRIVATE.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const privKey = await crypto.subtle.importKey(
    'pkcs8', privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(signingInput)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwt = `${signingInput}.${sig}`

  // Encrypt payload
  const authBytes   = Uint8Array.from(atob(keys.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const p256dhBytes = Uint8Array.from(atob(keys.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const clientKey     = await crypto.subtle.importKey('raw', p256dhBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sharedBits    = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeyPair.privateKey as CryptoKey, 256)
  const serverPubRaw  = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)

  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF
  async function hkdf(ikm: ArrayBuffer, salt: Uint8Array, info: Uint8Array, len: number) {
    const key  = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const prk  = await crypto.subtle.sign('HMAC', key, salt)
    const prkK = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const t    = await crypto.subtle.sign('HMAC', prkK, new Uint8Array([...info, 1]))
    return new Uint8Array(t).slice(0, len)
  }

  const prkInfo  = new TextEncoder().encode('Content-Encoding: auth\0')
  const prk      = await hkdf(sharedBits, authBytes, prkInfo, 32)

  const cekInfo  = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...new Uint8Array(p256dhBytes), ...new Uint8Array(serverPubRaw)])
  const cek      = await hkdf(prk.buffer, salt, cekInfo, 16)
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...new Uint8Array(p256dhBytes), ...new Uint8Array(serverPubRaw)])
  const nonce    = await hkdf(prk.buffer, salt, nonceInfo, 12)

  const aesKey   = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const padded   = new Uint8Array([0, 0, ...new TextEncoder().encode(payload)])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)

  const dh = btoa(String.fromCharCode(...new Uint8Array(serverPubRaw))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const saltB64 = btoa(String.fromCharCode(...salt)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${saltB64}`,
      'Crypto-Key': `dh=${dh}`,
      'TTL': '86400',
    },
    body: encrypted,
  })

  return res
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const { sender_identity, title, body } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get subscriptions for the OTHER person
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .neq('identity', sender_identity)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    const payload = JSON.stringify({
      title: title ?? 'flowers for her 🌸',
      body: body ?? 'someone added a photo today 🌷',
      url: '/today',
    })

    let sent = 0
    for (const row of subs) {
      try {
        await sendPush(row.subscription, payload)
        sent++
      } catch (e) {
        console.error('push failed for', row.identity, e)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
