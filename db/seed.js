const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

if (require.main === module) require("dotenv").config();

function makePool(connectionString) {
  return new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * Jalankan schema + isi/update data makanan pada database Postgres.
 * Aman dipanggil berkali-kali (upsert by name) — dipakai baik oleh
 * `npm run seed` manual maupun auto-seed saat server pertama kali start
 * di lingkungan deploy yang database-nya masih kosong.
 *
 * `poolOrConnectionString` boleh berupa instance pg.Pool yang sudah ada
 * (dipakai server.js supaya tidak buka koneksi ganda) atau connection
 * string (dipakai saat dijalankan sebagai CLI `node db/seed.js`).
 */
async function seedDatabase(poolOrConnectionString) {
  const ownPool = !(poolOrConnectionString && typeof poolOrConnectionString.connect === "function");
  const pool = ownPool ? makePool(poolOrConnectionString) : poolOrConnectionString;
  const client = await pool.connect();

  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    await client.query(schema);

    const foods = JSON.parse(fs.readFileSync(path.join(__dirname, "foods_data.json"), "utf-8"));

    await client.query("BEGIN");
    for (const f of foods) {
      await client.query(
        `INSERT INTO foods (name, category, calories_per_100g, protein_per_100g, fat_per_100g, carb_per_100g, is_vegetarian, is_vegan)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name) DO UPDATE SET
           category = excluded.category,
           calories_per_100g = excluded.calories_per_100g,
           protein_per_100g = excluded.protein_per_100g,
           fat_per_100g = excluded.fat_per_100g,
           carb_per_100g = excluded.carb_per_100g,
           is_vegetarian = excluded.is_vegetarian,
           is_vegan = excluded.is_vegan`,
        [f.name, f.category, f.calories_per_100g, f.protein_per_100g, f.fat_per_100g, f.carb_per_100g, f.is_vegetarian, f.is_vegan]
      );
    }
    await client.query("COMMIT");

    const { rows } = await client.query("SELECT COUNT(*) AS c FROM foods");
    return { processed: foods.length, total: Number(rows[0].c) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    if (ownPool) await pool.end();
  }
}

/**
 * True kalau database belum punya data makanan sama sekali, atau tabelnya
 * belum ada (dipakai untuk auto-seed sekali saat deploy pertama kali).
 */
async function needsSeed(pool) {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) AS c FROM foods");
    return Number(rows[0].c) === 0;
  } catch {
    return true; // tabel belum ada -> perlu seed dari nol
  }
}

module.exports = { seedDatabase, needsSeed };

// Jalankan langsung kalau dipanggil sebagai CLI: `node db/seed.js`
// Butuh env DATABASE_URL (connection string Postgres, mis. dari Supabase).
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL belum di-set. Isi di .env, contoh:");
    console.error("   DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres");
    process.exit(1);
  }

  seedDatabase()
    .then((result) => {
      console.log(`✅ ${result.processed} data makanan diproses (insert/update).`);
      console.log(`✅ Total makanan di database sekarang: ${result.total}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Gagal seed:", err.message);
      process.exit(1);
    });
}
