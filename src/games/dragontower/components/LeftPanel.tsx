import React, { useState, useEffect } from "react";
import { Difficulty } from "../types";
import { useGameStore } from "../store/useGameStore";
import { MIN_BET, MAX_BET, DIFF } from "../constants";

interface LeftPanelProps {
  onDiffChange: (v: Difficulty) => void;
  onStartGame: () => void;
  onCashOut: () => void;
  onRandom: () => void;
  onAutoToggle: () => void;
}

const fmt = (v: number) =>
  "$" +
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizeBet = (
  raw: string,
): { value: number; display: string; valid: boolean } => {
  const stripped = raw.replace(/^0+(\d)/, "$1");
  const parsed = parseFloat(stripped);
  if (isNaN(parsed) || stripped.trim() === "" || parsed < MIN_BET) {
    return { value: 0, display: "0.00000000", valid: false };
  }
  const clamped = Math.min(parsed, MAX_BET);
  const fixed = parseFloat(clamped.toFixed(8));
  return { value: fixed, display: fixed.toFixed(8), valid: true };
};

const fmtBtc = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DIFF_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: "Expert", label: "Expert" },
  { value: "Master", label: "Master" },
];

// ── Color tokens matching screenshot ──
const C = {
  bg: "#1A191D", // panel background — near black
  surface: "#100F13", // input / card background
  border: "rgba(255,255,255,0.07)",
  borderFocus: "rgba(255,255,255,0.18)",
  tabBg: "#100F13", // inactive tab area
  tabActive: "#ffffff",
  tabInactive: "#4a5568",
  labelColor: "#B5B5B5",
  valueColor: "#B5B5B5",
  textPrimary: "#e2e8f0",
  textDim: "#8a9ab0",
  accent: "#eaff00", // lime/yellow — bet button
  accentDark: "#111200",
  btcOrange: "#f0a020",
  red: "#e84040",
  green: "#38d080",
  gold: "#c8a44a",
};

