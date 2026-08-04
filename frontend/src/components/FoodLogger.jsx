import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function FoodLogger({ userId, dietaryPreference, onLogged }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [portion, setPortion] = useState(100);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchFoods(query.trim(), { diet: dietaryPreference });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, dietaryPreference]);

  const pick = (food) => {
    setSelected(food);
    setResults([]);
    setQuery(food.name);
  };

  const reset = () => {
    setSelected(null);
    setQuery("");
    setPortion(100);
  };

  const handleLog = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.logMeal({ userId, foodId: selected.id, portionG: Number(portion) });
      reset();
      onLogged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const factor = Number(portion) / 100 || 0;
  const preview = selected
    ? {
        calories: Math.round(selected.calories_per_100g * factor),
        protein: Math.round(selected.protein_per_100g * factor * 10) / 10,
        fat: Math.round(selected.fat_per_100g * factor * 10) / 10,
        carb: Math.round(selected.carb_per_100g * factor * 10) / 10,
      }
    : null;

  return (
    <div className="ledger-card logger-card">
      <p className="eyebrow">Catat Konsumsi</p>
      <h2 className="section-title">Baru makan apa?</h2>

      <form onSubmit={handleLog} className="logger-form">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Cari bahan makanan, mis. “tempe goreng”"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />
          {searching && <span className="search-status">mencari…</span>}
          {results.length > 0 && (
            <ul className="search-results">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => pick(f)}>
                    <span>{f.name}</span>
                    <span className="mono muted">{f.calories_per_100g} kkal/100g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="portion-row">
            <label className="field field--portion">
              <span>Porsi (gram)</span>
              <input
                type="number"
                min="1"
                max="2000"
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
              />
            </label>
            {preview && (
              <div className="portion-preview mono">
                <strong>{preview.calories}</strong> kkal · P {preview.protein}g · L {preview.fat}g · K{" "}
                {preview.carb}g
              </div>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={!selected || saving}>
          {saving ? "Menyimpan…" : "Catat ke hari ini"}
        </button>
      </form>
    </div>
  );
}
