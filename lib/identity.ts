import type { Identity } from './supabase'

const IDENTITY_KEY = 'garden_identity'

export function getIdentity(): Identity | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(IDENTITY_KEY)
  if (val === 'anthony' || val === 'yeon') return val
  return null
}

export function setIdentity(identity: Identity): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(IDENTITY_KEY, identity)
}

export function clearIdentity(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IDENTITY_KEY)
}

export function getDisplayName(identity: Identity): string {
  return identity === 'anthony' ? 'Anthony' : 'Yeon'
}

export function getPartnerIdentity(identity: Identity): Identity {
  return identity === 'anthony' ? 'yeon' : 'anthony'
}
