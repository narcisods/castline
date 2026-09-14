import { describe, expect, it } from 'vitest'
import { computeWavePowerKw } from './wavePower.js'

describe('computeWavePowerKw', () => {
  it('matches the reference deep-water wave power formula for a 1m/10s swell', () => {
    // ~1m swell height in feet, 10s period -> ~4.9 kW/m is the textbook reference figure
    expect(computeWavePowerKw(3.28084, 10)).toBeCloseTo(4.91, 2)
  })

  it('computes a small swell as low power', () => {
    expect(computeWavePowerKw(2, 8)).toBeCloseTo(1.46, 2)
  })

  it('computes a large swell as high power', () => {
    expect(computeWavePowerKw(6, 14)).toBeCloseTo(22.97, 2)
  })

  it('is zero for zero height', () => {
    expect(computeWavePowerKw(0, 5)).toBe(0)
  })

  it('returns null when height is missing', () => {
    expect(computeWavePowerKw(null, 10)).toBeNull()
  })

  it('returns null when period is missing', () => {
    expect(computeWavePowerKw(4, null)).toBeNull()
  })

  it('returns null when both are missing', () => {
    expect(computeWavePowerKw(null, null)).toBeNull()
  })

  it('scales with the square of height (doubling height ~4x\'s power)', () => {
    const base = computeWavePowerKw(2, 10) as number
    const doubled = computeWavePowerKw(4, 10) as number
    expect(doubled / base).toBeCloseTo(4, 1)
  })

  it('scales linearly with period', () => {
    const base = computeWavePowerKw(3, 5) as number
    const doubled = computeWavePowerKw(3, 10) as number
    expect(doubled / base).toBeCloseTo(2, 1)
  })
})
