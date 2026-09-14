const WATER_DENSITY_KG_M3 = 1025
const GRAVITY_M_S2 = 9.81
const FT_TO_M = 0.3048

// Deep-water wave power flux: P = (rho * g^2 / 64*pi) * H^2 * T, in W per meter
// of wave crest. Standard surf-forecasting formula, computed from the swell
// component (groundswell height/period) rather than combined sea state -
// swell is the organized, predictable energy source; wind chop is noisier
// and less meaningful fed through the same formula.
const WAVE_POWER_COEFFICIENT = (WATER_DENSITY_KG_M3 * GRAVITY_M_S2 ** 2) / (64 * Math.PI)

export function computeWavePowerKw(
  swellHeightFt: number | null,
  swellPeriodSec: number | null,
): number | null {
  if (swellHeightFt === null || swellPeriodSec === null) return null
  const heightM = swellHeightFt * FT_TO_M
  const powerWattsPerMeter = WAVE_POWER_COEFFICIENT * heightM ** 2 * swellPeriodSec
  return Math.round((powerWattsPerMeter / 1000) * 100) / 100
}
