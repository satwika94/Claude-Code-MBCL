const express = require("express");
const router = express.Router();
const { calculateNutritionNeeds, normalizeMacroPreference } = require("../services/nutritionCalculator");
const { asyncHandler } = require("../middleware/asyncHandler");

module.exports = (db) => {
  /**
   * POST /api/users
   * Buat profil user baru, hitung kebutuhan gizi, simpan sebagai target aktif.
   * Body: { name, email, gender, age, weightKg, heightCm, activityLevel, goal,
   *         dietaryPreference, proteinPct?, fatPct?, carbPct? }
   * proteinPct/fatPct/carbPct opsional — kalau diisi ketiganya harus
   * berjumlah 100%, dipakai untuk override kalkulasi makro default.
   */
  router.post("/users", asyncHandler(async (req, res) => {
    const {
      name, email, gender, age, weightKg, heightCm,
      activityLevel, goal, dietaryPreference = "none",
      proteinPct, fatPct, carbPct,
    } = req.body;

    const missing = [];
    for (const [k, v] of Object.entries({ name, email, gender, age, weightKg, heightCm, activityLevel, goal })) {
      if (v === undefined || v === null || v === "") missing.push(k);
    }
    if (missing.length > 0) {
      return res.status(400).json({ error: `Field wajib belum lengkap: ${missing.join(", ")}` });
    }

    try {
      const macroPreference = normalizeMacroPreference({ proteinPct, fatPct, carbPct });

      const needs = calculateNutritionNeeds({
        gender, age: Number(age), weightKg: Number(weightKg),
        heightCm: Number(heightCm), activityLevel, goal, macroPreference,
      });

      const { rows } = await db.query(`
        INSERT INTO users (name, email, gender, age, weight_kg, height_cm, activity_level, goal, dietary_preference, protein_pct, fat_pct, carb_pct)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (email) DO UPDATE SET
          name=excluded.name, gender=excluded.gender, age=excluded.age,
          weight_kg=excluded.weight_kg, height_cm=excluded.height_cm,
          activity_level=excluded.activity_level, goal=excluded.goal,
          dietary_preference=excluded.dietary_preference,
          protein_pct=excluded.protein_pct, fat_pct=excluded.fat_pct, carb_pct=excluded.carb_pct
        RETURNING *
      `, [
        name, email, gender, Number(age), Number(weightKg), Number(heightCm), activityLevel, goal, dietaryPreference,
        macroPreference ? macroPreference.proteinPct : null,
        macroPreference ? macroPreference.fatPct : null,
        macroPreference ? macroPreference.carbPct : null,
      ]);
      const user = rows[0];

      await db.query(`
        INSERT INTO daily_targets (user_id, bmr, tdee, target_calories, target_protein_g, target_fat_g, target_carb_g, target_water_ml)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [user.id, needs.bmr, needs.tdee, needs.target_calories, needs.protein_g, needs.fat_g, needs.carb_g, needs.water_ml]);

      res.json({ success: true, data: { user, nutrition_needs: needs } });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }));

  /**
   * GET /api/users/:id
   * Ambil profil user + target gizi aktif (terbaru)
   */
  router.get("/users/:id", asyncHandler(async (req, res) => {
    const { rows: userRows } = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const { rows: targetRows } = await db.query(`
      SELECT * FROM daily_targets WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT 1
    `, [req.params.id]);

    res.json({ success: true, data: { user, target: targetRows[0] } });
  }));

  return router;
};
