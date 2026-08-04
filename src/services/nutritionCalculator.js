// ============================================
// Logika kalkulasi kebutuhan gizi
// Rumus: Mifflin-St Jeor (BMR) -> TDEE -> target sesuai tujuan -> makro
// ============================================

const ACTIVITY_FACTORS = {
  sedentary: 1.2, // jarang olahraga
  light: 1.375, // olahraga ringan 1-3x/minggu
  moderate: 1.55, // olahraga sedang 3-5x/minggu
  active: 1.725, // olahraga berat 6-7x/minggu
  very_active: 1.9, // atlet / aktivitas fisik sangat tinggi
};

const GOAL_ADJUSTMENTS = {
  cutting: -500, // defisit kalori untuk penurunan berat badan
  maintenance: 0,
  bulking: 300, // surplus kalori untuk penambahan massa
};

/**
 * Hitung BMR menggunakan rumus Mifflin-St Jeor
 */
function calculateBMR({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

/**
 * Hitung TDEE (Total Daily Energy Expenditure)
 */
function calculateTDEE(bmr, activityLevel) {
  const factor = ACTIVITY_FACTORS[activityLevel];
  if (!factor) throw new Error(`activity_level tidak valid: ${activityLevel}`);
  return bmr * factor;
}

/**
 * Hitung target kalori akhir berdasarkan tujuan
 */
function calculateTargetCalories(tdee, goal) {
  const adjustment = GOAL_ADJUSTMENTS[goal];
  if (adjustment === undefined) throw new Error(`goal tidak valid: ${goal}`);
  return tdee + adjustment;
}

/**
 * Hitung pembagian makronutrien (gram)
 * - Protein: 1.8 g/kg berat badan (cukup untuk aktif berolahraga)
 * - Lemak: 25% dari total kalori
 * - Karbohidrat: sisanya
 */
function calculateMacros(targetCalories, weightKg) {
  const proteinG = 1.8 * weightKg;
  const proteinCalories = proteinG * 4;

  const fatCalories = targetCalories * 0.25;
  const fatG = fatCalories / 9;

  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbG = Math.max(remainingCalories / 4, 0);

  return {
    protein_g: Math.round(proteinG),
    fat_g: Math.round(fatG),
    carb_g: Math.round(carbG),
  };
}

/**
 * Fungsi utama: hitung semua kebutuhan gizi dari data profil user
 */
function calculateNutritionNeeds({ gender, age, weightKg, heightCm, activityLevel, goal }) {
  const bmr = calculateBMR({ gender, weightKg, heightCm, age });
  const tdee = calculateTDEE(bmr, activityLevel);
  const targetCalories = calculateTargetCalories(tdee, goal);
  const macros = calculateMacros(targetCalories, weightKg);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories: Math.round(targetCalories),
    ...macros,
  };
}

module.exports = {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  calculateNutritionNeeds,
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
};
