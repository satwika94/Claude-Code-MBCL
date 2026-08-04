const express = require("express");
const router = express.Router();
const { calculateNutritionNeeds } = require("../services/nutritionCalculator");

module.exports = (db) => {
  /**
   * POST /api/users
   * Buat profil user baru, hitung kebutuhan gizi, simpan sebagai target aktif.
   * Body: { name, email, gender, age, weightKg, heightCm, activityLevel, goal, dietaryPreference }
   */
  router.post("/users", (req, res) => {
    const {
      name, email, gender, age, weightKg, heightCm,
      activityLevel, goal, dietaryPreference = "none",
    } = req.body;

    const missing = [];
    for (const [k, v] of Object.entries({ name, email, gender, age, weightKg, heightCm, activityLevel, goal })) {
      if (v === undefined || v === null || v === "") missing.push(k);
    }
    if (missing.length > 0) {
      return res.status(400).json({ error: `Field wajib belum lengkap: ${missing.join(", ")}` });
    }

    try {
      const needs = calculateNutritionNeeds({
        gender, age: Number(age), weightKg: Number(weightKg),
        heightCm: Number(heightCm), activityLevel, goal,
      });

      const insertUser = db.prepare(`
        INSERT INTO users (name, email, gender, age, weight_kg, height_cm, activity_level, goal, dietary_preference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name=excluded.name, gender=excluded.gender, age=excluded.age,
          weight_kg=excluded.weight_kg, height_cm=excluded.height_cm,
          activity_level=excluded.activity_level, goal=excluded.goal,
          dietary_preference=excluded.dietary_preference
      `);
      const info = insertUser.run(name, email, gender, Number(age), Number(weightKg),
        Number(heightCm), activityLevel, goal, dietaryPreference);

      // Ambil user_id (baik baru insert maupun sudah ada / update by email)
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

      const insertTarget = db.prepare(`
        INSERT INTO daily_targets (user_id, bmr, tdee, target_calories, target_protein_g, target_fat_g, target_carb_g)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertTarget.run(user.id, needs.bmr, needs.tdee, needs.target_calories, needs.protein_g, needs.fat_g, needs.carb_g);

      res.json({ success: true, data: { user, nutrition_needs: needs } });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * GET /api/users/:id
   * Ambil profil user + target gizi aktif (terbaru)
   */
  router.get("/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const target = db.prepare(`
      SELECT * FROM daily_targets WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1
    `).get(req.params.id);

    res.json({ success: true, data: { user, target } });
  });

  return router;
};
