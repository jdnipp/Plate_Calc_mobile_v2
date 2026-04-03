function BarbellDiagram({perSide, unitLabel, barWeight, collarWeight}) {
  const left = [...perSide].reverse();
  const dense = (perSide.length + (collarWeight > 0 ? 1 : 0)) > 8;
  return (
    <div className="card small-card">
      <h3 className="section-title">Bar view</h3>
      <div className={`barbell-fit ${dense ? "dense" : ""}`}>
        <div className="plate-side">
          {left.map((p, i) => {
            const [bg, border, text] = plateStyle(p, unitLabel);
            return (
              <div
                key={`l-${p}-${i}`}
                className="plate realistic"
                style={{
                  height: `${plateHeight(p)}px`,
                  background: bg,
                  borderColor: border,
                  color: text
                }}
              >
                <span className="plate-label">{fmt(p)}</span>
              </div>
            );
          })}
          {collarWeight > 0 ? <div className="collar">C</div> : null}
        </div>
        {/* The horizontal bar stays present, flexes to fill width */}
        <div className="bar-section" />
        <div className="bar-center short-bar">
          <strong>{fmt(barWeight)} {unitLabel}</strong>
          <span>bar</span>
        </div>
      </div>
    </div>
  );
}
