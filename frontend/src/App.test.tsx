import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@/lib/api', () => ({
  getConditions: vi.fn().mockResolvedValue({
    lat: 0,
    lon: 0,
    date: '2026-09-13',
    tideStation: null,
    tideEvents: [],
    hourly: [],
    warnings: [],
  }),
  geocodeBeach: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

function renderApp() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the CastLine heading', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'CastLine' })).toBeInTheDocument()
  })

  it('shows a beach dropdown seeded with the default list', () => {
    renderApp()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows the add beach dialog trigger', () => {
    renderApp()
    expect(screen.getByRole('button', { name: 'Add beach' })).toBeInTheDocument()
  })
})
