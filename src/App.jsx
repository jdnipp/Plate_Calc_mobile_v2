import React, { useEffect, useMemo, useState } from "react";

const SETUPS = {
  acuostandard: {
    name: "ACUO Standard",
    unit: "lb",
    defaultBarWeight: 45,
    defaultCollarWeight: 0,
    plates: [45, 25, 15, 10, 5, 2.5],
    inventory: { 45: 12, 25: 6, 15: 4, 10: 6, 5: 6, 2.5: 4 },
    favorites: [95, 135, 155, 185, 205, 225, 275, 315],
    target: 185,
    barOptions: [25, 35, 45],
  },
  competitionkg: {
    name: "Competition KG",
    unit: "kg",
    defaultBarWeight: 20,
    defaultCollarWeight: 0,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
    inventory: { 25: 10, 20: 2, 15: 2, 10: 4, 5: 4, 2.5: 4, 1.25: 4 },
    favorites: [60, 80, 100, 120, 140],
    target: 100,
    barOptions: [15, 20],
  },
};

const STORAGE_KEYS = {
  favorites: "acuo-plate-calculator-favorites",
  setup: "acuo-plate-calculator-setup",
  inventoryMode: "acuo-plate-calculator-inventory-mode",
};

function roundToHundredth(value) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, "");
}

function parsePlateInput(input) {
  return input
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((p) => !Number.isNaN(p) && p > 0)
    .sort((a, b) => b - a);
}

