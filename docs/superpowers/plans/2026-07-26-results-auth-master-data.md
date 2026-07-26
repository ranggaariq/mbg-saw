# Results Grouping, Auth, Dashboard Charts, Master Data — Implementation Plan

> **For agentic workers:** Execute inline in this session (single-file Hono app, no test framework present — verification is manual via `wrangler dev` + `curl`, not unit tests). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add results grouping views, dashboard pie charts, staff/guest auth, toggleable Evaluasi menu, per-kriteria question text, and staff-only master data CRUD (Lingkup Sekolah, Kriteria) to the MBG-SAW Hono/D1 app.

**Architecture:** Everything stays in `src/index.ts` (existing pattern — no router/component split in this codebase) plus `schema.sql` migrations. Auth via signed cookie (`hono/cookie`), no user table. Charts via Chart.js CDN `<script>` tag, no bundler.

**Tech Stack:** Hono, Cloudflare D1, Wrangler, Tailwind CDN, Chart.js CDN, `hono/cookie`.

**Note on tests:** repo has zero test infra (`package.json` has no test runner). Adding one is out of scope (YAGNI — not requested, would be a large unrelated detour). Verification per task = start `wrangler dev` locally, hit the route with `curl` or browser, confirm expected output/status code.

---

### Task 1: Schema migrations

**Files:**
- Modify: `schema.sql`

