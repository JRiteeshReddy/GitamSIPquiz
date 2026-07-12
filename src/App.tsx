import React, { useState, useMemo, useCallback } from 'react';
import './index.css';

const ALL_ASSETS = [
  { normal: '/img/ball (1).png', target: '/img/ball (2).png', alt: 'ball' },
  { normal: '/img/banana (1).png', target: '/img/banana (2).png', alt: 'banana' },
  { normal: '/img/bottle (1).png', target: '/img/bottle (2).png', alt: 'bottle' },
  { normal: '/img/car (1).png', target: '/img/car (2).png', alt: 'car' },
  { normal: '/img/clock (1).png', target: '/img/clock (2).png', alt: 'clock' },
  { normal: "/img/phone' (1).png", target: "/img/phone' (2).png", alt: 'phone' },
];
const ITEM_COUNT = 5;

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
      const positions: {x: number, y: number}[] = [];

      roundAssets.forEach((asset, index) => {
        let x = 0, y = 0, rotation = 0;
        let isValid = false;
        let attempts = 0;

        // Try to find a non-overlapping position
        while (!isValid && attempts < 100) {
          x = 10 + Math.random() * 60;
          y = 10 + Math.random() * 60;
          rotation = Math.random() * 360;
          isValid = true;

          for (const pos of positions) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            if (dx * dx + dy * dy < 350) {
              isValid = false;
              break;
            }
          }
          attempts++;
        }

        positions.push({ x, y });
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
    <div className={`screen-half ${side === 'left' ? 'red' : 'blue'}`}>
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
