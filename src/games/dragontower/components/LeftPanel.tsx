import React, { useState } from "react";
import { Difficulty, GameState } from "../types";

interface LeftPanelProps {
  balance: number;
  bet: number;
  diff: Difficulty;
  gstate: GameState;
  curMult: number;
  curWin: number;
  onBetChange: (v: number) => void;
  onDiffChange: (v: Difficulty) => void;
  onStartGame: () => void;
  onCashOut: () => void;
  onRandom: () => void;
}

interface AutoSettings {
  autoBet: number;
  autoCount: number;
  autoAdvanced: boolean;
  onWinMode: "reset" | "increase";
  onLossMode: "reset" | "increase";
  winInc: number;
  lossInc: number;
  stopProfit: number;
  stopLoss: number;
  autoRunning: boolean;
  autoTotalProfit: number;
  autoDiff: Difficulty;
}

interface LeftPanelFullProps extends LeftPanelProps {
  auto: AutoSettings;
  onAutoToggle: () => void;
  onAutoBetChange: (v: number) => void;
  onAutoDiffChange: (v: Difficulty) => void;
  onAutoSettingsChange: (s: Partial<AutoSettings>) => void;
}

const fmt = (v: number) =>
  "$" +
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtBtc = (v: number) => v.toFixed(8);

const DIFF_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: "Expert", label: "Expert" },
  { value: "Master", label: "Master" },
];

// ── Color tokens matching screenshot ──
const C = {
  bg: "#0d1117", // panel background — near black
  surface: "#161b22", // input / card background
  border: "rgba(255,255,255,0.07)",
  borderFocus: "rgba(255,255,255,0.18)",
  tabBg: "#161b22", // inactive tab area
  tabActive: "#ffffff",
  tabInactive: "#4a5568",
  labelColor: "#4a5568",
  valueColor: "#8a9ab0",
  textPrimary: "#e2e8f0",
  textDim: "#8a9ab0",
  accent: "#c8d800", // lime/yellow — bet button
  accentDark: "#111200",
  btcOrange: "#f0a020",
  red: "#e84040",
  green: "#38d080",
  gold: "#c8a44a",
};

