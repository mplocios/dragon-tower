import React, { useState, useRef, useCallback, useEffect } from "react";
import { Difficulty, GameState, RealGameState, TileContent } from "./types";
import { DIFF, MULTS, INITIAL_BALANCE, INITIAL_BET } from "./constants";
import { usePixiGame } from "./hooks/usePixiGame";
import LeftPanel from "./components/LeftPanel";
import MobilePanel from "./components/MobilePanel";
import { Toast } from "./components/ResultOverlay";
import {
  saveSession,
  loadSession,
  clearSession,
  saveBalance,
  loadBalance,
  clearBalance,
  saveHistoryEntry,
  loadHistory,
} from "../../utils/session";
import { HistoryEntry } from "./types";
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

// ── Shared game session ID (reset each game) ─────────────────
let _sessionGameId = 0;
const newGameId = () => `game_${Date.now()}_${++_sessionGameId}`;

const DragonTower: React.FC = () => {
  // ── Test State ──────────────────────────────────────────────
  const [testMode, setTestMode] = useState(true);
  const testModeRef = useRef(true);
  const mountedRef = useRef(false);
  // ────────────────────────────────────────────────────────────

  // ── React state ──────────────────────────────────────────────

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(INITIAL_BET);
  const [diff, setDiff] = useState<Difficulty>("Medium");
  const [gstate, setGstate] = useState<GameState>("idle");
  const [rgstate, setRgstate] = useState<RealGameState>("newgame");
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
  const gameIdRef = useRef<string>(""); // current round ID
  const gameStartTimeRef = useRef<number>(0); // ms timestamp of game start
  const autoLastRoundWonRef = useRef(false);
  const autoRunningRef = useRef(false);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSettingsRef = useRef(auto);
  const autoCountRef = useRef(auto.autoCount);
  const autoTotalProfitRef = useRef(0);
  const autoIsInfiniteRef = useRef(false);
  const runNextAutoRoundRef = useRef<() => void>(() => {});

  useEffect(() => {
    balanceRef.current = balance;
    if (!testModeRef.current && mountedRef.current) saveBalance(balance);
  }, [balance]);
  useEffect(() => {
    betRef.current = bet;
  }, [bet]);
  useEffect(() => {
    autoSettingsRef.current = auto;
  }, [auto]);
  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // ── Toast helper ────────────────────────────────────────────
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const getState = useCallback(() => stateRef.current, []);
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
          if (!st.revealed[ar][i]) st.revealed[ar][i] = "egg_dim";
          eggsShown++;
        }
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // TILE CLICK
  // ─────────────────────────────────────────────────────────────
  const handleTileClick = useCallback(
    (r: number, c: number) => {
      const st = stateRef.current;
      if (st.gstate !== "playing" || r !== st.curRow) return;
      if ((st.revealed[r] ?? {})[c]) return;

      const type = towerRef.current[r]?.[c];
      if (!type) return;

      if (!st.revealed[r]) st.revealed[r] = {};
      st.revealed[r][c] = type;

      // ── HIT DRAGON ──────────────────────────────────────────
      if (type === "dragon") {
        const newState: GameState = "ended";
        st.gstate = newState;
        setGstate("ended");
        clearSession();
        autoLastRoundWonRef.current = false;

        const elapsed = Date.now() - gameStartTimeRef.current;
        console.log("🐉 [GAME:LOSE] Dragon hit", {
          // --- identifiers ---
          gameId: gameIdRef.current,
          timestamp: new Date().toISOString(),
          elapsedMs: elapsed,
          // --- tile info ---
          row: r,
          col: c,
          totalRows: DIFF[st.diff].rows,
          rowsCleared: r, // how many rows made it through
          // --- financials ---
          bet: betRef.current,
          payout: 0,
          profit: -betRef.current,
          balanceBefore: balanceRef.current + betRef.current,
          balanceAfter: balanceRef.current,
          // --- game settings ---
          difficulty: st.diff,
          diffConfig: DIFF[st.diff],
          // --- api hook ---
          // 🔌 POST /api/game/result { gameId, result:"lose", bet, payout:0, row, difficulty }
        });
        setRgstate("endgame");
        pixiGame.stopNormalBgSound();
        pixiGame.playLoseSound();
        pixiGame.spawnLoseExplosion(r, c, st.diff);
        pixiGame.screenShake();
        pixiGame.refreshGrid(st.diff, newState, st.curRow, st.revealed);
        pixiGame.swapDragonSprite(false);

        // Save history entry
        const loseEntry: HistoryEntry = {
          id: gameIdRef.current,
          timestamp: Date.now(),
          difficulty: st.diff,
          bet: betRef.current,
          result: "lose",
          multiplier: 0,
          payout: 0,
          profit: -betRef.current,
          rowsCleared: r,
        };
        saveHistoryEntry(loseEntry);
        setHistory(loadHistory());

        setTimeout(() => {
          revealUnselectedEggs(st);
          pixiGame.refreshGrid(st.diff, newState, st.curRow, st.revealed);
        }, 500);

        setTimeout(() => {
          pixiGame.showResultOverlay("lose", 0, betRef.current);
        }, 900);

        // ── HIT EGG ─────────────────────────────────────────────
      } else {
        pixiGame.spawnFX(r, c, "sparkle", st.diff);
        pixiGame.playEggSound();
        const m =
          MULTS[st.diff][r] ?? MULTS[st.diff][MULTS[st.diff].length - 1];
        const newMult = m;
        const newWin = parseFloat((betRef.current * m).toFixed(2));
        curMultRef.current = newMult;
        curWinRef.current = newWin;
        setCurMult(newMult);
        setCurWin(newWin);

        // saveSession({
        //   gstate: "playing",
        //   diff: st.diff,
        //   curRow: st.curRow,
        //   bet: betRef.current,
        //   tower: towerRef.current,
        //   revealed: st.revealed,
        //   curMult: newMult,
        //   curWin: newWin,
        // });

        console.log("🥚 [GAME:TILE] Egg selected", {
          gameId: gameIdRef.current,
          timestamp: new Date().toISOString(),
          // --- tile info ---
          row: r,
          col: c,
          rowsRemaining: DIFF[st.diff].rows - r - 1,
          // --- multiplier ---
          multiplier: newMult,
          potentialPayout: newWin,
          potentialProfit: parseFloat((newWin - betRef.current).toFixed(2)),
          bet: betRef.current,
          difficulty: st.diff,
          // --- api hook ---
          // 🔌 POST /api/game/tile { gameId, row, col, multiplier, potentialPayout }
        });

        const eggsFound = Object.values(st.revealed[r]).filter(
          (v) => v === "egg",
        ).length;

        if (eggsFound >= 1) {
          const nextRow = r + 1;
          st.curRow = nextRow;
          setCurRow(nextRow);

          saveSession({
            gstate: "playing",
            diff: st.diff,
            curRow: nextRow,
            bet: betRef.current,
            tower: towerRef.current,
            revealed: st.revealed,
            curMult: newMult,
            curWin: newWin,
          });

          // ── ALL ROWS CLEARED = WIN ───────────────────────────
          if (nextRow >= DIFF[st.diff].rows) {
            const newBal = balanceRef.current + newWin;
            balanceRef.current = newBal;
            setBalance(newBal);
            st.gstate = "ended";
            setGstate("ended");
            setRgstate("endgame");
            autoLastRoundWonRef.current = true;

            const elapsed = Date.now() - gameStartTimeRef.current;
            console.log("🏆 [GAME:WIN] All rows cleared", {
              // --- identifiers ---
              gameId: gameIdRef.current,
              timestamp: new Date().toISOString(),
              elapsedMs: elapsed,
              // --- financials ---
              bet: betRef.current,
              multiplier: newMult,
              payout: newWin,
              profit: parseFloat((newWin - betRef.current).toFixed(2)),
              balanceBefore: balanceRef.current - newWin,
              balanceAfter: newBal,
              // --- game settings ---
              difficulty: st.diff,
              diffConfig: DIFF[st.diff],
              rowsCompleted: nextRow,
              // --- api hook ---
              // 🔌 POST /api/game/result { gameId, result:"win", bet, multiplier, payout, rowsCompleted, difficulty }
            });

            pixiGame.stopNormalBgSound();
            pixiGame.swapDragonSprite(true);
            pixiGame.showFlameEffects(true, true);

            pixiGame.refreshGrid(st.diff, "ended", nextRow, st.revealed);

            // Save history entry
            const winEntry: HistoryEntry = {
              id: gameIdRef.current,
              timestamp: Date.now(),
              difficulty: st.diff,
              bet: betRef.current,
              result: "win",
              multiplier: newMult,
              payout: newWin,
              profit: parseFloat((newWin - betRef.current).toFixed(2)),
              rowsCleared: nextRow,
            };
            saveHistoryEntry(winEntry);
            setHistory(loadHistory());

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

  // ─────────────────────────────────────────────────────────────
  // START GAME
  // ─────────────────────────────────────────────────────────────
  const startGame = useCallback(
    (overrideBet?: number, overrideDiff?: Difficulty) => {
      const currentBet = overrideBet ?? betRef.current;
      const currentDiff = overrideDiff ?? stateRef.current.diff;

      if (currentBet <= 0) {
        showToast("Enter a valid bet!");
        return;
      }
      if (currentBet > balanceRef.current) {
        showToast("Insufficient balance!");
        return;
      }

      const newBal = balanceRef.current - currentBet;
      balanceRef.current = newBal;
      setBalance(newBal);

      // Assign new game ID + start time
      gameIdRef.current = newGameId();
      gameStartTimeRef.current = Date.now();

      console.log("🎮 [GAME:START] New game begun", {
        // --- identifiers ---
        gameId: gameIdRef.current,
        timestamp: new Date().toISOString(),
        // --- settings ---
        difficulty: currentDiff,
        diffConfig: DIFF[currentDiff],
        // --- financials ---
        bet: currentBet,
        balanceBefore: balanceRef.current + currentBet,
        balanceAfter: newBal,
        // --- auto info ---
        isAutobet: autoRunningRef.current,
        autoRoundsLeft: autoRunningRef.current ? autoCountRef.current : null,
        // --- api hook ---
        // 🔌 POST /api/game/start { gameId, bet, difficulty, userId, isAutobet }
      });
      setRgstate("newgame");
      const tower = Array.from({ length: DIFF[currentDiff].rows }, () =>
        genRow(currentDiff),
      );
      towerRef.current = tower;

      saveSession({
        gstate: "playing",
        diff: currentDiff,
        curRow: 0,
        bet: currentBet,
        tower,
        revealed: {},
        curMult: 1,
        curWin: 0,
      });
      console.log("✅ Session saved on start", loadSession());
      const revealed: Record<number, Record<number, TileContent>> = {};
      stateRef.current = {
        gstate: "playing",
        curRow: 0,
        diff: currentDiff,
        revealed,
      };
      setGstate("playing");
      setCurRow(0);
      setCurMult(1);
      setCurWin(0);
      curMultRef.current = 1;
      curWinRef.current = 0;
      autoLastRoundWonRef.current = false;

      pixiGame.hideResultOverlay();
      pixiGame.buildGrid(currentDiff);
      pixiGame.showFlameEffects(false);
      pixiGame.stopLoseSound();
      pixiGame.playNormalBgSound();
      pixiGame.refreshGrid(currentDiff, "playing", 0, revealed);
    },
    [showToast, pixiGame],
  );

  // ─────────────────────────────────────────────────────────────
  // CASH OUT
  // ─────────────────────────────────────────────────────────────
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
    clearSession();
    autoLastRoundWonRef.current = true;

    const elapsed = Date.now() - gameStartTimeRef.current;
    console.log("💰 [GAME:CASHOUT] Manual cashout", {
      // --- identifiers ---
      gameId: gameIdRef.current,
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      // --- financials ---
      bet: betRef.current,
      multiplier: mult,
      payout: win,
      profit: parseFloat((win - betRef.current).toFixed(2)),
      balanceBefore: balanceRef.current - win,
      balanceAfter: newBal,
      // --- game info ---
      difficulty: st.diff,
      rowsCompleted: st.curRow,
      totalRows: DIFF[st.diff].rows,
      rowsRemainingAtCashout: DIFF[st.diff].rows - st.curRow,
      // --- auto info ---
      isAutobet: autoRunningRef.current,
      // --- api hook ---
      // 🔌 POST /api/game/cashout { gameId, bet, multiplier, payout, rowsCompleted, difficulty }
    });
    setRgstate("endgame");
    clearSession();
    pixiGame.stopNormalBgSound();
    pixiGame.swapDragonSprite(true);
    pixiGame.showFlameEffects(true, true);
    pixiGame.refreshGrid(st.diff, "ended", st.curRow, st.revealed);

    // Save history entry
    const cashEntry: HistoryEntry = {
      id: gameIdRef.current,
      timestamp: Date.now(),
      difficulty: st.diff,
      bet: betRef.current,
      result: "win",
      multiplier: mult,
      payout: win,
      profit: parseFloat((win - betRef.current).toFixed(2)),
      rowsCleared: st.curRow,
    };
    saveHistoryEntry(cashEntry);
    setHistory(loadHistory());

    setTimeout(() => {
      revealUnselectedEggs(st);
      pixiGame.refreshGrid(st.diff, "ended", st.curRow, st.revealed);
    }, 500);
    pixiGame.showResultOverlay("win", mult, win);
  }, [pixiGame, revealUnselectedEggs]);

  // ─────────────────────────────────────────────────────────────
  // RANDOM PICK
  // ─────────────────────────────────────────────────────────────
  const doRandom = useCallback(() => {
    const st = stateRef.current;
    if (st.gstate !== "playing") return;
    const avail: number[] = [];
    for (let c = 0; c < DIFF[st.diff].cols; c++) {
      if (!(st.revealed[st.curRow] ?? {})[c]) avail.push(c);
    }
    if (!avail.length) return;
    const col = avail[Math.floor(Math.random() * avail.length)];

    console.log("🎲 [GAME:RANDOM] Auto-pick tile", {
      gameId: gameIdRef.current,
      timestamp: new Date().toISOString(),
      row: st.curRow,
      col,
      availableCols: avail,
      difficulty: st.diff,
    });

    handleTileClick(st.curRow, col);
  }, [handleTileClick]);

  // ─────────────────────────────────────────────────────────────
  // RESET / PLAY AGAIN
  // ─────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    clearSession();
    console.log("🔄 [GAME:RESET] Play again / reset", {
      previousGameId: gameIdRef.current,
      timestamp: new Date().toISOString(),
      balance: balanceRef.current,
      difficulty: stateRef.current.diff,
    });
    setRgstate("playagain");
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
    pixiGame.showFlameEffects(false);
    pixiGame.stopLoseSound();
    pixiGame.playNormalBgSound();
    pixiGame.refreshGrid(stateRef.current.diff, "idle", 0, {});
  }, [pixiGame]);

  useEffect(() => {
    resetGameRef.current = resetGame;
  }, [resetGame]);

  const mPlayAction = useCallback(() => {
    const st = stateRef.current;
    if (st.gstate === "playing" && st.curRow > 0) cashOut();
    else if (st.gstate !== "playing") startGame();
  }, [cashOut, startGame]);

  // ─────────────────────────────────────────────────────────────
  // DIFFICULTY CHANGE
  // ─────────────────────────────────────────────────────────────
  const handleDiffChange = useCallback(
    (v: Difficulty) => {
      if (stateRef.current.gstate !== "idle") return;

      console.log("⚙️ [GAME:SETTINGS] Difficulty changed", {
        timestamp: new Date().toISOString(),
        from: stateRef.current.diff,
        to: v,
        newConfig: DIFF[v],
        balance: balanceRef.current,
      });

      stateRef.current.diff = v;
      setDiff(v);
      pixiGame.buildGrid(v);
      pixiGame.refreshGrid(v, "idle", 0, {});
    },
    [pixiGame],
  );

  // ─────────────────────────────────────────────────────────────
  // AUTOBET
  // ─────────────────────────────────────────────────────────────
  const stopAutobet = useCallback(() => {
    console.log("⏹ [AUTO:STOP] Autobet stopped", {
      timestamp: new Date().toISOString(),
      totalProfit: autoTotalProfitRef.current,
      roundsCompleted: autoSettingsRef.current.autoCount,
      balance: balanceRef.current,
      reason: "manual stop",
    });

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
              ? parseFloat(
                  (settings.autoBet * (1 + settings.winInc / 100)).toFixed(2),
                )
              : settings.autoBet;
        else
          newBet =
            settings.onLossMode === "increase" && settings.lossInc > 0
              ? parseFloat(
                  (settings.autoBet * (1 + settings.lossInc / 100)).toFixed(2),
                )
              : settings.autoBet;
      }

      console.log(`${roundWon ? "✅" : "❌"} [AUTO:ROUND_END] Round finished`, {
        gameId: gameIdRef.current,
        timestamp: new Date().toISOString(),
        result: roundWon ? "win" : "lose",
        roundProfit,
        roundBet: settings.autoBet,
        nextBet: newBet,
        totalProfit: autoTotalProfitRef.current,
        roundsLeft: autoCountRef.current,
        balance: balanceRef.current,
        difficulty: settings.autoDiff,
      });

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
      if (!avail.length) {
        autoPlayRows();
        return;
      }
      const col = avail[Math.floor(Math.random() * avail.length)];
      handleTileClick(stateRef.current.curRow, col);
      autoTimeoutRef.current = setTimeout(() => {
        autoPlayRows();
      }, 150);
    }, delay);
  }, [cashOut, handleTileClick]);

  const runNextAutoRound = useCallback(() => {
    if (!autoRunningRef.current) return;

    const settings = autoSettingsRef.current;

    if (!autoIsInfiniteRef.current && autoCountRef.current <= 0) {
      console.log("🏁 [AUTO:COMPLETE] All rounds done", {
        timestamp: new Date().toISOString(),
        totalProfit: autoTotalProfitRef.current,
        balance: balanceRef.current,
        difficulty: settings.autoDiff,
      });
      showToast("Auto: All rounds complete!");
      stopAutobet();
      return;
    }
    if (
      settings.stopProfit > 0 &&
      autoTotalProfitRef.current >= settings.stopProfit
    ) {
      console.log("🎯 [AUTO:STOP_PROFIT] Stop profit target hit", {
        timestamp: new Date().toISOString(),
        totalProfit: autoTotalProfitRef.current,
        stopProfitTarget: settings.stopProfit,
        balance: balanceRef.current,
      });
      showToast("Auto: Stop on Profit reached!");
      stopAutobet();
      return;
    }
    if (
      settings.stopLoss > 0 &&
      autoTotalProfitRef.current <= -settings.stopLoss
    ) {
      console.log("🛑 [AUTO:STOP_LOSS] Stop loss limit hit", {
        timestamp: new Date().toISOString(),
        totalProfit: autoTotalProfitRef.current,
        stopLossTarget: settings.stopLoss,
        balance: balanceRef.current,
      });
      showToast("Auto: Stop on Loss reached!");
      stopAutobet();
      return;
    }
    if (settings.autoBet > balanceRef.current) {
      console.log("💸 [AUTO:INSUFFICIENT] Not enough balance", {
        timestamp: new Date().toISOString(),
        requiredBet: settings.autoBet,
        balance: balanceRef.current,
        shortfall: parseFloat(
          (settings.autoBet - balanceRef.current).toFixed(2),
        ),
      });
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

  useEffect(() => {
    runNextAutoRoundRef.current = runNextAutoRound;
  }, [runNextAutoRound]);

  const startAutobet = useCallback(() => {
    const settings = autoSettingsRef.current;

    console.log("▶ [AUTO:START] Autobet started", {
      timestamp: new Date().toISOString(),
      bet: settings.autoBet,
      difficulty: settings.autoDiff,
      rounds: settings.autoCount === 0 ? "infinite" : settings.autoCount,
      advanced: settings.autoAdvanced,
      onWinMode: settings.onWinMode,
      winInc: settings.winInc,
      onLossMode: settings.onLossMode,
      lossInc: settings.lossInc,
      stopProfit: settings.stopProfit || "none",
      stopLoss: settings.stopLoss || "none",
      balanceAtStart: balanceRef.current,
      // 🔌 POST /api/autobet/start { bet, difficulty, rounds, onWin, onLoss, stopProfit, stopLoss }
    });

    autoRunningRef.current = true;
    autoTotalProfitRef.current = 0;
    autoCountRef.current = settings.autoCount;
    autoIsInfiniteRef.current = settings.autoCount === 0;
    setAuto((prev) => ({ ...prev, autoRunning: true, autoTotalProfit: 0 }));
    runNextAutoRound();
  }, [runNextAutoRound]);

  const toggleAutobet = useCallback(() => {
    if (autoRunningRef.current) stopAutobet();
    else startAutobet();
  }, [startAutobet, stopAutobet]);

  // ── Init grid on mount ───────────────────────────────────────
  useEffect(() => {
    console.log("🚀 [GAME:INIT] DragonTower mounted", {
      timestamp: new Date().toISOString(),
      initialBalance: INITIAL_BALANCE,
      initialBet: INITIAL_BET,
      defaultDifficulty: "Medium",
    });

    const tid = setTimeout(async () => {
      await pixiGame.loadTextures();
      pixiGame.buildVignette();

      const session = loadSession();
      console.log("🔍 Session on mount:", session);
      const applyBalance = () => {
        if (testModeRef.current) {
          console.log(
            "🧪 TEST_MODE on — resetting balance to default:",
            INITIAL_BALANCE,
          );
          balanceRef.current = INITIAL_BALANCE;
          setBalance(INITIAL_BALANCE);
        } else {
          const savedBalance = loadBalance();
          if (savedBalance !== null) {
            console.log("💰 Restoring saved balance:", savedBalance);
            balanceRef.current = savedBalance;
            setBalance(savedBalance);
          } else {
            console.log(
              "💰 No saved balance found — using default:",
              INITIAL_BALANCE,
            );
            balanceRef.current = INITIAL_BALANCE;
            setBalance(INITIAL_BALANCE);
          }
        }
      };

      if (session && session.gstate === "playing") {
        towerRef.current = session.tower;
        betRef.current = session.bet;
        curMultRef.current = session.curMult;
        curWinRef.current = session.curWin;

        stateRef.current = {
          gstate: "playing",
          curRow: session.curRow,
          diff: session.diff,
          revealed: session.revealed,
        };

        setBet(session.bet);
        setDiff(session.diff);
        setGstate("playing");
        setCurRow(session.curRow);
        setCurMult(session.curMult);
        setCurWin(session.curWin);

        applyBalance();

        pixiGame.buildGrid(session.diff);
        pixiGame.refreshGrid(
          session.diff,
          "playing",
          session.curRow,
          session.revealed,
        );
      } else {
        applyBalance();

        pixiGame.buildGrid(stateRef.current.diff);
        pixiGame.refreshGrid(
          stateRef.current.diff,
          stateRef.current.gstate,
          stateRef.current.curRow,
          stateRef.current.revealed,
        );
      }
      mountedRef.current = true;
    }, 100);
    return () => clearTimeout(tid);
  }, []); // eslint-disable-line

  useEffect(() => {
    stateRef.current.diff = diff;
  }, [diff]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const st = stateRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (st.gstate === "playing" && curMultRef.current > 1) cashOut();
        else if (st.gstate !== "playing") startGame();
      } else if (e.code === "KeyR" && st.gstate === "playing") {
        e.preventDefault();
        doRandom();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cashOut, startGame, doRandom]);

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
        history={history}
        onBetChange={(v) => {
          console.log("💵 [GAME:BET_CHANGE] Bet updated", {
            from: betRef.current,
            to: v,
          });
          setBet(v);
          betRef.current = v;
        }}
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
        <div id="dragon-bg"></div>
        <div id="canvas-wrap" ref={canvasWrapRef}></div>

        <MobilePanel
          balance={balance}
          bet={bet}
          diff={diff}
          gstate={gstate}
          rgstate={rgstate}
          curMult={curMult}
          curWin={curWin}
          onBetChange={(v) => {
            setBet(v);
            betRef.current = v;
          }}
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
