import React, { useState, useEffect } from "react";
import { Difficulty, GameState, RealGameState } from "../types";

interface MobilePanelProps {
  balance: number;
  bet: number;
  diff: Difficulty;
  gstate: GameState;
  rgstate: any;
  curMult: number;
  curWin: number;
  onBetChange: (v: number) => void;
  onDiffChange: (v: Difficulty) => void;
  onPlayAction: () => void;
  onRandom: () => void;
}

const fmt = (v: number) =>
  "$" +
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DIFF_OPTS: Difficulty[] = ["Easy", "Medium", "Hard", "Expert", "Master"];

const BASE = "/dragon-tower";

// Label color — used for all labels/text except amounts
const LBL = "#91A9B6";

const cardStyle = (
  bgImage: string,
  extra?: React.CSSProperties,
): React.CSSProperties => ({
  border: "none",
  outline: "none",
  background: "transparent",
  backgroundImage: `url("${BASE}/assets/dragontower/images/${bgImage}")`,
  backgroundSize: "100% 100%",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  borderRadius: 10,
  overflow: "hidden",
  ...extra,
});

const arrowBtn = (
  img: string,
  pressed: boolean,
  disabled: boolean,
): React.CSSProperties => ({
  width: 28,
  height: 26,
  border: "none",
  outline: "none",
  borderRadius: 5,
  background: "transparent",
  backgroundImage: `url("${BASE}/assets/dragontower/images/${img}")`,
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.35 : 1,
  transform: pressed && !disabled ? "scale(0.84)" : "scale(1)",
  transition: "transform 0.08s ease",
  padding: 0,
  display: "block",
  flexShrink: 0,
});

// ─── TWEAK THESE ─────────────────────────────────────────────
const PLAY_SIZE = 100; // play button diameter (px)
const PLAY_OFFSET_X = 0;
const PLAY_OFFSET_Y = 20;
const MID_CENTER_GAP = 30; // gap between Balance and Random Pick (px)
const BOT_CENTER_GAP = 85; // gap between Bet and Total Profit (px)
const MID_H = 60; // Balance / Random Pick row height (px)
const BOT_H = 65; // Bet / Total Profit row height (px)
const ROW_GAP = 5; // vertical gap between row 1 and row 2 (px)
// ─────────────────────────────────────────────────────────────

const PLAY_TOP = MID_H + ROW_GAP / 2 - PLAY_SIZE / 2;

