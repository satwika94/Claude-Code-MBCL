import { useEffect, useState } from "react";
import { api } from "../api";

const MEAL_LABELS = {
  breakfast: "Sarapan",
  lunch: "Makan Siang",
  dinner: "Makan Malam",
  snack: "Camilan",
};

export default function MenuSuggestion({ userId, onLogged }) {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [loggingKey, setLoggingKey] = useState(null);
  const [loggedKeys, setLoggedKeys] = useState(new Set());

  const load = async () => {
    try {
      const data = await api.getRecommendedMenu(userId);
      setMenu(data.daily_menu);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const quickLog = async (item, key) => {
    setLoggingKey(key);
    try {
      await api.logMeal({ userId, foodId: item.food_id, portionG: item.portion_g });
      setLoggedKeys((prev) => new Set(prev).add(key));
      onLogged();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingKey(null);
    }
  };

  if (error) {
    return (
      <div className="ledger-card">
        <p className="eyebrow">Menu Hari Ini</p>
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="ledger-card">
        <p className="eyebrow">Menu Hari Ini</p>
        <p className="empty-note">Menyusun menu…</p>
      </div>
    );
  }

  return (
    <div className="ledger-card menu-card">
      <div className="menu-card__head">
        <div>
          <p className="eyebrow">Usulan Menu</p>
          <h2 className="section-title">Menu hari ini</h2>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
          Acak ulang
        </button>
      </div>

      <div className="menu-groups">
        {Object.entries(menu).map(([mealType, info]) => (
          <div className="menu-group" key={mealType}>
            <p className="menu-group__label mono">
              {MEAL_LABELS[mealType] || mealType} · {info.target_calories} kkal
            </p>
            <ul className="menu-item-list">
              {info.items.map((item, idx) => {
                const key = `${mealType}-${idx}`;
                const logged = loggedKeys.has(key);
                return (
                  <li className="menu-item" key={key}>
                    <span className="menu-item__name">
                      {item.name} <span className="mono muted">· {item.portion_g}g</span>
                    </span>
                    <div className="menu-item__end">
                      <span className="mono muted">{item.calories} kkal</span>
                      <button
                        type="button"
                        className={`btn-chip ${logged ? "btn-chip--done" : ""}`}
                        disabled={loggingKey === key || logged}
                        onClick={() => quickLog(item, key)}
                      >
                        {logged ? "Tercatat" : loggingKey === key ? "…" : "+ Catat"}
                      </button>
                    </div>
                  </li>
                );
              })}
              {info.items.length === 0 && (
                <li className="menu-item menu-item--empty">Tidak ada usulan cocok.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
