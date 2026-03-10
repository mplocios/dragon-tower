import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { DragonTowerCanvas } from './DragonTowerCanvas';
import {
  GameState,
  Difficulty,
  initializeGame,
  selectTile,
  nextLevel,
} from '../lib/dragonTower';

export const DragonTowerGame = (): JSX.Element => {
  const [betAmount, setBetAmount] = useState('1.00');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [totalWinnings, setTotalWinnings] = useState(0);

  const handleStartGame = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet > balance || bet <= 0) {
      console.error('Invalid bet:', bet, 'Balance:', balance);
      return;
    }

    console.log('Starting game with bet:', bet, 'Difficulty:', difficulty);
    setBalance(balance - bet);
    const newGameState = initializeGame(difficulty);
    console.log('Initialized game:', newGameState);
    setGameState(newGameState);
    setGameStarted(true);
    setTotalWinnings(0);
  };

  const handleTileSelect = (tileId: string) => {
    if (!gameState || !gameState.gameActive) return;

    const newState = selectTile(gameState, tileId);
    setGameState(newState);

    if (!newState.gameActive && !newState.tiles.find((t) => t.id === tileId)?.isSafe) {
      setGameStarted(false);
    }
  };

  const handleCashOut = () => {
    if (!gameState) return;

    const winnings = parseFloat(betAmount) * gameState.currentMultiplier;
    setBalance(balance + winnings);
    setTotalWinnings(winnings);
    setGameStarted(false);
    setGameState(null);
  };

  const handleContinue = () => {
    if (!gameState) return;

    setGameState(nextLevel(gameState));
  };

  const canCashOut = gameState && gameState.gameActive && gameState.currentLevel > 0;
  const hasLost = gameState && !gameState.gameActive && !gameState.tiles.find((t) => t.id === gameState.selectedTileId)?.isSafe;

  return (
    <div className="flex flex-col gap-6 w-full bg-[#1a191d] rounded-[20px] p-6">
      <div className="w-full flex-1">
        {gameStarted && gameState ? (
          <DragonTowerCanvas
            gameState={gameState}
            onTileSelect={handleTileSelect}
            disabled={!gameState.gameActive}
          />
        ) : (
          <div className="bg-[#0f0e12] rounded-lg h-[600px] flex items-center justify-center text-[#b4b4b4]">
            <p>Set your bet and start the game to begin climbing the tower!</p>
          </div>
        )}
      </div>

      <div className="w-full">
        <div className="space-y-4">
          <div>
            <Label className="text-[#b4b4b4] text-sm mb-2 block">
              Balance
            </Label>
            <div className="bg-[#0f0e12] rounded-lg px-4 py-3 text-white font-semibold">
              ${balance.toFixed(2)}
            </div>
          </div>

          <div>
            <Label className="text-[#b4b4b4] text-sm mb-2 block">
              Bet Amount
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={gameStarted}
                min="0.01"
                step="0.01"
                className="bg-[#0f0e12] border-2 border-[#282a2f] text-white"
              />
              <Button
                onClick={() => setBetAmount((Math.max(0.01, parseFloat(betAmount) / 2)).toFixed(2))}
                disabled={gameStarted}
                className="bg-[#282a2f] hover:bg-[#33333a] text-white"
              >
                ½
              </Button>
              <Button
                onClick={() => setBetAmount((parseFloat(betAmount) * 2).toFixed(2))}
                disabled={gameStarted}
                className="bg-[#282a2f] hover:bg-[#33333a] text-white"
              >
                2×
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-[#b4b4b4] text-sm mb-2 block">
              Difficulty
            </Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)} disabled={gameStarted}>
              <SelectTrigger className="bg-[#0f0e12] border-2 border-[#282a2f] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy (5 safe tiles, 1.2x)</SelectItem>
                <SelectItem value="medium">Medium (3 safe tiles, 1.5x)</SelectItem>
                <SelectItem value="hard">Hard (2 safe tiles, 2.0x)</SelectItem>
                <SelectItem value="expert">Expert (2 safe tiles, 2.5x)</SelectItem>
                <SelectItem value="master">Master (1 safe tile, 3.0x)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!gameStarted ? (
            <Button
              onClick={handleStartGame}
              disabled={parseFloat(betAmount) > balance || parseFloat(betAmount) <= 0}
              className="w-full bg-[#eaff00] hover:bg-[#d4e600] text-[#05080a] font-semibold py-3 rounded-lg text-base"
            >
              Start Game
            </Button>
          ) : (
            <div className="space-y-2">
              {canCashOut && (
                <Button
                  onClick={handleCashOut}
                  className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-3 rounded-lg"
                >
                  Cash Out - ${(parseFloat(betAmount) * gameState!.currentMultiplier).toFixed(2)}
                </Button>
              )}
              {gameState?.gameActive && gameState.currentLevel > 0 && (
                <Button
                  onClick={handleContinue}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3 rounded-lg"
                >
                  Continue to Next Level
                </Button>
              )}
              {hasLost && (
                <div>
                  <div className="text-red-500 text-center py-3 font-semibold text-lg mb-2">
                    Game Over! You lost!
                  </div>
                  <Button
                    onClick={() => {
                      setGameStarted(false);
                      setGameState(null);
                    }}
                    className="w-full bg-[#eaff00] hover:bg-[#d4e600] text-[#05080a] font-semibold py-3 rounded-lg"
                  >
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {gameState && (
            <div className="bg-[#0f0e12] rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-white">
                <span className="text-[#b4b4b4]">Current Level:</span>
                <span className="font-semibold text-lg">{gameState.currentLevel}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-[#b4b4b4]">Multiplier:</span>
                <span className="font-semibold text-lg text-[#eaff00]">{gameState.currentMultiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-[#b4b4b4]">Potential Win:</span>
                <span className="font-semibold text-lg text-[#22c55e]">
                  ${(parseFloat(betAmount) * gameState.currentMultiplier).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {totalWinnings > 0 && (
            <div className="bg-[#22c55e]/20 rounded-lg p-4 text-center border border-[#22c55e]">
              <div className="text-[#22c55e] font-semibold text-lg">
                You Won: ${totalWinnings.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
