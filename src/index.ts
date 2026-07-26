import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { cors } from 'hono/cors'
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  STAFF_USERNAME: string
  STAFF_PASSWORD: string
  SESSION_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes (useful for Google Apps Script / external integrations)
app.use('/api/*', cors())
app.use('/evaluate', cors())

// ==============================
// Auth: single staff credential via env secrets, signed cookie session
// ==============================
const SESSION_COOKIE = 'mbg_staff_session'

async function isStaff(c: any): Promise<boolean> {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE)
  return value === 'staff'
}

async function requireStaff(c: any, next: any) {
  if (await isStaff(c)) return next()
  return c.redirect(`/login?redirect=${encodeURIComponent(c.req.path)}`)
}

async function getEvaluasiEnabled(c: any): Promise<boolean> {
  const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'evaluasi_menu_enabled'").first<{ value: string }>()
  return row?.value === '1'
}

// ==============================
// Layout Component
// ==============================
const Layout = (props: { title: string; content: string; activePage: string; staff?: boolean; evaluasiEnabled?: boolean }) => {
  const staff = !!props.staff
  const evaluasiEnabled = props.evaluasiEnabled !== false
  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/criteria', label: 'Data Kriteria', icon: '📝' },
    { path: '/respondents', label: 'Responden', icon: '👥' },
    ...(evaluasiEnabled ? [{ path: '/evaluate', label: 'Evaluasi', icon: '⭐' }] : []),
    { path: '/saw-calculate', label: 'Hitung SAW', icon: '🧮' },
    { path: '/results', label: 'Hasil Keputusan', icon: '🏆' },
    ...(staff ? [
      { path: '/master/schools', label: 'Lingkup Sekolah', icon: '🏫' },
      { path: '/master/criteria', label: 'Manage Kriteria', icon: '⚙️' },
    ] : []),
  ]
  const navItems = navLinks.map(link => {
    const isActive = props.activePage === link.path
    const cls = isActive
      ? 'flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
      : 'flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-gray-800 text-gray-300'
    return `<a href="${link.path}" class="${cls}"><span>${link.icon}</span><span class="font-medium">${link.label}</span></a>`
  }).join('')

  return html`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${props.title} - SPK MBG SAW</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
      <style>
        body { font-family: 'Inter', sans-serif; }
        .glass-panel { background: rgba(31, 41, 55, 0.7); backdrop-filter: blur(10px); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.4s ease-out; }
      </style>
    </head>
    <body class="bg-gray-950 text-gray-100 min-h-screen flex">
      <aside class="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 shrink-0">
        <div class="p-6 border-b border-gray-800">
          <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">MBG SPK</h1>
          <p class="text-xs text-gray-400 mt-1">Sistem Pendukung Keputusan SAW</p>
        </div>
        <nav class="flex-1 p-4 space-y-2">
          ${raw(navItems)}
        </nav>
        <div class="p-4 border-t border-gray-800 space-y-3">
          ${raw(staff
            ? `<form method="post" action="/logout"><button type="submit" class="w-full text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors">🔓 Logout Staff</button></form>`
            : `<a href="/login" class="block text-center text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors">🔒 Login Staff</a>`)}
          <p class="text-xs text-gray-600 text-center">© 2025 SPK MBG SAW</p>
        </div>
      </aside>
      <main class="flex-1 p-8 overflow-y-auto min-h-screen">
        <div class="max-w-6xl mx-auto animate-in">
          ${raw(props.content)}
        </div>
      </main>
    </body>
    </html>
  `
}

// ==============================
// GET /api/criteria-score-distribution - Dashboard drill-down data (public)
// ==============================
app.get('/api/criteria-score-distribution', async (c) => {
  const criteriaId = (c.req.query('criteria_id') || 'C1').toLowerCase()
  const column = `${criteriaId}_score`
  if (!/^c[1-8]_score$/.test(column)) return c.json({ error: 'invalid criteria_id' }, 400)
  const { results } = await c.env.DB.prepare(
    `SELECT ${column} as score, COUNT(*) as count FROM evaluations GROUP BY ${column} ORDER BY ${column}`
  ).all<{ score: number; count: number }>()
  return c.json({ criteria_id: criteriaId.toUpperCase(), distribution: results })
})

// ==============================
// GET/POST /login, POST /logout - Staff Auth
// ==============================
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
  const evaluasiEnabled = await getEvaluasiEnabled(c)
  return c.html(Layout({ title: 'Login', content, activePage: '/login', evaluasiEnabled, staff: await isStaff(c) }))
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

