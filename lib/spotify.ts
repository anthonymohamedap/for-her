// Spotify PKCE OAuth + API helpers
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!
export const PLAYLIST_URL = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL ?? ''

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

interface SpotifyTokens { accessToken: string; refreshToken: string; expiresAt: number }

export function saveTokens(t: SpotifyTokens) {
  if (typeof window === 'undefined') return
  localStorage.setItem('spotify_tokens', JSON.stringify(t))
}
export function loadTokens(): SpotifyTokens | null {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem('spotify_tokens'); return r ? JSON.parse(r) : null } catch { return null }
}
export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('spotify_tokens')
  localStorage.removeItem('spotify_code_verifier')
}

function randomBase64url(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
async function sha256Base64url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}

export async function startLogin() {
  const verifier = randomBase64url(64)
  const challenge = await sha256Base64url(verifier)
  localStorage.setItem('spotify_code_verifier', verifier)
  const params = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI, scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const verifier = localStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('Missing PKCE verifier')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, code_verifier: verifier }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const d = await res.json()
  const tokens = { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000 }
  saveTokens(tokens)
  localStorage.removeItem('spotify_code_verifier')
  return tokens
}

export async function refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLIENT_ID }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const d = await res.json()
  const tokens = { accessToken: d.access_token, refreshToken: d.refresh_token ?? refreshToken, expiresAt: Date.now() + d.expires_in * 1000 }
  saveTokens(tokens)
  return tokens
}

export async function getValidToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (Date.now() > tokens.expiresAt - 60_000) {
    try { const r = await refreshTokens(tokens.refreshToken); return r.accessToken }
    catch { clearTokens(); return null }
  }
  return tokens.accessToken
}

export interface NowPlaying {
  isPlaying: boolean; title: string; artist: string
  albumArt: string | null; trackUrl: string; progressMs: number; durationMs: number
}

const EMPTY: NowPlaying = { isPlaying: false, title: '', artist: '', albumArt: null, trackUrl: '', progressMs: 0, durationMs: 0 }

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const token = await getValidToken()
  if (!token) return null
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 204 || res.status === 404) return EMPTY
    if (!res.ok) { if (res.status === 401) clearTokens(); return null }
    const data = await res.json()
    const item = data.item
    if (!item) return EMPTY
    return {
      isPlaying: data.is_playing,
      title: item.name,
      artist: item.artists?.map((a: { name: string }) => a.name).join(', ') ?? '',
      albumArt: item.album?.images?.[0]?.url ?? null,
      trackUrl: item.external_urls?.spotify ?? '',
      progressMs: data.progress_ms ?? 0,
      durationMs: item.duration_ms ?? 0,
    }
  } catch { return null }
}

// ── Playback control (requires Premium + user-modify-playback-state scope) ────

async function playerCmd(method: string, endpoint: string, body?: object): Promise<boolean> {
  const token = await getValidToken()
  if (!token) return false
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/player${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    // 204 = success with no body, 202 = accepted, 200 = ok
    return res.status === 204 || res.status === 202 || res.status === 200
  } catch { return false }
}

export async function spotifyPlay():     Promise<boolean> { return playerCmd('PUT',  '/play') }
export async function spotifyPause():    Promise<boolean> { return playerCmd('PUT',  '/pause') }
export async function spotifyNext():     Promise<boolean> { return playerCmd('POST', '/next') }
export async function spotifyPrev():     Promise<boolean> { return playerCmd('POST', '/previous') }
export async function spotifySeek(ms: number): Promise<boolean> {
  return playerCmd('PUT', `/seek?position_ms=${Math.round(ms)}`)
}
