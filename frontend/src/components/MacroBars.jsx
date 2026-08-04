const MACROS = [
  { key: "protein_g", label: "Protein", color: "var(--daun)" },
  { key: "fat_g", label: "Lemak", color: "var(--kayu)" },
  { key: "carb_g", label: "Karbohidrat", color: "var(--turmeric-tint)" },
];

export default function MacroBars({ consumed, target }) {
  return (
    <div className="macro-bars">
      {MACROS.map((m) => {
        const c = consumed[m.key] || 0;
        const t = target[m.key] || 1;
        const pct = Math.min((c / t) * 100, 100);
        return (
          <div className="macro-row" key={m.key}>
            <div className="macro-row__label">
              <span>{m.label}</span>
              <span className="mono muted">
                {Math.round(c)} / {Math.round(t)} g
              </span>
            </div>
            <div className="macro-track">
              <div
                className="macro-fill"
                style={{ width: `${pct}%`, background: m.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