// ==============================
// GET / - Dashboard
// ==============================
app.get('/', async (c) => {
  try {
    const respondentsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM respondents').first<{ count: number }>()
    const evaluationsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM evaluations').first<{ count: number }>()
    const resultsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM saw_results').first<{ count: number }>()

    const { results: levelCounts } = await c.env.DB.prepare(
      "SELECT satisfaction_level, COUNT(*) as count FROM saw_results GROUP BY satisfaction_level"
    ).all<{ satisfaction_level: string; count: number }>()
    const levelData = ['K1', 'K2', 'K3', 'K4'].map(lvl => levelCounts.find(r => r.satisfaction_level === lvl)?.count || 0)
    const { results: allCriteria } = await c.env.DB.prepare('SELECT id, name FROM criteria ORDER BY id ASC').all<{ id: string; name: string }>()
    const criteriaOptions = allCriteria.map(cr => `<option value="${cr.id}">${cr.id} - ${cr.name}</option>`).join('')

    const content = `
      <h2 class="text-3xl font-bold mb-2 text-white">Dashboard Overview</h2>
      <p class="text-gray-400 mb-8">Selamat datang di Sistem Pendukung Keputusan Evaluasi Program MBG</p>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          <p class="text-gray-400 font-medium mb-2 text-sm uppercase tracking-wider">Total Responden</p>
          <p class="text-4xl font-bold text-white">${respondentsCount?.count || 0}</p>
          <p class="text-xs text-gray-500 mt-2">Murid & Staff dari Berbagai Sekolah</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <p class="text-gray-400 font-medium mb-2 text-sm uppercase tracking-wider">Evaluasi Terkumpul</p>
          <p class="text-4xl font-bold text-white">${evaluationsCount?.count || 0}</p>
          <p class="text-xs text-gray-500 mt-2">Kuesioner terisi</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <p class="text-gray-400 font-medium mb-2 text-sm uppercase tracking-wider">Hasil Keputusan</p>
          <p class="text-4xl font-bold text-white">${resultsCount?.count || 0}</p>
          <p class="text-xs text-gray-500 mt-2">Sudah dihitung SAW</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 class="text-lg font-bold text-white mb-1">Distribusi Hasil Keputusan</h3>
          <p class="text-xs text-gray-500 mb-4">Klik salah satu bagian untuk ganti kriteria di sebelah kanan</p>
          <canvas id="decisionPie" class="max-h-64"></canvas>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6" id="criteriaPieWrap">
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
            labels: ['K1 (Sangat Puas)', 'K2 (Puas)', 'K3 (Tidak Puas)', 'K4 (Sangat Tidak Puas)'],
            datasets: [{ data: ${JSON.stringify(levelData)}, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] }]
          },
          options: {
            plugins: { legend: { labels: { color: '#9ca3af' } } },
            onClick: (evt, els) => { if (els.length) showCriteriaPie(document.getElementById('criteriaSelect').value) }
          }
        })

        const criteriaSelect = document.getElementById('criteriaSelect')
        let criteriaChart = null

        async function showCriteriaPie(criteriaId) {
          const res = await fetch('/api/criteria-score-distribution?criteria_id=' + criteriaId)
          const json = await res.json()
          const dataMap = { 1: 0, 2: 0, 3: 0, 4: 0 }
          json.distribution.forEach(d => { dataMap[d.score] = d.count })
          const ctx = document.getElementById('criteriaPie').getContext('2d')
          if (criteriaChart) criteriaChart.destroy()
          criteriaChart = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: ['1 - Sangat Tidak Baik', '2 - Tidak Baik', '3 - Baik', '4 - Sangat Baik'],
              datasets: [{ data: [dataMap[1], dataMap[2], dataMap[3], dataMap[4]], backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'] }]
            },
            options: { plugins: { legend: { labels: { color: '#9ca3af' } } } }
          })
        }
        criteriaSelect.addEventListener('change', (e) => showCriteriaPie(e.target.value))
        showCriteriaPie(criteriaSelect.value)
      </script>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h3 class="text-xl font-bold mb-4 text-white">Sistem Evaluasi Program Makan Bergizi Gratis (MBG)</h3>
        <p class="text-gray-400 leading-relaxed mb-6">
          Sistem Pendukung Keputusan ini menggunakan metode <strong class="text-indigo-400">Simple Additive Weighting (SAW)</strong> 
          untuk mengevaluasi tingkat kepuasan konsumen (Murid dan Staff) terhadap pelaksanaan program Makan Bergizi Gratis.
          Evaluasi dilakukan berdasarkan 8 kriteria dengan skala penilaian 1-4.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-950/50 border border-gray-800 rounded-xl p-4">
            <p class="text-sm font-semibold text-gray-300 mb-2">📋 Alur Kerja & Integrasi:</p>
            <ol class="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Input data responden (Manual / Google Forms)</li>
              <li>Pengisian kuesioner evaluasi (skor 1-4)</li>
              <li>Normalisasi matriks keputusan</li>
              <li>Perhitungan bobot preferensi (W)</li>
              <li>Klasifikasi tingkat kepuasan (K1-K4)</li>
            </ol>
          </div>
          <div class="bg-gray-950/50 border border-gray-800 rounded-xl p-4">
            <p class="text-sm font-semibold text-gray-300 mb-2">📊 Tingkat Kepuasan:</p>
            <div class="text-xs space-y-1">
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-gray-400">K1: Sangat Puas (>0.8)</span></div>
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-400"></span><span class="text-gray-400">K2: Puas (>0.6)</span></div>
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-orange-400"></span><span class="text-gray-400">K3: Tidak Puas (>0.4)</span></div>
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-400">K4: Sangat Tidak Puas (≤0.4)</span></div>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <a href="/saw-calculate" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/30">🧮 Jalankan Perhitungan SAW</a>
          <a href="/results" class="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-gray-700">🏆 Lihat Laporan Hasil</a>
        </div>
      </div>
    `

    const evaluasiEnabled = await getEvaluasiEnabled(c)
    return c.html(Layout({ title: 'Dashboard', content, activePage: '/', evaluasiEnabled, staff: await isStaff(c) }))
  } catch (e: any) {
    return c.text('Error: ' + e.message, 500)
  }
})