const S = {
  panel: {
    // width: 300,
    minWidth: 341,
    maxWidth: 341,
    flexShrink: 0,
    background: C.bg,
    flexDirection: "column" as const,
    borderRadius: "18px 0 0 18px",
    fontFamily: "'Rajdhani', sans-serif",
    color: C.textPrimary,
    padding: "14px 14px 20px",
    gap: 11,
    overflowY: "auto" as const,
    boxSizing: "border-box" as const,
    overflow: "hidden auto" as any,
  },

  // ── Tabs ──
  tabRow: {
    display: "flex",
    background: C.tabBg,
    borderRadius: 99,
    padding: 3,
    gap: 3,
  },
  tab: (active: boolean, disabled = false): React.CSSProperties => ({
    flex: 1,
    padding: "8px 0",
    border: "none",
    borderRadius: 99,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .18s",
    background: active ? C.tabActive : "transparent",
    color: active ? C.accentDark : disabled ? "#2a2e36" : C.tabInactive,
    letterSpacing: 0.5,
    opacity: disabled ? 0.4 : 1,
  }),

  // ── Generic ──
  fieldWrap: { display: "flex", flexDirection: "column" as const, gap: 5 },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  lbl: {
    fontSize: 13,
    color: C.labelColor,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  lblRight: {
    fontSize: 13,
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
    border: "none",
    borderLeft: `1px solid ${C.border}`,
    borderRadius: 0,
    color: C.valueColor,
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    padding: "0 10px",
    height: 44,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap" as const,
    transition: "all .15s",
    flexShrink: 0,
    textAlign: "center" as const,
    opacity: disabled ? 0.4 : 1,
  }),
  betRow: {
    display: "flex",
    gap: 0,
    width: "100%",
    boxSizing: "border-box" as const,
    background: C.surface,
    borderRadius: 9,
    border: `1.5px solid ${C.border}`,
    overflow: "hidden",
  },

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
    background: "#33333A",
    border: "none",
    borderRadius: 11,
    fontFamily: "'Poppins', sans-serif",
    fontSize: 16,
    fontWeight: 600,
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
  balLbl: { fontSize: 13, color: C.labelColor, fontWeight: 700 },
  balVal: { fontSize: 13, fontWeight: 700, color: C.textPrimary },

  sectionBox: {
    background: C.surface,
    borderRadius: 9,
    padding: "10px 11px",
    border: `1.5px solid ${C.border}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: 7,
    width: "100%",
    boxSizing: "border-box" as const,
    overflow: "hidden",
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
    background: active ? "rgb(51, 51, 58)" : C.bg,
    border: "none",
    color: C.textPrimary,
    padding: "5px 11px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    transition: ".18s",
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
  }),
};

const LeftPanel: React.FC<LeftPanelProps> = ({
  onDiffChange,
  onStartGame,
  onCashOut,
  onRandom,
  onAutoToggle,
}) => {
  // ── Read state from Zustand store ──
  const balance = useGameStore((s) => s.balance);
  const bet = useGameStore((s) => s.bet);
  const diff = useGameStore((s) => s.diff);
  const gstate = useGameStore((s) => s.gstate);
  const curMult = useGameStore((s) => s.curMult);
  const curWin = useGameStore((s) => s.curWin);
  const auto = useGameStore((s) => s.auto);
  const autoRunning = useGameStore((s) => s.autoRunning);
  const maxBetActive = useGameStore((s) => s.maxBet);
  const autoTotalProfit = useGameStore((s) => s.autoTotalProfit);
  const autoCount = useGameStore((s) => s.autoCount);

  const setBet = useGameStore((s) => s.setBet);
  const setDiff = useGameStore((s) => s.setDiff);
  const setAuto = useGameStore((s) => s.setAuto);

  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const [cooldown, setCooldown] = useState(false);
  const [betInputVal, setBetInputVal] = useState("0.00000000");
  const [betExceedsBalance, setBetExceedsBalance] = useState(false);
  const [autoBetInputVal, setAutoBetInputVal] = useState("0.00000000");
  const [autoBetExceedsBalance, setAutoBetExceedsBalance] = useState(false);
  const [betInvalid, setBetInvalid] = useState(false);
  const [autoBetInvalid, setAutoBetInvalid] = useState(false);
  const [betExceedsMax, setBetExceedsMax] = useState(false);
  const [autoBetExceedsMax, setAutoBetExceedsMax] = useState(false);

  const playing = gstate === "playing";
  const canCash = playing && curMult > 1;
  const isInfinite = auto.autoCount === 0;
  const [autoCashoutInput, setAutoCashoutInput] = useState("");
  const [autoCountInput, setAutoCountInput] = useState("");

  useEffect(() => {
    if (gstate !== "playing") {
      setCooldown(true);
      const timer = setTimeout(() => {
        setCooldown(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gstate]);

  useEffect(() => {
    setBetInputVal((v) => {
      const parsed = parseFloat(v);
      if (isNaN(parsed) || parsed === bet) return v;
      return bet === 0 ? "0.00000000" : bet.toFixed(8);
    });
  }, [bet]);

  useEffect(() => {
    setAutoBetInputVal((v) => {
      const parsed = parseFloat(v);
      if (isNaN(parsed) || parsed === auto.autoBet) return v;
      return auto.autoBet === 0 ? "0.00000000" : auto.autoBet.toFixed(8);
    });
  }, [auto.autoBet]);

  useEffect(() => {
    setAutoCashoutInput(
      auto.autoCashoutRow === 0 ? "" : String(auto.autoCashoutRow),
    );
  }, [auto.autoCashoutRow]);

  useEffect(() => {
    setAutoCountInput(auto.autoCount === 0 ? "" : String(auto.autoCount));
  }, [auto.autoCount]);

  const onBetChange = (v: number) => setBet(v);
  const onAutoSettingsChange = (s: Record<string, unknown>) =>
    setAuto(s as Record<string, never>);

  return (
    <div id="left-panel" style={S.panel}>
      {/* ── Tabs ── */}
      <div style={S.tabRow}>
        <button
          style={S.tab(activeTab === "manual", autoRunning)}
          disabled={autoRunning}
          onClick={() => {
            if (!autoRunning) setActiveTab("manual");
          }}
          title={autoRunning ? "Stop autoplay first" : undefined}
        >
          Manual
        </button>
        <button
          style={S.tab(activeTab === "auto", playing)}
          disabled={playing}
          onClick={() => {
            if (!playing) setActiveTab("auto");
          }}
          title={playing ? "Finish the current manual round first" : undefined}
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
              <div
                style={{
                  ...S.inputBox(),
                  flex: 1,
                  border: "none",
                  borderColor:
                    betExceedsBalance || betInvalid || betExceedsMax
                      ? "#e84040"
                      : undefined,
                  outline:
                    betExceedsBalance || betInvalid || betExceedsMax
                      ? "1.5px solid #e84040"
                      : "none",
                  borderRadius: 0,
                  background: "transparent",
                }}
              >
                <input
                  style={S.input}
                  type="number"
                  value={betInputVal}
                  min={0.01}
                  step={0.01}
                  disabled={playing || autoRunning}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setBetInputVal(raw);
                    const parsed = parseFloat(raw);
                    if (!isNaN(parsed) && parsed >= MIN_BET) {
                      const exceedsBalance =
                        parseFloat(parsed.toFixed(8)) >
                        parseFloat(balance.toFixed(8));
                      const exceedsMax = parsed > MAX_BET;
                      setBetExceedsBalance(exceedsBalance);
                      setBetExceedsMax(exceedsMax);
                      setBetInvalid(false);
                      if (!exceedsBalance && !exceedsMax) onBetChange(parsed);
                    } else {
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                    }
                  }}
                  onBlur={() => {
                    const { value, display, valid } = normalizeBet(betInputVal);
                    if (!valid) {
                      setBetInputVal("0.00000000");
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                      onBetChange(0);
                    } else {
                      const clamped = Math.min(
                        parseFloat(value.toFixed(8)) <=
                          parseFloat(balance.toFixed(8))
                          ? value
                          : balance,
                        MAX_BET,
                      );
                      setBetInputVal(clamped.toFixed(8));
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                      onBetChange(clamped);
                    }
                  }}
                />
                <div style={S.coinIcon}>₿</div>
              </div>
              <button
                style={S.modBtn(playing || autoRunning)}
                disabled={playing || autoRunning}
                onClick={() => {
                  const next = Math.max(
                    0.01,
                    parseFloat((bet * 0.5).toFixed(8)),
                  );
                  onBetChange(next);
                  setBetInputVal(next.toFixed(8));
                  setBetExceedsBalance(false);
                }}
              >
                ½
              </button>
              <button
                style={S.modBtn(playing || autoRunning)}
                disabled={playing || autoRunning}
                onClick={() => {
                  const next = parseFloat((bet * 2).toFixed(8));
                  const exceeds = next > balance;
                  setBetExceedsBalance(exceeds);
                  if (!exceeds) {
                    onBetChange(next);
                    setBetInputVal(next.toFixed(8));
                  }
                }}
              >
                2×
              </button>
              {maxBetActive && (
                <button
                  style={S.modBtn(playing || autoRunning)}
                  disabled={playing || autoRunning}
                  onClick={() => {
                    const maxVal = Math.min(balance, MAX_BET);
                    onBetChange(maxVal);
                    setBetInputVal(maxVal.toFixed(8));
                    setBetExceedsBalance(false);
                    setBetExceedsMax(false);
                  }}
                >
                  Max
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim }}>
                Min: {MIN_BET.toFixed(8)}
              </span>
              <span style={{ fontSize: 11, color: C.textDim }}>
                Max: {MAX_BET.toLocaleString()}
              </span>
            </div>
            {betExceedsBalance && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Can't bet more than your balance!
                </span>
              </div>
            )}
            {betExceedsMax && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Max bet is {MAX_BET.toLocaleString()}!
                </span>
              </div>
            )}
            {betInvalid && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Enter a valid bet amount!
                </span>
              </div>
            )}
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
            <button
              style={cooldown ? S.disabledBtn : S.betBtn}
              onClick={onStartGame}
              disabled={cooldown}
            >
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
            <div
              style={{ ...S.inputBox(), background: "#33333A", border: "none" }}
            >
              <span style={{ ...S.input, cursor: "default" }}>
                {fmt(curWin)}
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
              <div
                style={{
                  ...S.inputBox(),
                  flex: 1,
                  border: "none",
                  borderColor:
                    autoBetExceedsBalance || autoBetInvalid || autoBetExceedsMax
                      ? "#e84040"
                      : undefined,
                  outline:
                    autoBetExceedsBalance || autoBetInvalid || autoBetExceedsMax
                      ? "1.5px solid #e84040"
                      : "none",
                  borderRadius: 0,
                  background: "transparent",
                }}
              >
                <input
                  style={S.input}
                  type="number"
                  value={autoBetInputVal}
                  min={0.01}
                  step={0.01}
                  disabled={autoRunning}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setAutoBetInputVal(raw);
                    const parsed = parseFloat(raw);
                    if (!isNaN(parsed) && parsed >= MIN_BET) {
                      const exceedsBalance =
                        parseFloat(parsed.toFixed(8)) >
                        parseFloat(balance.toFixed(8));
                      const exceedsMax = parsed > MAX_BET;
                      setAutoBetExceedsBalance(exceedsBalance);
                      setAutoBetExceedsMax(exceedsMax);
                      setAutoBetInvalid(false);
                      if (!exceedsBalance && !exceedsMax)
                        setAuto({ autoBet: parsed });
                    } else {
                      setAutoBetExceedsBalance(false);
                      setAutoBetExceedsMax(false);
                      setAutoBetInvalid(false);
                    }
                  }}
                  onBlur={() => {
                    const { value, display, valid } =
                      normalizeBet(autoBetInputVal);
                    if (!valid) {
                      setAutoBetInputVal("0.00000000");
                      setAutoBetExceedsBalance(false);
                      setAutoBetExceedsMax(false);
                      setAutoBetInvalid(false);
                      setAuto({ autoBet: 0 });
                    } else {
                      const clamped = Math.min(
                        parseFloat(value.toFixed(8)) <=
                          parseFloat(balance.toFixed(8))
                          ? value
                          : balance,
                        MAX_BET,
                      );
                      setAutoBetInputVal(clamped.toFixed(8));
                      setAutoBetExceedsBalance(false);
                      setAutoBetExceedsMax(false);
                      setAutoBetInvalid(false);
                      setAuto({ autoBet: clamped });
                    }
                  }}
                />
                <div style={S.coinIcon}>₿</div>
              </div>
              <button
                style={S.modBtn(autoRunning)}
                disabled={autoRunning}
                onClick={() => {
                  const next = Math.max(
                    0.01,
                    parseFloat((auto.autoBet * 0.5).toFixed(8)),
                  );
                  setAuto({ autoBet: next });
                  setAutoBetInputVal(next.toFixed(8));
                  setAutoBetExceedsBalance(false);
                }}
              >
                ½
              </button>
              <button
                style={S.modBtn(autoRunning)}
                disabled={autoRunning}
                onClick={() => {
                  const next = parseFloat((auto.autoBet * 2).toFixed(8));
                  const exceeds = next > balance;
                  setAutoBetExceedsBalance(exceeds);
                  if (!exceeds) {
                    setAuto({ autoBet: next });
                    setAutoBetInputVal(next.toFixed(8));
                  }
                }}
              >
                2×
              </button>
              {maxBetActive && (
                <button
                  style={S.modBtn(autoRunning)}
                  disabled={autoRunning}
                  onClick={() => {
                    const maxVal = Math.min(balance, MAX_BET);
                    setAuto({ autoBet: maxVal });
                    setAutoBetInputVal(maxVal.toFixed(8));
                    setAutoBetExceedsBalance(false);
                    setAutoBetExceedsMax(false);
                  }}
                >
                  Max
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim }}>
                Min: {MIN_BET.toFixed(8)}
              </span>
              <span style={{ fontSize: 11, color: C.textDim }}>
                Max: {MAX_BET.toLocaleString()}
              </span>
            </div>
            {autoBetExceedsBalance && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Can't bet more than your balance!
                </span>
              </div>
            )}
            {autoBetExceedsMax && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Max bet is {MAX_BET.toLocaleString()}!
                </span>
              </div>
            )}
            {autoBetInvalid && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span style={{ color: "#e84040", fontSize: 12 }}>⚠</span>
                <span
                  style={{
                    color: "#e84040",
                    fontSize: 12,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Enter a valid bet amount!
                </span>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div style={S.fieldWrap}>
            <span style={S.lbl}>Difficulty</span>
            <div style={S.selectWrap}>
              <select
                style={S.select}
                value={auto.autoDiff}
                disabled={autoRunning}
                onChange={(e) => {
                  const v = e.target.value as Difficulty;
                  setAuto({ autoDiff: v });
                  onDiffChange(v);
                }}
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

          {/* Auto Cashout Row */}
          {(() => {
            const maxRow = DIFF[auto.autoDiff]?.rows ?? 9;
            return (
              <div style={S.fieldWrap}>
                <div style={S.rowBetween}>
                  <span style={S.lbl}>Auto Cashout At Row</span>
                  <span
                    style={{
                      ...S.lblRight,
                      color: auto.autoCashoutRow === 0 ? C.textDim : C.gold,
                    }}
                  >
                    {auto.autoCashoutRow === 0
                      ? "Disabled"
                      : `Row ${auto.autoCashoutRow} / ${maxRow}`}
                  </span>
                </div>
                <div style={S.inputBox()}>
                  <input
                    style={S.input}
                    type="number"
                    value={autoCashoutInput}
                    min={0}
                    max={maxRow}
                    step={1}
                    disabled={autoRunning}
                    placeholder={`0 = disabled (max ${maxRow})`}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || raw === "0") {
                        setAutoCashoutInput(raw);
                        onAutoSettingsChange({ autoCashoutRow: 0 });
                        return;
                      }
                      if (!/^\d+$/.test(raw)) return;
                      const parsed = parseInt(raw, 10);
                      if (isNaN(parsed)) return;
                      const clamped = Math.min(parsed, maxRow);
                      setAutoCashoutInput(String(clamped));
                      onAutoSettingsChange({ autoCashoutRow: clamped });
                    }}
                    onBlur={() => {
                      if (autoCashoutInput === "" || autoCashoutInput === "0") {
                        setAutoCashoutInput("");
                        onAutoSettingsChange({ autoCashoutRow: 0 });
                      } else {
                        const parsed = parseInt(autoCashoutInput, 10);
                        const clamped = isNaN(parsed)
                          ? 0
                          : Math.min(Math.max(0, parsed), maxRow);
                        setAutoCashoutInput(
                          clamped === 0 ? "" : String(clamped),
                        );
                        onAutoSettingsChange({ autoCashoutRow: clamped });
                      }
                    }}
                  />
                  <span
                    style={{ fontSize: 11, color: C.labelColor, flexShrink: 0 }}
                  >
                    / {maxRow}
                  </span>
                </div>
              </div>
            );
          })()}

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
                {isInfinite
                  ? "∞ Infinite"
                  : `${auto.autoCount} ${auto.autoCount === 1 ? "round" : "rounds"}`}
              </span>
            </div>
            <div style={S.inputBox()}>
              <input
                style={S.input}
                type="number"
                value={autoCountInput}
                min={0}
                step={1}
                disabled={autoRunning}
                placeholder="0 = infinite"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || raw === "0") {
                    setAutoCountInput(raw);
                    onAutoSettingsChange({ autoCount: 0 });
                    return;
                  }
                  if (!/^\d+$/.test(raw)) return;
                  const parsed = parseInt(raw, 10);
                  if (isNaN(parsed)) return;
                  setAutoCountInput(String(parsed));
                  onAutoSettingsChange({ autoCount: parsed });
                }}
                onBlur={() => {
                  if (autoCountInput === "" || autoCountInput === "0") {
                    setAutoCountInput("");
                    onAutoSettingsChange({ autoCount: 0 });
                  } else {
                    const parsed = parseInt(autoCountInput, 10);
                    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
                    setAutoCountInput(val === 0 ? "" : String(val));
                    onAutoSettingsChange({ autoCount: val });
                  }
                }}
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
            <label
              className="auto-toggle"
              style={{
                opacity: autoRunning ? 0.4 : 1,
                pointerEvents: autoRunning ? "none" : "auto",
              }}
            >
              <input
                type="checkbox"
                checked={auto.autoAdvanced}
                disabled={autoRunning}
                onChange={(e) =>
                  onAutoSettingsChange({ autoAdvanced: e.target.checked })
                }
              />
              <span className="auto-slider"></span>
            </label>
          </div>

          {auto.autoAdvanced && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* On Win */}
              <div style={S.sectionBox}>
                <span style={S.lbl}>On Win</span>
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                    flexWrap: "wrap" as const,
                    width: "100%",
                    boxSizing: "border-box" as const,
                  }}
                >
                  <button
                    style={{
                      ...S.modeBtn(auto.onWinMode === "reset"),
                      opacity: autoRunning ? 0.4 : 1,
                    }}
                    disabled={autoRunning}
                    onClick={() => onAutoSettingsChange({ onWinMode: "reset" })}
                  >
                    Reset
                  </button>
                  <button
                    style={{
                      ...S.modeBtn(auto.onWinMode === "increase"),
                      opacity: autoRunning ? 0.4 : 1,
                    }}
                    disabled={autoRunning}
                    onClick={() =>
                      onAutoSettingsChange({ onWinMode: "increase" })
                    }
                  >
                    Increase
                  </button>
                  <span style={{ color: C.labelColor, fontSize: 13 }}>by</span>
                  <input
                    type="number"
                    value={auto.winInc === 0 ? "" : auto.winInc}
                    min={0}
                    step={1}
                    placeholder="0"
                    style={{
                      ...S.smallInput,
                      opacity:
                        autoRunning || auto.onWinMode === "reset" ? 0.35 : 1,
                    }}
                    disabled={autoRunning || auto.onWinMode === "reset"}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!/^\d*\.?\d*$/.test(raw)) return;
                      onAutoSettingsChange({
                        winInc: raw === "" ? 0 : parseFloat(raw) || 0,
                      });
                    }}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value);
                      onAutoSettingsChange({
                        winInc: isNaN(parsed) ? 0 : Math.max(0, parsed),
                      });
                    }}
                  />
                  <span style={{ color: C.labelColor, fontSize: 13 }}>%</span>
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
                    width: "100%",
                    boxSizing: "border-box" as const,
                  }}
                >
                  <button
                    style={{
                      ...S.modeBtn(auto.onLossMode === "reset"),
                      opacity: autoRunning ? 0.4 : 1,
                    }}
                    disabled={autoRunning}
                    onClick={() =>
                      onAutoSettingsChange({ onLossMode: "reset" })
                    }
                  >
                    Reset
                  </button>
                  <button
                    style={{
                      ...S.modeBtn(auto.onLossMode === "increase"),
                      opacity: autoRunning ? 0.4 : 1,
                    }}
                    disabled={autoRunning}
                    onClick={() =>
                      onAutoSettingsChange({ onLossMode: "increase" })
                    }
                  >
                    Increase
                  </button>
                  <span style={{ color: C.labelColor, fontSize: 13 }}>by</span>
                  <input
                    type="number"
                    value={auto.lossInc === 0 ? "" : auto.lossInc}
                    min={0}
                    step={1}
                    placeholder="0"
                    style={{
                      ...S.smallInput,
                      opacity:
                        autoRunning || auto.onLossMode === "reset" ? 0.35 : 1,
                    }}
                    disabled={autoRunning || auto.onLossMode === "reset"}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!/^\d*\.?\d*$/.test(raw)) return;
                      onAutoSettingsChange({
                        lossInc: raw === "" ? 0 : parseFloat(raw) || 0,
                      });
                    }}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value);
                      onAutoSettingsChange({
                        lossInc: isNaN(parsed) ? 0 : Math.max(0, parsed),
                      });
                    }}
                  />
                  <span style={{ color: C.labelColor, fontSize: 13 }}>%</span>
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
                      value={auto.stopProfit === 0 ? "" : auto.stopProfit}
                      min={0}
                      step={1}
                      disabled={autoRunning}
                      placeholder="0"
                      style={{
                        ...S.input,
                        fontSize: 13,
                        opacity: autoRunning ? 0.4 : 1,
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^\d*\.?\d*$/.test(raw)) return;
                        onAutoSettingsChange({
                          stopProfit: raw === "" ? 0 : parseFloat(raw) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const parsed = parseFloat(e.target.value);
                        onAutoSettingsChange({
                          stopProfit: isNaN(parsed) ? 0 : Math.max(0, parsed),
                        });
                      }}
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
                      value={auto.stopLoss === 0 ? "" : auto.stopLoss}
                      min={0}
                      step={1}
                      disabled={autoRunning}
                      placeholder="0"
                      style={{
                        ...S.input,
                        fontSize: 13,
                        opacity: autoRunning ? 0.4 : 1,
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^\d*\.?\d*$/.test(raw)) return;
                        onAutoSettingsChange({
                          stopLoss: raw === "" ? 0 : parseFloat(raw) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const parsed = parseFloat(e.target.value);
                        onAutoSettingsChange({
                          stopLoss: isNaN(parsed) ? 0 : Math.max(0, parsed),
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stop condition warning */}
          {!autoRunning && !auto.autoAdvanced && auto.autoCount === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "#c8a44a", fontSize: 11 }}>⚠</span>
              <span
                style={{
                  color: "#c8a44a",
                  fontSize: 11,
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                }}
              >
                No stop condition set — will run infinitely.
              </span>
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
              cursor:
                playing || autoRunning
                  ? autoRunning
                    ? "pointer"
                    : "not-allowed"
                  : "pointer",
              letterSpacing: 0.8,
              marginTop: 2,
              background: autoRunning
                ? "linear-gradient(135deg, #7a1414, #4a0a0a)"
                : playing
                  ? "#161e06"
                  : `linear-gradient(135deg, #a8c000, ${C.accent})`,
              color: autoRunning
                ? "#ffaaaa"
                : playing
                  ? "#2a3208"
                  : C.accentDark,
              boxShadow: autoRunning
                ? "0 3px 14px rgba(160,20,0,.3)"
                : playing
                  ? "none"
                  : "0 3px 18px rgba(200,216,0,.28)",
              opacity: playing && !autoRunning ? 0.5 : 1,
            }}
            disabled={
              (playing && !autoRunning) ||
              (!autoRunning &&
                (auto.autoBet < MIN_BET ||
                  autoBetExceedsBalance ||
                  autoBetInvalid))
            }
            onClick={() => {
              if (
                !autoRunning &&
                (auto.autoBet < MIN_BET ||
                  autoBetExceedsBalance ||
                  autoBetInvalid)
              )
                return;
              onAutoToggle();
            }}
            title={
              playing && !autoRunning
                ? "Finish the current manual round first"
                : !autoRunning && auto.autoBet < MIN_BET
                  ? "Enter a valid bet amount to start autoplay"
                  : autoRunning
                    ? "Stops after current round resolves"
                    : undefined
            }
          >
            {autoRunning ? "⏹ Stop Autobet" : "▶ Start Autobet"}
          </button>

          <div style={S.divider} />

          <div style={S.balRow}>
            <span style={S.balLbl}>Balance</span>
            <span style={S.balVal}>{fmt(balance)}</span>
          </div>
          {autoRunning && (
            <div style={S.balRow}>
              <span style={{ ...S.balLbl, color: "#3a6a8a" }}>
                Session Profit
              </span>
              <span
                style={{
                  ...S.balVal,
                  color: autoTotalProfit >= 0 ? C.green : C.red,
                }}
              >
                {autoTotalProfit >= 0 ? "+" : ""}
                {fmt(autoTotalProfit)}
              </span>
            </div>
          )}

          {/* Live rounds indicator */}
          {autoRunning && (
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
                {isInfinite ? "∞" : autoCount}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeftPanel;
