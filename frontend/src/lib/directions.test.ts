import { describe, expect, it } from 'vitest'
import { buildDirectionsUrl } from './directions'

describe('buildDirectionsUrl', () => {
  it('builds a Google Maps directions URL for the given coordinates', () => {
    expect(buildDirectionsUrl(37.7561513, -122.510185)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=37.7561513,-122.510185',
    )
  })
})
