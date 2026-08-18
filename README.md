# SPK MBG SAW — Panduan Menjalankan Secara Lokal

Sistem Pendukung Keputusan (metode **SAW** — Simple Additive Weighting) untuk evaluasi
Program Makan Bergizi Gratis (MBG). Dibangun dengan **Hono + Cloudflare Workers + D1 (SQLite)**.

Panduan ini menjelaskan cara menjalankan project **sepenuhnya di komputer lokal**:

- Tanpa login ke akun Cloudflare
- Tanpa koneksi ke D1 di cloud
- Tanpa deploy ke internet
- Data tersimpan di **file SQLite lokal** di komputer kamu

Panduan mendukung **Windows, macOS, dan Linux** — ikuti bagian sesuai OS kamu.

> **Catatan penting:** "Lokal" di sini bukan berarti offline total. `npm install`
> (mengunduh dependensi) dan CDN frontend (Tailwind, Chart.js, jsPDF, XLSX) tetap
> membutuhkan koneksi internet. Yang tidak dibutuhkan adalah koneksi ke akun/produk
> Cloudflare.

---

## 1. Prasyarat dari Nol (Belum Ada Node & SQLite)

**Kabar baik: SQLite TIDAK perlu di-install.** Wrangler membawa runtime SQLite sendiri
(lewat Miniflare), jadi satu-satunya yang wajib adalah **Node.js versi 20+**
(disarankan LTS terbaru).

Ikuti bagian sesuai OS kamu (1a Windows / 1b macOS / 1c Linux), lalu lanjut ke bagian 2.

### 1a. Windows

1. **Install Node.js LTS**
   - Download installer di <https://nodejs.org> (tombol **LTS**), jalankan, klik Next
     sampai selesai — pastikan opsi **"Add to PATH"** tercentang (default sudah).
   - Atau lewat PowerShell: `winget install OpenJS.NodeJS.LTS`

2. **Install Git for Windows** (sekalian dapat Git Bash)
   - Download di <https://git-scm.com/download/win>, install dengan opsi default.
   - Git Bash memungkinkan semua perintah `bash` di panduan ini dijalankan sama persis,
     jadi sangat disarankan.

3. **Buka terminal** — pilih salah satu:
   - **Git Bash** (disarankan): klik kanan di dalam folder project → "Git Bash Here", atau
   - **PowerShell**: perintah yang beda akan diberi label `(PowerShell)` di panduan ini.

4. **Verifikasi** (jalankan di Git Bash / PowerShell):

   ```bash
   node -v   # harus muncul versi, mis. v22.x
   npm -v    # harus muncul versi, mis. 10.x
   ```

> Catatan khusus Windows:
> - Wrangler berjalan normal di Windows — binary `workerd` versi Windows otomatis
>   ter-install saat `npm install`, tidak perlu diurus manual.
> - Saat pertama kali `wrangler dev` jalan, Windows Defender Firewall mungkin muncul
>   popup — klik **Allow**.
> - Disarankan clone project di path tanpa spasi/karakter aneh (mis. `C:\projects\mbg-saw`),
>   hindari folder OneDrive/Desktop.

### 1b. macOS

```bash
# Cara 1: Homebrew (paling praktis kalau sudah ada Homebrew)
brew install node

# Cara 2: nvm (sama seperti bagian Linux di bawah)
```

### 1c. Ubuntu / Debian (Linux)

```bash
# 1. Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# 2. Muat ulang konfigurasi shell (atau tutup-buka terminal)
source ~/.bashrc

# 3. Install Node.js versi LTS terbaru
nvm install --lts

# 4. Verifikasi
node -v   # harus muncul versi, mis. v22.x
npm -v    # harus muncul versi, mis. 10.x
```

### 1d. Tabel Perintah Setara antar OS

Beberapa perintah di panduan ini berbeda antar OS. Simpan tabel ini sebagai contekan
(penting kalau pakai Windows PowerShell):

| Aksi | Linux / macOS / Git Bash | Windows PowerShell |
| --- | --- | --- |
| Buat file `.dev.vars` | `cat > .dev.vars << 'EOF' ... EOF` | Perintah `Set-Content` (lihat bagian 3) |
| Hapus folder database | `rm -rf .wrangler/state` | `Remove-Item -Recurse -Force .wrangler\state` |
| Matikan telemetri wrangler | `export WRANGLER_SEND_METRICS=false` | `$env:WRANGLER_SEND_METRICS="false"` |
| Jalankan dev server | `npm run dev` | `npm run dev` (sama) |
| Ganti port | `npx wrangler dev --port 8788` | sama |