const S = {
  panel: {
    // width: 300,
    minWidth: 270,
    flexShrink: 0,
    background: C.bg,
    flexDirection: "column" as const,
    borderRadius: "18px 0 0 18px",
    borderRight: `1px solid ${C.border}`,
    fontFamily: "'Rajdhani', sans-serif",
    color: C.textPrimary,
    padding: "14px 14px 20px",
    gap: 11,
    overflowY: "auto" as const,
  },

  // ── Tabs ──
  tabRow: {
    display: "flex",
    background: C.tabBg,
    borderRadius: 99,
    padding: 3,
    gap: 3,
  },
  tab: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 0",
    border: "none",
    borderRadius: 99,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .18s",
    background: active ? C.tabActive : "transparent",
    color: active ? C.accentDark : C.tabInactive,
    letterSpacing: 0.5,
  }),

  // ── Generic ──
  fieldWrap: { display: "flex", flexDirection: "column" as const, gap: 5 },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  lbl: {
    fontSize: 10,
    color: C.labelColor,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  lblRight: {
    fontSize: 11,
    color: C.valueColor,
    fontWeight: 600,
  },

  // ── Input box ──
  inputBox: (focused = false): React.CSSProperties => ({
    background: C.surface,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    height: 44,
    gap: 8,
    border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
    transition: "border-color .15s",
  }),
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: C.textPrimary,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    minWidth: 0,
  },

  // ── Bitcoin coin icon ──
  coinIcon: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.btcOrange}, #a05808)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 900,
    color: "#fff",
    flexShrink: 0,
    boxShadow: `0 0 6px rgba(240,160,32,0.4)`,
  },

  // ── ½ / 2× buttons ──
  modBtn: (disabled: boolean): React.CSSProperties => ({
    background: C.surface,
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    color: disabled ? "#2a3a4a" : C.valueColor,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    padding: "0 11px",
    height: 44,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap" as const,
    transition: "all .15s",
    flexShrink: 0,
  }),
  betRow: { display: "flex", gap: 5 },

  // ── Select ──
  selectWrap: { position: "relative" as const },
  select: {
    width: "100%",
    background: C.surface,
    border: `1.5px solid ${C.border}`,
    borderRadius: 9,
    color: C.textPrimary,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    padding: "11px 34px 11px 13px",
    appearance: "none" as const,
    cursor: "pointer",
    outline: "none",
  },
  selectArrow: {
    position: "absolute" as const,
    right: 11,
    top: "50%",
    transform: "translateY(-50%)",
    color: C.labelColor,
    pointerEvents: "none" as const,
    fontSize: 11,
  },

  // ── Action buttons ──
  betBtn: {
    width: "100%",
    border: "none",
    borderRadius: 11,
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    fontWeight: 900,
    padding: 14,
    cursor: "pointer",
    letterSpacing: 1,
    background: `linear-gradient(135deg, #a8c000, ${C.accent})`,
    color: C.accentDark,
    boxShadow: `0 3px 18px rgba(200,216,0,.28)`,
    transition: "filter .15s",
  },
  cashBtn: {
    width: "100%",
    border: "none",
    borderRadius: 11,
    fontFamily: "'Cinzel', serif",
    fontSize: 13,
    fontWeight: 900,
    padding: 14,
    cursor: "pointer",
    letterSpacing: 0.5,
    background: `linear-gradient(135deg, #a8c000, ${C.accent})`,
    color: C.accentDark,
    boxShadow: `0 3px 24px rgba(200,216,0,.4)`,
  },
  disabledBtn: {
    width: "100%",
    border: "none",
    borderRadius: 11,
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    fontWeight: 900,
    padding: 14,
    cursor: "not-allowed",
    letterSpacing: 1,
    background: "#161e06",
    color: "#2a3208",
  },
  rndBtn: (disabled: boolean): React.CSSProperties => ({
    width: "100%",
    background: "transparent",
    border: `1.5px solid ${disabled ? "#1a2535" : C.border}`,
    borderRadius: 11,
    color: disabled ? "#2a3a4a" : C.labelColor,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    padding: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .18s",
    letterSpacing: 0.8,
  }),

  // ── Misc ──
  divider: { height: 1, background: C.border, margin: "2px 0" },
  balRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balLbl: { fontSize: 12, color: C.labelColor, fontWeight: 700 },
  balVal: { fontSize: 13, fontWeight: 700, color: C.textPrimary },

  sectionBox: {
    background: C.surface,
    borderRadius: 9,
    padding: "10px 11px",
    border: `1.5px solid ${C.border}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: 7,
  },
  smallInput: {
    width: 50,
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.textPrimary,
    padding: "5px 7px",
    fontSize: 13,
    fontFamily: "'Rajdhani', sans-serif",
    outline: "none",
  },
  modeBtn: (active: boolean): React.CSSProperties => ({
    background: active ? "#1a4a7a" : C.bg,
    border: `1px solid ${active ? "#2a6aaa" : C.border}`,
    color: active ? "#90c8f0" : C.valueColor,
    padding: "5px 11px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    transition: ".18s",
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
  }),
};

const LeftPanel: React.FC<LeftPanelFullProps> = ({
  balance,
  bet,
  diff,
  gstate,
  curMult,
  curWin,
  onBetChange,
  onDiffChange,
  onStartGame,
  onCashOut,
  onRandom,
  auto,
  onAutoToggle,
  onAutoBetChange,
  onAutoDiffChange,
  onAutoSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const playing = gstate === "playing";
  const canCash = playing && curMult > 1;
  const isInfinite = auto.autoCount === 0;

  return (
    <div id="left-panel" style={S.panel}>
      {/* ── Tabs ── */}
      <div style={S.tabRow}>
        <button
          style={S.tab(activeTab === "manual")}
          onClick={() => setActiveTab("manual")}
        >
          Manual
        </button>
        <button
          style={S.tab(activeTab === "auto")}
          onClick={() => setActiveTab("auto")}
        >
          Auto
        </button>
      </div>

      {/* ══════════════ MANUAL ══════════════ */}
      {activeTab === "manual" && (
        <>
          {/* Bet */}
          <div style={S.fieldWrap}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Total Bet</span>
              <span style={S.lblRight}>{fmt(bet)}</span>
            </div>
            <div style={S.betRow}>
              <div style={{ ...S.inputBox(), flex: 1 }}>
                <input
                  style={S.input}
                  type="number"
                  value={bet}
                  min={0.01}
                  step={0.01}
                  disabled={playing}
                  onChange={(e) => onBetChange(parseFloat(e.target.value) || 0)}
                />
                <div style={S.coinIcon}>₿</div>
              </div>
              <button
                style={S.modBtn(playing)}
                disabled={playing}
                onClick={() =>
                  onBetChange(
                    Math.max(0.01, parseFloat((bet * 0.5).toFixed(2))),
                  )
                }
              >
                ½
              </button>
              <button
                style={S.modBtn(playing)}
                disabled={playing}
                onClick={() =>
                  onBetChange(Math.max(0.01, parseFloat((bet * 2).toFixed(2))))
                }
              >
                2×
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div style={S.fieldWrap}>
            <span style={S.lbl}>Difficulty</span>
            <div style={S.selectWrap}>
              <select
                style={S.select}
                value={diff}
                disabled={playing}
                onChange={(e) => onDiffChange(e.target.value as Difficulty)}
              >
                {DIFF_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span style={S.selectArrow}>▼</span>
            </div>
          </div>

          {/* Action */}
          {canCash ? (
            <button style={S.cashBtn} onClick={onCashOut}>
              💰 Cash Out {fmt(curWin)}
            </button>
          ) : playing ? (
            <button style={S.disabledBtn} disabled>
              Pick a tile...
            </button>
          ) : (
            <button style={S.betBtn} onClick={onStartGame}>
              Bet
            </button>
          )}

          {/* Random */}
          <button
            style={S.rndBtn(!playing)}
            disabled={!playing}
            onClick={onRandom}
          >
            Random Pick
          </button>

          {/* Profit */}
          <div style={S.fieldWrap}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Total Profit ({curMult.toFixed(2)}×)</span>
              <span
                style={{
                  ...S.lblRight,
                  color: curWin > 0 ? C.green : C.valueColor,
                }}
              >
                {fmt(curWin)}
              </span>
            </div>
            <div style={S.inputBox()}>
              <span style={{ ...S.input, cursor: "default" }}>
                {fmtBtc(curWin)}
              </span>
              <div style={S.coinIcon}>₿</div>
            </div>
          </div>

          <div style={S.divider} />

          <div style={S.balRow}>
            <span style={S.balLbl}>Balance</span>
            <span style={S.balVal}>{fmt(balance)}</span>
          </div>
        </>
      )}

      {/* ══════════════ AUTO ══════════════ */}
      {activeTab === "auto" && (
        <>
          {/* Bet */}
          <div style={S.fieldWrap}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Bet Amount</span>
              <span style={S.lblRight}>{fmt(auto.autoBet)}</span>
            </div>
            <div style={S.betRow}>
              <div style={{ ...S.inputBox(), flex: 1 }}>
                <input
                  style={S.input}
                  type="number"
                  value={auto.autoBet}
                  min={0.01}
                  step={0.01}
                  disabled={auto.autoRunning}
                  onChange={(e) =>
                    onAutoBetChange(parseFloat(e.target.value) || 0)
                  }
                />
                <div style={S.coinIcon}>₿</div>
              </div>
              <button
                style={S.modBtn(auto.autoRunning)}
                disabled={auto.autoRunning}
                onClick={() =>
                  onAutoBetChange(
                    Math.max(0.01, parseFloat((auto.autoBet * 0.5).toFixed(2))),
                  )
                }
              >
                ½
              </button>
              <button
                style={S.modBtn(auto.autoRunning)}
                disabled={auto.autoRunning}
                onClick={() =>
                  onAutoBetChange(
                    Math.max(0.01, parseFloat((auto.autoBet * 2).toFixed(2))),
                  )
                }
              >
                2×
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div style={S.fieldWrap}>
            <span style={S.lbl}>Difficulty</span>
            <div style={S.selectWrap}>
              <select
                style={S.select}
                value={auto.autoDiff}
                disabled={auto.autoRunning}
                onChange={(e) => onAutoDiffChange(e.target.value as Difficulty)}
              >
                {DIFF_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span style={S.selectArrow}>▼</span>
            </div>
          </div>

          {/* Number of bets */}
          <div style={S.fieldWrap}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Number of Bets</span>
              <span
                style={{
                  ...S.lblRight,
                  color: isInfinite ? C.gold : C.valueColor,
                }}
              >
                {isInfinite ? "∞ Infinite" : `${auto.autoCount} rounds`}
              </span>
            </div>
            <div style={S.inputBox()}>
              <input
                style={S.input}
                type="number"
                value={auto.autoCount}
                min={0}
                step={1}
                disabled={auto.autoRunning}
                placeholder="0 = infinite"
                onChange={(e) =>
                  onAutoSettingsChange({
                    autoCount: parseInt(e.target.value) || 0,
                  })
                }
              />
              {isInfinite ? (
                <span style={{ fontSize: 20, color: C.gold, flexShrink: 0 }}>
                  ∞
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    color: C.labelColor,
                    flexShrink: 0,
                    letterSpacing: 0.5,
                  }}
                >
                  RND
                </span>
              )}
            </div>
          </div>

          {/* Advanced toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={S.lbl}>Advanced Settings</span>
            <label className="auto-toggle">
              <input
                type="checkbox"
                checked={auto.autoAdvanced}
                onChange={(e) =>
                  onAutoSettingsChange({ autoAdvanced: e.target.checked })
                }
              />
              <span className="auto-slider"></span>
            </label>
          </div>

          {auto.autoAdvanced && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {/* On Win */}
              <div style={S.sectionBox}>
                <span style={S.lbl}>On Win</span>
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                    flexWrap: "wrap" as const,
                  }}
                >
                  <button
                    style={S.modeBtn(auto.onWinMode === "reset")}
                    onClick={() => onAutoSettingsChange({ onWinMode: "reset" })}
                  >
                    Reset
                  </button>
                  <button
                    style={S.modeBtn(auto.onWinMode === "increase")}
                    onClick={() =>
                      onAutoSettingsChange({ onWinMode: "increase" })
                    }
                  >
                    Increase
                  </button>
                  <span style={{ color: C.labelColor, fontSize: 12 }}>by</span>
                  <input
                    type="number"
                    value={auto.winInc}
                    min={0}
                    step={1}
                    style={{
                      ...S.smallInput,
                      opacity: auto.onWinMode === "reset" ? 0.35 : 1,
                    }}
                    disabled={auto.onWinMode === "reset"}
                    onChange={(e) =>
                      onAutoSettingsChange({
                        winInc: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span style={{ color: C.labelColor, fontSize: 12 }}>%</span>
                </div>
              </div>

              {/* On Loss */}
              <div style={S.sectionBox}>
                <span style={S.lbl}>On Loss</span>
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                    flexWrap: "wrap" as const,
                  }}
                >
                  <button
                    style={S.modeBtn(auto.onLossMode === "reset")}
                    onClick={() =>
                      onAutoSettingsChange({ onLossMode: "reset" })
                    }
                  >
                    Reset
                  </button>
                  <button
                    style={S.modeBtn(auto.onLossMode === "increase")}
                    onClick={() =>
                      onAutoSettingsChange({ onLossMode: "increase" })
                    }
                  >
                    Increase
                  </button>
                  <span style={{ color: C.labelColor, fontSize: 12 }}>by</span>
                  <input
                    type="number"
                    value={auto.lossInc}
                    min={0}
                    step={1}
                    style={{
                      ...S.smallInput,
                      opacity: auto.onLossMode === "reset" ? 0.35 : 1,
                    }}
                    disabled={auto.onLossMode === "reset"}
                    onChange={(e) =>
                      onAutoSettingsChange({
                        lossInc: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span style={{ color: C.labelColor, fontSize: 12 }}>%</span>
                </div>
              </div>

              {/* Stop conditions */}
              <div style={{ display: "flex", gap: 7 }}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={S.lbl}>Stop Profit ($)</span>
                  <div style={{ ...S.inputBox(), height: 38 }}>
                    <input
                      type="number"
                      value={auto.stopProfit}
                      min={0}
                      step={1}
                      style={{ ...S.input, fontSize: 13 }}
                      onChange={(e) =>
                        onAutoSettingsChange({
                          stopProfit: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={S.lbl}>Stop Loss ($)</span>
                  <div style={{ ...S.inputBox(), height: 38 }}>
                    <input
                      type="number"
                      value={auto.stopLoss}
                      min={0}
                      step={1}
                      style={{ ...S.input, fontSize: 13 }}
                      onChange={(e) =>
                        onAutoSettingsChange({
                          stopLoss: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start / Stop */}
          <button
            style={{
              width: "100%",
              border: "none",
              borderRadius: 11,
              fontFamily: "'Cinzel', serif",
              fontSize: 14,
              fontWeight: 900,
              padding: 13,
              cursor: "pointer",
              letterSpacing: 0.8,
              marginTop: 2,
              background: auto.autoRunning
                ? "linear-gradient(135deg, #7a1414, #4a0a0a)"
                : `linear-gradient(135deg, #a8c000, ${C.accent})`,
              color: auto.autoRunning ? "#ffaaaa" : C.accentDark,
              boxShadow: auto.autoRunning
                ? "0 3px 14px rgba(160,20,0,.3)"
                : "0 3px 18px rgba(200,216,0,.28)",
            }}
            onClick={onAutoToggle}
          >
            {auto.autoRunning ? "⏹ Stop Autobet" : "▶ Start Autobet"}
          </button>

          <div style={S.divider} />

          <div style={S.balRow}>
            <span style={S.balLbl}>Balance</span>
            <span style={S.balVal}>{fmt(balance)}</span>
          </div>
          <div style={S.balRow}>
            <span style={{ ...S.balLbl, color: "#3a6a8a" }}>
              Session Profit
            </span>
            <span
              style={{
                ...S.balVal,
                color: auto.autoTotalProfit >= 0 ? C.green : C.red,
              }}
            >
              {auto.autoTotalProfit >= 0 ? "+" : ""}
              {fmt(auto.autoTotalProfit)}
            </span>
          </div>

          {/* Live rounds indicator */}
          {auto.autoRunning && (
            <div
              style={{
                background: C.surface,
                borderRadius: 8,
                padding: "7px 12px",
                border: `1px solid rgba(200,164,74,0.18)`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={S.balLbl}>Rounds Left</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>
                {isInfinite ? "∞" : auto.autoCount}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeftPanel;
