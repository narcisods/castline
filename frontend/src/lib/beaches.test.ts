import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedBeaches } from '@/data/seed-beaches'
import { useBeaches } from './beaches'

describe('useBeaches', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seeds from the default beach list on first run (empty storage)', () => {
    const { result } = renderHook(() => useBeaches())
    expect(result.current.beaches).toEqual(seedBeaches)
  })

  it('persists an added beach to localStorage', () => {
    const { result } = renderHook(() => useBeaches())

    act(() => {
      result.current.addBeach({ name: 'Test Beach', city: 'Test City', state: 'CA', lat: 1, lon: 2 })
    })

    expect(result.current.beaches).toHaveLength(seedBeaches.length + 1)
    const stored = JSON.parse(localStorage.getItem('castline:beaches') ?? '[]')
    expect(stored).toHaveLength(seedBeaches.length + 1)
    expect(stored.at(-1)).toMatchObject({ name: 'Test Beach' })
  })

  it('does not re-seed once storage already has a (possibly edited) list', () => {
    localStorage.setItem(
      'castline:beaches',
      JSON.stringify([{ id: 'x', name: 'Only Beach', city: 'X', state: 'CA', lat: 0, lon: 0 }]),
    )

    const { result } = renderHook(() => useBeaches())

    expect(result.current.beaches).toEqual([
      { id: 'x', name: 'Only Beach', city: 'X', state: 'CA', lat: 0, lon: 0 },
    ])
  })

  it('removes a beach by id', () => {
    const { result } = renderHook(() => useBeaches())
    const firstId = result.current.beaches[0].id

    act(() => {
      result.current.removeBeach(firstId)
    })

    expect(result.current.beaches.find((b) => b.id === firstId)).toBeUndefined()
    expect(result.current.beaches).toHaveLength(seedBeaches.length - 1)
  })
})
