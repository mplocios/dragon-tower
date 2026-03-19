import React, { useRef, useCallback, useEffect } from "react";
import { Difficulty, GameState, TileContent, HistoryEntry } from "./types";
import { DIFF, MULTS } from "./constants";
import { usePixiGame } from "./hooks/usePixiGame";
import LeftPanel from "./components/LeftPanel";
import { Toast } from "./components/ResultOverlay";
import { useGameStore } from "./store/useGameStore";
import {
  saveSession,
  loadSession,
  clearSession,
  saveBalance,
  loadBalance,
  saveHistoryEntry,
  loadHistory,
} from "./utils/session";
import "./styles/dragontower.css";

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

// ── Quick store accessor ─────────────────────────────────────
const gs = () => useGameStore.getState();

const DragonTower: React.FC = () => {
  // ── Store selectors (trigger React re-renders) ────────────
  const balance = useGameStore((s) => s.balance);
  const bet = useGameStore((s) => s.bet);
  const diff = useGameStore((s) => s.diff);
  const gstate = useGameStore((s) => s.gstate);
  const curMult = useGameStore((s) => s.curMult);
  const curWin = useGameStore((s) => s.curWin);
  const toast = useGameStore((s) => s.toast);
  const rgstate = useGameStore((s) => s.rgstate);

  // ── Remaining refs (non-state, timers, callbacks) ─────────
  const mountedRef = useRef(false);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runNextAutoRoundRef = useRef<() => void>(() => {});
  const resetGameRef = useRef<() => void>(() => {});
  const engageLockRef = useRef<(ms?: number) => void>(() => {});
  const diffChangeCbRef = useRef<(v: Difficulty) => void>(() => {});
  const playActionCbRef = useRef<() => void>(() => {});
  const randomCbRef = useRef<() => void>(() => {});
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // ── Persist balance to localStorage on change ─────────────
  useEffect(() => {
    if (!gs().testMode && mountedRef.current) {
      saveBalance(balance);
      console.log("💳 [BALANCE:UPDATE] Balance changed", {
        timestamp: new Date().toISOString(),
        balance,
        testMode: false,
        // 🔌 API: POST /api/user/balance (or rely on game/result endpoint for server-side balance)
        // Payload: { balance }
        // NOTE: In production, balance is SERVER-AUTHORITATIVE — don't trust client balance.
        //       This log is for debugging only. Real balance updates happen via game/start, game/result, game/cashout.
      });
    }
  }, [balance]);

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    gs().setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => gs().setToast(null), 2200);
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimersRef.current = pendingTimersRef.current.filter(
        (t) => t !== id,
      );
      fn();
    }, ms);
    pendingTimersRef.current.push(id);
    return id;
  }, []);

  const clearPendingTimers = useCallback(() => {
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
  }, []);

  const getState = useCallback(
    () => ({
      gstate: gs().gstate,
      curRow: gs().curRow,
      diff: gs().diff,
      revealed: gs().revealed,
    }),
    [],
  );

  const handlePlayAgain = useCallback(() => resetGameRef.current(), []);

  // ── Reveal unselected eggs across tower ─────────────────
  const revealUnselectedEggs = useCallback(() => {
    const { tower, diff: d, revealed } = gs();
    const newRevealed: Record<number, Record<number, TileContent>> = {};
    for (const [k, v] of Object.entries(revealed)) {
      newRevealed[Number(k)] = { ...v };
    }
    for (let ar = 0; ar < tower.length; ar++) {
      if (!newRevealed[ar]) newRevealed[ar] = {};
      let eggsShown = 0;
      const maxEggs = DIFF[d].eggs;
      for (let i = 0; i < tower[ar].length; i++) {
        if (tower[ar][i] === "egg" && eggsShown < maxEggs) {
          if (!newRevealed[ar][i]) newRevealed[ar][i] = "egg_dim";
          eggsShown++;
        }
      }
    }
    gs().setRevealed(newRevealed);
    return newRevealed;
  }, []);

  // ─────────────────────────────────────────────────────────
  // TILE CLICK
  // ─────────────────────────────────────────────────────────
  const handleTileClick = useCallback(
    (r: number, c: number) => {
      const s = gs();
      if (s.gstate !== "playing" || r !== s.curRow) return;
      if ((s.revealed[r] ?? {})[c]) return;

      const type = s.tower[r]?.[c];
      if (!type) return;

      gs().revealTile(r, c, type);

      // ── HIT DRAGON ──────────────────────────────────────
      if (type === "dragon") {
        engageLockRef.current(1500);
        gs().setGstate("ended");
        clearSession();
        gs().setAutoLastRoundWon(false);

        const elapsed = Date.now() - s.gameStartTime;
        console.log("🐉 [GAME:LOSE] Dragon hit", {
          gameId: s.gameId,
          timestamp: new Date().toISOString(),
          elapsedMs: elapsed,
          row: r,
          col: c,
          totalRows: DIFF[s.diff].rows,
          rowsCleared: r,
          bet: s.bet,
          payout: 0,
          profit: -s.bet,
          balanceBefore: s.balance + s.bet,
          balanceAfter: s.balance,
          difficulty: s.diff,
          diffConfig: DIFF[s.diff],
          // 🔌 API: POST /api/game/result
          // Payload: { gameId, result: "lose", row: r, col: c, bet, payout: 0, profit: -bet, balanceAfter }
          // Response: { newBalance, serverSeed } — server reveals seed for verification
        });

        gs().setRgstate("endgame");
        gs().setPlayLock(true);
        pixiGame.panelCooldownRef.current = true;
        pixiGame.stopNormalBgSound();
        pixiGame.playLoseSound();
        pixiGame.spawnLoseExplosion(r, c, s.diff);
        pixiGame.screenShake();

        const revealed = gs().revealed;
        pixiGame.refreshGrid(s.diff, "ended", s.curRow, revealed);
        pixiGame.swapDragonSprite(false);

        // Save history entry
        const loseEntry: HistoryEntry = {
          id: s.gameId,
          timestamp: Date.now(),
          difficulty: s.diff,
          bet: s.bet,
          result: "lose",
          multiplier: 0,
          payout: 0,
          profit: -s.bet,
          rowsCleared: r,
        };
        gs().addHistoryEntry(loseEntry);
        console.log("📝 [HISTORY:SAVE] Game result saved", loseEntry);
        // 🔌 API: History is saved server-side via POST /api/game/result above

        scheduleTimer(() => {
          const rev = revealUnselectedEggs();
          pixiGame.refreshGrid(s.diff, "ended", s.curRow, rev);
        }, 500);

        scheduleTimer(() => {
          pixiGame.showResultOverlay("lose", 0, s.bet);
          engageLockRef.current(2000);
        }, 900);

        // ── HIT EGG ─────────────────────────────────────────
      } else {
        pixiGame.spawnFX(r, c, "sparkle", s.diff);
        pixiGame.playEggSound();
        const m = MULTS[s.diff][r] ?? MULTS[s.diff][MULTS[s.diff].length - 1];
        const newMult = m;
        const newWin = parseFloat((s.bet * m).toFixed(2));
        gs().setCurMult(newMult);
        gs().setCurWin(newWin);

        console.log("🥚 [GAME:TILE] Egg selected", {
          gameId: s.gameId,
          timestamp: new Date().toISOString(),
          row: r,
          col: c,
          rowsRemaining: DIFF[s.diff].rows - r - 1,
          multiplier: newMult,
          potentialPayout: newWin,
          potentialProfit: parseFloat((newWin - s.bet).toFixed(2)),
          bet: s.bet,
          difficulty: s.diff,
          // 🔌 API: POST /api/game/tile
          // Payload: { gameId, row: r, col: c }
          // Response: { tileContent: "egg"|"dragon", multiplier, nextRow }
          // NOTE: In production, tile content comes from SERVER (not client genRow)
        });

        const revealed = gs().revealed;
        const eggsFound = Object.values(revealed[r] ?? {}).filter(
          (v) => v === "egg",
        ).length;

        if (eggsFound >= 1) {
          const nextRow = r + 1;
          gs().setCurRow(nextRow);

          saveSession({
            gstate: "playing",
            diff: s.diff,
            curRow: nextRow,
            bet: s.bet,
            tower: s.tower,
            revealed: gs().revealed,
            curMult: newMult,
            curWin: newWin,
          });

          // ── ALL ROWS CLEARED = WIN ──────────────────────
          if (nextRow >= DIFF[s.diff].rows) {
            gs().setPlayLock(true);
            pixiGame.panelCooldownRef.current = true;
            const newBal = s.balance + newWin;
            gs().setBalance(newBal);
            gs().setGstate("ended");
            gs().setRgstate("endgame");
            gs().setAutoLastRoundWon(true);

            const elapsed = Date.now() - s.gameStartTime;
            console.log("🏆 [GAME:WIN] All rows cleared", {
              gameId: s.gameId,
              timestamp: new Date().toISOString(),
              elapsedMs: elapsed,
              bet: s.bet,
              multiplier: newMult,
              payout: newWin,
              profit: parseFloat((newWin - s.bet).toFixed(2)),
              balanceBefore: s.balance,
              balanceAfter: newBal,
              difficulty: s.diff,
              diffConfig: DIFF[s.diff],
              rowsCompleted: nextRow,
              // 🔌 API: POST /api/game/result
              // Payload: { gameId, result: "win", multiplier: newMult, payout: newWin, profit, balanceAfter: newBal, rowsCompleted }
              // Response: { newBalance, serverSeed }
            });

            pixiGame.stopNormalBgSound();
            pixiGame.swapDragonSprite(true);
            pixiGame.showFlameEffects(true, true);

            const rev = gs().revealed;
            pixiGame.refreshGrid(s.diff, "ended", nextRow, rev);

            // Save history entry
            const winEntry: HistoryEntry = {
              id: s.gameId,
              timestamp: Date.now(),
              difficulty: s.diff,
              bet: s.bet,
              result: "win",
              multiplier: newMult,
              payout: newWin,
              profit: parseFloat((newWin - s.bet).toFixed(2)),
              rowsCleared: nextRow,
            };
            gs().addHistoryEntry(winEntry);
            console.log("📝 [HISTORY:SAVE] Game result saved", winEntry);
            // 🔌 API: History is saved server-side via POST /api/game/result above

            scheduleTimer(() => {
              const dimRev = revealUnselectedEggs();
              pixiGame.refreshGrid(s.diff, "ended", nextRow, dimRev);
            }, 500);
            scheduleTimer(() => {
              pixiGame.showResultOverlay("win", newMult, newWin);
              engageLockRef.current(2000);
            }, 500);
          } else {
            pixiGame.refreshGrid(s.diff, gs().gstate, nextRow, gs().revealed);
          }
        } else {
          pixiGame.refreshGrid(s.diff, gs().gstate, s.curRow, gs().revealed);
        }
      }
    },
    [revealUnselectedEggs, scheduleTimer],
  ); // eslint-disable-line

  const betChangeCb = useCallback((v: number) => {
    const prev = gs().bet;
    gs().setBet(v);
    console.log("💵 [BET:CHANGE] Bet updated", {
      timestamp: new Date().toISOString(),
      from: prev,
      to: v,
      balance: gs().balance,
      // 🔌 API: POST /api/user/settings { bet }
    });
  }, []);

  const diffChangeCbRef2 = useRef<(v: Difficulty) => void>(() => {});
  const playActionCbRef2 = useRef<() => void>(() => {});
  const randomCbRef2 = useRef<() => void>(() => {});

  const pixiGame = usePixiGame(canvasWrapRef, {
    onTileClick: handleTileClick,
    onPlayAgain: handlePlayAgain,
    getState,
    onBetChange: betChangeCb,
    onDiffChange: (v) => diffChangeCbRef.current(v),
    onPlayAction: () => playActionCbRef.current(),
    onRandom: () => randomCbRef.current(),
  });

  // ─────────────────────────────────────────────────────────
  // START GAME
  // ─────────────────────────────────────────────────────────
  const startGame = useCallback(
    (overrideBet?: number, overrideDiff?: Difficulty) => {
      const s = gs();
      const currentBet = overrideBet ?? s.bet;
      const currentDiff = overrideDiff ?? s.diff;

      if (currentBet <= 0) {
        showToast("Enter a valid bet!");
        return;
      }
      if (currentBet > s.balance) {
        showToast("Insufficient balance!");
        return;
      }

      const newBal = s.balance - currentBet;
      gs().setBalance(newBal);

      // Assign new game ID + start time
      gs().newGameId();
      const gameId = gs().gameId;

      console.log("🎮 [GAME:START] New game begun", {
        gameId,
        timestamp: new Date().toISOString(),
        difficulty: currentDiff,
        diffConfig: DIFF[currentDiff],
        bet: currentBet,
        balanceBefore: s.balance,
        balanceAfter: newBal,
        isAutobet: gs().autoRunning,
        autoRoundsLeft: gs().autoRunning ? gs().autoCount : null,
        // 🔌 API: POST /api/game/start
        // Payload: { gameId, bet: currentBet, difficulty: currentDiff, balanceAfter: newBal, isAutobet }
        // Response: { serverSeed, gameId } — server generates tower & returns hashed seed for provably fair
      });

      gs().setRgstate("newgame");
      const tower = Array.from({ length: DIFF[currentDiff].rows }, () =>
        genRow(currentDiff),
      );
      gs().setTower(tower);

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

      gs().setRevealed({});
      gs().setGstate("playing");
      gs().setCurRow(0);
      gs().setCurMult(1);
      gs().setCurWin(0);
      gs().setDiff(currentDiff);
      gs().setAutoLastRoundWon(false);

      clearPendingTimers();
      // Clear any lingering lock timeout from previous game
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      // Kill all running animations/particles/timers from previous game
      pixiGame.resetAnimationState();
      pixiGame.buildGrid(currentDiff);
      pixiGame.showFlameEffects(false);
      pixiGame.stopLoseSound();
      pixiGame.swapDragonSprite(false);
      pixiGame.playNormalBgSound();
      pixiGame.refreshGrid(currentDiff, "playing", 0, {});
    },
    [showToast, pixiGame, clearPendingTimers],
  );

  // ─────────────────────────────────────────────────────────
  // CASH OUT
  // ─────────────────────────────────────────────────────────
  const cashOut = useCallback(() => {
    const s = gs();
    if (s.gstate !== "playing" || s.curRow === 0) return;
    const win = s.curWin;
    const mult = s.curMult;
    const newBal = s.balance + win;
    gs().setBalance(newBal);
    gs().setGstate("ended");
    clearSession();
    gs().setAutoLastRoundWon(true);

    const elapsed = Date.now() - s.gameStartTime;
    console.log("💰 [GAME:CASHOUT] Manual cashout", {
      gameId: s.gameId,
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      bet: s.bet,
      multiplier: mult,
      payout: win,
      profit: parseFloat((win - s.bet).toFixed(2)),
      balanceBefore: s.balance,
      balanceAfter: newBal,
      difficulty: s.diff,
      rowsCompleted: s.curRow,
      totalRows: DIFF[s.diff].rows,
      rowsRemainingAtCashout: DIFF[s.diff].rows - s.curRow,
      isAutobet: gs().autoRunning,
      // 🔌 API: POST /api/game/cashout
      // Payload: { gameId, multiplier: mult, payout: win, profit, balanceAfter: newBal, rowsCompleted }
      // Response: { newBalance, serverSeed }
    });

    gs().setRgstate("endgame");
    gs().setPlayLock(true);
    pixiGame.panelCooldownRef.current = true;
    pixiGame.stopNormalBgSound();
    pixiGame.swapDragonSprite(true);
    pixiGame.showFlameEffects(true, true);
    pixiGame.refreshGrid(s.diff, "ended", s.curRow, s.revealed);

    // Save history entry
    const cashEntry: HistoryEntry = {
      id: s.gameId,
      timestamp: Date.now(),
      difficulty: s.diff,
      bet: s.bet,
      result: "win",
      multiplier: mult,
      payout: win,
      profit: parseFloat((win - s.bet).toFixed(2)),
      rowsCleared: s.curRow,
    };
    gs().addHistoryEntry(cashEntry);
    console.log("📝 [HISTORY:SAVE] Game result saved", cashEntry);
    // 🔌 API: History is saved server-side via POST /api/game/cashout above

    scheduleTimer(() => {
      const rev = revealUnselectedEggs();
      pixiGame.refreshGrid(s.diff, "ended", s.curRow, rev);
    }, 500);
    pixiGame.showResultOverlay("win", mult, win);
    engageLockRef.current(2000);
  }, [pixiGame, revealUnselectedEggs, scheduleTimer]);

  // ─────────────────────────────────────────────────────────
  // RANDOM PICK
  // ─────────────────────────────────────────────────────────
  const doRandom = useCallback(() => {
    const s = gs();
    if (s.gstate !== "playing") return;
    const avail: number[] = [];
    for (let c = 0; c < DIFF[s.diff].cols; c++) {
      if (!(s.revealed[s.curRow] ?? {})[c]) avail.push(c);
    }
    if (!avail.length) return;
    const col = avail[Math.floor(Math.random() * avail.length)];

    console.log("🎲 [GAME:RANDOM] Auto-pick tile", {
      gameId: s.gameId,
      timestamp: new Date().toISOString(),
      row: s.curRow,
      col,
      availableCols: avail,
      difficulty: s.diff,
    });

    handleTileClick(s.curRow, col);
  }, [handleTileClick]);

  // ─────────────────────────────────────────────────────────
  // RESET / PLAY AGAIN
  // ─────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    clearPendingTimers();
    clearSession();
    const s = gs();
    console.log("🔄 [GAME:RESET] Play again / reset", {
      previousGameId: s.gameId,
      timestamp: new Date().toISOString(),
      balance: s.balance,
      difficulty: s.diff,
    });
    gs().setRgstate("playagain");
    pixiGame.resetAnimationState();
    pixiGame.swapDragonSprite(false);

    gs().resetRound();
    gs().setGstate("idle");

    const currentDiff = s.diff;
    pixiGame.buildGrid(currentDiff);
    pixiGame.showFlameEffects(false);
    pixiGame.stopLoseSound();
    pixiGame.playNormalBgSound();
    pixiGame.refreshGrid(currentDiff, "idle", 0, {});
  }, [pixiGame, clearPendingTimers]);

  useEffect(() => {
    resetGameRef.current = resetGame;
  }, [resetGame]);

  const engageLock = useCallback(
    (ms = 1000) => {
      // Clear any previous lock timeout so it doesn't unlock prematurely
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      gs().setPlayLock(true);
      pixiGame.panelCooldownRef.current = true;
      lockTimeoutRef.current = setTimeout(() => {
        lockTimeoutRef.current = null;
        gs().setPlayLock(false);
        pixiGame.panelCooldownRef.current = false;
        // Force panel redraw so button visually re-enables
        const s = gs();
        pixiGame.updateMobilePanel?.({
          balance: s.balance,
          bet: s.bet,
          diff: s.diff,
          gstate: s.gstate,
          curMult: s.curMult,
          curWin: s.curWin,
        });
      }, ms);
    },
    [pixiGame],
  );
  useEffect(() => {
    engageLockRef.current = engageLock;
  }, [engageLock]);

  const mPlayAction = useCallback(() => {
    if (gs().playLock) return;
    const s = gs();
    if (s.gstate === "playing" && s.curRow > 0) {
      engageLock(1000);
      cashOut();
    } else if (s.gstate !== "playing") {
      // Clear any leftover animations/timers from previous game before starting
      clearPendingTimers();
      if (s.gstate === "ended") {
        pixiGame.hideResultOverlay();
        pixiGame.swapDragonSprite(false);
        pixiGame.showFlameEffects(false);
        pixiGame.stopLoseSound();
      }
      startGame();
    }
  }, [cashOut, startGame, pixiGame, engageLock, clearPendingTimers]);

  // ─────────────────────────────────────────────────────────
  // DIFFICULTY CHANGE
  // ─────────────────────────────────────────────────────────
  const handleDiffChange = useCallback(
    (v: Difficulty) => {
      const s = gs();
      // Block during active play, but allow during ended (win/lose) or idle
      if (s.gstate === "playing") return;

      // Reset to idle if in ended state
      if (s.gstate === "ended") {
        clearPendingTimers();
        clearSession();
        gs().resetRound();
        gs().setGstate("idle");
        gs().setRgstate("playagain");
        pixiGame.hideResultOverlay();
        pixiGame.swapDragonSprite(false);
        pixiGame.showFlameEffects(false);
        pixiGame.stopLoseSound();
        pixiGame.playNormalBgSound();
      }

      console.log("⚙️ [GAME:SETTINGS] Difficulty changed", {
        timestamp: new Date().toISOString(),
        from: s.diff,
        to: v,
        newConfig: DIFF[v],
        balance: s.balance,
        // 🔌 API: POST /api/user/settings (optional — only if persisting preferences)
        // Payload: { difficulty: v }
      });

      gs().setDiff(v);
      pixiGame.buildGrid(v);
      pixiGame.refreshGrid(v, "idle", 0, {});
    },
    [pixiGame, clearPendingTimers],
  );

  // Wire up panel callback refs
  useEffect(() => {
    diffChangeCbRef.current = handleDiffChange;
  }, [handleDiffChange]);
  useEffect(() => {
    playActionCbRef.current = mPlayAction;
  }, [mPlayAction]);
  useEffect(() => {
    randomCbRef.current = doRandom;
  }, [doRandom]);

  // ─────────────────────────────────────────────────────────
  // AUTOBET
  // ─────────────────────────────────────────────────────────
  const stopAutobet = useCallback(() => {
    const s = gs();
    console.log("⏹ [AUTO:STOP] Autobet stopped", {
      timestamp: new Date().toISOString(),
      totalProfit: s.autoTotalProfit,
      roundsCompleted: s.auto.autoCount,
      balance: s.balance,
      reason: "manual stop",
      // 🔌 API: POST /api/autobet/stop
      // Payload: { totalProfit, roundsCompleted, balance, reason: "manual" }
    });

    gs().setAutoRunning(false);
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    autoTimeoutRef.current = null;

    if (s.gstate === "playing" && s.curRow > 0) cashOut();
    else if (s.gstate === "playing") {
      gs().setGstate("ended");
      pixiGame.refreshGrid(s.diff, "ended", s.curRow, s.revealed);
    }
  }, [cashOut, pixiGame]);

  const autoPlayRows = useCallback(() => {
    const s = gs();

    if (!s.autoRunning || s.gstate !== "playing") {
      if (!s.autoRunning) return;

      const settings = s.auto;
      const roundWon = s.autoLastRoundWon;
      const roundProfit = roundWon
        ? s.curWin - settings.autoBet
        : -settings.autoBet;

      gs().setAutoTotalProfit(s.autoTotalProfit + roundProfit);

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
        gameId: s.gameId,
        timestamp: new Date().toISOString(),
        result: roundWon ? "win" : "lose",
        roundProfit,
        roundBet: settings.autoBet,
        nextBet: newBet,
        totalProfit: gs().autoTotalProfit,
        roundsLeft: gs().autoCount,
        balance: gs().balance,
        difficulty: settings.autoDiff,
      });

      gs().setAuto({ autoBet: newBet });

      autoTimeoutRef.current = setTimeout(() => {
        runNextAutoRoundRef.current();
      }, 3000);
      return;
    }

    const delay = 600 + Math.random() * 500;
    autoTimeoutRef.current = setTimeout(() => {
      const cur = gs();
      if (!cur.autoRunning || cur.gstate !== "playing") {
        autoPlayRows();
        return;
      }
      const avail: number[] = [];
      for (let c = 0; c < DIFF[cur.diff].cols; c++) {
        if (!(cur.revealed[cur.curRow] ?? {})[c]) avail.push(c);
      }
      if (!avail.length) {
        autoPlayRows();
        return;
      }
      const col = avail[Math.floor(Math.random() * avail.length)];
      handleTileClick(cur.curRow, col);
      autoTimeoutRef.current = setTimeout(() => {
        autoPlayRows();
      }, 150);
    }, delay);
  }, [handleTileClick]);

  const runNextAutoRound = useCallback(() => {
    const s = gs();
    if (!s.autoRunning) return;

    const settings = s.auto;

    if (!s.autoIsInfinite && s.autoCount <= 0) {
      console.log("🏁 [AUTO:COMPLETE] All rounds done", {
        timestamp: new Date().toISOString(),
        totalProfit: s.autoTotalProfit,
        balance: s.balance,
        difficulty: settings.autoDiff,
      });
      showToast("Auto: All rounds complete!");
      stopAutobet();
      return;
    }
    if (settings.stopProfit > 0 && s.autoTotalProfit >= settings.stopProfit) {
      console.log("🎯 [AUTO:STOP_PROFIT] Stop profit target hit", {
        timestamp: new Date().toISOString(),
        totalProfit: s.autoTotalProfit,
        stopProfitTarget: settings.stopProfit,
        balance: s.balance,
      });
      showToast("Auto: Stop on Profit reached!");
      stopAutobet();
      return;
    }
    if (settings.stopLoss > 0 && s.autoTotalProfit <= -settings.stopLoss) {
      console.log("🛑 [AUTO:STOP_LOSS] Stop loss limit hit", {
        timestamp: new Date().toISOString(),
        totalProfit: s.autoTotalProfit,
        stopLossTarget: settings.stopLoss,
        balance: s.balance,
      });
      showToast("Auto: Stop on Loss reached!");
      stopAutobet();
      return;
    }
    if (settings.autoBet > s.balance) {
      console.log("💸 [AUTO:INSUFFICIENT] Not enough balance", {
        timestamp: new Date().toISOString(),
        requiredBet: settings.autoBet,
        balance: s.balance,
        shortfall: parseFloat((settings.autoBet - s.balance).toFixed(2)),
      });
      showToast("Auto: Insufficient balance!");
      stopAutobet();
      return;
    }

    if (s.autoCount > 0) {
      gs().setAutoCount(s.autoCount - 1);
      gs().setAuto({ autoCount: s.auto.autoCount - 1 });
    }

    gs().setBet(settings.autoBet);
    startGame(settings.autoBet, settings.autoDiff);
    autoPlayRows();
  }, [stopAutobet, showToast, startGame, autoPlayRows]);

  useEffect(() => {
    runNextAutoRoundRef.current = runNextAutoRound;
  }, [runNextAutoRound]);

  const startAutobet = useCallback(() => {
    const settings = gs().auto;

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
      balanceAtStart: gs().balance,
      // 🔌 API: POST /api/autobet/start
      // Payload: { bet, difficulty, rounds, advanced, onWinMode, winInc, onLossMode, lossInc, stopProfit, stopLoss }
    });

    gs().setAutoRunning(true);
    gs().setAutoTotalProfit(0);
    gs().setAutoCount(settings.autoCount);
    gs().setAutoIsInfinite(settings.autoCount === 0);
    runNextAutoRound();
  }, [runNextAutoRound]);

  const toggleAutobet = useCallback(() => {
    if (gs().autoRunning) stopAutobet();
    else startAutobet();
  }, [startAutobet, stopAutobet]);

  // ── Init grid on mount ─────────────────────────────────
  useEffect(() => {
    console.log("🚀 [GAME:INIT] DragonTower mounted", {
      timestamp: new Date().toISOString(),
      initialBalance: gs().balance,
      initialBet: gs().bet,
      defaultDifficulty: "Medium",
      testMode: gs().testMode,
      // 🔌 API: GET /api/user/profile
      // Response: { userId, balance, preferences: { difficulty, bet }, activeGame? }
      // Use this to hydrate the store on mount instead of localStorage
    });

    const tid = setTimeout(async () => {
      await pixiGame.loadTextures();
      pixiGame.preloadSounds();
      pixiGame.buildVignette();
      pixiGame.buildMobilePanel();

      const session = loadSession();
      console.log("🔍 Session on mount:", session);

      const applyBalance = () => {
        if (gs().testMode) {
          console.log("🧪 TEST_MODE on — resetting balance to default");
          // balance already initialized in store
        } else {
          const savedBalance = loadBalance();
          if (savedBalance !== null) {
            console.log("💰 Restoring saved balance:", savedBalance);
            gs().setBalance(savedBalance);
          }
        }
      };

      if (session && session.gstate === "playing") {
        console.log("🔄 [SESSION:RESTORE] Restoring in-progress game", {
          timestamp: new Date().toISOString(),
          sessionDiff: session.diff,
          sessionRow: session.curRow,
          sessionBet: session.bet,
          sessionMult: session.curMult,
          sessionWin: session.curWin,
          // 🔌 API: GET /api/game/restore
          // Payload: (none — server knows active game from auth token)
          // Response: { gameId, tower (server-side), curRow, revealed, bet, curMult, curWin, balance }
          // NOTE: In production, restore game state from SERVER, not localStorage
        });

        gs().setTower(session.tower);
        gs().setBet(session.bet);
        gs().setCurMult(session.curMult);
        gs().setCurWin(session.curWin);
        gs().setDiff(session.diff);
        gs().setGstate("playing");
        gs().setCurRow(session.curRow);
        gs().setRevealed(session.revealed);

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
        const s = gs();
        pixiGame.buildGrid(s.diff);
        pixiGame.refreshGrid(s.diff, s.gstate, s.curRow, s.revealed);
      }
      mountedRef.current = true;
    }, 100);
    return () => clearTimeout(tid);
  }, []); // eslint-disable-line

  // ── Update PixiJS mobile panel on state changes ────────
  useEffect(() => {
    pixiGame.updateMobilePanel?.({
      balance,
      bet,
      diff,
      gstate,
      curMult,
      curWin,
    });
  }, [balance, bet, diff, gstate, curMult, curWin, pixiGame]);

  // ── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const s = gs();
      if (s.playLock) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (s.gstate === "playing" && s.curMult > 1) cashOut();
        else if (s.gstate !== "playing") startGame();
      } else if (e.code === "KeyR" && s.gstate === "playing") {
        e.preventDefault();
        doRandom();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cashOut, startGame, doRandom]);

  // ── Render ────────────────────────────────────────────
  return (
    <div id="app">
      <LeftPanel
        onDiffChange={handleDiffChange}
        onStartGame={() => startGame()}
        onCashOut={cashOut}
        onRandom={doRandom}
        onAutoToggle={toggleAutobet}
      />

      <div id="game-panel">
        <div id="dragon-bg"></div>
        <div id="canvas-wrap" ref={canvasWrapRef}></div>
      </div>

      <Toast message={toast} />
    </div>
  );
};

export default DragonTower;
