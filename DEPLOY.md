# Panduan Deploy — Buku Gizi

Aplikasi ini sudah disiapkan supaya bisa deploy sebagai **satu service saja**
(backend Express men-serve hasil build frontend React, jadi cuma butuh 1 URL,
bukan 2 server terpisah).

## Soal siapa yang menjalankan langkah-langkah ini

Panduan di bawah ini ditulis untuk kamu jalankan sendiri (copy-paste ke
terminal). Kalau kamu punya **Claude Code** — beda dengan Claude di chat ini,
Claude Code jalan di komputer kamu sendiri dengan akses jaringan & kredensial
asli — kamu bisa minta Claude Code langsung mengeksekusi seluruh proses ini
untukmu: push ke GitHub, login CLI Railway/Vercel, deploy, sampai generate
domain publik. Tinggal buka folder project ini di Claude Code dan bilang
misalnya *"deploy aplikasi ini ke Railway sesuai DEPLOY.md"*.

## Realita harga hosting per Agustus 2026 (baca dulu sebelum pilih)

Sayangnya sudah tidak ada lagi platform yang "gratis selamanya + penyimpanan
permanen" untuk app kecil seperti ini:

| Platform | Biaya | Penyimpanan permanen (buat SQLite) | Catatan |
|---|---|---|---|
| **Render** (free tier) | Rp0 | ❌ Tidak ada di free tier | Server "tidur" setelah 15 menit nganggur, nyala lagi 30-60 detik pas diakses. Data user & log makan **hilang tiap restart** (tapi database makanan otomatis ke-seed ulang) |
| **Railway** (Hobby) | ~$5/bulan (~Rp80rb) | ✅ Ada (volume) | Tidak nyala-mati, data permanen selama masih bayar |
| **Fly.io** | ~$2-5/bulan | ✅ Ada (volume) | Sudah tidak ada free tier permanen sejak 2024 |

**Rekomendasi saya:**
- **Buat sekadar demo/nunjukkin ke orang lain** → pakai **Render free tier** (Opsi A). Gratis, tapi jangan simpan data penting di situ karena bisa hilang.
- **Mau benar-benar dipakai nge-track gizi harian** → pakai **Railway Hobby** (Opsi B), ~Rp80rb/bulan, datanya aman.

---

## Opsi A: Render (gratis, untuk demo)

Render deploy dari repo GitHub. Kalau kamu belum punya repo untuk project ini:

### 1. Push project ke GitHub
```bash
cd nutrition-app
git init
git add .
git commit -m "Initial commit"
```
Buat repo baru kosong di https://github.com/new (jangan centang "add README"),
lalu:
```bash
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main
git push -u origin main
```

### 2. Buat Web Service di Render
1. Daftar/login di https://render.com (bisa pakai akun GitHub)
2. Klik **New +** → **Web Service**
3. Pilih repo GitHub yang barusan di-push
4. Isi konfigurasi:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Klik **Create Web Service**

Render akan build & jalankan otomatis. Setelah selesai (±2-5 menit), kamu dapat
URL publik seperti `https://buku-gizi-xxxx.onrender.com` — buka di HP, langsung
bisa dipakai.

**Catatan penting**: karena free tier Render tidak punya disk permanen, tiap
kali service restart (nganggur 15 menit lalu diakses lagi, atau redeploy),
`nutrition.db` dibuat ulang dari nol — daftar makanan otomatis kembali terisi
(auto-seed), tapi **akun user & riwayat makan yang sudah dicatat akan hilang**.
Cocok untuk coba-coba/demo, kurang cocok untuk dipakai harian.

---

## Opsi B: Railway (~Rp80rb/bulan, data permanen)

Railway punya CLI yang bisa deploy langsung dari folder di komputer, tanpa
perlu setup GitHub dulu.

### 1. Install Railway CLI & login
```bash
npm install -g @railway/cli
railway login
```
Ini akan buka browser untuk login/daftar (bisa pakai GitHub).

### 2. Deploy dari folder project
```bash
cd nutrition-app
railway init          # buat project baru, ikuti prompt (kasih nama bebas)
railway up             # upload & deploy folder ini
```

### 3. Set Build & Start Command
Buka dashboard Railway (`railway open`) → pilih service → tab **Settings**:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Tambah persistent volume (WAJIB, supaya data tidak hilang)
Di dashboard Railway → service kamu → tab **Volumes** → **New Volume**:
- Mount path: `/data`

