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
 * Hitung pembagian makronutrien (gram).
 *
 * Default (macroPreference tidak diisi):
 * - Protein: 1.8 g/kg berat badan (cukup untuk aktif berolahraga)
 * - Lemak: 25% dari total kalori
 * - Karbohidrat: sisanya
 *
 * Custom (macroPreference diisi, hasil dari normalizeMacroPreference):
 * gram dihitung langsung dari persentase kalori tiap makro
 * (protein & karbo = 4 kkal/g, lemak = 9 kkal/g).
 */
function calculateMacros(targetCalories, weightKg, macroPreference) {
  if (macroPreference) {
    const { proteinPct, fatPct, carbPct } = macroPreference;
    return {
      protein_g: Math.round((targetCalories * (proteinPct / 100)) / 4),
      fat_g: Math.round((targetCalories * (fatPct / 100)) / 9),
      carb_g: Math.round((targetCalories * (carbPct / 100)) / 4),
    };
  }

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
 * Validasi & normalisasi preferensi persentase makro custom dari user.
 * Return null kalau user tidak mengisi (pakai kalkulasi default), atau
 * object { proteinPct, fatPct, carbPct } kalau valid. Throw Error kalau
 * diisi tapi tidak valid (dipakai di route handler, di-catch jadi 400).
 */
function normalizeMacroPreference({ proteinPct, fatPct, carbPct } = {}) {
  if (proteinPct === undefined && fatPct === undefined && carbPct === undefined) return null;
  if (proteinPct === null && fatPct === null && carbPct === null) return null;

  const p = Number(proteinPct);
  const f = Number(fatPct);
  const c = Number(carbPct);

  if ([p, f, c].some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error("Persentase makro (protein/lemak/karbo) harus berupa angka 0 atau lebih");
  }

  const total = p + f + c;
  if (Math.abs(total - 100) > 0.5) {
    throw new Error(`Total persentase makro harus 100% (sekarang ${total}%)`);
  }

  return { proteinPct: p, fatPct: f, carbPct: c };
}

/**
 * Estimasi kebutuhan cairan harian (ml), formula umum 35 ml per kg berat
 * badan. Ini estimasi standar untuk orang dewasa sehat, bukan anjuran
 * medis — sama seperti disclaimer rumus gizi lain di aplikasi ini.
 */
function calculateWaterNeeds(weightKg) {
  return Math.round(weightKg * 35);
}

/**
 * Fungsi utama: hitung semua kebutuhan gizi dari data profil user
 */
function calculateNutritionNeeds({ gender, age, weightKg, heightCm, activityLevel, goal, macroPreference }) {
  const bmr = calculateBMR({ gender, weightKg, heightCm, age });
  const tdee = calculateTDEE(bmr, activityLevel);
  const targetCalories = calculateTargetCalories(tdee, goal);
  const macros = calculateMacros(targetCalories, weightKg, macroPreference);
  const waterMl = calculateWaterNeeds(weightKg);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories: Math.round(targetCalories),
    ...macros,
    water_ml: waterMl,
  };
}

module.exports = {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  calculateWaterNeeds,
  normalizeMacroPreference,
  calculateNutritionNeeds,
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
};
