require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const { seedDatabase, needsSeed } = require("./db/seed");
const calculateRoutes = require("./src/routes/calculate");
const foodsRoutesFactory = require("./src/routes/foods");
const menuRoutesFactory = require("./src/routes/menu");
const usersRoutesFactory = require("./src/routes/users");
const logsRoutesFactory = require("./src/routes/logs");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum di-set. Isi .env dengan connection string Postgres (mis. dari Supabase), contoh:");
  console.error("   DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres");
  process.exit(1);
}

// rejectUnauthorized: false karena kebanyakan provider Postgres hosted
// (Supabase, Neon, dll) pakai sertifikat yang tidak selalu kebaca lewat
// CA bundle default Node di environment hosting kecil seperti ini.
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

async function start() {
  // Auto-seed sekali kalau database masih kosong (deploy pertama kali).
  // Aman dijalankan berkali-kali karena seedDatabase() pakai upsert by name.
  if (await needsSeed(db)) {
    console.log("ℹ️  Database masih kosong, menjalankan seed otomatis...");
    const result = await seedDatabase(db);
    console.log(`✅ Auto-seed selesai: ${result.total} makanan tersimpan.`);
  }

  // Routes API
  app.use("/api", calculateRoutes);
  app.use("/api", foodsRoutesFactory(db));
  app.use("/api", menuRoutesFactory(db));
  app.use("/api", usersRoutesFactory(db));
  app.use("/api", logsRoutesFactory(db));

  // Serve hasil build frontend (frontend/dist) kalau ada — ini yang dipakai
  // saat production/deploy, jadi backend + frontend jadi SATU service saja.
  // Saat development lokal, frontend dijalankan terpisah lewat `npm run dev`
  // (Vite) di port 5173 dengan proxy ke /api, jadi folder ini biasanya belum
  // ada dan blok ini otomatis dilewati.
  const FRONTEND_DIST = path.join(__dirname, "frontend", "dist");
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    // Catch-all supaya refresh/akses langsung ke rute mana pun tetap
    // memuat aplikasi React (SPA), bukan 404. Diletakkan PALING BAWAH,
    // setelah semua rute /api, supaya tidak menabrak endpoint API.
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  } else {
    // Fallback dev: kalau frontend belum di-build, root path tampilkan info API saja.
    app.get("/", (req, res) => {
      res.json({
        message: "Nutrition App Prototype API aktif 🚀 (frontend belum di-build — jalankan `npm run build`, atau untuk dev pakai `cd frontend && npm run dev`)",
        endpoints: [
          "POST /api/calculate-needs",
          "GET  /api/foods",
          "POST /api/recommend-menu",
          "GET  /api/recommend-menu/:userId",
          "POST /api/users",
          "GET  /api/users/:id",
          "POST /api/log-meal",
          "DELETE /api/log-meal/:id",
          "GET  /api/meal-logs/:userId",
          "GET  /api/daily-summary/:userId",
          "GET  /api/history/:userId",
        ],
      });
    });
  }

  app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Gagal start server:", err);
  process.exit(1);
});
