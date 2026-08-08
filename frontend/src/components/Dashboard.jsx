import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import PlateRing from "./PlateRing";
import MacroBars from "./MacroBars";
import MealLogList from "./MealLogList";
import FoodLogger from "./FoodLogger";
import HistoryChart from "./HistoryChart";
import MenuSuggestion from "./MenuSuggestion";

const DAY_LABEL = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

export default function Dashboard({ user, onSwitchProfile }) {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [summaryData, logsData, historyData] = await Promise.all([
        api.getDailySummary(user.id),
        api.getMealLogs(user.id),
        api.getHistory(user.id, 7),
      ]);
      setSummary(summaryData);
      setLogs(logsData);
      setHistory(historyData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (logId) => {
    await api.deleteLog(logId);
    refresh();
  };

  if (loading) {
    return (
      <div className="page page--centered">
        <p className="lede">Memuat catatan hari ini…</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="page page--centered">
        <div className="ledger-card">
          <p className="form-error">{error}</p>
          <button className="btn btn--ghost" onClick={onSwitchProfile}>
            Buat profil baru
          </button>
        </div>
      </div>
    );
  }

  const overTarget = summary.consumed.calories > summary.target.calories;

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <p className="eyebrow">Buku Gizi · {DAY_LABEL}</p>
          <h1 className="display-title display-title--sm">Halo, {user.name.split(" ")[0]}</h1>
        </div>
        <button className="btn btn--ghost" onClick={onSwitchProfile}>
          Ganti profil
        </button>
      </header>

      <section className="hero-card ledger-card">
        <PlateRing consumed={summary.consumed.calories} target={summary.target.calories} />
        <div className="hero-side">
          <p className={`status-pill ${overTarget ? "status-pill--over" : ""}`}>
            {overTarget
              ? `${Math.abs(summary.remaining.calories)} kkal melebihi target`
              : `Sisa ${summary.remaining.calories} kkal hari ini`}
          </p>
          <MacroBars consumed={summary.consumed} target={summary.target} />
          {summary.target.water_ml && (
            <p className="water-target">💧 Target cairan: {summary.target.water_ml} ml/hari</p>
          )}
        </div>
      </section>

      <section className="two-col">
        <FoodLogger
          userId={user.id}
          dietaryPreference={user.dietary_preference}
          onLogged={refresh}
        />
        <MealLogList logs={logs} onDelete={handleDelete} />
      </section>

      {history && <HistoryChart days={history.days} targetCalories={history.target_calories} />}

      <MenuSuggestion userId={user.id} onLogged={refresh} />
    </div>
  );
}
