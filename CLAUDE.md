# Buku Gizi — konteks untuk Claude Code

Aplikasi pelacak kebutuhan gizi & konsumsi harian untuk pengguna Indonesia.
Backend Node.js/Express + PostgreSQL (mis. Supabase/Neon), frontend React
(Vite). Bahasa UI, nama variabel domain, dan komentar kode mayoritas
**Bahasa Indonesia** — pertahankan konvensi ini kalau menambah/mengubah kode.

## Stack & versi
- Backend: Node.js 20, Express 4, `pg` (node-postgres) — semua query async/await via `db.query(sql, params)`, placeholder `$1, $2, ...` (bukan `?`)
- Database: PostgreSQL hosted (Supabase/Neon), disambungkan lewat env var `DATABASE_URL`. Bukan SQLite lagi — sudah dimigrasikan supaya bisa deploy free tier tanpa kehilangan data
- Frontend: React 18, Vite 5, CSS custom (bukan Tailwind) — lihat `frontend/src/styles/tokens.css` untuk design tokens sebelum menambah style baru
- Tidak ada ORM. Query SQL ditulis langsung di tiap file route.

## Perintah yang sering dipakai
```bash
# .env butuh DATABASE_URL (connection string Postgres) sebelum ini jalan
npm install && npm run seed && npm start   # jalankan backend saja (dev), port 3000
cd frontend && npm install && npm run dev  # jalankan frontend saja (dev), port 5173, proxy ke :3000
npm run build && npm start                  # mode production: 1 service, backend serve build frontend
npm run seed                                 # jalankan schema.sql + isi/update tabel foods dari db/foods_data.json
```

## Arsitektur singkat
- `server.js` — entry point, bikin `pg.Pool` dari `DATABASE_URL`, mount semua route di bawah `/api`, serve `frontend/dist` kalau ada (production), auto-seed database kalau tabel `foods` masih kosong
- `src/services/nutritionCalculator.js` — rumus BMR/TDEE/makro (Mifflin-St Jeor), murni fungsi tanpa DB
- `src/services/menuRecommender.js` — logika susun menu harian. **Penting**: tiap makan utama (sarapan/siang/malam) WAJIB 4 kelompok (karbohidrat+protein+sayur+lemak), cemilan WAJIB dari kelompok `buah`/`camilan` saja — jangan comot acak dari semua kategori kalau mengubah logika ini
- `src/routes/*.js` — tiap file terima `db` (instance `pg.Pool`) via factory function, kecuali `calculate.js` yang stateless. Query pakai `await db.query(...)`, bukan `db.prepare(...).get/all/run` gaya better-sqlite3 lama
- `db/foods_data.json` — sumber data 1.343 bahan makanan (dari TKPI Kemenkes RI). Kategori & flag vegetarian/vegan di-generate otomatis oleh `db/convert_tkpi_xlsx.py` lewat pencocokan kata kunci nama — LIHAT file itu & README bagian "Sumber data gizi" sebelum mengubah kategorisasi, ada banyak catatan false-positive yang sudah diperbaiki (mis. "bayam" vs "ayam", "sale pisang" vs "ikan sale")
- `frontend/src/api.js` — base URL API baca `VITE_API_URL`, default `/api` (relatif, untuk same-origin deployment)

## Workflow yang diharapkan
- **Jangan commit langsung ke `main`.** Kerja di branch baru, buat PR — terutama kalau sesi ini jalan di Claude Code Web (sandbox network-nya terbatas, tidak bisa login interaktif ke Supabase/Railway/Vercel dkk, jadi tugas web session sebaiknya seputar persiapan kode/config, bukan eksekusi deploy/provisioning langsung)
- Jangan commit `node_modules/`, `frontend/dist/`, atau `.env` (sudah di `.gitignore`) — dan JANGAN PERNAH commit connection string Postgres asli (isi password) ke mana pun di repo
- Kalau task terkait deploy, baca `DEPLOY.md` dulu — sudah ada panduan Render/Railway/Vercel + Supabase lengkap, jangan asumsi ulang dari nol
- Setelah ubah `db/foods_data.json` atau `schema.sql`, jalankan `npm run seed` (butuh `DATABASE_URL` di `.env`) dan cek `GET /api/foods` sebelum menganggap selesai
- Setelah ubah kode backend, verifikasi minimal dengan curl ke endpoint terkait (lihat daftar lengkap endpoint di `README.md`) — proyek ini belum punya automated test suite

## Istilah domain (biar konsisten)
`gizi`=nutrition, `kalori`=calories, `makro`=macros (protein/lemak/karbo),
`camilan`=snack, `porsi`=portion, `catat`/`log`=log a meal, `target`=daily
target, `konsumsi`=consumed. Satuan gizi selalu per 100g di database
(`calories_per_100g`, dst).
