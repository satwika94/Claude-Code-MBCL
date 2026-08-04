const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function HistoryChart({ days, targetCalories }) {
  const maxVal = Math.max(targetCalories * 1.15, ...days.map((d) => d.calories), 1);
  const targetPct = (targetCalories / maxVal) * 100;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="ledger-card history-card">
      <p className="eyebrow">Riwayat 7 Hari</p>
      <h2 className="section-title">Konsistensi kalori</h2>

      <div className="history-chart">
        <div className="history-chart__target-line" style={{ bottom: `${targetPct}%` }}>
          <span className="mono">target</span>
        </div>
        <div className="history-chart__bars">
          {days.map((d) => {
            const heightPct = Math.max((d.calories / maxVal) * 100, d.calories > 0 ? 3 : 0);
            const isToday = d.date === todayStr;
            const over = d.calories > targetCalories;
            const dow = DAY_LABELS[new Date(d.date + "T00:00:00").getDay()];
            return (
              <div className="history-bar" key={d.date}>
                <div className="history-bar__track">
                  <div
                    className={`history-bar__fill ${over ? "history-bar__fill--over" : ""} ${
                      isToday ? "history-bar__fill--today" : ""
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${d.calories} kkal`}
                  />
                </div>
                <span className={`history-bar__label mono ${isToday ? "history-bar__label--today" : ""}`}>
                  {dow}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
