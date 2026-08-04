const express = require("express");
const router = express.Router();
const { calculateNutritionNeeds } = require("../services/nutritionCalculator");
const { generateDailyMenu } = require("../services/menuRecommender");

module.exports = (db) => {
  /**
   * POST /api/recommend-menu
   * Body: { gender, age, weightKg, heightCm, activityLevel, goal, dietaryPreference }
   *
   * Menggabungkan kalkulasi kebutuhan gizi + rekomendasi menu harian
   * dalam satu panggilan (memudahkan untuk prototipe/testing).
   */
  router.post("/recommend-menu", (req, res) => {
    const {
      gender,
      age,
      weightKg,
      heightCm,
      activityLevel,
      goal,
      dietaryPreference = "none",
    } = req.body;

    try {
      const needs = calculateNutritionNeeds({
        gender,
        age: Number(age),
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        activityLevel,
        goal,
      });

      const foods = db.prepare("SELECT * FROM foods").all();
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
  });

  /**
   * GET /api/recommend-menu/:userId
   * Sama seperti POST /api/recommend-menu, tapi profil diambil dari
   * data user yang tersimpan (tidak perlu kirim ulang semua field).
   */
  router.get("/recommend-menu/:userId", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.userId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    try {
      const needs = calculateNutritionNeeds({
        gender: user.gender,
        age: user.age,
        weightKg: user.weight_kg,
        heightCm: user.height_cm,
        activityLevel: user.activity_level,
        goal: user.goal,
      });

      const foods = db.prepare("SELECT * FROM foods").all();
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
  });

  return router;
};
