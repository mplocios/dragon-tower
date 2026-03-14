import React, { useState, useRef, useCallback, useEffect } from "react";
import { Difficulty, GameState, TileContent } from "./types";
import { DIFF, MULTS, INITIAL_BALANCE, INITIAL_BET } from "./constants";
import { usePixiGame } from "./hooks/usePixiGame";
import LeftPanel from "./components/LeftPanel";
import MobilePanel from "./components/MobilePanel";
import { Toast } from "./components/ResultOverlay";
import "./styles/dragontower.css";

// ── Auto settings type ───────────────────────────────────────
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

// ── Utility ───────────────────────────────────────────────────
function genRow(diff: Difficulty): TileContent[] {
  const cfg = DIFF[diff];
  const arr: TileContent[] = [];
  for (let i = 0; i < cfg.eggs; i++) arr.push("egg");
  for (let i = 0; i < cfg.heads; i++) arr.push("dragon");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  while (arr.length < cfg.cols) arr.push(null);
  return arr;
}

const DragonTower: React.FC = () => {
  // ── React state ──────────────────────────────────────────────
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(INITIAL_BET);
  const [diff, setDiff] = useState<Difficulty>("Medium");
  const [gstate, setGstate] = useState<GameState>("idle");
  const [curRow, setCurRow] = useState(0);
  const [curMult, setCurMult] = useState(1);
  const [curWin, setCurWin] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [auto, setAuto] = useState<AutoSettings>({
    autoBet: 5,
    autoCount: 10,
    autoAdvanced: false,
    onWinMode: "reset",
    onLossMode: "reset",
    winInc: 0,
    lossInc: 0,
    stopProfit: 0,
    stopLoss: 0,
    autoRunning: false,
    autoTotalProfit: 0,
    autoDiff: "Medium",
  });

  // ── Mutable refs ─────────────────────────────────────────────
  const stateRef = useRef({
    gstate,
    curRow,
    diff,
    revealed: {} as Record<number, Record<number, TileContent>>,
  });
  const towerRef = useRef<TileContent[][]>([]);
  const balanceRef = useRef(balance);
  const betRef = useRef(bet);
  const curMultRef = useRef(1);
  const curWinRef = useRef(0);
  const autoLastRoundWonRef = useRef(false);
  const autoRunningRef = useRef(false);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSettingsRef = useRef(auto);
  const autoCountRef = useRef(auto.autoCount);
  const autoTotalProfitRef = useRef(0);
  const autoIsInfiniteRef = useRef(false);
  const runNextAutoRoundRef = useRef<() => void>(() => {});

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { autoSettingsRef.current = auto; }, [auto]);

  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // ── Toast helper ────────────────────────────────────────────
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── PixiJS hook ─────────────────────────────────────────────
  const getState = useCallback(() => stateRef.current, []);

  // ── Reset Game ref (defined early so pixiGame can reference it) ──
  const resetGameRef = useRef<() => void>(() => {});
  const handlePlayAgain = useCallback(() => resetGameRef.current(), []);

  // ── Reveal unselected eggs across tower ─────────────────────
  const revealUnselectedEggs = useCallback((st: typeof stateRef.current) => {
    for (let ar = 0; ar < towerRef.current.length; ar++) {
      if (!st.revealed[ar]) st.revealed[ar] = {};
      let eggsShown = 0;
      const maxEggs = DIFF[st.diff].eggs;
      for (let i = 0; i < towerRef.current[ar].length; i++) {
        if (towerRef.current[ar][i] === "egg" && eggsShown < maxEggs) {
          if (!st.revealed[ar][i]) {
            st.revealed[ar][i] = "egg_dim";
          }
          eggsShown++;
        }
      }
    }
  }, []);

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      const st = stateRef.current;
      if (st.gstate !== "playing" || r !== st.curRow) return;
      if ((st.revealed[r] ?? {})[c]) return;

      const type = towerRef.current[r]?.[c];
      if (!type) return;

      if (!st.revealed[r]) st.revealed[r] = {};
      st.revealed[r][c] = type;

      if (type === "dragon") {
        const newState: GameState = "ended";
        st.gstate = newState;
        setGstate("ended");
        autoLastRoundWonRef.current = false;

        pixiGame.spawnFX(r, c, "fire", st.diff);
        pixiGame.refreshGrid(st.diff, newState, st.curRow, st.revealed);
        pixiGame.swapDragonSprite(false);

        setTimeout(() => {
          revealUnselectedEggs(st);
          pixiGame.refreshGrid(st.diff, newState, st.curRow, st.revealed);
        }, 500);

        setTimeout(() => {
          pixiGame.showResultOverlay("lose", 0, betRef.current);
        }, 900);
      } else {
        pixiGame.spawnFX(r, c, "sparkle", st.diff);
        const m = MULTS[st.diff][r] ?? MULTS[st.diff][MULTS[st.diff].length - 1];
        const newMult = m;
        const newWin = parseFloat((betRef.current * m).toFixed(2));
        curMultRef.current = newMult;
        curWinRef.current = newWin;
        setCurMult(newMult);
        setCurWin(newWin);

        const eggsFound = Object.values(st.revealed[r]).filter(
          (v) => v === "egg",
        ).length;
        if (eggsFound >= 1) {
          const nextRow = r + 1;
          st.curRow = nextRow;
          setCurRow(nextRow);

          if (nextRow >= DIFF[st.diff].rows) {
            const newBal = balanceRef.current + newWin;
            balanceRef.current = newBal;
            setBalance(newBal);
            st.gstate = "ended";
            setGstate("ended");
            autoLastRoundWonRef.current = true;

            pixiGame.swapDragonSprite(true);
            pixiGame.refreshGrid(st.diff, "ended", nextRow, st.revealed);
            setTimeout(() => {
              revealUnselectedEggs(st);
              pixiGame.refreshGrid(st.diff, "ended", nextRow, st.revealed);
            }, 500);
            setTimeout(() => {
              pixiGame.showResultOverlay("win", newMult, newWin);
            }, 500);
          } else {
            pixiGame.refreshGrid(st.diff, st.gstate, nextRow, st.revealed);
          }
        } else {
          pixiGame.refreshGrid(st.diff, st.gstate, st.curRow, st.revealed);
        }
      }
    },
    [revealUnselectedEggs],
  ); // eslint-disable-line

  const pixiGame = usePixiGame(canvasWrapRef, {
    onTileClick: handleTileClick,
    onPlayAgain: handlePlayAgain,
    getState,
  });

  // ── Start Game ──────────────────────────────────────────────
  const startGame = useCallback(
    (overrideBet?: number, overrideDiff?: Difficulty) => {
      const currentBet = overrideBet ?? betRef.current;
      const currentDiff = overrideDiff ?? stateRef.current.diff;

      if (currentBet <= 0) { showToast("Enter a valid bet!"); return; }
      if (currentBet > balanceRef.current) { showToast("Insufficient balance!"); return; }

      const newBal = balanceRef.current - currentBet;
      balanceRef.current = newBal;
      setBalance(newBal);

      const tower = Array.from({ length: DIFF[currentDiff].rows }, () =>
        genRow(currentDiff),
      );
      towerRef.current = tower;

      const revealed: Record<number, Record<number, TileContent>> = {};
      stateRef.current = { gstate: "playing", curRow: 0, diff: currentDiff, revealed };
      setGstate("playing");
      setCurRow(0);
      setCurMult(1);
      setCurWin(0);
      curMultRef.current = 1;
      curWinRef.current = 0;
      autoLastRoundWonRef.current = false;

      pixiGame.hideResultOverlay();
      pixiGame.buildGrid(currentDiff);
      pixiGame.refreshGrid(currentDiff, "playing", 0, revealed);
    },
    [showToast, pixiGame],
  );

  // ── Cash Out ────────────────────────────────────────────────
  const cashOut = useCallback(() => {
    const st = stateRef.current;
    if (st.gstate !== "playing" || st.curRow === 0) return;
    const win = curWinRef.current;
    const mult = curMultRef.current;
    const newBal = balanceRef.current + win;
    balanceRef.current = newBal;
    setBalance(newBal);
    st.gstate = "ended";
    setGstate("ended");
    autoLastRoundWonRef.current = true;

    pixiGame.swapDragonSprite(true);
    pixiGame.refreshGrid(st.diff, "ended", st.curRow, st.revealed);
    setTimeout(() => {
      revealUnselectedEggs(st);
      pixiGame.refreshGrid(st.diff, "ended", st.curRow, st.revealed);
    }, 500);
    pixiGame.showResultOverlay("win", mult, win);
  }, [pixiGame, revealUnselectedEggs]);

  // ── Random Pick ─────────────────────────────────────────────
  const doRandom = useCallback(() => {
    const st = stateRef.current;
    if (st.gstate !== "playing") return;
    const avail: number[] = [];
    for (let c = 0; c < DIFF[st.diff].cols; c++) {
      if (!(st.revealed[st.curRow] ?? {})[c]) avail.push(c);
    }
    if (!avail.length) return;
    handleTileClick(st.curRow, avail[Math.floor(Math.random() * avail.length)]);
  }, [handleTileClick]);

  // ── Reset Game ──────────────────────────────────────────────
  const resetGame = useCallback(() => {
    pixiGame.hideResultOverlay();
    pixiGame.swapDragonSprite(false);
    stateRef.current = {
      gstate: "idle",
      curRow: 0,
      diff: stateRef.current.diff,
      revealed: {},
    };
    towerRef.current = [];
    setGstate("idle");
    setCurRow(0);
    setCurMult(1);
    setCurWin(0);
    pixiGame.buildGrid(stateRef.current.diff);
    pixiGame.refreshGrid(stateRef.current.diff, "idle", 0, {});
  }, [pixiGame]);

  useEffect(() => { resetGameRef.current = resetGame; }, [resetGame]);

  // ── Mobile play action ───────────────────────────────────────
  const mPlayAction = useCallback(() => {
    const st = stateRef.current;
    if (st.gstate === "playing" && st.curRow > 0) cashOut();
    else if (st.gstate !== "playing") startGame();
  }, [cashOut, startGame]);

  // ── Diff change ──────────────────────────────────────────────
  const handleDiffChange = useCallback(
    (v: Difficulty) => {
      if (stateRef.current.gstate !== "idle") return;
      stateRef.current.diff = v;
      setDiff(v);
      pixiGame.buildGrid(v);
      pixiGame.refreshGrid(v, "idle", 0, {});
    },
    [pixiGame],
  );

  // ── AUTO BET ────────────────────────────────────────────────
  const stopAutobet = useCallback(() => {
    autoRunningRef.current = false;
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    autoTimeoutRef.current = null;
    setAuto((prev) => ({ ...prev, autoRunning: false }));
    const st = stateRef.current;
    if (st.gstate === "playing" && st.curRow > 0) cashOut();
    else if (st.gstate === "playing") {
      st.gstate = "ended";
      setGstate("ended");
      pixiGame.refreshGrid(st.diff, "ended", st.curRow, st.revealed);
    }
  }, [cashOut, pixiGame]);

  const autoPlayRows = useCallback(() => {
    const st = stateRef.current;

    if (!autoRunningRef.current || st.gstate !== "playing") {
      if (!autoRunningRef.current) return;

      const settings = autoSettingsRef.current;
      const roundWon = autoLastRoundWonRef.current;
      const roundProfit = roundWon
        ? curWinRef.current - settings.autoBet
        : -settings.autoBet;

      autoTotalProfitRef.current += roundProfit;

      let newBet = settings.autoBet;
      if (settings.autoAdvanced) {
        if (roundWon)
          newBet =
            settings.onWinMode === "increase" && settings.winInc > 0
              ? parseFloat((settings.autoBet * (1 + settings.winInc / 100)).toFixed(2))
              : settings.autoBet;
        else
          newBet =
            settings.onLossMode === "increase" && settings.lossInc > 0
              ? parseFloat((settings.autoBet * (1 + settings.lossInc / 100)).toFixed(2))
              : settings.autoBet;
      }

      autoSettingsRef.current = {
        ...autoSettingsRef.current,
        autoBet: newBet,
        autoTotalProfit: autoTotalProfitRef.current,
      };

      setAuto((prev) => ({
        ...prev,
        autoTotalProfit: autoTotalProfitRef.current,
        autoBet: newBet,
      }));

      autoTimeoutRef.current = setTimeout(() => {
        runNextAutoRoundRef.current();
      }, 3000);

      return;
    }

    const delay = 600 + Math.random() * 500;
    autoTimeoutRef.current = setTimeout(() => {
      if (!autoRunningRef.current || stateRef.current.gstate !== "playing") {
        autoPlayRows();
        return;
      }
      const avail: number[] = [];
      for (let c = 0; c < DIFF[stateRef.current.diff].cols; c++) {
        if (!(stateRef.current.revealed[stateRef.current.curRow] ?? {})[c])
          avail.push(c);
      }
      if (!avail.length) { autoPlayRows(); return; }
      const col = avail[Math.floor(Math.random() * avail.length)];
      handleTileClick(stateRef.current.curRow, col);
      autoTimeoutRef.current = setTimeout(() => { autoPlayRows(); }, 150);
    }, delay);
  }, [cashOut, handleTileClick]);

  const runNextAutoRound = useCallback(() => {
    if (!autoRunningRef.current) return;

    const settings = autoSettingsRef.current;

    if (!autoIsInfiniteRef.current && autoCountRef.current <= 0) {
      showToast("Auto: All rounds complete!");
      stopAutobet();
      return;
    }
    if (settings.stopProfit > 0 && autoTotalProfitRef.current >= settings.stopProfit) {
      showToast("Auto: Stop on Profit reached!");
      stopAutobet();
      return;
    }
    if (settings.stopLoss > 0 && autoTotalProfitRef.current <= -settings.stopLoss) {
      showToast("Auto: Stop on Loss reached!");
      stopAutobet();
      return;
    }
    if (settings.autoBet > balanceRef.current) {
      showToast("Auto: Insufficient balance!");
      stopAutobet();
      return;
    }

    if (autoCountRef.current > 0) {
      autoCountRef.current -= 1;
      setAuto((prev) => ({ ...prev, autoCount: prev.autoCount - 1 }));
    }

    betRef.current = settings.autoBet;
    setBet(settings.autoBet);
    startGame(settings.autoBet, settings.autoDiff);
    autoPlayRows();
  }, [stopAutobet, showToast, startGame, autoPlayRows]);

  useEffect(() => { runNextAutoRoundRef.current = runNextAutoRound; }, [runNextAutoRound]);

  const startAutobet = useCallback(() => {
    autoRunningRef.current = true;
    autoTotalProfitRef.current = 0;
    autoCountRef.current = autoSettingsRef.current.autoCount;
    autoIsInfiniteRef.current = autoSettingsRef.current.autoCount === 0;
    setAuto((prev) => ({ ...prev, autoRunning: true, autoTotalProfit: 0 }));
    runNextAutoRound();
  }, [runNextAutoRound]);

  const toggleAutobet = useCallback(() => {
    if (autoRunningRef.current) stopAutobet();
    else startAutobet();
  }, [startAutobet, stopAutobet]);

  // ── Init grid on mount ───────────────────────────────────────
  useEffect(() => {
    const tid = setTimeout(async () => {
      await pixiGame.loadTextures();
      pixiGame.buildVignette();
      pixiGame.buildGrid(stateRef.current.diff);
      pixiGame.refreshGrid(
        stateRef.current.diff,
        stateRef.current.gstate,
        stateRef.current.curRow,
        stateRef.current.revealed,
      );
    }, 100);
    return () => clearTimeout(tid);
  }, []); // eslint-disable-line

  useEffect(() => { stateRef.current.diff = diff; }, [diff]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div id="app">
      <LeftPanel
        balance={balance}
        bet={bet}
        diff={diff}
        gstate={gstate}
        curMult={curMult}
        curWin={curWin}
        onBetChange={(v) => { setBet(v); betRef.current = v; }}
        onDiffChange={handleDiffChange}
        onStartGame={() => startGame()}
        onCashOut={cashOut}
        onRandom={doRandom}
        auto={auto}
        onAutoToggle={toggleAutobet}
        onAutoBetChange={(v) => setAuto((prev) => ({ ...prev, autoBet: v }))}
        onAutoDiffChange={(v) => setAuto((prev) => ({ ...prev, autoDiff: v }))}
        onAutoSettingsChange={(s) => setAuto((prev) => ({ ...prev, ...s }))}
      />

      <div id="game-panel">
        <div id="game-overlay"></div>
        <div id="dragon-bg"></div>
        <div id="canvas-wrap" ref={canvasWrapRef}></div>

        <MobilePanel
          balance={balance}
          bet={bet}
          diff={diff}
          gstate={gstate}
          curMult={curMult}
          curWin={curWin}
          onBetChange={(v) => { setBet(v); betRef.current = v; }}
          onDiffChange={handleDiffChange}
          onPlayAction={mPlayAction}
          onRandom={doRandom}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
};

export default DragonTower;
