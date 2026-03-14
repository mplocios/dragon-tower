import React, { useState, useEffect } from "react";
import { Difficulty, GameState } from "../types";

interface MobilePanelProps {
  balance: number;
  bet: number;
  diff: Difficulty;
  gstate: GameState;
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

const MobilePanel: React.FC<MobilePanelProps> = ({
  balance,
  bet,
  diff,
  gstate,
  curMult,
  curWin,
  onBetChange,
  onDiffChange,
  onPlayAction,
  onRandom,
}) => {
  const [cooldown, setCooldown] = useState(false);
  const playing = gstate === "playing";
  const canCash = playing && curMult > 1;

  useEffect(() => {
    if (gstate !== "playing") {
      setCooldown(true);

      const t = setTimeout(() => {
        setCooldown(false);
      }, 1000);

      return () => clearTimeout(t);
    }
  }, [gstate]);

  return (
    <div id="mob-container">
      <div id="mob-panel">
        {/* Tabs */}
        <div className="m-tabs-row">
          <button className="m-tab on">Manual</button>
          <button className="m-tab" disabled>
            Auto
          </button>
        </div>

        {/* Difficulty */}
        <div className="m-diff-row">
          <span className="m-diff-lbl">Difficulty</span>
          <div className="m-diff-r">
            <select
              className="m-diff-sel"
              value={diff}
              disabled={playing}
              onChange={(e) => onDiffChange(e.target.value as Difficulty)}
            >
              {DIFF_OPTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="m-diff-arrow">▼</span>
          </div>
        </div>

        {/* Balance + Random */}
        <div className="m-bal-row">
          <div className="m-bal-g">
            <span className="m-bal-lbl">Balance</span>
            <span className="m-bal-amt">{fmt(balance)}</span>
            <div className="m-coin">$</div>
          </div>
          <button className="m-rnd" disabled={!playing} onClick={onRandom}>
            Random Pick
          </button>
        </div>

        {/* Bet + Play + Profit */}
        <div className="m-main">
          <div className="m-bet-card">
            <span className="m-bet-lbl">Bet</span>
            <div className="m-bet-inner">
              <div className="m-bet-coin">$</div>
              <input
                className="m-bet-inp"
                type="number"
                value={bet}
                min={0.01}
                step={0.01}
                disabled={playing}
                onChange={(e) => onBetChange(parseFloat(e.target.value) || 0)}
              />
              <div className="m-arrows">
                <button
                  className="m-arr"
                  disabled={playing}
                  onClick={() =>
                    onBetChange(
                      Math.max(0.01, parseFloat((bet * 2).toFixed(2))),
                    )
                  }
                >
                  ▲
                </button>
                <button
                  className="m-arr"
                  disabled={playing}
                  onClick={() =>
                    onBetChange(
                      Math.max(0.01, parseFloat((bet * 0.5).toFixed(2))),
                    )
                  }
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* Play button */}
          <button
            id="m-play"
            className={canCash ? "cash-anim" : ""}
            onClick={onPlayAction}
            disabled={(playing && !canCash) || cooldown}
            style={
              canCash
                ? {
                    width: 74,
                    height: 74,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 36% 30%,#f4ff40,#c8d800 55%,#9aaa00)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }
                : undefined
            }
          >
            {canCash ? (
              <div style={{ textAlign: "center", lineHeight: 1.15 }}>
                <div style={{ fontSize: 16 }}>💰</div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#1c2e00",
                    fontFamily: "Rajdhani,sans-serif",
                  }}
                >
                  {fmt(curWin)}
                </div>
              </div>
            ) : (
              <div className="tri"></div>
            )}
          </button>

          <div className="m-profit-card">
            <span className="m-plbl">
              Total Profit{" "}
              <span className="m-pmult">({curMult.toFixed(2)}×)</span>
            </span>
            <div className="m-pi">
              <span className="m-pamt">{curWin.toFixed(8)}</span>
              <div className="m-pcoin">$</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePanel;
