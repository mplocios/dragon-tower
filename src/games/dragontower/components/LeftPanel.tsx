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
  onTabChange?: (tab: "manual" | "auto") => void;
  onPatternClear?: () => void;
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
    return { value: 0, display: "0.00", valid: false };
  }
  const clamped = Math.min(parsed, MAX_BET);
  const fixed = parseFloat(clamped.toFixed(2));
  return { value: fixed, display: fixed.toFixed(2), valid: true };
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
  tabInactive: "#9ca3af",
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
    maxWidth: "22.3%",
    flexShrink: 0,
    background: C.bg,
    flexDirection: "column" as const,
    borderRadius: "18px 0 0 18px",
    fontFamily: "'Poppins', sans-serif",
    color: C.textPrimary,
    padding: "10px 12px 12px",
    gap: 7,
    boxSizing: "border-box" as const,
    overflowX: "hidden" as const,
    overflowY: "auto" as const,
    scrollbarGutter: "stable" as const,
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
    fontFamily: "'Poppins', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .18s",
    background: active ? C.tabActive : "transparent",
    color: active ? C.accentDark : disabled ? "#555d6a" : C.tabInactive,
    letterSpacing: 0.5,
    opacity: disabled ? 0.4 : 1,
  }),

  // ── Generic ──
  fieldWrap: { display: "flex", flexDirection: "column" as const, gap: 5 },
  fieldWrapDisabled: (disabled: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column" as const,
    gap: 5,
    opacity: disabled ? 0.35 : 1,
    pointerEvents: disabled ? ("none" as const) : ("auto" as const),
    transition: "opacity .15s",
  }),
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
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
    padding: "7px 10px",
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
    fontFamily: "'Poppins', sans-serif",
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
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
  }),
};

const NumberInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}> = ({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder,
  step = 1,
  min = 0,
  max,
  style,
  inputStyle,
}) => {
  const handleUp = () => {
    const parsed = parseFloat(value) || 0;
    const next = parseFloat((parsed + step).toFixed(2));
    if (max !== undefined && next > max) return;
    onChange(next.toFixed(2));
  };
  const handleDown = () => {
    const parsed = parseFloat(value) || 0;
    const next = parseFloat((parsed - step).toFixed(2));
    if (next < min) return;
    onChange(next.toFixed(2));
  };
  return (
    <div
      className="number-input-wrap"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        alignSelf: "stretch",
        ...style,
      }}
    >
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          flex: 1,
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#e2e8f0",
          fontFamily: "'Poppins', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          paddingRight: 30,
          ...inputStyle,
        }}
      />
      <div
        className="number-input-arrows"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          padding: "4px 0",
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!disabled) handleUp();
          }}
          disabled={disabled}
          style={{
            flex: 1,
            width: 26,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0 3px 0 0",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            color: "#9ca3af",
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          ▲
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!disabled) handleDown();
          }}
          disabled={disabled}
          style={{
            flex: 1,
            width: 26,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0 0 3px 0",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            color: "#9ca3af",
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
};

const LeftPanel: React.FC<LeftPanelProps> = ({
  onDiffChange,
  onStartGame,
  onCashOut,
  onRandom,
  onAutoToggle,
  onTabChange,
  onPatternClear,
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
  const autoPattern = useGameStore((s) => s.autoPattern);
  const clearAutoPattern = useGameStore((s) => s.clearAutoPattern);

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
      return bet === 0 ? "0.00" : bet.toFixed(2);
    });
  }, [bet]);

  useEffect(() => {
    setAutoBetInputVal((v) => {
      const parsed = parseFloat(v);
      if (isNaN(parsed) || parsed === auto.autoBet) return v;
      return auto.autoBet === 0 ? "0.00" : auto.autoBet.toFixed(2);
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
            if (!autoRunning) {
              setActiveTab("manual");
              onTabChange?.("manual");
            }
          }}
          title={autoRunning ? "Stop autoplay first" : undefined}
        >
          Manual
        </button>
        <button
          style={S.tab(activeTab === "auto", playing)}
          disabled={playing}
          onClick={() => {
            if (!playing) {
              setActiveTab("auto");
              onTabChange?.("auto");
            }
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
          <div style={S.fieldWrapDisabled(playing || autoRunning)}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Bet</span>
              <span style={S.lblRight}>Balance: {fmt(balance)}</span>
            </div>
            <div style={S.betRow}>
              <div
                style={{
                  ...S.inputBox(),
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
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
                <NumberInput
                  value={betInputVal}
                  step={0.01}
                  min={MIN_BET}
                  max={Math.min(MAX_BET, balance)}
                  disabled={playing || autoRunning}
                  inputStyle={{ fontSize: 15 }}
                  onChange={(raw) => {
                    // Block more than 2 decimal places
                    const dotIdx = raw.indexOf('.');
                    if (dotIdx !== -1 && raw.length - dotIdx - 1 > 2) return;
                    setBetInputVal(raw);
                    const parsed = parseFloat(raw);
                    if (!isNaN(parsed) && parsed >= MIN_BET) {
                      const rounded = parseFloat(parsed.toFixed(2));
                      const exceedsBalance =
                        rounded > parseFloat(balance.toFixed(2));
                      const exceedsMax = rounded > MAX_BET;
                      setBetExceedsBalance(exceedsBalance);
                      setBetExceedsMax(exceedsMax);
                      setBetInvalid(false);
                      if (!exceedsBalance && !exceedsMax) onBetChange(rounded);
                    } else {
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                    }
                  }}
                  onBlur={() => {
                    const { value, display, valid } = normalizeBet(betInputVal);
                    if (!valid) {
                      setBetInputVal("0.00");
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                      onBetChange(0);
                    } else {
                      const clamped = Math.min(
                        parseFloat(value.toFixed(2)) <=
                          parseFloat(balance.toFixed(2))
                          ? value
                          : balance,
                        MAX_BET,
                      );
                      setBetInputVal(clamped.toFixed(2));
                      setBetExceedsBalance(false);
                      setBetExceedsMax(false);
                      setBetInvalid(false);
                      onBetChange(clamped);
                    }
                  }}
                />
              </div>
              <button
                style={S.modBtn(playing || autoRunning)}
                disabled={playing || autoRunning}
                onClick={() => {
                  if (bet <= 0) return;
                  const next = parseFloat((bet * 0.5).toFixed(2));
                  if (next < MIN_BET) return;
                  if (next > balance) return;
                  onBetChange(next);
                  setBetInputVal(next.toFixed(2));
                  setBetExceedsBalance(false);
                }}
              >
                ½
              </button>
              <button
                style={S.modBtn(playing || autoRunning)}
                disabled={playing || autoRunning}
                onClick={() => {
                  const next = parseFloat((bet * 2).toFixed(2));
                  const exceedsBalance = next > balance;
                  const exceedsMax = next > MAX_BET;
                  setBetExceedsBalance(exceedsBalance);
                  setBetExceedsMax(exceedsMax);
                  if (!exceedsBalance && !exceedsMax) {
                    onBetChange(next);
                    setBetInputVal(next.toFixed(2));
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
                    setBetInputVal(maxVal.toFixed(2));
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
                Min: {MIN_BET.toFixed(2)}
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
                    fontFamily: "'Poppins', sans-serif",
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
                    fontFamily: "'Poppins', sans-serif",
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
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Enter a valid bet amount!
                </span>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div style={S.fieldWrapDisabled(playing)}>
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
              style={cooldown || betExceedsBalance || betExceedsMax || betInvalid || bet < MIN_BET || bet > MAX_BET ? S.disabledBtn : S.betBtn}
              onClick={onStartGame}
              disabled={cooldown || betExceedsBalance || betExceedsMax || betInvalid || bet < MIN_BET || bet > MAX_BET}
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
        </>
      )}

      {/* ══════════════ AUTO ══════════════ */}
      {activeTab === "auto" && (
        <>
          {/* Bet */}
          <div style={S.fieldWrapDisabled(autoRunning)}>
            <div style={S.rowBetween}>
              <span style={S.lbl}>Bet</span>
              <span style={S.lblRight}>Balance: {fmt(balance)}</span>
            </div>
            <div style={S.betRow}>
              <div
                style={{
                  ...S.inputBox(),
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
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
                <NumberInput
                  value={autoBetInputVal}
                  step={0.01}
                  min={MIN_BET}
                  max={Math.min(MAX_BET, balance)}
                  disabled={autoRunning}
                  inputStyle={{ fontSize: 15 }}
                  onChange={(raw) => {
                    // Block more than 2 decimal places
                    const dotIdx = raw.indexOf('.');
                    if (dotIdx !== -1 && raw.length - dotIdx - 1 > 2) return;
                    setAutoBetInputVal(raw);
                    const parsed = parseFloat(raw);
                    if (!isNaN(parsed) && parsed >= MIN_BET) {
                      const rounded = parseFloat(parsed.toFixed(2));
                      const exceedsBalance =
                        rounded > parseFloat(balance.toFixed(2));
                      const exceedsMax = rounded > MAX_BET;
                      setAutoBetExceedsBalance(exceedsBalance);
                      setAutoBetExceedsMax(exceedsMax);
                      setAutoBetInvalid(false);
                      if (!exceedsBalance && !exceedsMax)
                        setAuto({ autoBet: rounded });
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
                      setAutoBetInputVal("0.00");
                      setAutoBetExceedsBalance(false);
                      setAutoBetExceedsMax(false);
                      setAutoBetInvalid(false);
                      setAuto({ autoBet: 0 });
                    } else {
                      const clamped = Math.min(
                        parseFloat(value.toFixed(2)) <=
                          parseFloat(balance.toFixed(2))
                          ? value
                          : balance,
                        MAX_BET,
                      );
                      setAutoBetInputVal(clamped.toFixed(2));
                      setAutoBetExceedsBalance(false);
                      setAutoBetExceedsMax(false);
                      setAutoBetInvalid(false);
                      setAuto({ autoBet: clamped });
                    }
                  }}
                />
              </div>
              <button
                style={S.modBtn(autoRunning)}
                disabled={autoRunning}
                onClick={() => {
                  if (auto.autoBet <= 0) return;
                  const next = parseFloat((auto.autoBet * 0.5).toFixed(2));
                  if (next < MIN_BET) return;
                  if (next > balance) return;
                  setAuto({ autoBet: next });
                  setAutoBetInputVal(next.toFixed(2));
                  setAutoBetExceedsBalance(false);
                }}
              >
                ½
              </button>
              <button
                style={S.modBtn(autoRunning)}
                disabled={autoRunning}
                onClick={() => {
                  const next = parseFloat((auto.autoBet * 2).toFixed(2));
                  const exceedsBalance = next > balance;
                  const exceedsMax = next > MAX_BET;
                  setAutoBetExceedsBalance(exceedsBalance);
                  setAutoBetExceedsMax(exceedsMax);
                  if (!exceedsBalance && !exceedsMax) {
                    setAuto({ autoBet: next });
                    setAutoBetInputVal(next.toFixed(2));
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
                    setAutoBetInputVal(maxVal.toFixed(2));
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
                Min: {MIN_BET.toFixed(2)}
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
                    fontFamily: "'Poppins', sans-serif",
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
                    fontFamily: "'Poppins', sans-serif",
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
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Enter a valid bet amount!
                </span>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div style={S.fieldWrapDisabled(autoRunning)}>
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
          {true &&
            (() => {
              const maxRow = DIFF[auto.autoDiff]?.rows ?? 9;
              const hasPattern = autoPattern.some((c) => c !== null);
              return (
                <div
                  style={{ ...S.fieldWrapDisabled(autoRunning || hasPattern) }}
                >
                  <div style={S.rowBetween}>
                    <span style={S.lbl}>Auto Cashout At Row</span>
                    <span
                      style={{
                        ...S.lblRight,
                        color: hasPattern
                          ? C.textDim
                          : auto.autoCashoutRow === 0
                            ? C.textDim
                            : C.gold,
                      }}
                    >
                      {hasPattern
                        ? "Pattern active"
                        : auto.autoCashoutRow === 0
                          ? "Disabled"
                          : `Row ${auto.autoCashoutRow} / ${maxRow}`}
                    </span>
                  </div>
                  <div style={S.inputBox()}>
                    <NumberInput
                      value={hasPattern ? "" : autoCashoutInput}
                      step={1}
                      min={0}
                      disabled={autoRunning || hasPattern}
                      placeholder={hasPattern ? "0" : `0`}
                      inputStyle={{ fontSize: 15 }}
                      onChange={(raw) => {
                        if (raw === "" || raw === "0") {
                          setAutoCashoutInput(raw);
                          onAutoSettingsChange({ autoCashoutRow: 0 });
                          return;
                        }
                        const parsed = parseInt(parseFloat(raw).toString(), 10);
                        if (isNaN(parsed) || parsed < 0) return;
                        const clamped = Math.min(parsed, maxRow);
                        setAutoCashoutInput(String(clamped));
                        onAutoSettingsChange({ autoCashoutRow: clamped });
                      }}
                      onBlur={() => {
                        if (
                          autoCashoutInput === "" ||
                          autoCashoutInput === "0"
                        ) {
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
                      style={{
                        fontSize: 11,
                        color: C.labelColor,
                        flexShrink: 0,
                      }}
                    >
                      / {maxRow}
                    </span>
                  </div>
                </div>
              );
            })()}

          {/* Number of bets */}
          <div style={S.fieldWrapDisabled(autoRunning)}>
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
              <NumberInput
                value={autoCountInput}
                step={1}
                min={0}
                disabled={autoRunning}
                placeholder="0"
                inputStyle={{ fontSize: 15 }}
                onChange={(raw) => {
                  if (raw === "" || raw === "0") {
                    setAutoCountInput(raw);
                    onAutoSettingsChange({ autoCount: 0 });
                    return;
                  }
                  // Accept integers or decimal strings from arrows (e.g. "1.00")
                  const parsed = parseInt(parseFloat(raw).toString(), 10);
                  if (isNaN(parsed) || parsed < 0) return;
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
                  {/* RND */}
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
                opacity: autoRunning ? 0.35 : 1,
                pointerEvents: autoRunning ? "none" : "auto",
                transition: "opacity .15s",
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
                    type="text"
                    inputMode="numeric"
                    value={auto.winInc === 0 ? "" : auto.winInc}
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
                    type="text"
                    inputMode="numeric"
                    value={auto.lossInc === 0 ? "" : auto.lossInc}
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
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={S.lbl}>Stop Profit ($)</span>
                  <div style={{ ...S.inputBox(), height: 38 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={auto.stopProfit === 0 ? "" : auto.stopProfit}
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
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={S.lbl}>Stop Loss ($)</span>
                  <div style={{ ...S.inputBox(), height: 38 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={auto.stopLoss === 0 ? "" : auto.stopLoss}
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
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                }}
              >
                No stop condition set — will run infinitely.
              </span>
            </div>
          )}

          {/* Pattern indicator */}
          {/* Pattern indicator — hidden for now
          {(() => {
            const selectedRows = autoPattern.filter((c) => c !== null).length;
            if (selectedRows > 0) {
              return (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(124,58,237,0.12)", borderRadius: 8, padding: "8px 12px",
                  marginBottom: 8, border: "1px solid rgba(124,58,237,0.3)",
                }}>
                  <span style={{ color: "#b366ff", fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                    Pattern: {selectedRows} row{selectedRows > 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => { clearAutoPattern(); onPatternClear?.(); }}
                    disabled={autoRunning}
                    style={{
                      background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)",
                      borderRadius: 6, color: "#b366ff", fontSize: 11, fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700, padding: "3px 10px", cursor: autoRunning ? "not-allowed" : "pointer",
                      opacity: autoRunning ? 0.5 : 1,
                    }}
                  >
                    Clear
                  </button>
                </div>
              );
            }
            return (
              <div style={{
                color: "#4a5568", fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 600,
                textAlign: "center", marginBottom: 8, padding: "4px 0",
              }}>
                Click tiles on the grid to set a pattern (bottom to top)
              </div>
            );
          })()}
          */}

          {/* Start / Stop */}
          <button
            style={{
              width: "100%",
              border: "none",
              borderRadius: 11,
              fontFamily: "'Poppins', sans-serif",
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
                  autoBetInvalid ||
                  !autoPattern.some((c) => c !== null)))
            }
            onClick={() => {
              if (
                !autoRunning &&
                (auto.autoBet < MIN_BET ||
                  autoBetExceedsBalance ||
                  autoBetInvalid ||
                  !autoPattern.some((c) => c !== null))
              )
                return;
              onAutoToggle();
            }}
            title={
              playing && !autoRunning
                ? "Finish the current manual round first"
                : !autoRunning && !autoPattern.some((c) => c !== null)
                  ? "Select a pattern on the grid to start autoplay"
                  : !autoRunning && auto.autoBet < MIN_BET
                    ? "Enter a valid bet amount to start autoplay"
                    : autoRunning
                      ? "Stops after current round resolves"
                      : undefined
            }
          >
            {autoRunning ? "⏹ Stop Autobet" : "▶ Start Autobet"}
          </button>

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
