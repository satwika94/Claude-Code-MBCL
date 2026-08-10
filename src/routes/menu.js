const express = require("express");
const router = express.Router();
const { calculateNutritionNeeds, normalizeMacroPreference } = require("../services/nutritionCalculator");
const { generateDailyMenu } = require("../services/menuRecommender");
const { asyncHandler } = require("../middleware/asyncHandler");

module.exports = (db) => {
  /**
   * POST /api/recommend-menu
   * Body: { gender, age, weightKg, heightCm, activityLevel, goal, dietaryPreference, proteinPct?, fatPct?, carbPct? }
   *
   * Menggabungkan kalkulasi kebutuhan gizi + rekomendasi menu harian
   * dalam satu panggilan (memudahkan untuk prototipe/testing).
   */
  router.post("/recommend-menu", asyncHandler(async (req, res) => {
    const {
      gender,
      age,
      weightKg,
      heightCm,
      activityLevel,
      goal,
      dietaryPreference = "none",
      proteinPct,
      fatPct,
      carbPct,
    } = req.body;

    try {
      const macroPreference = normalizeMacroPreference({ proteinPct, fatPct, carbPct });

      const needs = calculateNutritionNeeds({
        gender,
        age: Number(age),
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        activityLevel,
        goal,
        macroPreference,
      });

      const { rows: foods } = await db.query("SELECT * FROM foods");
      const { menu, totals } = generateDailyMenu(
        foods,
        needs.target_calories,
        dietaryPreference
      );

      res.json({
        success: true,
        data: {
          nutrition_needs: needs,
          daily_menu: menu,
          menu_totals: totals,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }));

  /**
   * GET /api/recommend-menu/:userId
   * Sama seperti POST /api/recommend-menu, tapi profil diambil dari
   * data user yang tersimpan (tidak perlu kirim ulang semua field).
   */
  router.get("/recommend-menu/:userId", asyncHandler(async (req, res) => {
    const { rows: userRows } = await db.query("SELECT * FROM users WHERE id = $1", [req.params.userId]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    try {
      const macroPreference =
        user.protein_pct != null && user.fat_pct != null && user.carb_pct != null
          ? { proteinPct: user.protein_pct, fatPct: user.fat_pct, carbPct: user.carb_pct }
          : null;

      const needs = calculateNutritionNeeds({
        gender: user.gender,
        age: user.age,
        weightKg: user.weight_kg,
        heightCm: user.height_cm,
        activityLevel: user.activity_level,
        goal: user.goal,
        macroPreference,
      });

      const { rows: foods } = await db.query("SELECT * FROM foods");
      const { menu, totals } = generateDailyMenu(
        foods,
        needs.target_calories,
        user.dietary_preference
      );

      res.json({
        success: true,
        data: { nutrition_needs: needs, daily_menu: menu, menu_totals: totals },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }));

  return router;
};
