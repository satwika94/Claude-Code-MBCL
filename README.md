# Nutrition App Prototype

Prototipe backend untuk **kalkulator kebutuhan gizi + rekomendasi menu harian**.
Dibangun dengan Node.js + Express + PostgreSQL (mis. Supabase/Neon, diakses lewat env var `DATABASE_URL`).

## Fitur yang sudah jalan
- Kalkulasi BMR (Mifflin-St Jeor) → TDEE → target kalori sesuai tujuan (cutting/maintenance/bulking)
- Kalkulasi target makro (protein/lemak/karbo) — otomatis (1.8g/kg protein, 25% lemak, sisanya
  karbo) atau **custom**: user bisa isi persentase karbo/protein/lemak sendiri (opsional, wajib
  total 100%) saat isi profil
- **Tracking asupan cairan** — target harian (35 ml/kg berat badan), catat minum lewat tombol
  cepat (gelas/botol) atau jumlah custom, progress bar + persentase pemenuhan real-time
- Database bahan makanan: **1.343 item resmi dari TKPI** (Tabel Komposisi Pangan Indonesia,
  Kementerian Kesehatan RI), lintas 10 kategori (karbohidrat, protein hewani, protein nabati,
  sayur, buah, lemak, **camilan/jajan pasar**, minuman, bumbu, olahan)
- Rekomendasi menu harian yang **seimbang secara gizi**: tiap sesi makan utama (sarapan/siang/
  malam) selalu memuat 1 sumber karbohidrat + 1 protein + 1 sayur + 1 lemak; cemilan diambil
  dari kelompok buah & jajan pasar/snack kemasan (bukan comot acak dari seluruh database)
- **Profil user tersimpan** — isi data sekali, target gizi otomatis dihitung & disimpan
- **Tracking konsumsi harian** — cari makanan, catat porsi, lihat progres kalori & makro
  real-time, hapus catatan yang salah
- **Frontend web (React)** — halaman onboarding + dashboard harian dengan desain custom
  ("NutriCalc": nota warung + cincin piring kalori sebagai elemen utama)
- **Riwayat 7 hari** — grafik batang konsistensi kalori, dibandingkan dengan garis target
- **Menu hari ini di dashboard** — usulan menu otomatis lengkap dengan tombol "+ Catat"
  per item untuk langsung mencatat tanpa perlu cari manual
- Placeholder integrasi Claude API untuk generate narasi resep (angka gizi tetap dari database, bukan dari AI)

## Menjalankan aplikasi lengkap (backend + frontend)

Butuh 2 terminal terpisah:

**Terminal 1 — backend (port 3000):**
```bash
npm install
npm run seed     # sekali saja, isi database
npm start
```

**Terminal 2 — frontend (port 5173):**
```bash
cd frontend
npm install
npm run dev
```

Buka **http://localhost:5173** di browser. Frontend otomatis meneruskan panggilan `/api/*`
ke backend di port 3000 (lihat `frontend/vite.config.js`).

Alur pakai: isi form onboarding sekali (data tersimpan di `localStorage` browser) → masuk
ke dashboard → cari makanan di panel "Catat Konsumsi" → pilih hasil → atur porsi (gram) →
"Catat ke hari ini". Progres kalori (cincin piring) dan makro (bar protein/lemak/karbo)
ter-update otomatis, dan catatan hari ini muncul di panel kanan (gaya struk) dengan tombol
hapus per item.

### Mode production lokal (satu server saja)
Backend bisa langsung men-serve hasil build frontend, jadi tidak perlu 2 server terpisah:
```bash
npm install
npm run build     # build frontend React -> frontend/dist
npm run seed
npm start
```
Buka **http://localhost:3000** — backend & frontend jalan dari 1 proses yang sama. Ini
persis alur yang dipakai saat deploy ke hosting (lihat bagian berikutnya).

## Deploy online
Panduan lengkap deploy ke hosting publik ada di **[`DEPLOY.md`](./DEPLOY.md)** — mencakup
Render, Railway (dengan perbandingan biaya terkini), dan opsi split **Vercel (frontend) +
Railway/Render (backend)** kalau kamu spesifik ingin pakai Vercel. Sudah disiapkan juga
`Dockerfile` untuk deploy ke platform apa pun yang support container, dan `frontend/src/api.js`
sudah mendukung backend terpisah lewat env var `VITE_API_URL`.

## Sumber data gizi
Data mentah berasal dari **Tabel Komposisi Pangan Indonesia (TKPI)** yang dipublikasikan
Kementerian Kesehatan RI melalui panganku.org, dalam bentuk dataset yang sudah dibersihkan
(1.346 baris, kolom: nama, kalori, protein, lemak, karbohidrat per 100g).