- [ ] Add to `schema.sql` after the `criteria` table block (after line 17):
```sql
ALTER TABLE criteria ADD COLUMN question TEXT;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES ('evaluasi_menu_enabled', '1');

CREATE TABLE IF NOT EXISTS school_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO school_scopes (name) VALUES ('SMKN 1 CIOMAS'), ('SMAN 1 CIOMAS'), ('SMP IBG'), ('SDN 08'), ('SDN 05'), ('SDN 02');
```
- [ ] Since `schema.sql` starts with `DROP TABLE IF EXISTS ...` for a full re-seed, add matching drops at the top: `DROP TABLE IF EXISTS settings;` and `DROP TABLE IF EXISTS school_scopes;` (before the existing drops, order doesn't matter since no FK from them).
- [ ] Apply locally: `cd /home/ranggariq/dev/freelance/joki-ta/mbg-saw && npx wrangler d1 execute mbg-saw-db --local --file=./schema.sql`
- [ ] Verify: `npx wrangler d1 execute mbg-saw-db --local --command="SELECT * FROM settings"` → shows `evaluasi_menu_enabled | 1`. `SELECT * FROM school_scopes` → 6 rows.
- [ ] Commit: `git add schema.sql && git commit -m "feat: add settings, school_scopes tables and criteria.question column"`

---

### Task 2: Auth — login/logout + requireStaff middleware

**Files:**
- Modify: `src/index.ts`

- [ ] Install cookie helper (already bundled with `hono` — `hono/cookie` is a subpath export, no new dependency needed). Confirm: `grep -r "hono/cookie" node_modules/hono/package.json` should list the export.
- [ ] At top of `src/index.ts`, add import:
```ts
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie'
```
- [ ] Add a `requireStaff` middleware function (place near top, after `app` is created, before route definitions):
```ts
const SESSION_COOKIE = 'mbg_staff_session'

async function isStaff(c: any): Promise<boolean> {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE)
  return value === 'staff'
}

async function requireStaff(c: any, next: any) {
  if (await isStaff(c)) return next()
  return c.redirect(`/login?redirect=${encodeURIComponent(c.req.path)}`)
}
```
- [ ] Add `GET /login` and `POST /login` routes (place before the `/` dashboard route):
```ts
app.get('/login', async (c) => {
  const redirect = c.req.query('redirect') || '/'
  const error = c.req.query('error')
  const content = `
    <div class="max-w-md mx-auto mt-20">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h2 class="text-2xl font-bold text-white mb-6">Login Staff</h2>
        ${error ? `<p class="text-red-400 text-sm mb-4">Username atau password salah.</p>` : ''}
        <form method="post" action="/login">
          <input type="hidden" name="redirect" value="${redirect}" />
          <label class="block text-sm text-gray-400 mb-1">Username</label>
          <input type="text" name="username" required class="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-2.5 mb-4" />
          <label class="block text-sm text-gray-400 mb-1">Password</label>
          <input type="password" name="password" required class="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-2.5 mb-6" />
          <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium">Login</button>
        </form>
      </div>
    </div>
  `
  return c.html(Layout({ title: 'Login', content, activePage: '/login' }))
})

app.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const username = String(body.username || '')
  const password = String(body.password || '')
  const redirect = String(body.redirect || '/')
  if (username === c.env.STAFF_USERNAME && password === c.env.STAFF_PASSWORD) {
    await setSignedCookie(c, SESSION_COOKIE, 'staff', c.env.SESSION_SECRET, {
      httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 8,
    })
    return c.redirect(redirect)
  }
  return c.redirect(`/login?error=1&redirect=${encodeURIComponent(redirect)}`)
})

app.post('/logout', async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.redirect('/')
})
```
- [ ] Apply `requireStaff` to existing routes by inserting it as second arg: change `app.get('/criteria', async (c) => {` → `app.get('/criteria', requireStaff, async (c) => {`. Do the same for: `/respondents` (GET), `/evaluate` (GET and POST), `/saw-calculate` (GET), `/results` (GET). Leave `/` , `/login`, `/logout`, `POST /api/gform-webhook`, and the new `/api/criteria-score-distribution` (Task 5) unguarded.
- [ ] Add `STAFF_USERNAME`, `STAFF_PASSWORD`, `SESSION_SECRET` as local dev vars in `.dev.vars` (create if absent, gitignored):
```
STAFF_USERNAME=admin
STAFF_PASSWORD=changeme123
SESSION_SECRET=dev-secret-change-in-production
```
- [ ] Verify `.dev.vars` is gitignored: `grep -q "^.dev.vars$" .gitignore || echo ".dev.vars" >> .gitignore`
- [ ] Verify: `wrangler dev`, then `curl -i http://localhost:8787/criteria` → expect `302` redirect to `/login?redirect=%2Fcriteria`. `curl -i -c cookies.txt -d "username=admin&password=changeme123&redirect=/criteria" http://localhost:8787/login` → expect `302` to `/criteria`. `curl -i -b cookies.txt http://localhost:8787/criteria` → expect `200`.
- [ ] Commit: `git add src/index.ts .gitignore && git commit -m "feat: add staff login/logout and requireStaff auth guard"`

---

### Task 3: Nav — Evaluasi toggle + Manajemen group

**Files:**
- Modify: `src/index.ts` (`navLinks` def at line ~18-25, `Layout` function ~27-74)

- [ ] Change `navLinks` (currently a static array) into a function that takes the enabled flag and session state:
```ts
function getNavLinks(evaluasiEnabled: boolean, staff: boolean) {
  const links = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/criteria', label: 'Data Kriteria', icon: '📋' },
    { path: '/respondents', label: 'Data Responden', icon: '👥' },
  ]
  if (evaluasiEnabled) links.push({ path: '/evaluate', label: 'Evaluasi', icon: '⭐' })
  links.push({ path: '/results', label: 'Hasil Keputusan', icon: '🏆' })
  if (staff) {
    links.push({ path: '/master/schools', label: 'Lingkup Sekolah', icon: '🏫' })
    links.push({ path: '/master/criteria', label: 'Manage Kriteria', icon: '⚙️' })
  }
  return links
}
```
- [ ] Update `Layout` signature to accept `navLinks` (array) and `staff` (boolean) instead of relying on the old module-level `navLinks` constant; render a "Logout" link/button when `staff` true, else "Login" link, in the sidebar footer (near existing sidebar closing markup).
- [ ] Every route's `c.html(Layout({...}))` call must now fetch the setting + staff status and pass them in. Add a shared helper near the top:
```ts
async function getEvaluasiEnabled(c: any): Promise<boolean> {
  const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'evaluasi_menu_enabled'").first<{ value: string }>()
  return row?.value === '1'
}
```
- [ ] Update each `Layout({...})` call site (there are 7+: `/`, `/criteria`, `/respondents`, `/evaluate` GET, `/results`, plus new `/login`, `/master/*`) to compute `const evaluasiEnabled = await getEvaluasiEnabled(c)` and `const staff = await isStaff(c)` before building `content`, then pass `navLinks: getNavLinks(evaluasiEnabled, staff)` and `staff` into `Layout(...)`.
- [ ] In the `/evaluate` GET handler, after computing `evaluasiEnabled`, short-circuit with a disabled message if false:
```ts
if (!evaluasiEnabled) {
  const content = `<div class="max-w-xl mx-auto mt-20 text-center text-gray-400">
    <p class="text-xl mb-2">Form Evaluasi sedang dinonaktifkan.</p>
    <p class="text-sm">Hubungi staff untuk mengaktifkan kembali.</p>
  </div>`
  return c.html(Layout({ title: 'Evaluasi', content, activePage: '/evaluate', navLinks: getNavLinks(evaluasiEnabled, true), staff: true }))
}
```
- [ ] Verify: with setting `= '0'` (`wrangler d1 execute mbg-saw-db --local --command="UPDATE settings SET value='0' WHERE key='evaluasi_menu_enabled'"`), load any staff page → no "Evaluasi" link in sidebar; `curl -b cookies.txt http://localhost:8787/evaluate` → 200 with disabled message. Reset to `'1'` after.
- [ ] Commit: `git add src/index.ts && git commit -m "feat: toggleable Evaluasi nav item, staff-only Manajemen nav group"`

---

### Task 4: Master data pages

**Files:**
- Modify: `src/index.ts`

- [ ] Add `GET /master/schools` (guarded by `requireStaff`) — list + inline add form + delete buttons:
```ts
app.get('/master/schools', requireStaff, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM school_scopes ORDER BY name ASC').all<{ id: number; name: string }>()
  const rows = results.map(r => `
    <tr class="hover:bg-gray-800/50">
      <td class="p-4 text-gray-200">${r.name}</td>
      <td class="p-4 text-right">
        <form method="post" action="/master/schools/${r.id}/delete" onsubmit="return confirm('Hapus ${r.name}?')">
          <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Hapus</button>
        </form>
      </td>
    </tr>
  `).join('')
  const evaluasiEnabled = await getEvaluasiEnabled(c)
  const content = `
    <h2 class="text-3xl font-bold text-white mb-6">Manage Lingkup Sekolah</h2>
    <form method="post" action="/master/schools" class="flex gap-2 mb-6">
      <input type="text" name="name" required placeholder="Nama sekolah" class="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5" />
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg">Tambah</button>
    </form>
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-gray-950 border-b border-gray-800"><tr><th class="p-4 text-gray-400 text-sm">Nama Sekolah</th><th></th></tr></thead>
        <tbody class="divide-y divide-gray-800">${rows || '<tr><td class="p-8 text-center text-gray-500">Belum ada data</td></tr>'}</tbody>
      </table>
    </div>
  `
  return c.html(Layout({ title: 'Lingkup Sekolah', content, activePage: '/master/schools', navLinks: getNavLinks(evaluasiEnabled, true), staff: true }))
})

app.post('/master/schools', requireStaff, async (c) => {
  const body = await c.req.parseBody()
  const name = String(body.name || '').trim()
  if (name) await c.env.DB.prepare('INSERT OR IGNORE INTO school_scopes (name) VALUES (?)').bind(name).run()
  return c.redirect('/master/schools')
})

app.post('/master/schools/:id/delete', requireStaff, async (c) => {
  await c.env.DB.prepare('DELETE FROM school_scopes WHERE id = ?').bind(c.req.param('id')).run()
  return c.redirect('/master/schools')
})
```
- [ ] Add `GET /master/criteria` + `POST /master/criteria/:id` (edit name/weight/type/question, weight-sum warning):
```ts
app.get('/master/criteria', requireStaff, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; name: string; weight: number; type: string; question: string | null }>()
  const totalWeight = results.reduce((s, r) => s + r.weight, 0)
  const warn = Math.abs(totalWeight - 1.0) > 0.001
  const rows = results.map(r => `
    <form method="post" action="/master/criteria/${r.id}" class="p-5 border border-gray-800 rounded-xl bg-gray-950/50 mb-4">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-indigo-400 font-bold">${r.id}</span>
        <input type="text" name="name" value="${r.name}" required class="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm" />
        <input type="number" step="0.01" name="weight" value="${r.weight}" required class="w-24 bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm" />
        <select name="type" class="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm">
          <option value="Benefit" ${r.type === 'Benefit' ? 'selected' : ''}>Benefit</option>
          <option value="Cost" ${r.type === 'Cost' ? 'selected' : ''}>Cost</option>
        </select>
      </div>
      <textarea name="question" placeholder="Pertanyaan untuk form evaluasi" class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm mb-3">${r.question || ''}</textarea>
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
    </form>
  `).join('')
  const evaluasiEnabled = await getEvaluasiEnabled(c)
  const content = `
    <h2 class="text-3xl font-bold text-white mb-2">Manage Kriteria</h2>
    <p class="text-gray-400 mb-2">Total bobot = ${totalWeight.toFixed(2)}</p>
    ${warn ? `<p class="text-amber-400 text-sm mb-4">⚠ Total bobot tidak sama dengan 1.0</p>` : ''}
    ${rows}
  `
  return c.html(Layout({ title: 'Manage Kriteria', content, activePage: '/master/criteria', navLinks: getNavLinks(evaluasiEnabled, true), staff: true }))
})

app.post('/master/criteria/:id', requireStaff, async (c) => {
  const body = await c.req.parseBody()
  const id = c.req.param('id')
  const name = String(body.name || '')
  const weight = parseFloat(String(body.weight || '0'))
  const type = String(body.type || 'Benefit')
  const question = String(body.question || '')
  await c.env.DB.prepare('UPDATE criteria SET name = ?, weight = ?, type = ?, question = ? WHERE id = ?').bind(name, weight, type, question, id).run()
  return c.redirect('/master/criteria')
})
```
- [ ] Add toggle route referenced in Task 3's nav (place near master routes):
```ts
app.post('/master/toggle-evaluasi', requireStaff, async (c) => {
  const enabled = await getEvaluasiEnabled(c)
  await c.env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'evaluasi_menu_enabled'").bind(enabled ? '0' : '1').run()
  return c.redirect('/master/schools')
})
```
Add the toggle button to the `/master/schools` page content (below the add form): `<form method="post" action="/master/toggle-evaluasi" class="mb-6"><button class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">Toggle Menu Evaluasi</button></form>`.
- [ ] Verify: `curl -b cookies.txt http://localhost:8787/master/schools` → 200, lists 6 seeded schools. POST add/delete work. `/master/criteria` shows 8 rows editable, save round-trips.
- [ ] Commit: `git add src/index.ts && git commit -m "feat: add staff-only master data pages (schools CRUD, criteria edit)"`

---

### Task 5: Dashboard pie charts

**Files:**
- Modify: `src/index.ts` (`Layout` head section ~43-51, `GET /` route ~79-149)

- [ ] Add Chart.js CDN script tag next to the existing Tailwind CDN script in `Layout`'s `<head>` (near line 45): `<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>`.
- [ ] Add new public JSON endpoint (place near other API routes, no `requireStaff`):
```ts
app.get('/api/criteria-score-distribution', async (c) => {
  const criteriaId = (c.req.query('criteria_id') || 'C1').toLowerCase()
  const column = `${criteriaId}_score`
  if (!/^c[1-8]_score$/.test(column)) return c.json({ error: 'invalid criteria_id' }, 400)
  const { results } = await c.env.DB.prepare(
    `SELECT ${column} as score, COUNT(*) as count FROM evaluations GROUP BY ${column} ORDER BY ${column}`
  ).all<{ score: number; count: number }>()
  return c.json({ criteria_id: criteriaId.toUpperCase(), distribution: results })
})
```
- [ ] In `GET /` handler, after existing stat-card queries, add K1-K4 counts for the pie:
```ts
const { results: levelCounts } = await c.env.DB.prepare(
  "SELECT satisfaction_level, COUNT(*) as count FROM saw_results GROUP BY satisfaction_level"
).all<{ satisfaction_level: string; count: number }>()
const levelData = ['K1', 'K2', 'K3', 'K4'].map(lvl => levelCounts.find(r => r.satisfaction_level === lvl)?.count || 0)
const { results: allCriteria } = await c.env.DB.prepare('SELECT id, name FROM criteria ORDER BY id ASC').all<{ id: string; name: string }>()
```
- [ ] Add chart markup + inline script to the dashboard `content` template (after the existing stat cards, before the CTA buttons block):
```ts
const criteriaOptions = allCriteria.map(cr => `<option value="${cr.id}">${cr.id} - ${cr.name}</option>`).join('')
// ...inside content template literal:
`
<div class="grid md:grid-cols-2 gap-6 mb-8">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6">
    <h3 class="text-lg font-bold text-white mb-4">Distribusi Hasil Keputusan</h3>
    <canvas id="decisionPie" class="max-h-64"></canvas>
  </div>
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6" id="criteriaPieWrap" style="display:none">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-white">Distribusi Skor per Kriteria</h3>
      <select id="criteriaSelect" class="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg p-2">${criteriaOptions}</select>
    </div>
    <canvas id="criteriaPie" class="max-h-64"></canvas>
  </div>
</div>
<script>
  const decisionCtx = document.getElementById('decisionPie').getContext('2d')
  const decisionChart = new Chart(decisionCtx, {
    type: 'pie',
    data: {
      labels: ['K1 (Sangat Puas)', 'K2 (Puas)', 'K3 (Kurang Puas)', 'K4 (Tidak Puas)'],
      datasets: [{ data: ${JSON.stringify(levelData)}, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] }]
    },
    options: { onClick: (evt, els) => { if (els.length) showCriteriaPie(document.getElementById('criteriaSelect').value) } }
  })

  const criteriaPieWrap = document.getElementById('criteriaPieWrap')
  const criteriaSelect = document.getElementById('criteriaSelect')
  let criteriaChart = null

  async function showCriteriaPie(criteriaId) {
    criteriaPieWrap.style.display = 'block'
    const res = await fetch('/api/criteria-score-distribution?criteria_id=' + criteriaId)
    const json = await res.json()
    const dist = json.distribution
    const dataMap = { 1: 0, 2: 0, 3: 0, 4: 0 }
    dist.forEach(d => { dataMap[d.score] = d.count })
    const ctx = document.getElementById('criteriaPie').getContext('2d')
    if (criteriaChart) criteriaChart.destroy()
    criteriaChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['1 - Sangat Tidak Baik', '2 - Tidak Baik', '3 - Baik', '4 - Sangat Baik'],
        datasets: [{ data: [dataMap[1], dataMap[2], dataMap[3], dataMap[4]], backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'] }]
      }
    })
  }
  criteriaSelect.addEventListener('change', (e) => showCriteriaPie(e.target.value))
