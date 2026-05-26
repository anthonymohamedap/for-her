// Spotify PKCE OAuth + API helpers
// No client secret needed — everything runs in the browser

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!
export const PLAYLIST_URL = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL ?? ''

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ')

// ─── Token storage ────────────────────────────────────────────────────────────

interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number   // Unix ms
}

export function saveTokens(tokens: SpotifyTokens) {
  if (typeof window === 'undefined') return
  localStorage.setItem('spotify_tokens', JSON.stringify(tokens))
}

export function loadTokens(): SpotifyTokens | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('spotify_tokens')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('spotify_tokens')
  localStorage.removeItem('spotify_code_verifier')
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function randomBase64url(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return btoa(String.fromCharCode(...Array.from(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sha256Base64url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

export async function startLogin() {
  const verifier = randomBase64url(64)
  const challenge = await sha256Base64url(verifier)
  localStorage.setItem('spotify_code_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const verifier = localStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('Missing PKCE verifier')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json()

  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  saveTokens(tokens)
  localStorage.removeItem('spotify_code_verifier')
  return tokens
}

export async function refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()

  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  saveTokens(tokens)
  return tokens
}

// ─── Get a valid access token (refresh if needed) ─────────────────────────────

export async function getValidToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null

  // Refresh 60s before expiry
  if (Date.now() > tokens.expiresAt - 60_000) {
    try {
      const refreshed = await refreshTokens(tokens.refreshToken)
      return refreshed.accessToken
    } catch {
      clearTokens()
      return null
    }
  }

  return tokens.accessToken
}

// ─── Now Playing ──────────────────────────────────────────────────────────────

export interface NowPlaying {
  isPlaying: boolean
  title: string
  artist: string
  albumArt: string | null
  trackUrl: string
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const token = await getValidToken()
  if (!token) return null

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 204 || res.status === 404) {
      // Nothing playing
      return { isPlaying: false, title: '', artist: '', albumArt: null, trackUrl: '' }
    }

    if (!res.ok) {
      if (res.status === 401) clearTokens()
      return null
    }

    const data = await res.json()
    const item = data.item
    if (!item) return { isPlaying: false, title: '', artist: '', albumArt: null, trackUrl: '' }

    return {
      isPlaying: data.is_playing,
      title: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', ') ?? '',
      albumArt: item.album?.images?.[0]?.url ?? null,
      trackUrl: item.external_urls?.spotify ?? '',
    }
  } catch {
    return null
  }
}

  }
}