Lalu tab **Variables**, tambah environment variable:
```
DB_PATH=/data/nutrition.db
```
(Server sudah didesain untuk baca `DB_PATH` dari environment variable — lihat
`server.js`.)

### 5. Generate domain publik
Tab **Settings** → **Networking** → **Generate Domain**. Railway kasih URL
seperti `https://buku-gizi-production.up.railway.app`.

Setelah ini, redeploy/restart tidak akan menghapus data karena SQLite-nya
tersimpan di volume yang persistent.

---

## Opsi C: Vercel (frontend) + Railway/Render (backend)

Kalau kamu spesifik ingin pakai **Vercel**: perlu tahu dulu, Vercel itu
platform *serverless* — cocok banget untuk frontend statis, tapi **tidak
cocok untuk backend Express+SQLite kita apa adanya**. Alasannya: fungsi
serverless Vercel tidak punya filesystem permanen, jadi tiap request bisa
kena instance berbeda dan tulisan ke file `nutrition.db` tidak akan
konsisten/bisa hilang. ([sumber resmi Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel))

Jalan keluarnya, **pisah deploy-nya jadi 2**:
- **Backend** (Express + SQLite, tidak berubah) → tetap ke Railway/Render seperti Opsi A/B di atas
- **Frontend** (React) → ke Vercel, dihubungkan ke backend lewat env var

Frontend sudah disiapkan untuk mode ini (`frontend/src/api.js` baca
`VITE_API_URL`). Langkahnya:

### 1. Deploy backend dulu (ikuti Opsi A atau B), catat URL-nya
Misal hasilnya `https://buku-gizi-backend.up.railway.app`

### 2. Push project ke GitHub (kalau belum)
```bash
cd nutrition-app
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main && git push -u origin main
```

### 3. Import project di Vercel
1. Login ke https://vercel.com (bisa pakai akun GitHub)
2. **Add New** → **Project** → pilih repo GitHub project ini
3. Di step konfigurasi:
   - **Root Directory**: `frontend` (penting — Vercel harus build folder frontend, bukan root)
   - **Framework Preset**: Vite (biasanya otomatis terdeteksi)
4. Buka **Environment Variables**, tambahkan:
   ```
   VITE_API_URL=https://buku-gizi-backend.up.railway.app/api
   ```
   (ganti dengan URL backend kamu dari langkah 1, jangan lupa akhiran `/api`)
5. Klik **Deploy**

Vercel kasih URL publik seperti `https://buku-gizi.vercel.app` — itu frontend-nya,
sudah otomatis manggil API ke backend yang di Railway/Render.

### Kalau nanti mau backend juga full di Vercel
Itu berarti migrasi dari SQLite ke database yang bisa diakses lewat jaringan
(SQLite-compatible: [Turso](https://turso.tech); atau Postgres: Neon/Supabase,
keduanya bisa diprovision 1 command lewat `vercel install neon`), plus ubah
routes Express jadi Vercel Functions. Ini perubahan arsitektur yang lumayan,
belum diimplementasikan di prototipe ini — bilang kalau mau saya kerjakan.

---

## Cara tes hasil deploy

Buka URL yang didapat dari Render/Railway di HP atau browser:
1. Harus langsung muncul form onboarding "Buku Gizi"
2. Isi profil → harus lanjut ke dashboard dengan cincin kalori
3. Coba catat makanan → refresh halaman → catatan harus tetap ada (kalau di
   Railway dengan volume; kalau di Render free tier, catatan hilang setelah
   service tidur & bangun lagi — itu wajar sesuai catatan di atas)

## Kalau nanti mau upgrade ke solusi gratis permanen

Ada jalan supaya bisa gratis selamanya TANPA kehilangan data: pindah dari
SQLite ke **PostgreSQL gratis** (mis. [Neon](https://neon.tech) atau
[Supabase](https://supabase.com), keduanya punya free tier database yang
genuinely permanen), lalu tetap pakai Render free tier untuk web service-nya
(data disimpan di database eksternal, bukan disk lokal, jadi aman meski
service Render sendiri restart). Ini butuh sedikit perubahan kode
(`better-sqlite3` → `pg`), belum diimplementasikan di prototipe ini — bilang
kalau mau saya kerjakan.