</script>
`
```
- [ ] Verify: `curl http://localhost:8787/api/criteria-score-distribution?criteria_id=C3` → JSON with `distribution` array. Load `/` in browser, confirm pie renders, click a slice → second pie + selector appears, switching the dropdown updates it.
- [ ] Commit: `git add src/index.ts && git commit -m "feat: add dashboard decision pie chart with per-criteria drill-down"`

---

### Task 6: Evaluasi form — per-kriteria question text

**Files:**
- Modify: `src/index.ts` (`GET /evaluate` handler, ~line 337-368)

- [ ] Change the criteria query to also select `question`: `SELECT id, name, question FROM criteria ORDER BY id ASC` and update the TS type to `{ id: string; name: string; question?: string }`.
- [ ] Change the label line (currently `<p class="font-medium text-gray-200 mb-4"><span class="text-indigo-400 font-bold">${cr.id}</span> - ${cr.name}</p>`) to:
```ts
`<p class="font-medium text-gray-200 mb-4"><span class="text-indigo-400 font-bold">${cr.id}</span> - ${cr.question || cr.name}</p>`
```
- [ ] Verify: set a `question` value on `C1` via `/master/criteria`, reload `/evaluate` (logged in as staff), confirm the question text shows instead of `name` for C1, and other criteria still show `name` (empty question fallback).
- [ ] Commit: `git add src/index.ts && git commit -m "feat: show per-criteria question text on evaluation form"`

