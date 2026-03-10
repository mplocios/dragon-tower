import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameState, Tile } from '../lib/dragonTower';

interface DragonTowerCanvasProps {
  gameState: GameState;
  onTileSelect: (tileId: string) => void;
  disabled: boolean;
}

export const DragonTowerCanvas = ({ gameState, onTileSelect, disabled }: DragonTowerCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const tileGraphicsRef = useRef<Map<string, PIXI.Container>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 600 });

  useEffect(() => {
    if (!canvasRef.current) return;

    const updateSize = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initApp = async () => {
      if (appRef.current) return;

      try {
        const app = new PIXI.Application({
          width: canvasSize.width || 1000,
          height: canvasSize.height || 600,
          backgroundColor: 0x0f0e12,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (canvasRef.current) {
          canvasRef.current.appendChild(app.canvas);
          appRef.current = app;
        }
      } catch (error) {
        console.error('Failed to initialize PIXI app:', error);
      }
    };

    initApp();

    return () => {
      if (appRef.current && canvasRef.current && appRef.current.canvas.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(appRef.current.canvas);
        appRef.current.destroy(true, true);
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!appRef.current) {
      return;
    }

    const app = appRef.current;

    if (canvasSize.width > 0 && canvasSize.height > 0) {
      app.renderer.resize(canvasSize.width, canvasSize.height);
    }

    const stage = app.stage;

    stage.removeChildren();
    tileGraphicsRef.current.clear();

    const padding = 40;
    const tileSize = 90;
    const tileGap = 20;
    const rowGap = 50;
    const config = gameState.tiles;

    const totalWidth = config.length * tileSize + (config.length - 1) * tileGap;
    const startX = (app.screen.width - totalWidth) / 2;
    const startY = padding + (gameState.currentLevel * (tileSize + rowGap));

    const revealedSafeCount = config.filter((t) => t.isRevealed && t.isSafe).length;

    config.forEach((tile, index) => {
      const container = new PIXI.Container();
      const x = startX + index * (tileSize + tileGap);
      const y = startY;

      container.x = x;
      container.y = y;
      container.interactive = !disabled && !tile.isRevealed;
      container.cursor = !disabled && !tile.isRevealed ? 'pointer' : 'default';

      const background = new PIXI.Graphics();
      background.roundRect(0, 0, tileSize, tileSize, 12);

      if (tile.isRevealed) {
        if (tile.isSafe) {
          background.fill(0x22c55e);
        } else {
          background.fill(0xef4444);
        }
      } else {
        background.fill(0x282a2f);
      }

      background.stroke({ color: 0x3d3d47, width: 3 });

      container.addChild(background);

      let iconText = '?';
      let shouldShowIcon = true;

      if (tile.isRevealed) {
        iconText = tile.isSafe ? '🥚' : '🐉';
      } else if (revealedSafeCount > 0) {
        const unreveledDragons = config.filter((t) => !t.isRevealed && !t.isSafe).length;
        if (unreveledDragons > 0) {
          iconText = '🐉';
          shouldShowIcon = true;
        } else {
          shouldShowIcon = false;
        }
      }

      if (shouldShowIcon) {
        const icon = new PIXI.Text(iconText, {
          fontFamily: 'Arial',
          fontSize: 50,
          fill: 0xffffff,
        });

        if (!tile.isRevealed && revealedSafeCount > 0 && !tile.isSafe) {
          icon.alpha = 0.7;
        }

        icon.anchor.set(0.5, 0.5);
        icon.x = tileSize / 2;
        icon.y = tileSize / 2;
        container.addChild(icon);
      }

      if (!tile.isRevealed && !disabled) {
        container.on('pointerdown', () => {
          onTileSelect(tile.id);
        });

        container.on('pointerover', () => {
          if (!disabled) {
            const bg = container.getChildAt(0) as PIXI.Graphics;
            bg.clear();
            bg.roundRect(0, 0, tileSize, tileSize, 12);
            bg.fill(0x3d3d47);
            bg.stroke({ color: 0x3d3d47, width: 3 });
          }
        });

        container.on('pointerout', () => {
          const bg = container.getChildAt(0) as PIXI.Graphics;
          bg.clear();
          bg.roundRect(0, 0, tileSize, tileSize, 12);
          bg.fill(0x282a2f);
          bg.stroke({ color: 0x3d3d47, width: 3 });
        });
      }

      stage.addChild(container);
      tileGraphicsRef.current.set(tile.id, container);
    });

    const levelText = new PIXI.Text(`Level ${gameState.currentLevel}`, {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: 36,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    levelText.x = app.screen.width / 2;
    levelText.y = 20;
    levelText.anchor.set(0.5, 0);
    stage.addChild(levelText);

    const multiplierText = new PIXI.Text(`${gameState.currentMultiplier.toFixed(2)}×`, {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: 28,
      fontWeight: 'bold',
      fill: 0xeaff00,
    });

    multiplierText.x = app.screen.width / 2;
    multiplierText.y = 65;
    multiplierText.anchor.set(0.5, 0);
    stage.addChild(multiplierText);
  }, [gameState, disabled, onTileSelect]);

  return (
    <div
      ref={canvasRef}
      className="w-full rounded-lg overflow-hidden bg-[#0f0e12]"
      style={{ height: '600px', minHeight: '400px' }}
    />
  );
};
