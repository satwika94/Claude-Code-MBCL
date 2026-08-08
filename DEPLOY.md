# Panduan Deploy — NutriCalc

Aplikasi ini sudah disiapkan supaya bisa deploy sebagai **satu service saja**
(backend Express men-serve hasil build frontend React, jadi cuma butuh 1 URL,
bukan 2 server terpisah). Database-nya **PostgreSQL** yang diakses lewat
jaringan (mis. Supabase/Neon) — bukan file SQLite lokal — jadi datanya aman
disimpan di luar disk service backend.

## Soal siapa yang menjalankan langkah-langkah ini

Panduan di bawah ini ditulis untuk kamu jalankan sendiri (copy-paste ke
terminal, atau klik-klik di dashboard). Kalau kamu punya **Claude Code** —
beda dengan Claude di chat ini, Claude Code jalan di komputer kamu sendiri
dengan akses jaringan & kredensial asli — kamu bisa minta Claude Code
langsung mengeksekusi seluruh proses ini untukmu: push ke GitHub, login CLI
Railway/Vercel, deploy, sampai generate domain publik. Tinggal buka folder
project ini di Claude Code dan bilang misalnya *"deploy aplikasi ini ke
Railway sesuai DEPLOY.md"*.

Provisioning **Supabase** butuh login interaktif di browser, jadi itu bagian
yang harus kamu klik sendiri di dashboard — Claude (baik di chat ini maupun
Claude Code) tidak bisa login akun pihak ketiga untukmu.

## Langkah 0 (WAJIB untuk semua opsi): buat database Supabase

