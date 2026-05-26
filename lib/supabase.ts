import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Identity = 'anthony' | 'yeon'

export interface Memory {
  id: string
  identity: Identity
  date: string
  photo_url: string
  caption: string | null
  created_at: string
}

export interface StreakRecord {
  id: string
  current_streak: number
  longest_streak: number
  last_shared_date: string | null
  updated_at: string
}

// Upload a photo to Supabase Storage
export async function uploadPhoto(file: File, identity: Identity, date: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${identity}/${date}.${ext}`

  const { error } = await supabase.storage
    .from('memory-photos')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('memory-photos').getPublicUrl(path)
  return data.publicUrl
}

// Save a memory entry
export async function saveMemory(
  identity: Identity,
  date: string,
  photoUrl: string,
  caption: string
): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .upsert({ identity, date, photo_url: photoUrl, caption }, { onConflict: 'identity,date' })

  if (error) throw error
}

// Get memories for a specific date
export async function getMemoriesForDate(date: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('date', date)

  if (error) throw error
  return data ?? []
}

// Get all memories ordered by date desc
export async function getAllMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data ?? []
}

// Get streak record
export async function getStreak(): Promise<StreakRecord | null> {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}
