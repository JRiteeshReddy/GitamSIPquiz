import React, { useState, useMemo, useCallback } from 'react';
import { Car, Bike, PenTool, Book, Apple, RotateCcw } from 'lucide-react';
import './index.css';

const ICONS = [Car, Bike, PenTool, Book, Apple];
const ITEM_COUNT = 5;

interface ItemConfig {
  id: number;
  Icon: React.ElementType;
  x: number;
  y: number;
  rotation: number;
  isTarget: boolean;
}

interface RoundConfig {
  leftItems: ItemConfig[];
  rightItems: ItemConfig[];
}

function App() {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lose'>('playing');

  // Generate round configuration
  const roundConfig = useMemo<RoundConfig>(() => {
    const targetSide = Math.random() > 0.5 ? 'left' : 'right';
    const targetIndex = Math.floor(Math.random() * ITEM_COUNT);

    const generateSideItems = (side: 'left' | 'right'): ItemConfig[] => {
      const items: ItemConfig[] = [];
      const positions: {x: number, y: number}[] = [];

      ICONS.forEach((Icon, index) => {
        let x = 0, y = 0, rotation = 0;
        let isValid = false;
        let attempts = 0;

        // Try to find a non-overlapping position
        while (!isValid && attempts < 100) {
          // Keep within 10% to 70% to ensure it stays well inside the plate
          x = 10 + Math.random() * 60;
          y = 10 + Math.random() * 60;
          rotation = Math.random() * 360;
          isValid = true;

          for (const pos of positions) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            // Minimum distance between centers to avoid overlap.
            // Items are ~15% wide. Distance 18 means 18^2 = 324
            if (dx * dx + dy * dy < 350) {
              isValid = false;
              break;
            }
          }
          attempts++;
        }

        positions.push({ x, y });
        items.push({
          id: index,
          Icon,
          x,
          y,
          rotation,
          isTarget: side === targetSide && index === targetIndex,
        });
      });
      return items;
    };

    return {
      leftItems: generateSideItems('left'),
      rightItems: generateSideItems('right'),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handleItemClick = useCallback((isTarget: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing') return;

    if (isTarget) {
      setGameState('win');
      setScore(s => s + 1);
    } else {
      setGameState('lose');
    }
  }, [gameState]);

  const handleMissClick = useCallback(() => {
    if (gameState !== 'playing') return;
    setGameState('lose');
  }, [gameState]);

  const nextRound = () => {
    if (gameState === 'lose') {
      setScore(0);
    }
    setGameState('playing');
    setRound(r => r + 1);
  };

  const renderPlate = (items: ItemConfig[], side: 'left' | 'right') => (
    <div className={`screen-half ${side === 'left' ? 'red' : 'blue'}`} onClick={handleMissClick}>
      <div className="plate">
        {items.map((item) => {
          const { Icon, x, y, rotation, isTarget } = item;
          // Target item has a distinct color (e.g., bright green), normal items are white
          const color = isTarget ? '#4ade80' : '#ffffff';
          
          return (
            <div
              key={item.id}
              className="game-object"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `rotate(${rotation}deg)`,
              }}
              onClick={(e) => handleItemClick(isTarget, e)}
            >
              <Icon 
                color={color} 
                strokeWidth={isTarget ? 3 : 2} // Slightly thicker stroke for the target as well
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div id="portrait-overlay">
        <RotateCcw className="rotate-icon" color="#ffffff" />
        <h1>Rotate Device</h1>
        <p>Please turn your device to landscape mode to play.</p>
      </div>

      <div id="game-container">
        <div className="score-board">
          Score: {score}
        </div>

        {renderPlate(roundConfig.leftItems, 'left')}
        {renderPlate(roundConfig.rightItems, 'right')}

        <div className={`message-overlay ${gameState !== 'playing' ? 'visible' : ''}`}>
          <div className="message-content">
            <h2 className={`message-title ${gameState}`}>
              {gameState === 'win' ? 'You Found It!' : 'Oops! Wrong Item'}
            </h2>
            <button className="btn-primary" onClick={nextRound}>
              {gameState === 'win' ? 'Next Round' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