---

## 2. Clone & Install Dependensi

**Windows PowerShell / Git Bash:**

```bash
# 1. Clone repository
git clone <URL-REPOSITORY> mbg-saw
cd mbg-saw

# 2. Install dependensi (butuh internet, beberapa menit)
npm install
```

> Semua perintah `npm` di panduan ini berjalan sama di semua OS — npm sudah
> mengurus perbedaan platform secara otomatis.

---

## 3. Buat File Konfigurasi `.dev.vars`

File ini berisi kredensial login staff dan secret session. **Tanpa file ini aplikasi
tidak bisa jalan** (error `STAFF_USERNAME` dsb.).

Isi file (sama untuk semua OS):

```
STAFF_USERNAME=admin
STAFF_PASSWORD=ganti_password_ini
SESSION_SECRET=ubah-ke-string-acak-panjang-minimal-32-karakter
```

Cara membuatnya — pilih sesuai OS kamu:

**Linux / macOS / Git Bash (Windows):**

```bash
# Di folder project:
cat > .dev.vars << 'EOF'
STAFF_USERNAME=admin
STAFF_PASSWORD=ganti_password_ini
SESSION_SECRET=ubah-ke-string-acak-panjang-minimal-32-karakter
EOF
```

**Windows PowerShell:**

```powershell
@"
STAFF_USERNAME=admin
STAFF_PASSWORD=ganti_password_ini
SESSION_SECRET=ubah-ke-string-acak-panjang-minimal-32-karakter
"@ | Set-Content -Encoding utf8 .dev.vars
```

- `STAFF_USERNAME` / `STAFF_PASSWORD` = akun untuk login staff
- `SESSION_SECRET` = string acak panjang (untuk tanda tangan cookie session)

> File `.dev.vars` sudah masuk `.gitignore`, jadi kredensial tidak ikut ter-commit
> ke git. Jangan pernah share file ini.
>
> **Kalau file ini baru dibuat/diubah, restart dev server** — env hanya dibaca saat
> server mulai.

---

## 4. Inisialisasi Database Lokal

Satu perintah untuk membuat tabel + data contoh (8 kriteria, 6 sekolah, 100 responden,
800 data evaluasi):

```bash
npm run db:init
```

Yang terjadi di balik layar:

```bash
wrangler d1 execute mbg-saw-db --local --file=./schema_part1.sql
wrangler d1 execute mbg-saw-db --local --file=./schema_part2.sql
```

Flag `--local` memastikan perintah ini **tidak menyentuh Cloudflare sama sekali** —
database dibuat di file SQLite lokal di dalam folder `.wrangler/`.

> **Perhatian:** `schema_part1.sql` diawali `DROP TABLE`, jadi menjalankan ulang
> `db:init` = **reset total database**. Lihat bagian 8 untuk penjelasan lebih lanjut.

---

## 5. Menjalankan Aplikasi

```bash
npm run dev
```

Setelah muncul log seperti ini, aplikasi sudah jalan:

```
[wrangler:inf] Ready on http://localhost:8787
```

Buka **<http://localhost:8787>** di browser. Dashboard dan hasil keputusan bisa
diakses tanpa login.

> Di Windows, saat pertama kali jalankan, izinkan akses di popup **Windows Defender
> Firewall** (klik Allow) — ini normal untuk dev server lokal.

Halaman-halaman utama:

| URL | Keterangan |
| --- | --- |
| `/` | Dashboard (publik) |
| `/login` | Login staff |
| `/criteria` | Data kriteria (staff) |
| `/respondents` | Data responden (staff) |
| `/results` | Hasil keputusan SAW (staff) |
| `/master/schools` | Manajemen lingkup sekolah (staff) |
| `/evaluate` | Form evaluasi publik |

---

## 6. Login Staff & Aktifkan Menu Evaluasi

1. Buka <http://localhost:8787/login>
2. Masukkan username & password sesuai isi `.dev.vars` (contoh: `admin`)
3. Setelah login, buka `/master/schools`
4. Klik tombol **"Toggle Menu Evaluasi"** sampai statusnya **"Aktif ✅"**
   (di data seed awal, menu evaluasi sengaja dinonaktifkan — value `0` di tabel `settings`)

Sekarang menu **Evaluasi** muncul di sidebar dan form `/evaluate` bisa dibuka.

