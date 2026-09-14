# CastLine — Surf Fishing Conditions App — Project Brief

*A personal tool, built as a portfolio project: maintain a list of my own regular surf fishing beaches (unlimited, add as many as I want), browse any one beach's tide/wave/weather data via a dropdown, and — as a second, later capability — trigger an AI ranking that pulls today's data across every beach on the list and recommends the top 3 spots and time windows to fish today.*

---

## 1. Why this project exists

This is meant to be a resume/portfolio piece that proves independent, self-directed engineering — not another tutorial clone. It should show:

- Real API integration and data consolidation (multiple third-party sources, normalized into one model)
- A genuine, explainable use of AI (not a thin wrapper around a single API call)
- A finished, deployed, usable product — not a half-built repo

Because it's tied to an actual hobby (surf fishing) and seeded with my own regular spots, the goal is to build something worth using myself, not just worth showing a recruiter. Staging it as V1 (data viewer) then V2 (AI recommender) also means there's a genuinely complete, deployed product at V1, even before the AI layer exists — the project doesn't live or die on the AI part working.

## 2. Tech stack

Keeping this close to what I already use professionally, since the point is partly to demonstrate that stack in a self-directed context:

- **Frontend:** React + TypeScript, built with Vite, package-managed with Yarn
- **Data fetching:** TanStack Query
- **Styling:** Tailwind CSS (open question: possibly shadcn/ui components on top — decide once the UI takes shape)
- **Testing:** Vitest (unit), Playwright (end-to-end)
- **Backend:** Node.js + Express — a small API layer that fetches from third-party sources, normalizes/combines the data, and (in V2) calls the AI model server-side (so API keys never touch the client)
- **AI:** Claude API (Anthropic), used only in V2
- **Deployment:** TBD — Vercel/Render/Railway are reasonable options for a React + small Node backend

## 3. Core concept

### V1 — Beach data viewer (no AI)

I maintain a personal list of beaches — pre-seeded with the spots I actually fish, with no cap on how many I can add. Each beach is added by name and geocoded to coordinates. A dropdown lets me pick any one beach and see **today's** consolidated data for it:

- **Tide data** — the day's high/low tide times and the tide curve throughout the day
- **Weather data** — hourly wind speed/direction, barometric pressure (and its trend through the day), precipitation
- **Wave/swell data** — wave height, period, swell direction, at hourly resolution where available

No AI or ranking yet — just a clean, reliable view of one beach's conditions for today. This alone should be a complete, useful, deployable tool.

### V2 — "Find the best spot" (AI ranking)

A separate action (e.g. a "Find best spot" button/section) fetches today's full-day data for **every** beach on the list at once, sends it to Claude, and returns the **top 3 ranked spots**, each with:

- A recommended time window for that beach today — e.g. **"Manresa Beach, 7:00am–11:00am"**
- A short explanation of *why* — the actual factors driving it (e.g. "incoming tide, light offshore wind, 3ft swell at 9s period")
- A confidence signal when data is thin or conflicting, rather than asserting a confident answer regardless

This is same-day, not multi-day — tide state changes within a single day, so the useful question is "what time today, and where," not "which day this week."

The "why" is what makes this a real AI feature instead of a novelty — the ranking logic (what factors matter, how they interact — e.g. an incoming tide with a moderate swell might beat a bigger swell with the wrong wind direction) should be spelled out in the prompt/system design, not left implicit.

## 4. Data sources (confirmed 2026-09-13 via spike)

Spiked against 3 real beaches (Ocean Beach SF, Manresa State Beach, Linda Mar Beach) — throwaway scripts in `backend/spikes/`. All four confirmed as reliable, free, hourly-resolution, no-API-key sources:

