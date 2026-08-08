require("dotenv").config();
const { getPool, ensureSeeded, buildApp } = require("./src/app");

const PORT = process.env.PORT || 3000;

async function start() {
  const db = getPool();
  await ensureSeeded(db);
  const app = buildApp(db);

  app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Gagal start server:", err);
  process.exit(1);
});
