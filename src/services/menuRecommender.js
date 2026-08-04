// ============================================
// Mesin rekomendasi menu harian (versi rule-based / prototipe)
//
// Prinsip gizi seimbang: tiap SESI MAKAN UTAMA (sarapan/siang/malam)
// wajib memuat 4 kelompok bahan: karbohidrat, protein (hewani/nabati),
// lemak, dan sayur — bukan comot acak dari seluruh database. Buah
// (dan nanti jajan pasar) khusus dialokasikan ke sesi CEMILAN, bukan
// makan utama, sesuai kaidah "isi piringku".
//
// Catatan: ini BUKAN pakai LLM untuk hitung angka gizi -
// angka selalu dari database (deterministik & akurat).
// LLM (mis. Claude API) baru dipakai belakangan untuk
// menyusun bahan jadi "nama resep" & instruksi memasak
// yang enak dibaca. Lihat fungsi generateRecipeNarrative().
// ============================================

const MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

// Proporsi kalori di dalam SATU sesi makan utama, dibagi ke 4 kelompok.
// Referensi kasar ala "Isi Piringku": ~separuh karbo+lauk, separuh sayur+buah,
// disesuaikan supaya tetap praktis untuk porsi rumahan.
const MAIN_MEAL_GROUPS = {
  karbohidrat: 0.40,
  protein: 0.30,
  sayur: 0.15,
  lemak: 0.15,
};

const PROTEIN_CATEGORIES = ["protein_hewani", "protein_nabati"];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function filterByDiet(foods, dietaryPreference) {
  if (dietaryPreference === "vegetarian") return foods.filter((f) => f.is_vegetarian === 1);
  if (dietaryPreference === "vegan") return foods.filter((f) => f.is_vegan === 1);
  return foods;
}

function toMenuItem(food, portionG) {
  const factor = portionG / 100;
  return {
    food_id: food.id,
    name: food.name,
    portion_g: portionG,
    calories: Math.round(food.calories_per_100g * factor),
    protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
    carb_g: Math.round(food.carb_per_100g * factor * 10) / 10,
  };
}

/**
 * Pilih SATU bahan dari sebuah kelompok (mis. "sayur") dan tentukan
 * porsinya supaya kalorinya mendekati alokasi yang diberikan.
 */
function pickOneFromPool(pool, targetCalories, { minG = 20, maxG = 300 } = {}) {
  const candidates = pool.filter((f) => f.calories_per_100g > 0);
  if (candidates.length === 0) return null;

  const food = shuffle(candidates)[0];
  let portionG = Math.round((targetCalories / food.calories_per_100g) * 100);
  portionG = Math.max(minG, Math.min(portionG, maxG));

  return toMenuItem(food, portionG);
}

/**
 * Susun SATU sesi makan UTAMA (sarapan/siang/malam) yang seimbang:
 * 1 sumber karbohidrat, 1 sumber protein, 1 sumber lemak, 1 sayur.
 */
function pickBalancedMainMeal(foods, targetCalories, dietaryPreference) {
  const candidates = filterByDiet(foods, dietaryPreference);

  const pools = {
    karbohidrat: candidates.filter((f) => f.category === "karbohidrat"),
    protein: candidates.filter((f) => PROTEIN_CATEGORIES.includes(f.category)),
    sayur: candidates.filter((f) => f.category === "sayur"),
    lemak: candidates.filter((f) => f.category === "lemak"),
  };

  const selected = [];
  for (const [group, ratio] of Object.entries(MAIN_MEAL_GROUPS)) {
    const allocatedCalories = targetCalories * ratio;
    // Lemak biasanya minyak/santan dengan kalori padat -> batasi porsi kecil (wajar: 5-30g)
    const bounds = group === "lemak" ? { minG: 5, maxG: 30 } : { minG: 20, maxG: 300 };
    const item = pickOneFromPool(pools[group], allocatedCalories, bounds);
    if (item) selected.push(item);
  }

  return selected;
}

/**
 * Susun sesi CEMILAN: dari kelompok buah DAN camilan (jajan pasar/
 * snack kemasan), supaya variasinya tidak melulu buah segar.
 */
function pickSnack(foods, targetCalories, dietaryPreference) {
  const candidates = filterByDiet(foods, dietaryPreference);
  const snackPool = candidates.filter((f) => f.category === "buah" || f.category === "camilan");

  // Jaga-jaga: kalau karena filter diet kelompok ini kosong (kasus langka),
  // baru jatuh balik ke seluruh kandidat supaya snack tidak kosong total.
  const pool = snackPool.length > 0 ? snackPool : candidates;

  const selected = [];
  let remaining = targetCalories;
  const shuffled = shuffle(pool);

  for (const food of shuffled) {
    if (remaining < 25 || selected.length >= 2) break;
    if (food.calories_per_100g <= 0) continue;
    const item = pickOneFromPool([food], remaining, { minG: 20, maxG: 200 });
    if (!item) continue;
    selected.push(item);
    remaining -= item.calories;
  }

  return selected;
}

/**
 * Susun menu harian lengkap (breakfast, lunch, dinner, snack)
 * berdasarkan target kalori total dari hasil kalkulasi gizi.
 */
function generateDailyMenu(foods, targetCalories, dietaryPreference = "none") {
  const menu = {};
  let totals = { calories: 0, protein_g: 0, fat_g: 0, carb_g: 0 };

  for (const [mealType, ratio] of Object.entries(MEAL_DISTRIBUTION)) {
    const mealTargetCalories = targetCalories * ratio;
    const items =
      mealType === "snack"
        ? pickSnack(foods, mealTargetCalories, dietaryPreference)
        : pickBalancedMainMeal(foods, mealTargetCalories, dietaryPreference);

    menu[mealType] = {
      target_calories: Math.round(mealTargetCalories),
      items,
    };

    for (const item of items) {
      totals.calories += item.calories;
      totals.protein_g += item.protein_g;
      totals.fat_g += item.fat_g;
      totals.carb_g += item.carb_g;
    }
  }

  totals.calories = Math.round(totals.calories);
  totals.protein_g = Math.round(totals.protein_g * 10) / 10;
  totals.fat_g = Math.round(totals.fat_g * 10) / 10;
  totals.carb_g = Math.round(totals.carb_g * 10) / 10;

  return { menu, totals };
}

/**
 * (Opsional) Placeholder integrasi LLM: ubah daftar bahan mentah
 * menjadi narasi resep yang enak dibaca. Angka gizi TETAP dari
 * hasil generateDailyMenu(), LLM hanya menyusun bahasa/instruksi.
 *
 * Contoh pemanggilan di server.js jika ANTHROPIC_API_KEY tersedia:
 *
 *   const res = await fetch("https://api.anthropic.com/v1/messages", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({
 *       model: "claude-sonnet-4-6",
 *       max_tokens: 500,
 *       messages: [{
 *         role: "user",
 *         content: `Buatkan nama menu & instruksi singkat memasak dari bahan berikut: ${JSON.stringify(items)}. Jangan ubah angka gizinya.`
 *       }]
 *     })
 *   });
 */
function generateRecipeNarrativePlaceholder(mealItems) {
  const names = mealItems.map((i) => i.name).join(", ");
  return `Menu berisi: ${names}. (Narasi resep detail bisa digenerate via LLM di tahap berikutnya.)`;
}

module.exports = {
  generateDailyMenu,
  pickBalancedMainMeal,
  pickSnack,
  generateRecipeNarrativePlaceholder,
  MEAL_DISTRIBUTION,
  MAIN_MEAL_GROUPS,
};