Kategori (`category`) dan flag `is_vegetarian`/`is_vegan` **tidak ada di data mentah** —
keduanya di-generate otomatis lewat pencocokan kata kunci pada nama makanan
(lihat `db/convert_tkpi_xlsx.py`): kata kunci hewani/susu-telur dicek dulu untuk flag,
lalu kata kunci kategori dicek untuk pengelompokan (karbohidrat/protein/sayur/buah/lemak/
**camilan**/minuman/bumbu, sisanya masuk "olahan"). Kategori **camilan** mencakup jajan
pasar tradisional (keripik, getuk, kue, dodol, dll) maupun snack/permen/cokelat kemasan —
dipisah khusus supaya rekomendasi menu tidak mencampur jajanan dengan lauk di makan utama.
Sudah diuji dengan generate 10x menu vegan (40 sesi makan) tanpa ada item hewani yang lolos,
tapi untuk kasus yang sangat jarang (nama masakan daerah yang tidak eksplisit menyebut jenis
daging/ikan) kemungkinan masih ada yang terlewat — cek ulang manual jika filter ini dipakai
untuk kebutuhan diet ketat (misal alergi berat).

## Logika rekomendasi menu
Tiap sesi makan **utama** (sarapan/siang/malam) diracik dari 4 kelompok wajib — bukan comot
acak dari seluruh database:

| Kelompok | Porsi dari kalori sesi makan |
|---|---|
| Karbohidrat | 40% |
| Protein (hewani/nabati) | 30% |
| Sayur | 15% |
| Lemak (minyak/margarin, porsi kecil 5–30g) | 15% |

Sesi **cemilan** diambil dari kelompok **buah** dan **camilan** (jajan pasar/snack kemasan),
maksimal 2 item. Semua tetap menghormati filter vegetarian/vegan. Lihat
`src/services/menuRecommender.js` untuk detail implementasinya.

## Menambah/mengedit data makanan
Data makanan disimpan di `db/foods_data.json` (bukan hardcode di kode), supaya gampang di-maintain:

```json
{
  "name": "Nama makanan",
  "category": "karbohidrat",       // karbohidrat | protein_hewani | protein_nabati | sayur | buah | lemak | minuman | bumbu | olahan
  "calories_per_100g": 130,
  "protein_per_100g": 2.7,
  "fat_per_100g": 0.3,
  "carb_per_100g": 28,
  "is_vegetarian": 1,               // 1 = ya, 0 = tidak
  "is_vegan": 1
}
```

Tinggal tambah entri baru ke array JSON tersebut, lalu jalankan:
```bash
npm run seed
```
Seed sekarang pakai `ON CONFLICT ... DO UPDATE`, jadi aman dijalankan berkali-kali —
data lama dengan nama sama akan ter-update, bukan dobel.

## Endpoint API

### 1. Hitung kebutuhan gizi
```
POST /api/calculate-needs
Content-Type: application/json

{
  "gender": "male",          // "male" | "female"
  "age": 25,
  "weightKg": 70,
  "heightCm": 175,
  "activityLevel": "active", // sedentary | light | moderate | active | very_active
  "goal": "bulking"          // cutting | maintenance | bulking
}
```

### 2. Lihat daftar bahan makanan
```
GET /api/foods
```

### 3. Rekomendasi menu harian (gabungan kalkulasi + menu)
```
POST /api/recommend-menu
Content-Type: application/json

{
  "gender": "female",
  "age": 28,
  "weightKg": 58,
  "heightCm": 162,
  "activityLevel": "moderate",
  "goal": "cutting",
  "dietaryPreference": "vegetarian"  // "none" | "vegetarian" | "vegan"
}
```

### 4. Buat/update profil user (menghitung & menyimpan target gizi)
```
POST /api/users
Content-Type: application/json

{
  "name": "Siti Rahma",
  "email": "siti@email.com",
  "gender": "female",
  "age": 28,
  "weightKg": 58,
  "heightCm": 162,
  "activityLevel": "active",
  "goal": "cutting",
  "dietaryPreference": "vegetarian",
  "proteinPct": 30,  // opsional — kalau diisi, proteinPct+fatPct+carbPct WAJIB total 100
  "fatPct": 20,
  "carbPct": 50
}
```
Email dipakai sebagai kunci unik — kirim ulang dengan email yang sama untuk update profil
dan menghitung ulang target (misal setelah berat badan berubah). `proteinPct`/`fatPct`/`carbPct`
opsional — kalau tidak diisi, makro dihitung otomatis (1.8g/kg protein, 25% lemak, sisanya karbo).

### 5. Ambil profil + target aktif
```
GET /api/users/:id
```

### 6. Catat konsumsi makanan
```
POST /api/log-meal
Content-Type: application/json

{ "userId": 1, "foodId": 108, "portionG": 150 }
```

### 7. Hapus catatan konsumsi
```
DELETE /api/log-meal/:logId
```

### 8. Daftar catatan konsumsi (default: hari ini)
```
GET /api/meal-logs/:userId?date=2026-08-01
```

### 9. Ringkasan progres harian (target vs konsumsi vs sisa)
```
GET /api/daily-summary/:userId?date=2026-08-01
```
Response termasuk `consumed.water_ml` (total asupan cairan hari itu) dan `water_percent`
(persentase pemenuhan target cairan).