// ==============================
// GET /criteria - Tabel Kriteria
// ==============================
app.get('/criteria', requireStaff, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; name: string; weight: number; type: string }>()

    const rows = results.length > 0
      ? results.map(row => `
          <tr class="hover:bg-gray-800/50 transition-colors">
            <td class="p-4 font-bold text-indigo-400">${row.id}</td>
            <td class="p-4 text-gray-200">${row.name}</td>
            <td class="p-4 font-bold text-white">${row.weight}</td>
            <td class="p-4">${row.type}</td>
            <td class="p-4 w-1/4">
              <div class="flex items-center gap-3">
                <div class="flex-1 bg-gray-800 rounded-full h-2.5">
                  <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all" style="width: ${row.weight * 100}%"></div>
                </div>
                <span class="text-xs text-gray-400 font-mono w-10">${(row.weight * 100).toFixed(0)}%</span>
              </div>
            </td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada data kriteria</td></tr>'

    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0)

    const content = `
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold text-white">Data Kriteria</h2>
          <p class="text-gray-400 mt-1">8 kriteria evaluasi program MBG dengan total bobot = ${totalWeight.toFixed(2)}</p>
        </div>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <table class="w-full text-left">
          <thead class="bg-gray-950 border-b border-gray-800">
            <tr>
              <th class="p-4 font-semibold text-gray-400 text-sm">Kode</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Nama Kriteria</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Bobot</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Tipe</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Visualisasi Bobot</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            ${rows}
          </tbody>
        </table>
      </div>
    `

    const evaluasiEnabled = await getEvaluasiEnabled(c)
    return c.html(Layout({ title: 'Data Kriteria', content, activePage: '/criteria', evaluasiEnabled, staff: true }))
  } catch (e: any) {
    return c.text('Error loading criteria: ' + e.message, 500)
  }
})

// ==============================
// GET /respondents - Tabel Responden (Ditambahkan Sekolah & Email)
// ==============================
app.get('/respondents', requireStaff, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const typeFilter = c.req.query('type') || ''
  const searchFilter = c.req.query('search') || ''
  const limit = 50
  const offset = (page - 1) * limit

  try {
    let query = 'SELECT * FROM respondents'
    let countQuery = 'SELECT COUNT(*) as total FROM respondents'
    const whereClauses: string[] = []
    const params: any[] = []

    if (typeFilter) {
      whereClauses.push('consumer_type = ?')
      params.push(typeFilter)
    }
    if (searchFilter) {
      whereClauses.push('(name LIKE ? OR school LIKE ? OR email LIKE ? OR id LIKE ?)')
      const likeQuery = `%${searchFilter}%`
      params.push(likeQuery, likeQuery, likeQuery, likeQuery)
    }

    if (whereClauses.length > 0) {
      const whereStr = ' WHERE ' + whereClauses.join(' AND ')
      query += whereStr
      countQuery += whereStr
    }

    query += ' ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) ASC LIMIT ? OFFSET ?'

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>()
    const total = countResult?.total || 0
    const totalPages = Math.ceil(total / limit)

    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all<{ id: string; name: string; email?: string; school?: string; consumer_type: string }>()

    const rows = results.length > 0
      ? results.map(row => {
          const badgeColor = row.consumer_type === 'Murid'
            ? 'bg-blue-900/30 text-blue-400 border-blue-800'
            : 'bg-amber-900/30 text-amber-400 border-amber-800'
          return `
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="p-4 font-mono text-gray-500 text-sm">${row.id}</td>
              <td class="p-4 text-gray-200 font-medium">${row.name}</td>
              <td class="p-4 text-gray-400 text-sm font-mono">${row.email || '-'}</td>
              <td class="p-4 text-gray-300 text-sm">${row.school || '-'}</td>
              <td class="p-4">
                <span class="px-3 py-1 ${badgeColor} text-xs rounded-full font-bold border">${row.consumer_type}</span>
              </td>
            </tr>
          `
        }).join('')
      : '<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada data responden</td></tr>'

    const filterActive = (val: string) => typeFilter === val ? 'selected' : ''

    const queryParamsStr = (p: number) => {
      const qs = new URLSearchParams()
      qs.set('page', p.toString())
      if (typeFilter) qs.set('type', typeFilter)
      if (searchFilter) qs.set('search', searchFilter)
      return qs.toString()
    }

    const pagination = totalPages > 1 ? `
      <div class="flex flex-col sm:flex-row justify-between items-center bg-gray-900 border border-gray-800 rounded-xl p-4 mt-6 gap-4">
        <span class="text-sm text-gray-400">
          Menampilkan ${offset + 1} - ${Math.min(offset + limit, total)} dari ${total} responden
        </span>
        <div class="flex gap-2">
          ${page > 1 ? `<a href="/respondents?${queryParamsStr(page - 1)}" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">← Sebelumnya</a>` : ''}
          <span class="px-4 py-2 text-sm text-gray-400">Halaman ${page} / ${totalPages}</span>
          ${page < totalPages ? `<a href="/respondents?${queryParamsStr(page + 1)}" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">Selanjutnya →</a>` : ''}
        </div>
      </div>
    ` : ''

    const content = `
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 class="text-3xl font-bold text-white">Data Responden</h2>
          <p class="text-gray-400 mt-1">Daftar responden evaluasi beserta informasi sekolah & email (Total: ${total})</p>
        </div>
        <form method="get" class="flex flex-wrap gap-2 w-full md:w-auto">
          <input type="text" name="search" value="${searchFilter}" placeholder="Cari nama, sekolah, email..." class="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 flex-1 md:w-60" />
          <select name="type" class="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5">
            <option value="">Semua Tipe</option>
            <option value="Murid" ${filterActive('Murid')}>Murid</option>
            <option value="Staff" ${filterActive('Staff')}>Staff</option>
          </select>
          <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">Cari & Filter</button>
        </form>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto shadow-xl">
        <table class="w-full text-left">
          <thead class="bg-gray-950 border-b border-gray-800">
            <tr>
              <th class="p-4 font-semibold text-gray-400 text-sm">ID</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Nama</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Email</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Asal Sekolah</th>
              <th class="p-4 font-semibold text-gray-400 text-sm">Tipe Konsumen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            ${rows}
          </tbody>
        </table>
      </div>
      ${pagination}
    `

    const evaluasiEnabled = await getEvaluasiEnabled(c)
    return c.html(Layout({ title: 'Data Responden', content, activePage: '/respondents', evaluasiEnabled, staff: true }))
  } catch (e: any) {
    return c.text('Error loading respondents: ' + e.message, 500)
  }
})

// ==============================
// GET /evaluate - Form Evaluasi
// ==============================
app.get('/evaluate', async (c) => {
  const evaluasiEnabled = await getEvaluasiEnabled(c)
  const staff = await isStaff(c)
  if (!evaluasiEnabled) {
    const content = `<div class="max-w-xl mx-auto mt-20 text-center text-gray-400">
      <p class="text-xl mb-2">Form Evaluasi sedang dinonaktifkan.</p>
      <p class="text-sm">Hubungi staff untuk mengaktifkan kembali lewat Manajemen Data Master.</p>
    </div>`
    return c.html(Layout({ title: 'Evaluasi', content, activePage: '/evaluate', evaluasiEnabled, staff }))
  }
  try {
    const { results: schools } = await c.env.DB.prepare('SELECT name FROM school_scopes ORDER BY name ASC').all<{ name: string }>()
    const { results: criteria } = await c.env.DB.prepare('SELECT id, name, question FROM criteria ORDER BY id ASC').all<{ id: string; name: string; question?: string }>()

    const schoolOptions = schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('')

    const criteriaFields = criteria.map((cr, idx) => {
      const scoreOptions = [
        { val: 1, label: 'Sangat Tidak Baik', color: 'peer-checked:bg-red-600/20 peer-checked:border-red-500 peer-checked:text-red-300' },
        { val: 2, label: 'Tidak Baik', color: 'peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-orange-300' },
        { val: 3, label: 'Baik', color: 'peer-checked:bg-blue-600/20 peer-checked:border-blue-500 peer-checked:text-blue-300' },
        { val: 4, label: 'Sangat Baik', color: 'peer-checked:bg-emerald-600/20 peer-checked:border-emerald-500 peer-checked:text-emerald-300' },
      ].map(opt => `
        <label class="cursor-pointer">
          <input type="radio" name="c${idx + 1}_score" value="${opt.val}" class="peer sr-only" required />
          <div class="text-center p-3 rounded-lg border border-gray-700 text-sm ${opt.color} text-gray-400 hover:bg-gray-800 transition-all">
            <div class="font-bold text-lg mb-1">${opt.val}</div>
            <div class="text-xs">${opt.label}</div>
          </div>
        </label>
      `).join('')

      return `
        <div class="p-5 border border-gray-800 rounded-xl bg-gray-950/50">
          <p class="font-medium text-gray-200 mb-4"><span class="text-indigo-400 font-bold">${cr.id}</span> - ${cr.question || cr.name}</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${scoreOptions}
          </div>
        </div>
      `
    }).join('')

    const publicUrl = new URL('/evaluate', c.req.url).toString()
    const shareBox = staff ? `
      <div class="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-indigo-300">🔗 Link publik form ini (bisa dibagikan ke responden):</p>
          <p id="shareUrl" class="text-xs text-gray-400 font-mono break-all">${publicUrl}</p>
        </div>
        <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('shareUrl').textContent); this.textContent='✅ Tersalin'" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">📋 Salin Link</button>
      </div>
    ` : ''

    const content = `
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold text-white mb-2">Form Evaluasi Responden</h2>
        <p class="text-gray-400 mb-8">Isi nilai evaluasi kepuasan program MBG untuk setiap kriteria (1-4).</p>
        ${shareBox}

        <form id="evaluationForm" class="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <div class="grid sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">Nama Lengkap</label>
              <input type="text" name="name" required class="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3" />
            </div>
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">Email (opsional)</label>
              <input type="email" name="email" class="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3" />
            </div>
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">Asal Sekolah</label>
              <select name="school" required class="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3">
                <option value="">-- Pilih Sekolah --</option>
                ${schoolOptions}
              </select>
            </div>
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">Tipe Responden</label>
              <select name="consumer_type" required class="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3">
                <option value="">-- Pilih Tipe --</option>
                <option value="Murid">Murid</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          <div class="space-y-6">
            ${criteriaFields}
          </div>

          <div class="mt-8 pt-6 border-t border-gray-800">
            <button type="submit" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-indigo-900/20 transition-all text-lg">
              💾 Simpan Evaluasi
            </button>
            <div id="submitMessage" class="mt-4 text-center hidden"></div>
          </div>
        </form>
      </div>

      <script>
        document.getElementById('evaluationForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          
          const textFields = ['name', 'email', 'school', 'consumer_type'];
          for (let key in data) {
            if (!textFields.includes(key)) {
              data[key] = parseInt(data[key]);
            }
          }

          const msgEl = document.getElementById('submitMessage');
          msgEl.className = 'mt-4 text-center text-sm p-3 rounded-lg bg-gray-800 text-gray-300';
          msgEl.textContent = '⏳ Menyimpan evaluasi...';
          msgEl.classList.remove('hidden');

          try {
            const res = await fetch('/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (result.success) {
              msgEl.className = 'mt-4 text-center text-sm p-3 rounded-lg bg-emerald-900/50 border border-emerald-800 text-emerald-400';
              msgEl.textContent = '✅ Evaluasi berhasil disimpan!';
              e.target.reset();
            } else {
              msgEl.className = 'mt-4 text-center text-sm p-3 rounded-lg bg-red-900/50 border border-red-800 text-red-400';
              msgEl.textContent = '❌ Error: ' + result.error;
            }
          } catch (err) {
            msgEl.className = 'mt-4 text-center text-sm p-3 rounded-lg bg-red-900/50 border border-red-800 text-red-400';
            msgEl.textContent = '❌ Gagal menghubungi server.';
          }
        });
      </script>
    `

    return c.html(Layout({ title: 'Form Evaluasi', content, activePage: '/evaluate', evaluasiEnabled, staff }))
  } catch (e: any) {
    return c.text('Error loading evaluation form: ' + e.message, 500)
  }
})

// ==============================
// Shared helpers: find-or-create respondent, upsert evaluation scores
// ==============================
async function findOrCreateRespondentId(c: any, opts: { name: string; email?: string; school?: string; consumer_type: string }): Promise<string> {
  if (opts.email) {
    const existing = await c.env.DB.prepare('SELECT id FROM respondents WHERE email = ?').bind(opts.email).first<{ id: string }>()
    if (existing) return existing.id
  }
  const lastRow = await c.env.DB.prepare('SELECT id FROM respondents ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1').first<{ id: string }>()
  let nextNum = 1
  if (lastRow && lastRow.id.startsWith('A')) {
    nextNum = parseInt(lastRow.id.substring(1)) + 1
  } else {
    const countRow = await c.env.DB.prepare('SELECT COUNT(*) as total FROM respondents').first<{ total: number }>()
    nextNum = (countRow?.total || 0) + 1
  }
  const respondentId = `A${nextNum}`
  await c.env.DB.prepare(`
    INSERT INTO respondents (id, name, email, school, consumer_type)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, email = excluded.email, school = excluded.school, consumer_type = excluded.consumer_type
  `).bind(respondentId, opts.name, opts.email || '', opts.school || '', opts.consumer_type).run()
  return respondentId
}

async function upsertEvaluationScores(c: any, respondentId: string, scores: number[]) {
  await c.env.DB.prepare(`
    INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(respondent_id) DO UPDATE SET
      c1_score = excluded.c1_score,
      c2_score = excluded.c2_score,
      c3_score = excluded.c3_score,
      c4_score = excluded.c4_score,
      c5_score = excluded.c5_score,
      c6_score = excluded.c6_score,
      c7_score = excluded.c7_score,
      c8_score = excluded.c8_score
  `).bind(respondentId, ...scores).run()
}

// ==============================
// POST /evaluate - Simpan Evaluasi (Form Publik - self registration)
// ==============================
app.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, school, consumer_type, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score } = body

    if (!name || !school || !consumer_type) {
      return c.json({ success: false, error: 'Nama, asal sekolah, dan tipe responden wajib diisi' }, 400)
    }
    if (consumer_type !== 'Murid' && consumer_type !== 'Staff') {
      return c.json({ success: false, error: 'Tipe responden harus Murid atau Staff' }, 400)
    }

    const scores = [c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score]
    if (scores.some((s: any) => typeof s !== 'number' || s < 1 || s > 4)) {
      return c.json({ success: false, error: 'Semua skor harus berupa angka antara 1 dan 4' }, 400)
    }

    const respondentId = await findOrCreateRespondentId(c, { name, email, school, consumer_type })
    await upsertEvaluationScores(c, respondentId, scores)

    return c.json({ success: true, message: 'Evaluasi berhasil disimpan', respondent_id: respondentId })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ==============================
// POST /api/gform-webhook - Webhook Khusus Google Forms / Google Sheets
// ==============================
app.post('/api/gform-webhook', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, school, consumer_type, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score } = body

    if (!name || !consumer_type) {
      return c.json({ success: false, error: 'name dan consumer_type (Murid/Staff) wajib diisi' }, 400)
    }

    const validConsumerType = consumer_type === 'Staff' || consumer_type === 'Guru' ? 'Staff' : 'Murid'

    // 1. Cek atau Buat ID Responden Baru
    let respondentId = body.respondent_id
    if (!respondentId) {
      if (email) {
        const existingByEmail = await c.env.DB.prepare('SELECT id FROM respondents WHERE email = ?').bind(email).first<{ id: string }>()
        if (existingByEmail) respondentId = existingByEmail.id
      }
      
      if (!respondentId) {
        // Generate ID baru (misal A501, A502 dst)
        const lastRow = await c.env.DB.prepare('SELECT id FROM respondents ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1').first<{ id: string }>()
        let nextNum = 1
        if (lastRow && lastRow.id.startsWith('A')) {
          nextNum = parseInt(lastRow.id.substring(1)) + 1
        } else {
          // Fallback count if ID format varies
          const countRow = await c.env.DB.prepare('SELECT COUNT(*) as total FROM respondents').first<{ total: number }>()
          nextNum = (countRow?.total || 0) + 1
        }
        respondentId = `A${nextNum}`
      }
    }

    // 2. Insert atau Update data Responden
    await c.env.DB.prepare(`
      INSERT INTO respondents (id, name, email, school, consumer_type)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        school = excluded.school,
        consumer_type = excluded.consumer_type
    `).bind(respondentId, name, email || '', school || '', validConsumerType).run()

    // 3. Simpan evaluasi (jika skor lengkap dikirimkan)
    const scores = [c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score]
    const allScoresPresent = scores.every(s => typeof s === 'number' && s >= 1 && s <= 4)

    if (allScoresPresent) {
      await c.env.DB.prepare(`
        INSERT INTO evaluations (respondent_id, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(respondent_id) DO UPDATE SET
          c1_score = excluded.c1_score,
          c2_score = excluded.c2_score,
          c3_score = excluded.c3_score,
          c4_score = excluded.c4_score,
          c5_score = excluded.c5_score,
          c6_score = excluded.c6_score,
          c7_score = excluded.c7_score,
          c8_score = excluded.c8_score
      `).bind(respondentId, c1_score, c2_score, c3_score, c4_score, c5_score, c6_score, c7_score, c8_score).run()
    }

    return c.json({
      success: true,
      message: 'Data dari Google Form berhasil disimpan ke database',
      respondent_id: respondentId,
      evaluation_saved: allScoresPresent
    })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ==============================
// GET /saw-calculate - Hitung SAW
// ==============================
app.get('/saw-calculate', requireStaff, async (c) => {
  try {
    const { results: criteria } = await c.env.DB.prepare('SELECT id, weight FROM criteria ORDER BY id ASC').all<{ id: string; weight: number }>()
    if (criteria.length !== 8) {
      throw new Error('Kriteria harus berjumlah 8, ditemukan: ' + criteria.length)
    }
    const weights = criteria.map(cr => cr.weight)

    const { results: evals } = await c.env.DB.prepare('SELECT * FROM evaluations').all()
    if (evals.length === 0) {
      const content = `
        <div class="max-w-md mx-auto mt-20 text-center bg-gray-900 border border-red-800/50 p-8 rounded-2xl shadow-2xl">
          <div class="text-4xl mb-4">⚠️</div>
          <h2 class="text-xl font-bold text-red-400 mb-2">Belum Ada Data Evaluasi</h2>
          <p class="text-gray-400 mb-6">Silakan isi form evaluasi terlebih dahulu sebelum menjalankan perhitungan SAW.</p>
          <a href="/evaluate" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors">Isi Evaluasi</a>
        </div>
      `
      return c.html(Layout({ title: 'Error', content, activePage: '/saw-calculate', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
    }

    const maxScores = [0, 0, 0, 0, 0, 0, 0, 0]
    for (const ev of evals) {
      for (let i = 1; i <= 8; i++) {
        const val = ev[`c${i}_score`] as number
        if (val > maxScores[i - 1]) maxScores[i - 1] = val
      }
    }

    const stmtBase = `INSERT OR REPLACE INTO saw_results (respondent_id, final_score, satisfaction_level) VALUES (?, ?, ?)`
    const statements = []

    for (const ev of evals) {
      let finalScore = 0
      for (let i = 1; i <= 8; i++) {
        const val = ev[`c${i}_score`] as number
        const normalized = maxScores[i - 1] === 0 ? 0 : val / maxScores[i - 1]
        finalScore += normalized * weights[i - 1]
      }

      let level = 'K4'
      if (finalScore > 0.8) level = 'K1'
      else if (finalScore > 0.6) level = 'K2'
      else if (finalScore > 0.4) level = 'K3'

      statements.push(
        c.env.DB.prepare(stmtBase).bind(ev.respondent_id, finalScore, level)
      )
    }

    const chunkSize = 100
    for (let i = 0; i < statements.length; i += chunkSize) {
      const chunk = statements.slice(i, i + chunkSize)
      await c.env.DB.batch(chunk)
    }

    const content = `
      <div class="max-w-md mx-auto mt-20 text-center bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <div class="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-4xl">✅</span>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Perhitungan SAW Selesai!</h2>
        <p class="text-gray-400 mb-2">Total ${evals.length} data evaluasi berhasil diproses.</p>
        <p class="text-gray-500 text-sm mb-8">Normalisasi matriks & pembobotan preferensi telah dihitung.</p>
        <a href="/results" class="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-900/30">
          🏆 Lihat Hasil Keputusan
        </a>
      </div>
    `

    return c.html(Layout({ title: 'Perhitungan Berhasil', content, activePage: '/saw-calculate', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
  } catch (e: any) {
    const content = `
      <div class="max-w-md mx-auto mt-20 text-center bg-gray-900 border border-red-800/50 p-8 rounded-2xl shadow-2xl">
        <div class="text-4xl mb-4">❌</div>
        <h2 class="text-xl font-bold text-red-400 mb-2">Error Perhitungan</h2>
        <p class="text-gray-400">${e.message}</p>
      </div>
    `
    return c.html(Layout({ title: 'Error', content, activePage: '/saw-calculate', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
  }
})

// ==============================
// GET /results - Hasil Keputusan (Ditambahkan Kolom Sekolah & Email)
// ==============================
app.get('/results', requireStaff, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const levelFilter = c.req.query('level') || ''
  const typeFilter = c.req.query('type') || ''
  const tab = c.req.query('tab') || 'summary'
  const limit = 50
  const offset = (page - 1) * limit

  const tabClass = (t: string) => t === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
  const tabsNav = `
    <div class="flex gap-2 mb-6">
      <a href="/results?tab=summary" class="px-4 py-2 rounded-lg text-sm ${tabClass('summary')}">Ringkasan</a>
      <a href="/results?tab=kriteria" class="px-4 py-2 rounded-lg text-sm ${tabClass('kriteria')}">Per Kriteria</a>
      <a href="/results?tab=responden" class="px-4 py-2 rounded-lg text-sm ${tabClass('responden')}">Per Responden</a>
    </div>
  `

  if (tab === 'kriteria') {
    try {
      const { results: criteria } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; name: string; weight: number }>()
      const { results: evaluations } = await c.env.DB.prepare('SELECT * FROM evaluations').all<any>()
      const rows = criteria.map((cr, idx) => {
        const col = `c${idx + 1}_score`
        const scores = evaluations.map(e => e[col] as number)
        const avgRaw = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        const max = scores.length ? Math.max(...scores) : 0
        const avgNorm = max === 0 ? 0 : avgRaw / max
        const contribution = avgNorm * cr.weight
        return `
          <tr class="hover:bg-gray-800/50 transition-colors">
            <td class="p-4 font-bold text-indigo-400">${cr.id}</td>
            <td class="p-4 text-gray-200">${cr.name}</td>
            <td class="p-4 text-white">${avgRaw.toFixed(2)}</td>
            <td class="p-4 text-white">${avgNorm.toFixed(3)}</td>
            <td class="p-4 text-gray-400">${cr.weight}</td>
            <td class="p-4 font-bold text-emerald-400">${contribution.toFixed(3)}</td>
          </tr>
        `
      }).join('')
      const content = `
        ${tabsNav}
        <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <table class="w-full text-left">
            <thead class="bg-gray-950 border-b border-gray-800">
              <tr>
                <th class="p-4 font-semibold text-gray-400 text-sm">Kode</th>
                <th class="p-4 font-semibold text-gray-400 text-sm">Kriteria</th>
                <th class="p-4 font-semibold text-gray-400 text-sm">Avg Skor</th>
                <th class="p-4 font-semibold text-gray-400 text-sm">Avg Normalisasi</th>
                <th class="p-4 font-semibold text-gray-400 text-sm">Bobot</th>
                <th class="p-4 font-semibold text-gray-400 text-sm">Kontribusi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">${rows || '<tr><td colspan="6" class="p-8 text-center text-gray-500">Belum ada data evaluasi</td></tr>'}</tbody>
          </table>
        </div>
      `
      return c.html(Layout({ title: 'Hasil per Kriteria', content, activePage: '/results', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
    } catch (e: any) {
      return c.text('Error loading kriteria breakdown: ' + e.message, 500)
    }
  }

  if (tab === 'responden') {
    try {
      const { results: criteria } = await c.env.DB.prepare('SELECT * FROM criteria ORDER BY id ASC').all<{ id: string; weight: number }>()
      const { results: evaluations } = await c.env.DB.prepare(
        'SELECT e.*, r.name, sr.final_score FROM evaluations e JOIN respondents r ON r.id = e.respondent_id LEFT JOIN saw_results sr ON sr.respondent_id = e.respondent_id ORDER BY CAST(SUBSTR(e.respondent_id, 2) AS INTEGER) ASC'
      ).all<any>()
      const maxes = criteria.map((_, idx) => {
        const scores = evaluations.map(e => e[`c${idx + 1}_score`] as number)
        return scores.length ? Math.max(...scores) : 0
      })
      const header = criteria.map(cr => `<th class="p-3 text-gray-400 text-xs">${cr.id}</th>`).join('')
      const rows = evaluations.map(e => {
        const cells = criteria.map((cr, idx) => {
          const raw = e[`c${idx + 1}_score`] as number
          const contribution = maxes[idx] === 0 ? 0 : (raw / maxes[idx]) * cr.weight
          return `<td class="p-3 text-sm text-gray-300">${raw} <span class="text-gray-500">(${contribution.toFixed(3)})</span></td>`
        }).join('')
        return `<tr class="hover:bg-gray-800/50 transition-colors"><td class="p-3 text-sm font-mono text-gray-500">${e.respondent_id}</td><td class="p-3 text-sm text-gray-200">${e.name}</td>${cells}<td class="p-3 text-sm font-bold text-emerald-400">${(e.final_score ?? 0).toFixed(3)}</td></tr>`
      }).join('')
      const content = `
        ${tabsNav}
        <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto shadow-xl">
          <table class="w-full text-left">
            <thead class="bg-gray-950 border-b border-gray-800"><tr><th class="p-3 text-gray-400 text-xs">ID</th><th class="p-3 text-gray-400 text-xs">Nama</th>${header}<th class="p-3 text-gray-400 text-xs">Final Score</th></tr></thead>
            <tbody class="divide-y divide-gray-800">${rows || `<tr><td colspan="${criteria.length + 3}" class="p-8 text-center text-gray-500">Belum ada data evaluasi</td></tr>`}</tbody>
          </table>
        </div>
      `
      return c.html(Layout({ title: 'Hasil per Responden', content, activePage: '/results', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
    } catch (e: any) {
      return c.text('Error loading responden breakdown: ' + e.message, 500)
    }
  }

  try {
    const whereClause: string[] = []
    const params: any[] = []

    if (levelFilter) {
      whereClause.push('s.satisfaction_level = ?')
      params.push(levelFilter)
    }
    if (typeFilter) {
      whereClause.push('r.consumer_type = ?')
      params.push(typeFilter)
    }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''

    const countQuery = `SELECT COUNT(*) as total FROM saw_results s JOIN respondents r ON s.respondent_id = r.id ${whereStr}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>()
    const total = countResult?.total || 0
    const totalPages = Math.ceil(total / limit)

    const query = `
      SELECT s.respondent_id, r.name, r.email, r.school, r.consumer_type, s.final_score, s.satisfaction_level
      FROM saw_results s
      JOIN respondents r ON s.respondent_id = r.id
      ${whereStr}
      ORDER BY s.final_score DESC
      LIMIT ? OFFSET ?
    `
    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all<{
      respondent_id: string; name: string; email?: string; school?: string; consumer_type: string; final_score: number; satisfaction_level: string
    }>()

    const { results: stats } = await c.env.DB.prepare(
      'SELECT satisfaction_level, COUNT(*) as cnt FROM saw_results GROUP BY satisfaction_level'
    ).all<{ satisfaction_level: string; cnt: number }>()

    const statMap: Record<string, number> = { K1: 0, K2: 0, K3: 0, K4: 0 }
    stats.forEach(s => (statMap[s.satisfaction_level] = s.cnt))
    const totalResults = Object.values(statMap).reduce((a, b) => a + b, 0)

    const getLevelBadge = (level: string) => {
      switch (level) {
        case 'K1': return '<span class="px-3 py-1 bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded-full text-xs font-bold">K1 (Sangat Puas)</span>'
        case 'K2': return '<span class="px-3 py-1 bg-blue-900/50 text-blue-400 border border-blue-800 rounded-full text-xs font-bold">K2 (Puas)</span>'
        case 'K3': return '<span class="px-3 py-1 bg-orange-900/50 text-orange-400 border border-orange-800 rounded-full text-xs font-bold">K3 (Tidak Puas)</span>'
        case 'K4': return '<span class="px-3 py-1 bg-red-900/50 text-red-400 border border-red-800 rounded-full text-xs font-bold">K4 (Sangat Tidak Puas)</span>'
        default: return ''
      }
    }

    const rows = results.length > 0
      ? results.map((row, idx) => {
          const typeBadge = row.consumer_type === 'Murid'
            ? '<span class="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-800">Murid</span>'
            : '<span class="px-2 py-1 bg-amber-900/30 text-amber-400 text-xs rounded border border-amber-800">Staff</span>'
          return `
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="p-4 font-bold text-gray-500">#${offset + idx + 1}</td>
              <td class="p-4 font-mono text-gray-400 text-sm">${row.respondent_id}</td>
              <td class="p-4">
                <div class="font-medium text-gray-200">${row.name}</div>
                <div class="text-xs text-gray-500 font-mono">${row.email || ''}</div>
              </td>
              <td class="p-4 text-gray-300 text-sm">${row.school || '-'}</td>
              <td class="p-4">${typeBadge}</td>
              <td class="p-4 font-mono font-bold text-indigo-400">${row.final_score.toFixed(4)}</td>
              <td class="p-4">${getLevelBadge(row.satisfaction_level)}</td>
            </tr>
          `
        }).join('')
      : '<tr><td colspan="7" class="p-8 text-center text-gray-500">Belum ada hasil perhitungan. <a href="/saw-calculate" class="text-indigo-400 underline">Jalankan SAW</a></td></tr>'

    const filterActiveLevel = (val: string) => levelFilter === val ? 'selected' : ''
    const filterActiveType = (val: string) => typeFilter === val ? 'selected' : ''

    const statPercent = (count: number) => totalResults > 0 ? ((count / totalResults) * 100).toFixed(1) : '0'

    const pagination = totalPages > 1 ? `
      <div class="flex flex-col sm:flex-row justify-between items-center bg-gray-900 border border-gray-800 rounded-xl p-4 mt-6 gap-4">
        <span class="text-sm text-gray-400">
          Menampilkan ${offset + 1} - ${Math.min(offset + limit, total)} dari ${total} hasil
        </span>
        <div class="flex gap-2">
          ${page > 1 ? `<a href="/results?page=${page - 1}${levelFilter ? `&level=${levelFilter}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">← Prev</a>` : ''}
          <span class="px-4 py-2 text-sm text-gray-400">Halaman ${page} / ${totalPages}</span>
          ${page < totalPages ? `<a href="/results?page=${page + 1}${levelFilter ? `&level=${levelFilter}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">Next →</a>` : ''}
        </div>
      </div>
    ` : ''

    const content = `
      ${tabsNav}
      <!-- Statistics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl text-center hover:border-emerald-800/50 transition-all">
          <div class="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">K1 - Sangat Puas</div>
          <div class="text-3xl font-bold text-emerald-400">${statMap['K1']}</div>
          <div class="text-xs text-gray-600 mt-1">${statPercent(statMap['K1'])}%</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl text-center hover:border-blue-800/50 transition-all">
          <div class="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">K2 - Puas</div>
          <div class="text-3xl font-bold text-blue-400">${statMap['K2']}</div>
          <div class="text-xs text-gray-600 mt-1">${statPercent(statMap['K2'])}%</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl text-center hover:border-orange-800/50 transition-all">
          <div class="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">K3 - Tidak Puas</div>
          <div class="text-3xl font-bold text-orange-400">${statMap['K3']}</div>
          <div class="text-xs text-gray-600 mt-1">${statPercent(statMap['K3'])}%</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl text-center hover:border-red-800/50 transition-all">
          <div class="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">K4 - Sgt Tdk Puas</div>
          <div class="text-3xl font-bold text-red-400">${statMap['K4']}</div>
          <div class="text-xs text-gray-600 mt-1">${statPercent(statMap['K4'])}%</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 class="text-2xl font-bold text-white">Laporan Hasil Keputusan</h2>
        <form method="get" class="flex flex-wrap gap-2 w-full md:w-auto">
          <select name="type" class="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 p-2">
            <option value="">Semua Tipe</option>
            <option value="Murid" ${filterActiveType('Murid')}>Murid</option>
            <option value="Staff" ${filterActiveType('Staff')}>Staff</option>
          </select>
          <select name="level" class="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 p-2">
            <option value="">Semua Kategori</option>
            <option value="K1" ${filterActiveLevel('K1')}>K1 - Sangat Puas</option>
            <option value="K2" ${filterActiveLevel('K2')}>K2 - Puas</option>
            <option value="K3" ${filterActiveLevel('K3')}>K3 - Tidak Puas</option>
            <option value="K4" ${filterActiveLevel('K4')}>K4 - Sangat Tidak Puas</option>
          </select>
          <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Filter</button>
        </form>
      </div>

      <!-- Results Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto shadow-xl">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-950 border-b border-gray-800">
            <tr>
              <th class="p-4 font-semibold text-gray-400 w-16">Rank</th>
              <th class="p-4 font-semibold text-gray-400">ID</th>
              <th class="p-4 font-semibold text-gray-400">Nama & Email</th>
              <th class="p-4 font-semibold text-gray-400">Asal Sekolah</th>
              <th class="p-4 font-semibold text-gray-400">Tipe</th>
              <th class="p-4 font-semibold text-gray-400">Skor Akhir (W)</th>
              <th class="p-4 font-semibold text-gray-400">Tingkat Kepuasan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            ${rows}
          </tbody>
        </table>
      </div>
      ${pagination}
    `

    return c.html(Layout({ title: 'Hasil Keputusan', content, activePage: '/results', evaluasiEnabled: await getEvaluasiEnabled(c), staff: true }))
  } catch (e: any) {
    return c.text('Error loading results: ' + e.message, 500)
  }
})

