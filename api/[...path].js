// Entry point Vercel Serverless Function untuk semua request /api/*.
// File ini TIDAK dipakai saat deploy ke Render/Railway/Docker (yang pakai
// server.js) — cuma untuk mode full-stack di Vercel, lihat DEPLOY.md.
const { getPool, ensureSeeded, buildApp } = require("../src/app");

// appPromise di module scope: kalau instance function ini "warm" (dipakai
// ulang untuk request berikutnya oleh Vercel), Express app + koneksi
// database tidak perlu dibuat ulang tiap request.
let appPromise;
function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const db = getPool();
      await ensureSeeded(db);
      return buildApp(db);
    })();
  }
  return appPromise;
}

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