- **Nominatim (OpenStreetMap)** — forward geocoding, beach name → lat/long. **Finding:** a `"<name>, <city>, <state>"` query can return zero results when a beach's OSM entry isn't attributed to the city it's commonly associated with (e.g. "Manresa State Beach, Watsonville, CA" misses; "Manresa State Beach, CA" hits — it's actually tagged under Rio del Mar/Santa Cruz County). Production geocoding needs a state-only fallback query when the full query misses. Also respect the ~1 req/sec rate limit and set a real User-Agent identifying the app; a stray "Access denied" was seen once and didn't recur, so it may be transient/IP-based rather than deterministic — worth keeping a retry.
- **NOAA CO-OPS Tides & Currents API** — tide predictions. **Finding:** stations are either **reference** (type `R`, full harmonic hourly curve at any datum) or **subordinate** (type `S`, offset-based — hi/lo events only, calculated from a linked `reference_id` station). The *nearest* station to a beach is often subordinate. Production normalization needs to: use the nearest station's hi/lo times directly (most locally accurate), but fetch the hourly tide curve from its `reference_id` when the nearest station doesn't serve `interval=h` (some subordinate stations do serve it directly — check per-station, don't assume). Also note: the `time_zone` param value is `lst_ldt`, not the more intuitive `lst_ld` (a real gotcha hit during the spike).
- **Open-Meteo Marine API** — wave height/period/direction + swell height/period/direction, full 24-hour hourly coverage confirmed for all 3 beaches, including bay-sheltered ones.
- **Open-Meteo (general weather)** — hourly wind speed/direction, surface pressure, precipitation, full 24-hour hourly coverage confirmed.

**Not needed:** Stormglass.io and the NOAA/NWS marine forecast API — Open-Meteo Marine covered wave/swell data completely for all spiked beaches, so no second marine source is necessary.

## 5. Scope

### V1 scope (build and ship this first)

- I can add any number of beaches by name (geocoded via Nominatim), pre-seeded with my own regular spots; no accounts — the list just lives in browser state (localStorage) or a simple local config, no cross-device sync needed
- A dropdown/select to choose one beach from the list
- Backend endpoint that, given a beach, fetches + normalizes today's tide/weather/wave data at hourly resolution
- Frontend view showing that consolidated data clearly for the selected beach
- Deployed and publicly reachable with a real URL — V1 should be a genuinely finished product on its own

**Seed list gap (2026-09-13):** 2 of the original 33 beach names couldn't be geocoded reliably and were dropped from the seed data rather than seeded with a wrong location — pick these up later via the app's own "add beach" flow once exact coordinates are known:
- **China Beach (Capitola)** — OSM has no beach by this name near Capitola; the only "China Beach" it knows in Northern California is a different, well-known one in San Francisco's Richmond District.
- **Esplanade Beach (Pacifica)** — OSM has no dedicated beach location here, only an "Esplanade Avenue" street; the beach is below the street near a past cliff collapse, but there's no precise node to geocode against.

### V2 scope (build after V1 is deployed and working)

- Backend endpoint that fetches + normalizes today's data for *every* beach on the list, sends it to Claude, and returns a top-3 ranked list (spot, time window, explanation, confidence)
- Frontend: a "Find best spot" section/button that triggers this and displays the ranked results
- Should reuse the same normalization logic from V1, not duplicate it

## 6. Explicitly out of scope (resist scope creep)

- User accounts / auth (or any cross-device persistence)
- Historical data / trends over time
- Multi-day forecasting (deliberately same-day only — see section 3)
- Species-specific recommendations (real value, but requires baking fishing domain knowledge into the prompt — its own future phase, not V1 or V2)
- Mobile app (responsive web is enough)
- Notifications/alerts
- Monetization

These are fine as "Future Improvements" bullet points in the README, not things to build now.

**Future improvement (noted 2026-09-13, not V1/V2):** a Google login so catch history can be saved per-user — what beach, when, how many fish. This directly requires the auth and cross-device persistence that are explicitly out of scope above, so it's its own later phase (a "V3"), to be scoped only after V2 (AI ranking) ships. Worth keeping in mind when designing the beach data model, though: avoid decisions now that would make adding a user-scoped catch log harder later (e.g. don't hardcode single-user assumptions any more than necessary).

## 7. Suggested build order

1. Spike: confirm which data source APIs actually work well, at hourly resolution, for a couple of the real beaches I fish; get raw data pulling in a throwaway script before building any app structure around it
2. Spike: geocoding — typed beach name to coordinates via Nominatim, including basic handling of "not found" / ambiguous results
3. Backend: data-fetching + normalization layer for a single beach (no AI yet) — get real, correct full-day data flowing
4. Frontend: beach list management (add/seed beaches) + dropdown selector + display of that consolidated data — **this completes V1; deploy it**
5. Backend: AI ranking layer — fetch data for all beaches, design the prompt/system carefully (the ranking + time-window + confidence + explanation logic), test it against a range of real conditions
6. Frontend: "Find best spot" section showing the AI's top-3 ranked results — **this completes V2; deploy it**
7. Polish: loading states, error handling, README with screenshots

## 8. Testing expectations

Consistent with how I work professionally: meaningful unit test coverage on the data normalization logic and (in V2) the ranking logic — the parts most likely to have real bugs — plus at least a basic Playwright smoke test per stage (V1: add a beach, select it, see its data; V2: trigger the ranking, see a top-3 result).

---

## How to work with Claude for VS Code on this

- **Start every new session by pointing it at this file** — "Read castline-project-brief.md, then let's start on step X" — so it has the full context without me re-explaining the project each time.
- **Work one phase at a time**, in the order in section 7, and don't start V2 work until V1 is actually deployed and working. Don't ask it to "build the whole app" in one shot — that produces something broad and shallow instead of something I actually understand and can defend in an interview.
- **Ask it to propose an approach before writing code** for anything non-trivial (especially the AI ranking prompt design and the data normalization schema) — review the plan, adjust, then have it implement.
- **Keep this file updated** as decisions get made (e.g. once I pick the final data sources, or decide on shadcn/ui) — it should stay the single source of truth for the project, the same way a README or design doc would on a real team.
- **Be explicit about "done"** for each phase — e.g. "V1 is done when I can add a beach, select it from the dropdown, and see real today's-data for it, verified by a passing test" — so there's a clear stopping point instead of open-ended iteration.