const MobilePanel: React.FC<MobilePanelProps> = ({
  balance,
  bet,
  diff,
  gstate,
  rgstate,
  curMult,
  curWin,
  onBetChange,
  onDiffChange,
  onPlayAction,
  onRandom,
}) => {
  const [cooldown, setCooldown] = useState(true);
  const [rndPressed, setRndPressed] = useState(false);
  const [upPressed, setUpPressed] = useState(false);
  const [downPressed, setDownPressed] = useState(false);

  const playing = gstate === "playing";
  const canCash = playing && curMult > 1;
  const btnDisabled = (playing && !canCash) || cooldown;

  useEffect(() => {
    if (rgstate === "playagain") {
    } else if (gstate === "ended" || gstate === "idle") {
      setCooldown(true);
      const t = setTimeout(() => setCooldown(false), 2000);
      return () => clearTimeout(t);
    } else if (gstate === "playing") {
      setCooldown(false);
    }
  }, [gstate, rgstate]);

  return (
    <div id="mob-container">
      <div id="mob-panel">
        {/* ── DIFFICULTY ── */}
        <div
          style={cardStyle("dif-bg.png", {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            minHeight: 44,
          })}
        >
          {/* label */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: LBL,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Difficulty
          </span>
          <div className="m-diff-r">
            <select
              className="m-diff-sel"
              value={diff}
              disabled={playing}
              onChange={(e) => onDiffChange(e.target.value as Difficulty)}
              style={{ opacity: playing ? 0.5 : 1, color: "#e2e8f0" }}
            >
              {DIFF_OPTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="m-diff-arrow" style={{ color: LBL }}>
              ▼
            </span>
          </div>
        </div>

        {/* ── ROWS CONTAINER ── */}
        <div style={{ position: "relative" }}>
          {/* ── ROW 1: Balance | Random Pick ── */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              marginBottom: ROW_GAP,
            }}
          >
            {/* Balance card — label + amount + coin all on ONE row */}
            <div
              style={cardStyle("bal-bg.png", {
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                padding: "0 12px",
                height: MID_H,
              })}
            >
              {/* BALANCE label inline */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: LBL,
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                  flexShrink: 0,
                }}
              >
                Balance
              </span>
              {/* amount */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#e8d080",
                  fontFamily: "Rajdhani, sans-serif",
                  minWidth: 0,
                }}
              >
                {fmt(balance).replace("$", "")}
              </span>
              {/* coin icon */}
              <div className="m-coin" style={{ flexShrink: 0 }}>
                $
              </div>
            </div>

            {/* Gap spacer */}
            <div style={{ width: MID_CENTER_GAP, flexShrink: 0 }} />

            {/* Random Pick card */}
            <button
              onMouseDown={() => setRndPressed(true)}
              onMouseUp={() => setRndPressed(false)}
              onMouseLeave={() => setRndPressed(false)}
              onTouchStart={() => setRndPressed(true)}
              onTouchEnd={() => setRndPressed(false)}
              disabled={!playing}
              onClick={onRandom}
              className="m-rnd"
              style={{
                ...cardStyle("randompic-bg.png"),
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: MID_H,
                cursor: playing ? "pointer" : "not-allowed",
                opacity: playing ? 1 : 0.4,
                transform: rndPressed && playing ? "scale(0.93)" : "scale(1)",
                transition: "transform 0.08s ease, opacity 0.2s",
                userSelect: "none",
                WebkitUserSelect: "none",
                // label color
                color: LBL,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Random Pick
            </button>
          </div>

          {/* ── ROW 2: Bet | Total Profit ── */}
          <div style={{ display: "flex", alignItems: "stretch" }}>
            {/* Bet card — BET label top-left, amount bottom-left, arrows right column */}
            <div
              style={cardStyle("bet-bg.png", {
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "row", // left content | right arrows
                alignItems: "stretch",
                padding: 0,
                height: BOT_H,
                overflow: "hidden",
              })}
            >
              {/* Left side: BET label top, amount+coin bottom */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "8px 6px 8px 12px",
                }}
              >
                {/* BET label — top */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: LBL,
                    textTransform: "uppercase",
                    letterSpacing: 1.8,
                  }}
                >
                  Bet
                </span>
                {/* coin + amount — bottom */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="m-bet-coin">$</div>
                  <input
                    className="m-bet-inp"
                    type="number"
                    value={bet}
                    min={0.01}
                    step={0.01}
                    disabled={playing}
                    onChange={(e) =>
                      onBetChange(parseFloat(e.target.value) || 0)
                    }
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>
              </div>

              {/* Right side: arrows stacked, aligned to top of card */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 3,
                  padding: "6px 20px 6px 0px",
                  flexShrink: 0,
                }}
              >
                <button
                  onMouseDown={() => setUpPressed(true)}
                  onMouseUp={() => setUpPressed(false)}
                  onMouseLeave={() => setUpPressed(false)}
                  onTouchStart={() => setUpPressed(true)}
                  onTouchEnd={() => setUpPressed(false)}
                  disabled={playing}
                  onClick={() =>
                    onBetChange(
                      Math.max(0.01, parseFloat((bet * 2).toFixed(2))),
                    )
                  }
                  style={arrowBtn("bet-up-bg.png", upPressed, playing)}
                />
                <button
                  onMouseDown={() => setDownPressed(true)}
                  onMouseUp={() => setDownPressed(false)}
                  onMouseLeave={() => setDownPressed(false)}
                  onTouchStart={() => setDownPressed(true)}
                  onTouchEnd={() => setDownPressed(false)}
                  disabled={playing}
                  onClick={() =>
                    onBetChange(
                      Math.max(0.01, parseFloat((bet * 0.5).toFixed(2))),
                    )
                  }
                  style={{
                    ...arrowBtn("bet-down-bg.png", downPressed, playing),
                    width: 38,
                  }}
                />
              </div>
            </div>

            {/* Gap spacer */}
            <div style={{ width: BOT_CENTER_GAP - 15, flexShrink: 0 }} />

            {/* Total Profit card */}
            <div
              style={cardStyle("total-profit-bg.png", {
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                // padding: "8px 10px 8px 24px",
                marginLeft: 15,
                height: BOT_H,
              })}
            >
              <div style={{ marginLeft: 30 }}>
                {/* label row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: LBL,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                    }}
                  >
                    Total Profit
                  </span>
                  {/* multiplier — label color */}
                  <span style={{ fontSize: 11, color: LBL, fontWeight: 700 }}>
                    ({curMult.toFixed(2)}×)
                  </span>
                </div>
                {/* amount row */}
                <div className="m-pi" style={{ marginTop: 6 }}>
                  <span className="m-pamt">{curWin.toFixed(8)}</span>
                  <div className="m-pcoin">₿</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PLAY / CASH-OUT BUTTON ── */}
          <div
            style={{
              position: "absolute",
              top: PLAY_TOP + PLAY_OFFSET_Y,
              left: `calc(50% + ${PLAY_OFFSET_X}px)`,
              transform: "translateX(-50%)",
              zIndex: 10,
              width: PLAY_SIZE,
              height: PLAY_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              id="m-play"
              className={canCash ? "cash-anim" : ""}
              onClick={onPlayAction}
              disabled={btnDisabled}
              style={{
                width: PLAY_SIZE,
                height: PLAY_SIZE,
                borderRadius: "50%",
                border: "none",
                background: canCash
                  ? "radial-gradient(circle at 36% 30%, #f4ff40, #c8d800 55%, #9aaa00)"
                  : btnDisabled
                    ? "radial-gradient(circle at 36% 30%, #888, #555 55%, #333)"
                    : "radial-gradient(circle at 36% 30%, #f4ff40, #c8d800 55%, #9aaa00)",
                boxShadow: canCash
                  ? undefined
                  : btnDisabled
                    ? "0 0 0 4px rgba(100,100,100,.12), 0 4px 14px rgba(0,0,0,.4)"
                    : "0 0 0 6px rgba(180,200,0,.22), 0 0 0 12px rgba(180,200,0,.1), 0 8px 28px rgba(180,200,0,.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: btnDisabled ? "not-allowed" : "pointer",
                opacity: btnDisabled ? 0.55 : 1,
                transition: "transform .12s, opacity .2s",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!btnDisabled)
                  e.currentTarget.style.transform = "scale(1.07)";
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
              onMouseDown={(e) => {
                if (!btnDisabled)
                  e.currentTarget.style.transform = "scale(0.94)";
              }}
              onMouseUp={(e) => {
                if (!btnDisabled)
                  e.currentTarget.style.transform = "scale(1.07)";
              }}
            >
              {canCash ? (
                <div style={{ textAlign: "center", lineHeight: 1.2 }}>
                  <div style={{ fontSize: 18 }}>💰</div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "#1c2e00",
                      fontFamily: "Rajdhani, sans-serif",
                    }}
                  >
                    {fmt(curWin)}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "14px 0 14px 24px",
                    borderColor: `transparent transparent transparent ${btnDisabled ? "#555" : "#1c2e00"}`,
                    marginLeft: 6,
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePanel;
