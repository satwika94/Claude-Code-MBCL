import { useState } from "react";
import { api } from "../api";

const QUICK_AMOUNTS = [
  { label: "Gelas 200ml", ml: 200 },
  { label: "Botol 500ml", ml: 500 },
  { label: "Botol 600ml", ml: 600 },
];

export default function WaterTracker({ userId, target, consumedMl, percent, logs, onLogged }) {
  const [customMl, setCustomMl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const logAmount = async (amountMl) => {
    setSaving(true);
    setError("");
    try {
      await api.logWater({ userId, amountMl });
      setCustomMl("");
      onLogged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const amountMl = Number(customMl);
    if (!amountMl || amountMl <= 0) return;
    logAmount(amountMl);
  };

  const handleDelete = async (logId) => {
    await api.deleteWaterLog(logId);
    onLogged();
  };

  const pct = Math.min(percent ?? 0, 100);
  const overTarget = percent != null && percent > 100;

  return (
    <div className="ledger-card water-card">
      <p className="eyebrow">Asupan Cairan</p>
      <div className="water-summary">
        <div className="water-track">
          <div
            className={`water-fill${overTarget ? " water-fill--over" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="water-summary__text mono">
          {consumedMl} / {target} ml
          {percent != null && <span className="water-percent"> · {percent}%</span>}
        </p>
      </div>

      <div className="water-quick-buttons">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q.ml}
            type="button"
            className="btn btn--ghost water-quick-btn"
            disabled={saving}
            onClick={() => logAmount(q.ml)}
          >
            + {q.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleCustomSubmit} className="water-custom-form">
        <input
          type="number"
          min="1"
          max="5000"
          placeholder="Jumlah lain (ml)"
          value={customMl}
          onChange={(e) => setCustomMl(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={saving || !customMl}>
          Catat
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {logs.length > 0 && (
        <ul className="water-log-list">
          {logs.map((log) => (
            <li key={log.log_id} className="water-log-row">
              <span className="mono">{log.amount_ml} ml</span>
              <span className="mono muted water-log-time">
                {new Date(log.logged_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                type="button"
                className="btn-icon"
                aria-label="Hapus catatan cairan"
                onClick={() => handleDelete(log.log_id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
