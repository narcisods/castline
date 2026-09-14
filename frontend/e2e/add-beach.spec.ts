import { expect, test } from '@playwright/test'

const FAKE_CONDITIONS = {
  lat: 40.1,
  lon: -124.1,
  date: '2026-09-13',
  tideStation: {
    id: '9999999',
    name: 'Test Station',
    distanceMiles: 1.2,
    type: 'R',
    hourlyCurveStationId: '9999999',
    usedReferenceFallback: false,
  },
  tideEvents: [{ time: '2026-09-13T06:42:00', heightFt: 5.2, type: 'high' }],
  hourly: [
    {
      time: '2026-09-13T12:00:00',
      tideHeightFt: 4.1,
      waveHeightFt: 3.2,
      wavePeriodSec: 9,
      waveDirectionDeg: 270,
      swellHeightFt: 2.1,
      swellPeriodSec: 11,
      swellDirectionDeg: 280,
      windSpeedMph: 8,
      windDirectionDeg: 300,
      pressureHpa: 1015,
      pressureTrend: 'steady',
      precipitationIn: 0,
    },
  ],
  warnings: [],
}

test('add a beach, select it, and see its conditions', async ({ page }) => {
  await page.route('**/api/geocode**', async (route) => {
    await route.fulfill({
      json: {
        result: { lat: 40.1, lon: -124.1, displayName: 'Test Beach, Test City, CA' },
        queryUsed: 'Test Beach, Test City, CA',
      },
    })
  })

  await page.route('**/api/conditions**', async (route) => {
    await route.fulfill({ json: FAKE_CONDITIONS })
  })

  await page.goto('/')

  await page.getByRole('button', { name: 'Add beach' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Beach name').fill('Test Beach')
  await dialog.getByLabel('City').fill('Test City')
  await dialog.getByLabel('State').fill('CA')
  await dialog.getByRole('button', { name: 'Add beach' }).click()

  await expect(page.getByRole('combobox')).toContainText('Test Beach')
  await expect(page.getByText('High 5.2ft')).toBeVisible()
  await expect(page.getByText('3.2ft')).toBeVisible() // wave height in the hourly table
})
