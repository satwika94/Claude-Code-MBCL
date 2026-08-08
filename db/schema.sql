-- ============================================
-- SKEMA DATABASE: Nutrition App Prototype
-- PostgreSQL (mis. Supabase / Neon).
-- ============================================

-- Data profil pengguna
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
  age INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  activity_level TEXT CHECK(activity_level IN (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )) NOT NULL,
  goal TEXT CHECK(goal IN ('cutting', 'maintenance', 'bulking')) NOT NULL,
  dietary_preference TEXT DEFAULT 'none', -- vegetarian, vegan, none, dll
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Preferensi persentase makro custom (opsional). NULL di ketiganya berarti
-- user pakai kalkulasi otomatis (1.8g/kg protein, 25% lemak, sisanya karbo)
-- alih-alih persentase pilihan sendiri. ADD COLUMN IF NOT EXISTS supaya
-- aman dijalankan ulang di database yang sudah ada (lihat db/seed.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS protein_pct REAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fat_pct REAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS carb_pct REAL;

-- Target kalori & makro harian (hasil kalkulasi, disimpan sbg histori)
CREATE TABLE IF NOT EXISTS daily_targets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  bmr REAL NOT NULL,
  tdee REAL NOT NULL,
  target_calories REAL NOT NULL,
  target_protein_g REAL NOT NULL,
  target_fat_g REAL NOT NULL,
  target_carb_g REAL NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- Target kebutuhan cairan harian (ml, estimasi dari berat badan)
ALTER TABLE daily_targets ADD COLUMN IF NOT EXISTS target_water_ml REAL;

-- Database bahan makanan (referensi gizi per 100g)
CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- karbohidrat, protein_hewani, protein_nabati, sayur, buah, lemak
  calories_per_100g REAL NOT NULL,
  protein_per_100g REAL NOT NULL,
  fat_per_100g REAL NOT NULL,
  carb_per_100g REAL NOT NULL,
  is_vegetarian INTEGER DEFAULT 1, -- 1 = ya, 0 = tidak
  is_vegan INTEGER DEFAULT 1
);

-- Resep/menu (kombinasi dari beberapa bahan)
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT
);

-- Detail bahan dalam suatu resep
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  food_id INTEGER NOT NULL REFERENCES foods(id),
  portion_g REAL NOT NULL
);

-- Log konsumsi harian pengguna
CREATE TABLE IF NOT EXISTS meal_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recipe_id INTEGER REFERENCES recipes(id),
  food_id INTEGER REFERENCES foods(id),
  portion_g REAL,
  logged_at TIMESTAMPTZ DEFAULT now()
);
