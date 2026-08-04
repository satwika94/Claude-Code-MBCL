const express = require("express");
const router = express.Router();

module.exports = (db) => {
  /**
   * POST /api/log-meal
   * Catat konsumsi satu item makanan.
   * Body: { userId, foodId, portionG, mealType? }
   */
  router.post("/log-meal", (req, res) => {
    const { userId, foodId, portionG } = req.body;
    if (!userId || !foodId || !portionG) {
      return res.status(400).json({ error: "userId, foodId, dan portionG wajib diisi" });
    }

    const food = db.prepare("SELECT * FROM foods WHERE id = ?").get(foodId);
    if (!food) return res.status(404).json({ error: "Makanan tidak ditemukan" });

    const insert = db.prepare(`
      INSERT INTO meal_logs (user_id, food_id, portion_g) VALUES (?, ?, ?)
    `);
    const info = insert.run(userId, foodId, Number(portionG));

    const factor = Number(portionG) / 100;
    res.json({
      success: true,
      data: {
        log_id: info.lastInsertRowid,
        food_name: food.name,
        portion_g: Number(portionG),
        calories: Math.round(food.calories_per_100g * factor),
        protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
        fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
        carb_g: Math.round(food.carb_per_100g * factor * 10) / 10,
      },
    });
  });

  /**
   * DELETE /api/log-meal/:id
   */
  router.delete("/log-meal/:id", (req, res) => {
    const info = db.prepare("DELETE FROM meal_logs WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Log tidak ditemukan" });
    res.json({ success: true });
  });

  /**
   * GET /api/meal-logs/:userId?date=YYYY-MM-DD
   * Daftar log konsumsi user pada tanggal tertentu (default: hari ini)
   */
  router.get("/meal-logs/:userId", (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const logs = db.prepare(`
      SELECT ml.id, ml.portion_g, ml.logged_at, f.id as food_id, f.name as food_name,
             f.calories_per_100g, f.protein_per_100g, f.fat_per_100g, f.carb_per_100g
      FROM meal_logs ml
      JOIN foods f ON f.id = ml.food_id
      WHERE ml.user_id = ? AND date(ml.logged_at) = date(?)
      ORDER BY ml.logged_at ASC
    `).all(req.params.userId, date);

    const items = logs.map((l) => {
      const factor = l.portion_g / 100;
      return {
        log_id: l.id,
        food_id: l.food_id,
        food_name: l.food_name,
        portion_g: l.portion_g,
        logged_at: l.logged_at,
        calories: Math.round(l.calories_per_100g * factor),
        protein_g: Math.round(l.protein_per_100g * factor * 10) / 10,
        fat_g: Math.round(l.fat_per_100g * factor * 10) / 10,
        carb_g: Math.round(l.carb_per_100g * factor * 10) / 10,
      };
    });

    res.json({ success: true, data: items });
  });

  /**
   * GET /api/daily-summary/:userId?date=YYYY-MM-DD
   * Target gizi aktif user + total konsumsi hari ini + sisa (remaining)
   */
  router.get("/daily-summary/:userId", (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const userId = req.params.userId;

    const target = db.prepare(`
      SELECT * FROM daily_targets WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1
    `).get(userId);
    if (!target) return res.status(404).json({ error: "Target gizi user belum ada. Buat profil terlebih dahulu." });

    const logs = db.prepare(`
      SELECT ml.portion_g, f.calories_per_100g, f.protein_per_100g, f.fat_per_100g, f.carb_per_100g
      FROM meal_logs ml
      JOIN foods f ON f.id = ml.food_id
      WHERE ml.user_id = ? AND date(ml.logged_at) = date(?)
    `).all(userId, date);

    const consumed = logs.reduce((acc, l) => {
      const factor = l.portion_g / 100;
      acc.calories += l.calories_per_100g * factor;
      acc.protein_g += l.protein_per_100g * factor;
      acc.fat_g += l.fat_per_100g * factor;
      acc.carb_g += l.carb_per_100g * factor;
      return acc;
    }, { calories: 0, protein_g: 0, fat_g: 0, carb_g: 0 });

    for (const k of Object.keys(consumed)) consumed[k] = Math.round(consumed[k] * 10) / 10;

    res.json({
      success: true,
      data: {
        date,
        target: {
          calories: target.target_calories,
          protein_g: target.target_protein_g,
          fat_g: target.target_fat_g,
          carb_g: target.target_carb_g,
        },
        consumed,
        remaining: {
          calories: Math.round(target.target_calories - consumed.calories),
          protein_g: Math.round((target.target_protein_g - consumed.protein_g) * 10) / 10,
          fat_g: Math.round((target.target_fat_g - consumed.fat_g) * 10) / 10,
          carb_g: Math.round((target.target_carb_g - consumed.carb_g) * 10) / 10,
        },
      },
    });
  });

  /**
   * GET /api/history/:userId?days=7
   * Total kalori & makro per hari untuk N hari terakhir (termasuk hari
   * tanpa catatan sama sekali, supaya grafik tetap punya 7 titik).
   */
  router.get("/history/:userId", (req, res) => {
    const userId = req.params.userId;
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30);

    const target = db.prepare(`
      SELECT * FROM daily_targets WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1
    `).get(userId);
    if (!target) return res.status(404).json({ error: "Target gizi user belum ada." });

    const rows = db.prepare(`
      SELECT date(ml.logged_at) as log_date,
             SUM(f.calories_per_100g * ml.portion_g / 100.0) as calories,
             SUM(f.protein_per_100g * ml.portion_g / 100.0) as protein_g,
             SUM(f.fat_per_100g * ml.portion_g / 100.0) as fat_g,
             SUM(f.carb_per_100g * ml.portion_g / 100.0) as carb_g
      FROM meal_logs ml
      JOIN foods f ON f.id = ml.food_id
      WHERE ml.user_id = ? AND date(ml.logged_at) >= date('now', ?)
      GROUP BY date(ml.logged_at)
    `).all(userId, `-${days - 1} days`);

    const byDate = Object.fromEntries(rows.map((r) => [r.log_date, r]));

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const row = byDate[dateStr];
      series.push({
        date: dateStr,
        calories: row ? Math.round(row.calories) : 0,
        protein_g: row ? Math.round(row.protein_g * 10) / 10 : 0,
        fat_g: row ? Math.round(row.fat_g * 10) / 10 : 0,
        carb_g: row ? Math.round(row.carb_g * 10) / 10 : 0,
      });
    }

    res.json({
      success: true,
      data: { target_calories: target.target_calories, days: series },
    });
  });

  return router;
};