---

### Task 7: `/results` — grouped tabs

**Files:**
- Modify: `src/index.ts` (`GET /results` handler, ~line 654-822)

- [ ] Add tab query param handling at top of handler: `const tab = c.req.query('tab') || 'summary'`.
- [ ] Wrap existing summary content (K1-K4 cards + ranked table) in a branch `if (tab === 'summary')`.
- [ ] Add `kriteria` tab branch — aggregate per-criterion stats:
```ts
if (tab === 'kriteria') {
  const { results: criteria } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; name: string; weight: number }>()
  const { results: evaluations } = await c.env.DB.prepare('SELECT * FROM evaluations').all<any>()
  const rows = criteria.map((cr, idx) => {
    const col = `c${idx + 1}_score`
    const scores = evaluations.map(e => e[col] as number)
    const avgRaw = scores.reduce((a, b) => a + b, 0) / scores.length
    const max = Math.max(...scores)
    const avgNorm = avgRaw / max
    const contribution = avgNorm * cr.weight
    return `
      <tr class="hover:bg-gray-800/50">
        <td class="p-4 font-bold text-indigo-400">${cr.id}</td>
        <td class="p-4 text-gray-200">${cr.name}</td>
        <td class="p-4 text-white">${avgRaw.toFixed(2)}</td>
        <td class="p-4 text-white">${avgNorm.toFixed(3)}</td>
        <td class="p-4 text-gray-400">${cr.weight}</td>
        <td class="p-4 font-bold text-emerald-400">${contribution.toFixed(3)}</td>
      </tr>
    `
  }).join('')
  content = `
    ${tabsNav}
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
      <table class="w-full text-left">
        <thead class="bg-gray-950 border-b border-gray-800">
          <tr>
            <th class="p-4 text-gray-400 text-sm">Kode</th><th class="p-4 text-gray-400 text-sm">Kriteria</th>
            <th class="p-4 text-gray-400 text-sm">Avg Skor</th><th class="p-4 text-gray-400 text-sm">Avg Normalisasi</th>
            <th class="p-4 text-gray-400 text-sm">Bobot</th><th class="p-4 text-gray-400 text-sm">Kontribusi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">${rows}</tbody>
      </table>
    </div>
  `
}
```
- [ ] Add `responden` tab branch — per-respondent per-criterion breakdown:
```ts
if (tab === 'responden') {
  const { results: criteria } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; weight: number }>()
  const { results: evaluations } = await c.env.DB.prepare(
    'SELECT e.*, r.name, sr.final_score FROM evaluations e JOIN respondents r ON r.id = e.respondent_id LEFT JOIN saw_results sr ON sr.respondent_id = e.respondent_id ORDER BY e.respondent_id'
  ).all<any>()
  const maxes = criteria.map((_, idx) => Math.max(...evaluations.map(e => e[`c${idx + 1}_score`] as number)))
  const header = criteria.map(cr => `<th class="p-3 text-gray-400 text-xs">${cr.id}</th>`).join('')
  const rows = evaluations.map(e => {
    const cells = criteria.map((cr, idx) => {
      const raw = e[`c${idx + 1}_score`] as number
      const contribution = (raw / maxes[idx]) * cr.weight
      return `<td class="p-3 text-sm text-gray-300">${raw} <span class="text-gray-500">(${contribution.toFixed(3)})</span></td>`
    }).join('')
    return `<tr class="hover:bg-gray-800/50"><td class="p-3 text-sm font-mono text-gray-500">${e.respondent_id}</td><td class="p-3 text-sm text-gray-200">${e.name}</td>${cells}<td class="p-3 text-sm font-bold text-emerald-400">${(e.final_score ?? 0).toFixed(3)}</td></tr>`
  }).join('')
  content = `
    ${tabsNav}
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto shadow-xl">
      <table class="w-full text-left">
        <thead class="bg-gray-950 border-b border-gray-800"><tr><th class="p-3 text-gray-400 text-xs">ID</th><th class="p-3 text-gray-400 text-xs">Nama</th>${header}<th class="p-3 text-gray-400 text-xs">Final Score</th></tr></thead>
        <tbody class="divide-y divide-gray-800">${rows}</tbody>
      </table>
    </div>
  `
}
```
- [ ] Add shared `tabsNav` const (defined once before the branches) using current `tab` to highlight active:
```ts
const tabClass = (t: string) => t === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
const tabsNav = `
  <div class="flex gap-2 mb-6">
    <a href="/results?tab=summary" class="px-4 py-2 rounded-lg text-sm ${tabClass('summary')}">Ringkasan</a>
    <a href="/results?tab=kriteria" class="px-4 py-2 rounded-lg text-sm ${tabClass('kriteria')}">Per Kriteria</a>
    <a href="/results?tab=responden" class="px-4 py-2 rounded-lg text-sm ${tabClass('responden')}">Per Responden</a>
  </div>
`
```
Prepend `tabsNav` to the existing summary-tab content too.
- [ ] Verify: `curl -b cookies.txt "http://localhost:8787/results?tab=kriteria"` → 200, table w/ 8 rows. `?tab=responden` → 200, table w/ 100 rows + per-criteria cells. `?tab=summary` (or no param) → existing behavior unchanged.
- [ ] Commit: `git add src/index.ts && git commit -m "feat: add per-kriteria and per-responden grouped views to /results"`

---

## Self-review notes
- Spec coverage: all 7 spec items map to Tasks 2-7 (Task 1 is the shared schema prerequisite). ✅
- `getNavLinks`/`getEvaluasiEnabled`/`isStaff` names used consistently across Tasks 3-7. ✅
- No add/delete for criteria (per spec non-goal) — Task 4 only edits existing rows. ✅
- `school_scopes` stays unlinked to `respondents.school` (per spec non-goal) — Task 4 has no such join. ✅