// ==============================
// Manajemen Data Master (staff-only)
// ==============================
app.get('/master/schools', requireStaff, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM school_scopes ORDER BY name ASC').all<{ id: number; name: string }>()
  const rows = results.map(r => `
    <tr class="hover:bg-gray-800/50 transition-colors">
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
    <form method="post" action="/master/toggle-evaluasi" class="mb-6">
      <button type="submit" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm border border-gray-700">
        Toggle Menu Evaluasi (saat ini: ${evaluasiEnabled ? 'Aktif ✅' : 'Nonaktif ❌'})
      </button>
    </form>
    <form method="post" action="/master/schools" class="flex gap-2 mb-6">
      <input type="text" name="name" required placeholder="Nama sekolah" class="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5" />
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg">Tambah</button>
    </form>
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-gray-950 border-b border-gray-800"><tr><th class="p-4 text-gray-400 text-sm">Nama Sekolah</th><th></th></tr></thead>
        <tbody class="divide-y divide-gray-800">${rows || '<tr><td colspan="2" class="p-8 text-center text-gray-500">Belum ada data</td></tr>'}</tbody>
      </table>
    </div>
  `
  return c.html(Layout({ title: 'Lingkup Sekolah', content, activePage: '/master/schools', evaluasiEnabled, staff: true }))
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

app.post('/master/toggle-evaluasi', requireStaff, async (c) => {
  const enabled = await getEvaluasiEnabled(c)
  await c.env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'evaluasi_menu_enabled'").bind(enabled ? '0' : '1').run()
  return c.redirect('/master/schools')
})

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
  return c.html(Layout({ title: 'Manage Kriteria', content, activePage: '/master/criteria', evaluasiEnabled, staff: true }))
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

export default app
