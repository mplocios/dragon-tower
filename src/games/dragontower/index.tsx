import React, { useRef, useCallback, useEffect } from "react";
import { Difficulty, GameState, TileContent, HistoryEntry } from "./types";
import { DIFF, MULTS, MIN_BET } from "./constants";
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
  const autoInitialBetRef = useRef<number>(0);
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

      const instant = gs().instantBet;

      gs().revealTile(r, c, type);

      // ── HIT DRAGON ──────────────────────────────────────
      if (type === "dragon") {
        if (!instant) engageLockRef.current(1500);
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
        });

        gs().setRgstate("endgame");
        gs().setPlayLock(true);
        pixiGame.panelCooldownRef.current = true;
        if (gs().autoRunning) {
          const roundProfit = parseFloat((-s.bet).toFixed(2));
          const newTotalProfit = parseFloat(
            (gs().autoTotalProfit + roundProfit).toFixed(2),
          );
          gs().setAutoTotalProfit(newTotalProfit);
        }

        if (instant) {
          pixiGame.stopNormalBgSound();
          pixiGame.playLoseSound();
          const revealed = gs().revealed;
          pixiGame.refreshGrid(s.diff, "ended", s.curRow, revealed);
          const rev = revealUnselectedEggs();
          pixiGame.refreshGrid(s.diff, "ended", s.curRow, rev);
          pixiGame.showResultOverlay("lose", 0, s.bet);
          engageLockRef.current(500);
        } else {
          pixiGame.stopNormalBgSound();
          pixiGame.playLoseSound();
          pixiGame.spawnLoseExplosion(r, c, s.diff);
          pixiGame.screenShake();

          const revealed = gs().revealed;
          pixiGame.refreshGrid(s.diff, "ended", s.curRow, revealed);
          pixiGame.swapDragonSprite(false);

          scheduleTimer(() => {
            const rev = revealUnselectedEggs();
            pixiGame.refreshGrid(s.diff, "ended", s.curRow, rev);
          }, 500);

          scheduleTimer(() => {
            if (!gs().autoRunning) pixiGame.showResultOverlay("lose", 0, s.bet);
            engageLockRef.current(2000);
          }, 900);
        }

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

        // ── HIT EGG ─────────────────────────────────────────
      } else {
        pixiGame.playEggSound();
        if (!instant) {
          pixiGame.spawnFX(r, c, "sparkle", s.diff);
        }
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
            });

            if (instant) {
              pixiGame.stopNormalBgSound();
              const rev = gs().revealed;
              pixiGame.refreshGrid(s.diff, "ended", nextRow, rev);
              const dimRev = revealUnselectedEggs();
              pixiGame.refreshGrid(s.diff, "ended", nextRow, dimRev);
              pixiGame.showResultOverlay("win", newMult, newWin);
              engageLockRef.current(500);
            } else {
              pixiGame.stopNormalBgSound();
              pixiGame.swapDragonSprite(true);
              pixiGame.showFlameEffects(true, true);

              const rev = gs().revealed;
              pixiGame.refreshGrid(s.diff, "ended", nextRow, rev);

              scheduleTimer(() => {
                const dimRev = revealUnselectedEggs();
                pixiGame.refreshGrid(s.diff, "ended", nextRow, dimRev);
              }, 500);
              scheduleTimer(() => {
                if (!gs().autoRunning)
                  pixiGame.showResultOverlay("win", newMult, newWin);
                engageLockRef.current(2000);
              }, 500);
            }

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
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
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
    });

    gs().setRgstate("endgame");
    gs().setPlayLock(true);
    pixiGame.panelCooldownRef.current = true;
    if (gs().autoRunning) {
      const roundProfit = parseFloat((win - s.bet).toFixed(2));
      const newTotalProfit = parseFloat(
        (gs().autoTotalProfit + roundProfit).toFixed(2),
      );
      gs().setAutoTotalProfit(newTotalProfit);
    }
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

    scheduleTimer(() => {
      const rev = revealUnselectedEggs();
      pixiGame.refreshGrid(s.diff, "ended", s.curRow, rev);
    }, 500);
    if (!gs().autoRunning) pixiGame.showResultOverlay("win", mult, win);
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
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      gs().setPlayLock(true);
      pixiGame.panelCooldownRef.current = true;
      lockTimeoutRef.current = setTimeout(() => {
        lockTimeoutRef.current = null;
        gs().setPlayLock(false);
        pixiGame.panelCooldownRef.current = false;
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
      if (s.gstate === "playing") return;

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
      });

      gs().setDiff(v);
      gs().clearAutoPattern();
      pixiGame.buildGrid(v);
      pixiGame.refreshGrid(v, "idle", 0, {});
    },
    [pixiGame, clearPendingTimers],
  );

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
    });

    gs().setAutoRunning(false);
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    autoTimeoutRef.current = null;

    if (s.gstate === "playing" && s.curRow > 0) {
      cashOut();
    } else if (s.gstate === "playing" && s.curRow === 0) {
      const refunded = s.balance + s.bet;
      gs().setBalance(refunded);
      clearPendingTimers();
      clearSession();
      gs().resetRound();
      gs().setGstate("idle");
      pixiGame.resetAnimationState();
      pixiGame.swapDragonSprite(false);
      pixiGame.showFlameEffects(false);
      pixiGame.stopLoseSound();
      pixiGame.stopNormalBgSound();
      pixiGame.buildGrid(s.diff);
      pixiGame.refreshGrid(s.diff, "idle", 0, {});
      showToast("Autobet stopped — bet refunded.");
    }
  }, [cashOut, pixiGame, clearPendingTimers, showToast]);

  // ─────────────────────────────────────────────────────────
  // AUTO PLAY WITH PATTERN (instant all-at-once)
  // ─────────────────────────────────────────────────────────
  const autoPlayWithPattern = useCallback(() => {
    const s = gs();
    if (!s.autoRunning || s.gstate !== "playing") return;

    const pattern = s.autoPattern;
    const tower = s.tower;
    const diffCfg = DIFF[s.diff];

    let maxPatternRow = -1;
    for (let r = 0; r < pattern.length; r++) {
      if (pattern[r] !== null) maxPatternRow = r;
      else break;
    }
    if (maxPatternRow < 0) return;

    let lastSafeRow = -1;
    let dragonRow = -1;
    let dragonCol = -1;
    const revealed: Record<number, Record<number, TileContent>> = {};

    for (let r = 0; r <= maxPatternRow; r++) {
      const col = pattern[r]!;
      const tileContent = tower[r]?.[col];

      if (tileContent === "dragon") {
        dragonRow = r;
        dragonCol = col;
        revealed[r] = { [col]: "dragon" };
        break;
      } else {
        revealed[r] = { [col]: "egg" };
        lastSafeRow = r;
      }
    }

    gs().setRevealed(revealed);

    if (dragonRow >= 0) {
      gs().setCurRow(dragonRow);
      if (dragonRow > 0) {
        const prevMult = MULTS[s.diff][dragonRow - 1] ?? 1;
        gs().setCurMult(prevMult);
        gs().setCurWin(parseFloat((s.bet * prevMult).toFixed(2)));
      }

      engageLockRef.current(1500);
      gs().setGstate("ended");
      clearSession();
      gs().setAutoLastRoundWon(false);
      gs().setRgstate("endgame");
      gs().setPlayLock(true);
      pixiGame.panelCooldownRef.current = true;

      const roundProfit = parseFloat((-s.bet).toFixed(2));
      const newTotalProfit = parseFloat(
        (gs().autoTotalProfit + roundProfit).toFixed(2),
      );
      gs().setAutoTotalProfit(newTotalProfit);

      pixiGame.stopNormalBgSound();
      pixiGame.playLoseSound();
      pixiGame.spawnLoseExplosion(dragonRow, dragonCol, s.diff);
      pixiGame.screenShake();
      pixiGame.refreshGrid(s.diff, "ended", dragonRow, revealed);
      pixiGame.swapDragonSprite(false);

      const loseEntry: HistoryEntry = {
        id: s.gameId,
        timestamp: Date.now(),
        difficulty: s.diff,
        bet: s.bet,
        result: "lose",
        multiplier: 0,
        payout: 0,
        profit: -s.bet,
        rowsCleared: dragonRow,
      };
      gs().addHistoryEntry(loseEntry);

      scheduleTimer(() => {
        const rev = revealUnselectedEggs();
        pixiGame.refreshGrid(s.diff, "ended", dragonRow, rev);
      }, 500);
      scheduleTimer(() => {
        pixiGame.showResultOverlay("lose", 0, s.bet);
        engageLockRef.current(2000);
      }, 900);

      autoTimeoutRef.current = setTimeout(() => {
        runNextAutoRoundRef.current();
      }, 2000);
    } else {
      const cashoutRow = lastSafeRow;
      const mult = MULTS[s.diff][cashoutRow] ?? 1;
      const win = parseFloat((s.bet * mult).toFixed(2));

      gs().setCurRow(cashoutRow + 1);
      gs().setCurMult(mult);
      gs().setCurWin(win);

      if (cashoutRow + 1 >= diffCfg.rows) {
        const newBal = s.balance + win;
        gs().setBalance(newBal);
        gs().setGstate("ended");
        gs().setRgstate("endgame");
        gs().setAutoLastRoundWon(true);
        gs().setPlayLock(true);
        pixiGame.panelCooldownRef.current = true;

        const roundProfit = parseFloat((win - s.bet).toFixed(2));
        const newTotalProfit = parseFloat(
          (gs().autoTotalProfit + roundProfit).toFixed(2),
        );
        gs().setAutoTotalProfit(newTotalProfit);

        pixiGame.stopNormalBgSound();
        pixiGame.swapDragonSprite(true);
        pixiGame.showFlameEffects(true, true);
        pixiGame.refreshGrid(s.diff, "ended", cashoutRow + 1, revealed);

        const winEntry: HistoryEntry = {
          id: s.gameId,
          timestamp: Date.now(),
          difficulty: s.diff,
          bet: s.bet,
          result: "win",
          multiplier: mult,
          payout: win,
          profit: parseFloat((win - s.bet).toFixed(2)),
          rowsCleared: cashoutRow + 1,
        };
        gs().addHistoryEntry(winEntry);

        scheduleTimer(() => {
          const rev = revealUnselectedEggs();
          pixiGame.refreshGrid(s.diff, "ended", cashoutRow + 1, rev);
        }, 500);
        scheduleTimer(() => {
          pixiGame.showResultOverlay("win", mult, win);
          engageLockRef.current(2000);
        }, 500);
      } else {
        const newBal = s.balance + win;
        gs().setBalance(newBal);
        gs().setGstate("ended");
        gs().setRgstate("endgame");
        gs().setAutoLastRoundWon(true);
        gs().setPlayLock(true);
        pixiGame.panelCooldownRef.current = true;

        const roundProfit = parseFloat((win - s.bet).toFixed(2));
        const newTotalProfit = parseFloat(
          (gs().autoTotalProfit + roundProfit).toFixed(2),
        );
        gs().setAutoTotalProfit(newTotalProfit);

        pixiGame.stopNormalBgSound();
        pixiGame.swapDragonSprite(true);
        pixiGame.showFlameEffects(true, true);
        pixiGame.refreshGrid(s.diff, "ended", cashoutRow + 1, revealed);

        const cashEntry: HistoryEntry = {
          id: s.gameId,
          timestamp: Date.now(),
          difficulty: s.diff,
          bet: s.bet,
          result: "win",
          multiplier: mult,
          payout: win,
          profit: parseFloat((win - s.bet).toFixed(2)),
          rowsCleared: cashoutRow + 1,
        };
        gs().addHistoryEntry(cashEntry);

        scheduleTimer(() => {
          const rev = revealUnselectedEggs();
          pixiGame.refreshGrid(s.diff, "ended", cashoutRow + 1, rev);
        }, 500);
        pixiGame.showResultOverlay("win", mult, win);
        engageLockRef.current(2000);
      }

      autoTimeoutRef.current = setTimeout(() => {
        runNextAutoRoundRef.current();
      }, 2000);
    }
  }, [pixiGame, revealUnselectedEggs, scheduleTimer]);

  const autoPlayRows = useCallback(() => {
    const s = gs();

    if (!s.autoRunning || s.gstate !== "playing") {
      if (!s.autoRunning) return;

      const settings = s.auto;
      const roundWon = s.autoLastRoundWon;

      console.log(`${roundWon ? "✅" : "❌"} [AUTO:ROUND_END] Round finished`, {
        gameId: s.gameId,
        timestamp: new Date().toISOString(),
        result: roundWon ? "win" : "lose",
        totalProfit: gs().autoTotalProfit,
        roundsLeft: gs().autoCount,
        balance: gs().balance,
        difficulty: settings.autoDiff,
      });

      // ── FIXED: Use autoInitialBetRef for resets, compound on current bet for increases ──
      const currentBet = settings.autoBet;
      const initialBet = autoInitialBetRef.current;
      let newBet = currentBet;

      if (settings.autoAdvanced) {
        if (roundWon) {
          if (settings.onWinMode === "increase" && settings.winInc > 0) {
            newBet = parseFloat(
              (currentBet * (1 + settings.winInc / 100)).toFixed(2),
            );
            newBet = Math.min(newBet, gs().balance);
            if (newBet < MIN_BET) newBet = MIN_BET;
          } else if (settings.onWinMode === "reset") {
            newBet = initialBet;
          }
        } else {
          if (settings.onLossMode === "increase" && settings.lossInc > 0) {
            newBet = parseFloat(
              (currentBet * (1 + settings.lossInc / 100)).toFixed(2),
            );
            newBet = Math.min(newBet, gs().balance);
            if (newBet < MIN_BET) newBet = MIN_BET;
          } else if (settings.onLossMode === "reset") {
            newBet = initialBet;
          }
        }
        gs().setAuto({ autoBet: newBet });
      }

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

      const cashoutRow = cur.auto.autoCashoutRow ?? 0;
      if (cashoutRow > 0 && cur.curRow >= cashoutRow && cur.curMult > 1) {
        console.log(
          "💰 [AUTO:CASHOUT] Auto-cashout triggered at row",
          cur.curRow,
        );
        cashOut();
        autoTimeoutRef.current = setTimeout(() => {
          runNextAutoRoundRef.current();
        }, 2000);
        return;
      }

      const col = avail[Math.floor(Math.random() * avail.length)];
      handleTileClick(cur.curRow, col);
      autoTimeoutRef.current = setTimeout(() => {
        autoPlayRows();
      }, 150);
    }, delay);
  }, [handleTileClick, cashOut]);

  // ─────────────────────────────────────────────────────────
  // RUN NEXT AUTO ROUND — FIXED BET ADJUSTMENT LOGIC
  // ─────────────────────────────────────────────────────────
  const runNextAutoRound = useCallback(() => {
    const s = gs();
    if (!s.autoRunning) return;

    const settings = s.auto;
    const roundWon = s.autoLastRoundWon;

    // ── Adjust bet based on win/loss ──────────────────────────
    // Key rules:
    //   - "increase" compounds on the CURRENT bet each round it applies
    //   - "reset" always returns to autoInitialBetRef.current (the bet set when autobet started)
    //   - These two modes are independent per win/loss, so:
    //     onWin=increase + onLoss=reset → win: compound up, lose: snap back to start
    //     onWin=reset + onLoss=increase → win: snap back to start, lose: compound up
    let newBet = settings.autoBet;

    if (settings.autoAdvanced) {
      const currentBet = settings.autoBet;
      const initialBet = autoInitialBetRef.current;
      newBet = currentBet;

      if (roundWon) {
        if (settings.onWinMode === "increase" && settings.winInc > 0) {
          // Compound the increase on top of whatever the bet currently is
          newBet = parseFloat(
            (currentBet * (1 + settings.winInc / 100)).toFixed(2),
          );
          newBet = Math.min(newBet, gs().balance);
          if (newBet < MIN_BET) newBet = MIN_BET;
        } else if (settings.onWinMode === "reset") {
          // Always reset to the original starting bet
          newBet = initialBet;
        }
      } else {
        // Lost
        if (settings.onLossMode === "increase" && settings.lossInc > 0) {
          // Compound the increase on top of whatever the bet currently is
          newBet = parseFloat(
            (currentBet * (1 + settings.lossInc / 100)).toFixed(2),
          );
          newBet = Math.min(newBet, gs().balance);
          if (newBet < MIN_BET) newBet = MIN_BET;
        } else if (settings.onLossMode === "reset") {
          // Always reset to the original starting bet
          newBet = initialBet;
        }
      }

      if (newBet !== currentBet) {
        gs().setAuto({ autoBet: newBet });
      }
    }

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

    const betToUse = settings.autoAdvanced ? newBet : settings.autoBet;
    gs().setBet(betToUse);
    startGame(betToUse, settings.autoDiff);

    const pattern = gs().autoPattern;
    const hasPattern = pattern.some((col) => col !== null);
    if (hasPattern) {
      autoTimeoutRef.current = setTimeout(() => {
        autoPlayWithPattern();
      }, 100);
    } else {
      autoPlayRows();
    }
  }, [stopAutobet, showToast, startGame, autoPlayRows, autoPlayWithPattern]);

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
    });

    gs().setAutoRunning(true);
    gs().setAutoTotalProfit(0);
    gs().setAutoCount(settings.autoCount);
    gs().setAutoIsInfinite(settings.autoCount === 0);
    // Snapshot the starting bet — this is the value "reset" always returns to
    autoInitialBetRef.current = settings.autoBet;
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

  // ── Sync volume changes to active sounds ──────────────
  const storeVolume = useGameStore((s) => s.volume);
  useEffect(() => {
    pixiGame.updateAllSoundVolumes?.(storeVolume);
  }, [storeVolume, pixiGame]);

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
      if (!s.hotkeysEnabled) return;

      // ── "R" only: works in auto tab when autobet is running ── disabled for now since it was causing confusion and isn't a critical feature
      // if (
      //   e.code === "KeyR" &&
      //   s.gstate === "playing" &&
      //   s.autoRunning &&
      //   s.curRow > 0
      // ) {
      //   e.preventDefault();
      //   const prevRow = s.curRow - 1;
      //   const newRevealed = { ...s.revealed };
      //   delete newRevealed[prevRow];
      //   gs().setRevealed(newRevealed);
      //   gs().setCurRow(prevRow);
      //   const mults = MULTS[s.diff];
      //   gs().setCurMult(prevRow === 0 ? 1 : mults[prevRow - 1]);
      //   gs().setCurWin(
      //     prevRow === 0 ? 0 : s.bet * (prevRow === 0 ? 1 : mults[prevRow - 1]),
      //   );
      //   pixiGame.refreshGrid(s.diff, s.gstate, prevRow, newRevealed);
      //   return;
      // }

      // ── All other hotkeys: manual tab only, never during autobet ──
      if (pixiGame.autoTabActiveRef.current) return;
      if (s.autoRunning) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (s.gstate === "playing" && s.curMult > 1) cashOut();
        else if (s.gstate !== "playing") startGame();
        return;
      }

      const cols = DIFF[s.diff].cols;

      if (e.code >= "Digit1" && e.code <= "Digit4") {
        e.preventDefault();
        const col = parseInt(e.code.charAt(5)) - 1;
        if (s.gstate === "playing" && col < cols) {
          handleTileClick(s.curRow, col);
        }
        return;
      }

      if (e.code === "KeyQ" && s.gstate === "playing") {
        e.preventDefault();
        doRandom();
        return;
      }

      if (e.code === "KeyW" && s.gstate === "playing" && s.curMult > 1) {
        e.preventDefault();
        cashOut();
        return;
      }

      if (e.code === "KeyS" && s.gstate !== "playing") {
        e.preventDefault();
        const doubled = Math.min(s.bet * 2, s.balance);
        gs().setBet(parseFloat(doubled.toFixed(2)));
        return;
      }

      if (e.code === "KeyA" && s.gstate !== "playing") {
        e.preventDefault();
        const halved = Math.max(s.bet / 2, MIN_BET);
        gs().setBet(parseFloat(halved.toFixed(2)));
        return;
      }

      if (e.code === "KeyD" && s.gstate !== "playing") {
        e.preventDefault();
        gs().setBet(0);
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cashOut, startGame, doRandom, handleTileClick]);

  // ── Render ────────────────────────────────────────────
  return (
    <div id="dragon-app">
      <LeftPanel
        onDiffChange={handleDiffChange}
        onStartGame={() => startGame()}
        onCashOut={cashOut}
        onRandom={doRandom}
        onAutoToggle={toggleAutobet}
        onTabChange={(tab) => {
          pixiGame.autoTabActiveRef.current = tab === "auto";
          const s = gs();
          pixiGame.refreshGrid(s.diff, s.gstate, s.curRow, s.revealed);
        }}
        onPatternClear={() => {
          const s = gs();
          pixiGame.refreshGrid(s.diff, s.gstate, s.curRow, s.revealed);
        }}
      />

      <div id="game-panel-outer">
        <div id="game-panel">
          <div id="dragon-bg"></div>
          <div id="canvas-wrap" ref={canvasWrapRef}></div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
};

export default DragonTower;