---

## 7. Menghitung SAW untuk Data Contoh (sekali saja)

Perhitungan SAW berjalan **otomatis setiap kali evaluasi disimpan** (auto-SAW).
Data seed hanya berisi responden + evaluasi mentah, jadi hasil SAW awalnya kosong.
Cukup trigger sekali:

1. Buka <http://localhost:8787/evaluate>
2. Isi form dengan data apa saja (nama, sekolah, tipe, 8 skor 1-4)
3. Klik **Simpan Evaluasi**

Selesai — perhitungan SAW akan menghitung **semua 100 responden** sekaligus.
Buka `/results` untuk melihat peringkat K1–K4.

---

## 8. Di Mana Data Tersimpan & Cara Reset

- Database lokal tersimpan di folder **`.wrangler/state/`** (file SQLite).
- Folder ini sudah masuk `.gitignore` — tidak ikut ter-commit.

**Reset database ke kondisi awal** (jalankan setelah dev server dihentikan dengan Ctrl+C):

**Linux / macOS / Git Bash:**

```bash
rm -rf .wrangler/state
npm run db:init
npm run dev
```

**Windows PowerShell:**

```powershell
Remove-Item -Recurse -Force .wrangler\state
npm run db:init
npm run dev
```

---

## 9. Troubleshooting

| Masalah | Solusi |
| --- | --- |
| `command not found: wrangler` saat `npm run db:init` | Jalankan `npm install` dulu. Wrangler dipanggil lewat `npm run`, jadi tidak perlu install global. |
| Error `STAFF_USERNAME is not defined` saat buka halaman | File `.dev.vars` belum dibuat / salah nama. Buat sesuai bagian 3, lalu **restart** dev server (env dibaca saat server mulai). |
| Error `no such table: criteria` / `D1_ERROR` | Database belum di-init. Jalankan `npm run db:init`. |
| Port `8787` sudah dipakai | `npx wrangler dev --port 8788` (ganti port sesuka kamu). |
| Login selalu "Username atau password salah" | Cek isi `.dev.vars`. Kalau baru diedit, restart dev server (Ctrl+C lalu `npm run dev` lagi). |
| Muncul pertanyaan telemetri dari Wrangler | Jawab `n`, atau matikan permanen: `export WRANGLER_SEND_METRICS=false` (PowerShell: `$env:WRANGLER_SEND_METRICS="false"`). |
| Grafik / tombol export (PDF/XLSX) tidak muncul | Frontend memuat library dari CDN — pastikan ada koneksi internet. |
| **Windows:** popup Windows Defender Firewall muncul | Klik **Allow** — itu akses untuk dev server lokal. |
| **Windows:** PowerShell menolak menjalankan script | Pakai **Git Bash** (disarankan), atau `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` di PowerShell. |
| **Windows:** `.dev.vars` tidak terbaca padahal sudah dibuat | Pastikan file bernama persis `.dev.vars` (bukan `.dev.vars.txt`). Cek dengan `ls -la` di Git Bash, atau buat ulang lewat perintah di bagian 3. |
| **Windows:** error aneh soal path (spasi/unicode) | Clone project di path sederhana tanpa spasi, mis. `C:\projects\mbg-saw`. |

---

## 10. Penjelasan: Maksud "Tanpa Koneksi ke Wrangler / Cloudflare"

Biar tidak bingung, ada 2 hal yang namanya mirip:

1. **Wrangler (CLI tool)** — tetap dipakai, tapi hanya sebagai *dev server lokal*.
   Saat `wrangler dev` jalan, runtime Cloudflare (workerd) dan database D1
   di-simulasikan **di dalam komputermu** (SQLite lokal oleh Miniflare).
   Tidak ada login, tidak ada upload, tidak ada koneksi ke akun Cloudflare.
2. **Cloudflare (cloud)** — hanya tersentuh jika kamu menjalankan
   `npm run deploy` (perintah deploy ke production). Selama kamu hanya pakai
   `npm run dev` dan `npm run db:init`, tidak ada data apa pun yang keluar dari komputermu.

Jadi alur sehari-hari yang aman untuk development:

```bash
npm run dev          # jalan lokal di localhost:8787
npm run db:init      # reset/isi database lokal
```

Dan yang **jangan** dijalankan kecuali memang mau deploy:

```bash
npm run deploy       # ⚠️ ini yang konek ke Cloudflare
```
