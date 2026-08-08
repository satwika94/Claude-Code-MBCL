const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const { seedDatabase, needsSeed } = require("../db/seed");
const calculateRoutes = require("./routes/calculate");
const foodsRoutesFactory = require("./routes/foods");
const menuRoutesFactory = require("./routes/menu");
const usersRoutesFactory = require("./routes/users");
const logsRoutesFactory = require("./routes/logs");

// Pool disimpan di module scope supaya dipakai ulang lintas request —
// penting baik untuk server long-running (Render/Railway/Docker) maupun
// serverless function Vercel yang bisa "warm" (instance dipakai ulang
// untuk beberapa request berturut-turut).
let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL belum di-set. Isi env var dengan connection string Postgres (mis. dari Supabase)."
      );
    }
    // rejectUnauthorized: false karena kebanyakan provider Postgres hosted
    // (Supabase, Neon, dll) pakai sertifikat yang tidak selalu kebaca lewat
    // CA bundle default Node di environment hosting kecil seperti ini.
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// Auto-seed sekali per instance kalau database masih kosong (deploy
// pertama kali). Aman dijalankan berkali-kali karena seedDatabase() pakai
// upsert by name — flag `seededOnce` cuma menghindari SELECT COUNT
// berulang tiap request/invocation pada instance yang sama.
let seededOnce = false;
async function ensureSeeded(db) {
  if (seededOnce) return;
  if (await needsSeed(db)) {
    console.log("ℹ️  Database masih kosong, menjalankan seed otomatis...");
    const result = await seedDatabase(db);
    console.log(`✅ Auto-seed selesai: ${result.total} makanan tersimpan.`);
  }
  seededOnce = true;
}

function buildApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Routes API
  app.use("/api", calculateRoutes);
  app.use("/api", foodsRoutesFactory(db));
  app.use("/api", menuRoutesFactory(db));
  app.use("/api", usersRoutesFactory(db));
  app.use("/api", logsRoutesFactory(db));

  // Serve hasil build frontend (frontend/dist) kalau ada — dipakai saat
  // deploy mode "satu service" (Render/Railway/Docker). Di Vercel, frontend
  // di-serve langsung oleh CDN Vercel (bukan lewat blok ini), jadi
  // frontend/dist biasanya tidak ada di filesystem function dan blok ini
  // otomatis dilewati.
  const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    // Catch-all supaya refresh/akses langsung ke rute mana pun tetap
    // memuat aplikasi React (SPA), bukan 404. Diletakkan PALING BAWAH,
    // setelah semua rute /api, supaya tidak menabrak endpoint API.
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  } else {
    // Fallback: kalau frontend belum di-build (dev lokal tanpa `npm run
    // build`, atau function Vercel yang memang tidak menyertakan frontend),
    // root path tampilkan info API saja.
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

  return app;
}

module.exports = { getPool, ensureSeeded, buildApp };