Semua opsi deploy di bawah butuh `DATABASE_URL` yang mengarah ke database
Postgres. Rekomendasi: [Supabase](https://supabase.com), free tier-nya
genuinely permanen (tidak seperti disk Render free tier yang hilang tiap
restart).

1. Buka https://supabase.com → **Sign in** (bisa pakai akun GitHub)
2. **New project** → pilih organization (atau buat baru) → isi:
   - **Name**: bebas, misal `buku-gizi`
   - **Database Password**: buat password kuat, **simpan baik-baik** (dibutuhkan di connection string, tidak ditampilkan lagi setelah ini)
   - **Region**: pilih yang terdekat (Southeast Asia / Singapore paling dekat ke Indonesia)
3. Klik **Create new project**, tunggu ±2 menit sampai provisioning selesai
4. Ambil connection string: **Project Settings** (ikon gear) → **Database** →
   bagian **Connection string** → tab **URI**
   - Pakai mode **Transaction** (connection pooling, port `6543`) — lebih
     cocok untuk backend serverless/hosting kecil dibanding direct
     connection (port `5432`)
   - Hasilnya kira-kira:
     `postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres`
   - Ganti `[YOUR-PASSWORD]` dengan password dari langkah 2
5. **Simpan connection string ini** — dipakai sebagai env var `DATABASE_URL`
   di semua opsi deploy di bawah. **Jangan pernah commit connection string
   asli ke git/GitHub** — isi cuma di dashboard hosting (Render/Railway/Vercel)
   atau di `.env` lokal (sudah di-`.gitignore`).

### Isi schema & data awal (jalankan sekali, dari komputer kamu)

Setelah dapat `DATABASE_URL`, isi database dengan skema tabel + 1.343 data
makanan dari TKPI:

```bash
cd nutrition-app
npm install
echo "DATABASE_URL=postgresql://...(connection string dari langkah di atas)" >> .env
npm run seed
```

Kalau berhasil akan muncul `✅ 1343 data makanan diproses...`. (Backend juga
otomatis menjalankan seed ini sendiri saat pertama kali start kalau tabel
`foods` masih kosong, jadi langkah manual ini opsional — tapi enak buat
verifikasi connection string-nya benar sebelum lanjut deploy.)

---

## Realita harga hosting per Agustus 2026

| Platform | Biaya | Minta kartu? | Server tidur? | Catatan |
|---|---|---|---|---|
| **Render** (free tier) + Supabase | Rp0 | Ya, verifikasi kartu (tidak di-charge selama Instance Type = Free) | Ya, tidur setelah 15 menit nganggur, bangun lagi 30-60 detik | Data sekarang **aman** karena disimpan di Supabase (bukan disk Render) |
| **Railway** (Hobby) + Supabase | ~$5/bulan (~Rp80rb) | Ya | Tidak, selalu nyala | Bayar untuk server yang tidak cold-start, bukan lagi demi data permanen |
| **Vercel** (frontend + backend) + Supabase | Rp0 | **Tidak** | Cold-start ringan tapi cepat (serverless) | Satu platform saja, tidak perlu kartu sama sekali — lihat Opsi D |

**Rekomendasi saya:** kalau kamu tidak keberatan verifikasi kartu (tidak
akan di-charge di tier Free), **Render (Opsi A)** paling simpel karena
backend jalan sebagai server biasa, satu service. Kalau **tidak mau kasih
kartu sama sekali**, pakai **Opsi D: full Vercel** — satu-satunya opsi di
sini yang genuinely tidak butuh kartu, karena frontend & backend jadi satu
platform yang sama.

---

## Opsi A: Render (gratis, data permanen via Supabase)

### 1. Push project ke GitHub (kalau belum)
```bash
cd nutrition-app
git init && git add . && git commit -m "Initial commit"
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
5. Buka **Environment Variables**, tambahkan:
   ```
   DATABASE_URL=postgresql://...(connection string Supabase dari Langkah 0)
   ```
6. Klik **Create Web Service**

Render akan build & jalankan otomatis. Setelah selesai (±2-5 menit), kamu dapat
URL publik seperti `https://buku-gizi-xxxx.onrender.com` — buka di HP, langsung
bisa dipakai. Server bisa "tidur" setelah 15 menit nganggur (bangun lagi
30-60 detik pas diakses), tapi data akun/riwayat makan **tidak hilang** —
tersimpan permanen di Supabase.

---

## Opsi B: Railway (~Rp80rb/bulan, tanpa cold-start)

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

### 3. Set Build & Start Command + env var
Buka dashboard Railway (`railway open`) → pilih service → tab **Settings**:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

Lalu tab **Variables**, tambah:
```
DATABASE_URL=postgresql://...(connection string Supabase dari Langkah 0)
```

### 4. Generate domain publik
Tab **Settings** → **Networking** → **Generate Domain**. Railway kasih URL
seperti `https://buku-gizi-production.up.railway.app`.

---

## Opsi C: Vercel (frontend) + Render/Railway (backend)

Vercel itu platform *serverless* — cocok banget untuk frontend statis, tapi
backend Express kita (mount semua route lewat satu `app.listen`, bukan
per-function) belum dikonversi jadi Vercel Functions. Jalan keluarnya,
**pisah deploy-nya jadi 2**:
- **Backend** (Express, connect ke Supabase lewat `DATABASE_URL`) → ke Render/Railway seperti Opsi A/B di atas
- **Frontend** (React) → ke Vercel, dihubungkan ke backend lewat env var

Frontend sudah disiapkan untuk mode ini (`frontend/src/api.js` baca
`VITE_API_URL`). Langkahnya:

### 1. Deploy backend dulu (ikuti Opsi A atau B), catat URL-nya
Misal hasilnya `https://buku-gizi-backend.onrender.com`

### 2. Push project ke GitHub (kalau belum, sama seperti Opsi A langkah 1)

### 3. Import project di Vercel
1. Login ke https://vercel.com (bisa pakai akun GitHub)
2. **Add New** → **Project** → pilih repo GitHub project ini
3. Di step konfigurasi:
   - **Root Directory**: `frontend` (penting — Vercel harus build folder frontend, bukan root)
   - **Framework Preset**: Vite (biasanya otomatis terdeteksi)
4. Buka **Environment Variables**, tambahkan:
   ```
   VITE_API_URL=https://buku-gizi-backend.onrender.com/api
   ```
   (ganti dengan URL backend kamu dari langkah 1, jangan lupa akhiran `/api`)
5. Klik **Deploy**

Vercel kasih URL publik seperti `https://buku-gizi.vercel.app` — itu frontend-nya,
sudah otomatis manggil API ke backend yang di Render/Railway.

---

## Opsi D: Full Vercel — frontend + backend, satu platform, tanpa kartu

Ini opsi paling pas kalau kamu tidak mau kasih kartu ke platform hosting
manapun. Backend Express sudah dikonversi jadi Vercel Serverless Function
(lihat `api/index.js` — file ini yang jalan di Vercel, `server.js` tetap
dipakai untuk Opsi A/B/C atau dev lokal, isinya sama cuma beda cara
di-jalankan). Database tetap Supabase seperti Langkah 0.

Bedanya dengan Opsi C: **cuma butuh 1 project Vercel** untuk frontend +
backend sekaligus (bukan 2 platform terpisah), dan **root directory-nya
folder repo itu sendiri**, bukan `frontend`.

### 1. Push project ke GitHub (kalau belum, sama seperti Opsi A langkah 1)

### 2. Import project di Vercel
1. Login ke https://vercel.com (bisa pakai akun GitHub) — tidak akan diminta kartu untuk Hobby plan
2. **Add New** → **Project** → pilih repo GitHub project ini
3. Di step konfigurasi:
   - **Root Directory**: biarkan default (`.`, folder repo paling atas) — **JANGAN** diubah ke `frontend` seperti Opsi C, karena Vercel perlu lihat folder `api/` yang ada di root juga
   - **Framework Preset**: pilih **Other** (build command & output directory sudah diatur lewat `vercel.json` di repo, jadi Vercel otomatis pakai itu)
4. Buka **Environment Variables**, tambahkan:
   ```
   DATABASE_URL=postgresql://...(connection string Supabase dari Langkah 0)
   ```
   (frontend di setup ini tidak butuh `VITE_API_URL` — dia manggil `/api` relatif, karena frontend & backend sekarang satu origin/domain yang sama)
5. Klik **Deploy**

Tunggu ±1-2 menit, Vercel kasih 1 URL publik seperti `https://buku-gizi.vercel.app`
yang sudah melayani frontend DAN `/api/*` sekaligus.

**Kalau kamu sudah kadung bikin project Vercel dengan Root Directory =
`frontend` (Opsi C)**: hapus project itu (**Settings** → **Advanced** →
**Delete Project**) dan buat ulang dari langkah 2 di atas dengan Root
Directory default — Root Directory tidak bisa diubah setelah project dibuat.

---

## Cara tes hasil deploy

Buka URL yang didapat dari Render/Railway/Vercel (tergantung opsi yang
kamu pilih) di HP atau browser:
1. Harus langsung muncul form onboarding "NutriCalc"
2. Isi profil → harus lanjut ke dashboard dengan cincin kalori
3. Coba catat makanan → refresh halaman, atau buka lagi besok → catatan
   harus tetap ada (data tersimpan di Supabase, bukan disk backend, jadi
   aman dari restart/cold-start platform manapun)
