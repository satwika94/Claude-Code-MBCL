const express = require("express");
const router = express.Router();
const { calculateNutritionNeeds } = require("../services/nutritionCalculator");

/**
 * POST /api/calculate-needs
 * Body: { gender, age, weightKg, heightCm, activityLevel, goal }
 */
router.post("/calculate-needs", (req, res) => {
  const { gender, age, weightKg, heightCm, activityLevel, goal } = req.body;

  // Validasi input dasar
  const missing = [];
  if (!gender) missing.push("gender");
  if (!age) missing.push("age");
  if (!weightKg) missing.push("weightKg");
  if (!heightCm) missing.push("heightCm");
  if (!activityLevel) missing.push("activityLevel");
  if (!goal) missing.push("goal");

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Field wajib belum lengkap: ${missing.join(", ")}`,
    });
  }

  try {
    const result = calculateNutritionNeeds({
      gender,
      age: Number(age),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      activityLevel,
      goal,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
