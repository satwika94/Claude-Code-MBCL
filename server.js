require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const { seedDatabase, needsSeed } = require("./db/seed");
const calculateRoutes = require("./src/routes/calculate");
const foodsRoutesFactory = require("./src/routes/foods");
const menuRoutesFactory = require("./src/routes/menu");
const usersRoutesFactory = require("./src/routes/users");
const logsRoutesFactory = require("./src/routes/logs");

const app = express();
const PORT = process.env.PORT || 3000;

// DB_PATH bisa di-override lewat env var, penting untuk platform hosting
// yang menyediakan persistent volume di path tertentu (mis. Railway/Fly.io),
// supaya data tidak hilang tiap kali service di-redeploy/restart.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "db", "nutrition.db");

app.use(cors());
app.use(express.json());

// Auto-seed sekali kalau database masih kosong (deploy pertama kali).
// Aman dijalankan berkali-kali karena seedDatabase() pakai upsert by name.
if (needsSeed(DB_PATH)) {
  console.log(`ℹ️  Database di ${DB_PATH} masih kosong, menjalankan seed otomatis...`);
  const result = seedDatabase(DB_PATH);
  console.log(`✅ Auto-seed selesai: ${result.total} makanan tersimpan.`);
}

const db = new Database(DB_PATH);

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