### Catat/lihat/hapus asupan cairan
```
POST /api/log-water
Content-Type: application/json

{ "userId": 1, "amountMl": 500 }
```
```
DELETE /api/log-water/:logId
GET /api/water-logs/:userId?date=2026-08-01
```

### 10. Riwayat kalori N hari terakhir (untuk grafik)
```
GET /api/history/:userId?days=7
```
Selalu mengembalikan tepat `days` titik data (hari tanpa catatan tetap muncul dengan
kalori 0), supaya grafik konsisten jumlah barnya.

### 11. Rekomendasi menu pakai profil tersimpan (dipakai dashboard)
```
GET /api/recommend-menu/:userId
```
Sama seperti `POST /api/recommend-menu`, tapi tidak perlu kirim ulang data profil.

### Pencarian makanan (dipakai fitur logging)
```
GET /api/foods?search=tempe&diet=vegetarian&limit=8
```

## Struktur folder
```
nutrition-app/
├── server.js                     # Entry point mode server biasa (Render/Railway/Docker/dev lokal)
├── api/
│   └── index.js               # Entry point mode Vercel Serverless Function (full-stack di Vercel)
├── vercel.json                    # Config build frontend + expose folder api/ untuk mode Vercel full-stack
├── Dockerfile                     # Build image untuk deploy (backend + frontend jadi 1)
├── .dockerignore
├── DEPLOY.md                      # Panduan deploy ke Render/Railway/Vercel + perbandingan biaya
├── railway.json                   # Konfigurasi build/start untuk Railway
├── render.yaml                    # Konfigurasi build/start untuk Render
├── db/
│   ├── schema.sql                 # Skema tabel database (PostgreSQL)
│   ├── seed.js                    # Jalankan schema.sql + load data dari JSON (dipakai juga untuk auto-seed)
│   ├── foods_data.json            # Data 1.343 bahan makanan (sumber: TKPI)
│   └── convert_tkpi_xlsx.py       # Script konversi dataset TKPI xlsx -> JSON
├── src/
│   ├── app.js                     # Setup Express app (routes, static frontend, DB pool) — dipakai bareng server.js & api/
│   ├── services/
│   │   ├── nutritionCalculator.js  # Logika BMR/TDEE/makro
│   │   └── menuRecommender.js      # Logika rekomendasi menu (rule-based, seimbang gizi)
│   └── routes/
│       ├── calculate.js
│       ├── foods.js
│       ├── menu.js
│       ├── users.js                # Profil user + simpan target gizi
│       └── logs.js                 # Log konsumsi + ringkasan harian
├── frontend/                      # Aplikasi web React (Vite)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                 # Routing Onboarding <-> Dashboard
│       ├── api.js                  # Wrapper fetch ke backend
│       ├── styles/                 # Design tokens + stylesheet utama
│       └── components/
│           ├── Onboarding.jsx      # Form profil awal
│           ├── Dashboard.jsx       # Halaman utama tracking harian
│           ├── PlateRing.jsx       # Cincin piring progres kalori (elemen signature)
│           ├── MacroBars.jsx       # Bar protein/lemak/karbo
│           ├── FoodLogger.jsx      # Cari & catat makanan
│           ├── MealLogList.jsx     # Daftar catatan hari ini (gaya struk)
│           ├── HistoryChart.jsx    # Grafik batang riwayat 7 hari
│           ├── MenuSuggestion.jsx  # Usulan menu harian + tombol catat cepat
│           └── WaterTracker.jsx    # Progress + tombol cepat catat asupan cairan
└── package.json
```

## Langkah selanjutnya (belum diimplementasi di prototipe ini)
1. **Autentikasi sungguhan** (JWT/OAuth) — saat ini identitas user hanya berbasis email +
   `localStorage`, siapa pun yang tahu `user_id` bisa mengakses data itu
2. **Integrasi Claude API** untuk narasi resep yang lebih natural (lihat komentar
   di `generateRecipeNarrativePlaceholder()` pada `menuRecommender.js`)
3. Riwayat baru menghitung 7 hari terakhir dari hari ini — belum ada navigasi ke
   minggu/bulan sebelumnya
4. Perluas lagi database makanan (makanan daerah lain, produk kemasan dengan barcode, dll)

## Catatan penting
- Rumus & angka gizi di sini adalah estimasi standar untuk keperluan prototipe.
  Untuk penggunaan nyata, sebaiknya divalidasi dengan ahli gizi dan disertai
  disclaimer medis di aplikasi.
- Nilai gizi 1.343 item ini berasal dari data resmi TKPI (Kementerian Kesehatan RI),
  jauh lebih akurat dibanding estimasi manual. Namun kategori & flag vegetarian/vegan
  hasil klasifikasi otomatis berbasis kata kunci nama — lihat bagian "Sumber data gizi"
  di atas untuk detail dan batasannya.
