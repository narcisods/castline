import { useCallback, useEffect, useState } from 'react'
import { seedBeaches } from '@/data/seed-beaches'
import type { Beach } from '@/types/beach'

const STORAGE_KEY = 'castline:beaches'

function loadBeaches(): Beach[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return seedBeaches
    return JSON.parse(raw) as Beach[]
  } catch {
    return seedBeaches
  }
}

function saveBeaches(beaches: Beach[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beaches))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - fail silently,
    // the in-memory list still works for the current session.
  }
}

export function useBeaches() {
  const [beaches, setBeaches] = useState<Beach[]>(() => loadBeaches())

  useEffect(() => {
    saveBeaches(beaches)
  }, [beaches])

  const addBeach = useCallback((beach: Omit<Beach, 'id'>) => {
    const withId: Beach = { ...beach, id: crypto.randomUUID() }
    setBeaches((prev) => [...prev, withId])
    return withId
  }, [])

  const removeBeach = useCallback((id: string) => {
    setBeaches((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { beaches, addBeach, removeBeach }
}