function groupPlates(plates) {
  const counts = {};
  plates.forEach((plate) => {
    counts[plate] = (counts[plate] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([plate, count]) => ({ plate: Number(plate), count }));
}

function formatPlateList(plates, unitLabel) {
  if (!plates.length) return "No plates needed";
  return groupPlates(plates)
    .map(({ plate, count }) => `${count} × ${formatNumber(plate)} ${unitLabel}`)
    .join(", ");
}

function plateHeight(plate) {
  const map = {
    55: 80,
    45: 76,
    35: 70,
    25: 64,
    20: 60,
    15: 56,
    10: 50,
    5: 42,
    2.5: 36,
    1.25: 30,
  };
  return map[plate] || 34;
}

function plateStyle(plate, unitLabel) {
  if (unitLabel === "kg") {
    const kgColors = {
      25: { bg: "linear-gradient(180deg, #cf2e2e 0%, #991b1b 100%)", border: "#7f1d1d", text: "#fff" },
      20: { bg: "linear-gradient(180deg, #2f5fd3 0%, #1e3a8a 100%)", border: "#1e3a8a", text: "#fff" },
      15: { bg: "linear-gradient(180deg, #e4c245 0%, #a16207 100%)", border: "#92400e", text: "#111" },
      10: { bg: "linear-gradient(180deg, #3f3f46 0%, #18181b 100%)", border: "#18181b", text: "#fff" },
      5: { bg: "linear-gradient(180deg, #f7f7f7 0%, #d4d4d8 100%)", border: "#a1a1aa", text: "#111" },
      2.5: { bg: "linear-gradient(180deg, #16a34a 0%, #166534 100%)", border: "#166534", text: "#fff" },
      1.25: { bg: "linear-gradient(180deg, #f8fafc 0%, #cbd5e1 100%)", border: "#94a3b8", text: "#111" },
    };
    return kgColors[plate] || kgColors[10];
  }

  const lbColors = {
    45: { bg: "linear-gradient(180deg, #d97706 0%, #9a3412 100%)", border: "#9a3412", text: "#fff" },
    25: { bg: "linear-gradient(180deg, #ef4444 0%, #991b1b 100%)", border: "#991b1b", text: "#fff" },
    15: { bg: "linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%)", border: "#1e3a8a", text: "#fff" },
    10: { bg: "linear-gradient(180deg, #22c55e 0%, #166534 100%)", border: "#166534", text: "#fff" },
    5: { bg: "linear-gradient(180deg, #f4f4f5 0%, #d4d4d8 100%)", border: "#a1a1aa", text: "#111" },
    2.5: { bg: "linear-gradient(180deg, #111827 0%, #000000 100%)", border: "#000000", text: "#fff" },
  };
  return lbColors[plate] || lbColors[10];
}

function getClosestSolution(targetWeight, barWeight, collarWeight, availablePlates, inventoryMode, inventory) {
  const perSideTarget = roundToHundredth((targetWeight - barWeight - collarWeight * 2) / 2);
  if (perSideTarget < 0) return null;

  let best = {
    plates: [],
    weight: 0,
    diff: Math.abs(perSideTarget),
  };

  function dfs(index, currentWeight, currentPlates, remainingInventory) {
    const diff = Math.abs(perSideTarget - currentWeight);
    if (diff < best.diff || (diff === best.diff && currentWeight > best.weight)) {
      best = {
        plates: [...currentPlates],
        weight: roundToHundredth(currentWeight),
        diff: roundToHundredth(diff),
      };
    }

    if (index >= availablePlates.length) return;

    const plate = availablePlates[index];
    const maxByWeight = Math.floor((perSideTarget - currentWeight + best.diff) / plate);
    const maxByInventory = inventoryMode
      ? Math.floor((remainingInventory[plate] || 0) / 2)
      : Math.max(0, Math.floor((perSideTarget + best.diff) / plate));
    const maxCount = Math.max(0, Math.min(maxByWeight, maxByInventory, 12));

    for (let count = maxCount; count >= 0; count--) {
      const nextWeight = roundToHundredth(currentWeight + count * plate);
      const nextPlates = [...currentPlates, ...Array(count).fill(plate)];
      const nextInventory = { ...remainingInventory };

      if (inventoryMode && count > 0) {
        nextInventory[plate] = (nextInventory[plate] || 0) - count * 2;
      }

      dfs(index + 1, nextWeight, nextPlates, nextInventory);
    }
  }

  dfs(0, 0, [], { ...inventory });
  return best;
}

function calculatePlates({ targetWeight, barWeight, collarWeight, availablePlates, inventoryMode, inventory }) {
  if (targetWeight < barWeight + collarWeight * 2) {
    return {
      error: "Target weight must be at least the bar plus collars.",
      info: "",
      perSide: [],
      perSideWeight: 0,
      totalLoaded: roundToHundredth(barWeight + collarWeight * 2),
      exact: false,
      closest: false,
    };
  }

  const perSideTarget = roundToHundredth((targetWeight - barWeight - collarWeight * 2) / 2);
  let perSideRemaining = perSideTarget;
  const perSide = [];
  const remainingInventory = { ...inventory };

  for (const plate of availablePlates) {
    let maxCount = Math.floor(perSideRemaining / plate);
    if (inventoryMode) {
      maxCount = Math.min(maxCount, Math.floor((remainingInventory[plate] || 0) / 2));
    }

    for (let i = 0; i < maxCount; i++) {
      perSide.push(plate);
      perSideRemaining = roundToHundredth(perSideRemaining - plate);
      if (inventoryMode) remainingInventory[plate] -= 2;
    }
  }

  const perSideWeight = roundToHundredth(perSide.reduce((sum, p) => sum + p, 0));
  const totalLoaded = roundToHundredth(barWeight + collarWeight * 2 + perSideWeight * 2);

  if (perSideRemaining === 0) {
    return {
      error: "",
      info: collarWeight > 0 ? `Includes ${formatNumber(collarWeight)} per collar.` : "",
      perSide,
      perSideWeight,
      totalLoaded,
      exact: true,
      closest: false,
    };
  }

  const closest = getClosestSolution(targetWeight, barWeight, collarWeight, availablePlates, inventoryMode, inventory);

  return {
    error: "Cannot make the exact weight with your current setup.",
    info: closest ? `Closest possible load is ${formatNumber(roundToHundredth(barWeight + collarWeight * 2 + closest.weight * 2))}.` : "",
    perSide: closest ? closest.plates : perSide,
    perSideWeight: closest ? closest.weight : perSideWeight,
    totalLoaded: closest ? roundToHundredth(barWeight + collarWeight * 2 + closest.weight * 2) : totalLoaded,
    exact: false,
    closest: Boolean(closest),
  };
}

function BarbellDiagram({ perSide, unitLabel, barWeight, collarWeight }) {
  const left = [...perSide].reverse();
  const right = [...perSide];
  const totalVisualPlates = perSide.length * 2 + (collarWeight > 0 ? 2 : 0);
  const dense = totalVisualPlates > 8;

  return (
    <div className="card small-card">
      <h3 className="section-title">Bar view</h3>
      <div className={`barbell-fit ${dense ? "dense" : ""}`}>
        <div className="plate-side">
          {left.map((plate, index) => {
            const style = plateStyle(plate, unitLabel);
            return (
              <div
                key={`left-${plate}-${index}`}
                className="plate realistic"
                style={{
                  height: `${plateHeight(plate)}px`,
                  background: style.bg,
                  borderColor: style.border,
                  color: style.text,
                }}
                title={`${formatNumber(plate)} ${unitLabel}`}
              >
                <span>{formatNumber(plate)} {unitLabel}</span>
              </div>
            );
          })}
          {collarWeight > 0 ? <div className="collar">C</div> : null}
        </div>

        <div className="bar-section" />
        <div className="bar-center short-bar">
          <strong>{formatNumber(barWeight)} {unitLabel}</strong>
          <span>bar</span>
        </div>
        <div className="bar-section" />

        <div className="plate-side">
          {collarWeight > 0 ? <div className="collar">C</div> : null}
          {right.map((plate, index) => {
            const style = plateStyle(plate, unitLabel);
            return (
              <div
                key={`right-${plate}-${index}`}
                className="plate realistic"
                style={{
                  height: `${plateHeight(plate)}px`,
                  background: style.bg,
                  borderColor: style.border,
                  color: style.text,
                }}
                title={`${formatNumber(plate)} ${unitLabel}`}
              >
                <span>{formatNumber(plate)} {unitLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SetupButton({ active, children, onClick }) {
  return (
    <button type="button" className={active ? "pill active" : "pill"} onClick={onClick}>
      {children}
    </button>
  );
}

export default function App() {
  const [setupMode, setSetupMode] = useState(() => {
    if (typeof window === "undefined") return "acuostandard";
    const saved = localStorage.getItem(STORAGE_KEYS.setup);
    return saved && SETUPS[saved] ? saved : "acuostandard";
  });

  const activeSetup = SETUPS[setupMode] || SETUPS.acuostandard;
  const [unitLabel, setUnitLabel] = useState(activeSetup.unit);
  const [targetWeight, setTargetWeight] = useState(String(activeSetup.target));
  const [barWeight, setBarWeight] = useState(String(activeSetup.defaultBarWeight));
  const [collarWeight, setCollarWeight] = useState(String(activeSetup.defaultCollarWeight));
  const [plateInput, setPlateInput] = useState(activeSetup.plates.join(", "));
  const [inventoryMode, setInventoryMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEYS.inventoryMode) === "true";
  });
  const [inventory, setInventory] = useState(activeSetup.inventory);
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === "undefined") return activeSetup.favorites;
    const saved = localStorage.getItem(STORAGE_KEYS.favorites);
    return saved ? JSON.parse(saved) : activeSetup.favorites;
  });
  const [favoriteDraft, setFavoriteDraft] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.setup, setupMode);
  }, [setupMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.inventoryMode, String(inventoryMode));
  }, [inventoryMode]);

  useEffect(() => {
    const next = SETUPS[setupMode] || SETUPS.acuostandard;
    setUnitLabel(next.unit);
    setBarWeight(String(next.defaultBarWeight));
    setCollarWeight(String(next.defaultCollarWeight));
    setPlateInput(next.plates.join(", "));
    setInventory(next.inventory);
    setFavorites(next.favorites);
    setTargetWeight(String(next.target));
    setInventoryMode(false);
    setShareMessage("");
  }, [setupMode]);

  const availablePlates = useMemo(() => parsePlateInput(plateInput), [plateInput]);

  const result = useMemo(() => {
    const target = Number(targetWeight);
    const bar = Number(barWeight);
    const collar = Number(collarWeight);

    if (
      Number.isNaN(target) ||
      Number.isNaN(bar) ||
      Number.isNaN(collar) ||
      target <= 0 ||
      bar <= 0 ||
      collar < 0 ||
      availablePlates.length === 0
    ) {
      return null;
    }

    const raw = calculatePlates({
      targetWeight: target,
      barWeight: bar,
      collarWeight: collar,
      availablePlates,
      inventoryMode,
      inventory,
    });

    if (raw && raw.info.includes("unitLabel")) {
      raw.info = raw.info.replace("unitLabel", unitLabel);
    }
    return raw;
  }, [targetWeight, barWeight, collarWeight, availablePlates, inventoryMode, inventory, unitLabel]);

  function applySetup(nextMode) {
    setSetupMode(nextMode);
  }

  function updateInventoryCount(plate, value) {
    const parsed = Math.max(0, Number(value) || 0);
    setInventory((prev) => ({ ...prev, [plate]: parsed }));
  }

  function addFavorite() {
    const value = Number(favoriteDraft);
    if (!Number.isNaN(value) && value > 0 && !favorites.includes(value)) {
      setFavorites((prev) => [...prev, value].sort((a, b) => a - b));
      setFavoriteDraft("");
    }
  }

  function removeFavorite(weight) {
    setFavorites((prev) => prev.filter((item) => item !== weight));
  }

  async function handleShare() {
    if (!result) return;
    const text = `ACUO Plate Setup\nLift: ${formatNumber(result.totalLoaded)} ${unitLabel}\nPer side: ${formatPlateList(result.perSide, unitLabel)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ACUO Plate Calculator", text });
        setShareMessage("Shared.");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMessage("Copied setup to clipboard.");
      } else {
        setShareMessage("Sharing is not supported on this device.");
      }
    } catch {
      setShareMessage("Share was canceled.");
    }
  }

  function handlePrint() {
    window.print();
  }

  const jump = 5;

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <div className="app-header">
          <p className="eyebrow">ACUO CrossFit</p>
          <h1>Plate Calculator</h1>
          <p className="lead">Built for phones. Fast input, big buttons, quick answer.</p>
        </div>

        <div className="top-controls no-print">
          <div className="setup-row">
            {Object.entries(SETUPS).map(([key, setup]) => (
              <SetupButton key={key} active={setupMode === key} onClick={() => applySetup(key)}>
                {setup.name}
              </SetupButton>
            ))}
          </div>
        </div>

        <div className="card result-card sticky-result">
          {!result ? (
            <p className="subtle">Enter valid numbers to calculate plates.</p>
          ) : (
            <>
              <div className="hero-result">
                <span>Per side</span>
                <strong>{formatPlateList(result.perSide, unitLabel)}</strong>
              </div>

              <div className="stats compact-stats">
                <div className="stat">
                  <span>Total</span>
                  <strong>{formatNumber(result.totalLoaded)} {unitLabel}</strong>
                </div>
                <div className="stat">
                  <span>Side</span>
                  <strong>{formatNumber(result.perSideWeight)} {unitLabel}</strong>
                </div>
              </div>

              <BarbellDiagram
                perSide={result.perSide}
                unitLabel={unitLabel}
                barWeight={Number(barWeight) || 0}
                collarWeight={Number(collarWeight) || 0}
              />
            </>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Load</h2>

          {unitLabel === "lb" ? (
            <div className="bar-options no-print">
              {activeSetup.barOptions.map((weight) => (
                <button
                  key={weight}
                  type="button"
                  className={Number(barWeight) === weight ? "pill active" : "pill"}
                  onClick={() => setBarWeight(String(weight))}
                >
                  {weight} lb bar
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid one">
            <label className="field">
              <span>Target</span>
              <input inputMode="decimal" type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
            </label>

            <div className="quick-adjust no-print">
              <button
                type="button"
                className="secondary big"
                onClick={() => setTargetWeight(String(Math.max(Number(barWeight) || 0, (Number(targetWeight) || 0) - jump)))}
              >
                -5
              </button>
              <button
                type="button"
                className="secondary big"
                onClick={() => setTargetWeight(String((Number(targetWeight) || 0) + jump))}
              >
                +5
              </button>
            </div>

            <div className="quick-picks no-print">
              {favorites.map((weight) => (
                <button key={weight} type="button" className="pill large" onClick={() => setTargetWeight(String(weight))}>
                  {weight}
                </button>
              ))}
            </div>

            <div className="two-up">
              <label className="field">
                <span>Bar</span>
                <input inputMode="decimal" type="number" value={barWeight} onChange={(e) => setBarWeight(e.target.value)} />
              </label>
              <label className="field">
                <span>Collar</span>
                <input inputMode="decimal" type="number" value={collarWeight} onChange={(e) => setCollarWeight(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        {result ? (
          <div className={result.exact ? "notice success" : "notice warning"}>
            <strong>{result.exact ? "Exact match" : result.error}</strong>
            {result.info ? <p>{result.info}</p> : null}
          </div>
        ) : null}

        <div className="actions no-print bottom-actions">
          <button type="button" className="secondary" onClick={handleShare}>Share</button>
          <button type="button" className="secondary" onClick={handlePrint}>Print</button>
        </div>

        <details className="advanced no-print">
          <summary>Advanced options</summary>

          <div className="card small-card">
            <label className="field">
              <span>Available Plate Sizes</span>
              <input value={plateInput} onChange={(e) => setPlateInput(e.target.value)} />
              <small>Comma separated plate sizes in {unitLabel}.</small>
            </label>

            <div className="toggle-row">
              <div>
                <strong>Gym inventory mode</strong>
                <p className="subtle">Optional. Leave off for normal class use.</p>
              </div>
              <button
                type="button"
                className={inventoryMode ? "toggle active" : "toggle"}
                onClick={() => setInventoryMode((v) => !v)}
                aria-pressed={inventoryMode}
              >
                <span />
              </button>
            </div>

            {inventoryMode ? (
              <div className="grid two inventory-grid">
                {availablePlates.map((plate) => (
                  <label className="field compact" key={plate}>
                    <span>{formatNumber(plate)} {unitLabel}</span>
                    <input type="number" min="0" value={inventory[plate] ?? 0} onChange={(e) => updateInventoryCount(plate, e.target.value)} />
                  </label>
                ))}
              </div>
            ) : null}

            <div className="favorites-editor">
              <h3>Quick lifts</h3>
              <div className="favorites">
                {favorites.map((weight) => (
                  <div key={weight} className="favorite-chip">
                    <button type="button" onClick={() => setTargetWeight(String(weight))}>
                      {weight} {unitLabel}
                    </button>
                    <button type="button" className="remove" onClick={() => removeFavorite(weight)}>×</button>
                  </div>
                ))}
              </div>

              <div className="add-favorite">
                <input
                  type="number"
                  value={favoriteDraft}
                  onChange={(e) => setFavoriteDraft(e.target.value)}
                  placeholder={`Add quick lift ${unitLabel}`}
                />
                <button type="button" className="primary" onClick={addFavorite}>Add</button>
              </div>
            </div>
          </div>
        </details>

        {shareMessage ? <p className="subtle no-print">{shareMessage}</p> : null}
      </div>
    </div>
  );
}
