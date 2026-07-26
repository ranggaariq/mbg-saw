# Design: Results Grouping, Dashboard Charts, Auth, Master Data

Date: 2026-07-26

## Scope

7 features on the MBG-SAW Hono/D1 app (single-file `src/index.ts`):

1. `/results` grouped-per-kriteria view
2. `/results` grouped-per-responden (per-criteria breakdown) view
3. Dashboard pie chart of decision results (K1-K4), drill-down pie per kriteria
4. Hide "Evaluasi" nav menu, toggleable (not deleted)
5. Evaluasi form: add per-kriteria "pertanyaan" text
6. Login page — staff (full access) vs guest (dashboard only, no login)
7. Master data management (staff-only): Manage Lingkup Sekolah, Manage Kriteria (edit-only)

## Non-goals

- No add/delete of kriteria (schema stays fixed at 8 `cN_score` columns on `evaluations`).
- No linking `school_scopes` to `respondents.school` (existing data stays as free text, untouched).
- No multi-account staff / user table — single staff credential via env secrets.

## 1. Auth

- No DB user table. Secrets: `STAFF_USERNAME`, `STAFF_PASSWORD`, `SESSION_SECRET` (wrangler secrets).
- `GET /login` — login form. `POST /login` — verify against secrets, set signed HTTP-only cookie (`hono/cookie` `setSignedCookie`) on success, redirect to `?redirect=` target or `/`.
- `POST /logout` — clear cookie.
- Middleware `requireStaff` applied to all routes except `/`, `/login`, `POST /login`, `POST /logout`, `POST /api/gform-webhook`. Redirects to `/login?redirect=<original path>` when cookie missing/invalid.
- Nav renders "Login" or "Logout" depending on session state (checked via `getSignedCookie`).

## 2. DB changes (`schema.sql`)

- `criteria`: add `question TEXT` column (nullable, falls back to `name` in UI if empty).
- New `settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`, seed row `('evaluasi_menu_enabled', '1')`.
- New `school_scopes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`, seeded: SMKN 1 CIOMAS, SMAN 1 CIOMAS, SMP IBG, SDN 08, SDN 05, SDN 02.

## 3. Nav / Evaluasi toggle

- `navLinks` render reads `settings.evaluasi_menu_enabled`; omits "Evaluasi" entry when `'0'`.
- `/evaluate` route itself also checks the flag — shows a "dinonaktifkan" message instead of the form when disabled (so direct navigation doesn't bypass the hide).
- Toggle lives on new staff-only page `/master` (Manajemen Data Master landing) as a switch, `POST /master/toggle-evaluasi` flips the setting.

## 4. Master data pages (staff-only, new "Manajemen" nav group)

- `/master/schools` — list/add/edit/delete rows in `school_scopes`. Simple table + inline form.
- `/master/criteria` — edit `name`, `weight`, `type`, `question` for the 8 existing rows (no add/delete). On save, validate weights still sum to 1.0 (±0.001); show a warning banner if not (does not block save).

## 5. `/results` — tabs via `?tab=summary|kriteria|responden`

- **summary** (existing): unchanged K1-K4 cards + ranked table.
- **kriteria**: per each of 8 criteria — avg raw score, avg normalized score (÷ max across evaluations), weight, weighted contribution — aggregated over all evaluations.
- **responden**: one row per respondent — each criterion's raw score + weighted contribution (score/max × weight) + final_score. Reuses the same normalization logic as `/saw-calculate`.

## 6. Dashboard pie chart

- `GET /` stays public (no auth). Adds Chart.js (CDN `<script>`) pie chart of K1-K4 counts from `saw_results`.
- Clicking a slice reveals a second pie chart section with a criteria selector (dropdown, defaults C1) showing 1-4 score distribution for the selected criterion, fetched from new `GET /api/criteria-score-distribution?criteria_id=C1` (JSON, public, read-only aggregate — no PII).

## 7. Evaluasi form

- Per-criterion block label becomes `question || name`. Score options (1-4, fixed generic labels) unchanged.

## Access matrix

| Route | Guest | Staff |
|---|---|---|
| `/` (dashboard) | ✅ | ✅ |
| `/login`, `/logout` | ✅ | ✅ |
| `/criteria`, `/respondents`, `/evaluate`, `/results` | ❌ → redirect login | ✅ |
| `/master/*` | ❌ → redirect login | ✅ |
| `POST /api/gform-webhook` | ✅ (external, unauthenticated by design) | ✅ |
| `GET /api/criteria-score-distribution` | ✅ (dashboard chart data) | ✅ |

## Testing

- Manual smoke test per route (guest redirect behavior, staff login/logout, toggle Evaluasi menu, CRUD schools, edit kriteria, results tabs render, dashboard pie + drill-down).
