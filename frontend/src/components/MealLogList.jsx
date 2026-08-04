export default function MealLogList({ logs, onDelete }) {
  if (logs.length === 0) {
    return (
      <div className="ledger-card">
        <p className="eyebrow">Catatan Hari Ini</p>
        <p className="empty-note">
          Belum ada yang dicatat. Mulai dari catat sarapanmu di panel sebelah.
        </p>
      </div>
    );
  }

  return (
    <div className="ledger-card receipt-card">
      <p className="eyebrow">Catatan Hari Ini</p>
      <ul className="receipt-list">
        {logs.map((log) => (
          <li key={log.log_id} className="receipt-row">
            <div className="receipt-row__main">
              <span className="receipt-row__name">{log.food_name}</span>
              <span className="receipt-row__portion mono muted">{log.portion_g} g</span>
            </div>
            <div className="receipt-row__end">
              <span className="mono">{log.calories} kkal</span>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Hapus ${log.food_name}`}
                onClick={() => onDelete(log.log_id)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
