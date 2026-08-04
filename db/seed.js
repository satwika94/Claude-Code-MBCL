const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "nutrition.db");

/**
 * Jalankan schema + isi/update data makanan pada database di dbPath.
 * Aman dipanggil berkali-kali (upsert by name) — dipakai baik oleh
 * `npm run seed` manual maupun auto-seed saat server pertama kali start
 * di lingkungan deploy yang database-nya masih kosong.
 */
function seedDatabase(dbPath = DEFAULT_DB_PATH) {
  const db = new Database(dbPath);

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);

  const foods = JSON.parse(fs.readFileSync(path.join(__dirname, "foods_data.json"), "utf-8"));

  const insertFood = db.prepare(`
    INSERT INTO foods (name, category, calories_per_100g, protein_per_100g, fat_per_100g, carb_per_100g, is_vegetarian, is_vegan)
    VALUES (@name, @category, @calories_per_100g, @protein_per_100g, @fat_per_100g, @carb_per_100g, @is_vegetarian, @is_vegan)
    ON CONFLICT(name) DO UPDATE SET
      category = excluded.category,
      calories_per_100g = excluded.calories_per_100g,
      protein_per_100g = excluded.protein_per_100g,
      fat_per_100g = excluded.fat_per_100g,
      carb_per_100g = excluded.carb_per_100g,
      is_vegetarian = excluded.is_vegetarian,
      is_vegan = excluded.is_vegan
  `);

  const insertManyFoods = db.transaction((rows) => {
    for (const row of rows) insertFood.run(row);
  });

  insertManyFoods(foods);

  const totalCount = db.prepare("SELECT COUNT(*) as c FROM foods").get().c;
  db.close();

  return { processed: foods.length, total: totalCount, dbPath };
}

/**
 * True kalau database di dbPath belum punya data makanan sama sekali
 * (dipakai untuk auto-seed sekali saat deploy pertama kali).
 */
function needsSeed(dbPath = DEFAULT_DB_PATH) {
  if (!fs.existsSync(dbPath)) return true;
  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) as c FROM foods").get();
    db.close();
    return row.c === 0;
  } catch {
    return true; // tabel belum ada / db korup -> perlu seed dari nol
  }
}

module.exports = { seedDatabase, needsSeed, DEFAULT_DB_PATH };

// Jalankan langsung kalau dipanggil sebagai CLI: `node db/seed.js`
if (require.main === module) {
  const result = seedDatabase();
  console.log(`✅ ${result.processed} data makanan diproses (insert/update).`);
  console.log(`✅ Total makanan di database sekarang: ${result.total}`);
  console.log(`✅ Database siap di: ${result.dbPath}`);
}
