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

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x0f0e12,
      antialias: true,
    });

    canvasRef.current.appendChild(app.canvas);
    appRef.current = app;

    return () => {
      app.destroy(true, true);
      canvasRef.current?.removeChild(app.canvas);
    };
  }, []);

  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;
    const stage = app.stage;

    stage.removeChildren();
    tileGraphicsRef.current.clear();

    const padding = 40;
    const tileSize = 70;
    const tileGap = 15;
    const rowGap = 30;
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
      background.roundRect(0, 0, tileSize, tileSize, 8);

      if (tile.isRevealed) {
        if (tile.isSafe) {
          background.fill(0x22c55e);
        } else {
          background.fill(0xef4444);
        }
      } else {
        background.fill(0x282a2f);
      }

      background.stroke({ color: 0x3d3d47, width: 2 });

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
          fontSize: 40,
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
      }

      stage.addChild(container);
      tileGraphicsRef.current.set(tile.id, container);
    });

    const levelText = new PIXI.Text(`Level ${gameState.currentLevel}`, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: 28,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    levelText.x = app.screen.width / 2;
    levelText.y = 20;
    levelText.anchor.set(0.5, 0);
    stage.addChild(levelText);
  }, [gameState, disabled, onTileSelect]);

  return (
    <div
      ref={canvasRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: '400px', backgroundColor: '#0f0e12' }}
    />
  );
};
