import React, { useState, useMemo, useCallback } from 'react';
import './index.css';

const ALL_ASSETS = [
  { normal: '/img/ball (1).png', target: '/img/ball (2).png', alt: 'ball' },
  { normal: '/img/banana (1).png', target: '/img/banana (2).png', alt: 'banana' },
  { normal: '/img/bottle (1).png', target: '/img/bottle (2).png', alt: 'bottle' },
  { normal: '/img/car (1).png', target: '/img/car (2).png', alt: 'car' },
  { normal: '/img/clock (1).png', target: '/img/clock (2).png', alt: 'clock' },
  { normal: "/img/phone' (1).png", target: "/img/phone' (2).png", alt: 'phone' },
  { normal: '/img/1.png', target: '/img/2.png', alt: 'item7' },
];
const ITEM_COUNT = 7;

interface ItemConfig {
  id: number;
  src: string;
  alt: string;
  x: number;
  y: number;
  rotation: number;
  isTarget: boolean;
}

interface RoundConfig {
  leftItems: ItemConfig[];
  rightItems: ItemConfig[];
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function App() {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lose'>('playing');

  // Generate round configuration
  const roundConfig = useMemo<RoundConfig>(() => {
    const targetSide = Math.random() > 0.5 ? 'left' : 'right';
    const targetIndex = Math.floor(Math.random() * ITEM_COUNT);
    
    // Pick 5 random assets for this round
    const roundAssets = shuffle(ALL_ASSETS).slice(0, ITEM_COUNT);

    const generateSideItems = (side: 'left' | 'right'): ItemConfig[] => {
      const items: ItemConfig[] = [];
      const positions: {cx: number, cy: number}[] = [];

      roundAssets.forEach((asset, index) => {
        let x = 0, y = 0, rotation = 0;
        let isValid = false;
        let attempts = 0;

        // Item width is 22%, radius is 11%
        const itemRadius = 11;
        
        // Try to find a non-overlapping position within the circle
        while (!isValid && attempts < 500) {
          x = Math.random() * (100 - itemRadius * 2);
          y = Math.random() * (100 - itemRadius * 2);
          rotation = Math.random() * 360;
          isValid = true;

          const cx = x + itemRadius;
          const cy = y + itemRadius;
          
          // Check if it's outside the plate circle (radius 50)
          const distFromCenter = (cx - 50) * (cx - 50) + (cy - 50) * (cy - 50);
          if (distFromCenter > (50 - itemRadius) * (50 - itemRadius)) {
            isValid = false;
            attempts++;
            continue;
          }

          for (const pos of positions) {
            const dx = cx - pos.cx;
            const dy = cy - pos.cy;
            // Minimum distance squared (22^2 = 484)
            // Use 400 to allow very slight visual overlap if tightly packed
            if (dx * dx + dy * dy < 400) {
              isValid = false;
              break;
            }
          }
          attempts++;
        }

        positions.push({ cx: x + itemRadius, cy: y + itemRadius });
        const isVisualTarget = side === targetSide && index === targetIndex;
        const isCorrectItem = index === targetIndex;
        
        items.push({
          id: index,
          src: isVisualTarget ? asset.target : asset.normal,
          alt: asset.alt,
          x,
          y,
          rotation,
          isTarget: isCorrectItem,
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

  const nextRound = () => {
    if (gameState === 'lose') {
      setScore(0);
    }
    setGameState('playing');
    setRound(r => r + 1);
  };

  const renderPlate = (items: ItemConfig[], side: 'left' | 'right') => (
    <div className={`screen-half ${side === 'left' ? 'blue' : 'red'}`}>
      <div className="plate">
        {items.map((item) => {
          const { id, src, alt, x, y, rotation, isTarget } = item;
          
          return (
            <div
              key={id}
              className="game-object"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `rotate(${rotation}deg)`,
              }}
              onClick={(e) => handleItemClick(isTarget, e)}
            >
              <img 
                src={src} 
                alt={alt} 
                draggable="false"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
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
