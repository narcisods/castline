# CastLine

Surf fishing conditions app — see [castline-project-brief.md](./castline-project-brief.md) for the full project brief, scope, and build order.

## Status

**V1 in progress:** repo scaffolding + data-source spike (see the brief's build order, §7).

## Structure

Yarn workspaces monorepo:

- `frontend/` — React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query
- `backend/` — Node.js + Express + TypeScript

## Development

```bash
yarn install

yarn dev:frontend   # http://localhost:5173
yarn dev:backend    # http://localhost:3001

yarn test:frontend  # Vitest unit tests
yarn test:backend   # Vitest unit tests
yarn workspace frontend e2e  # Playwright end-to-end tests

yarn lint
```

## Future improvements

Not part of V1 or V2 — see `castline-project-brief.md` §6 for the full out-of-scope list.

- Google login + per-user catch log (date, beach, fish count) — a later "V3", requires auth and persistence deliberately deferred for now
- Species-specific recommendations
- Multi-day forecasting
- Notifications/alerts
