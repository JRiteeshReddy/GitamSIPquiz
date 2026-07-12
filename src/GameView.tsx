import React from 'react';
import type { ItemConfig, RoundConfig } from './types';

interface GameViewProps {
  roundConfig: RoundConfig;
  onItemClick: (isTarget: boolean, e: React.MouseEvent) => void;
  resultMessage: { title: string; isWin: boolean } | null;
}

const GameView: React.FC<GameViewProps> = ({ 
  roundConfig, 
  onItemClick, 
  resultMessage
}) => {
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
              onClick={(e) => onItemClick(isTarget, e)}
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
    <div id="game-container">
      {renderPlate(roundConfig.leftItems, 'left')}
      {renderPlate(roundConfig.rightItems, 'right')}

      <div className={`message-overlay ${resultMessage ? 'visible' : ''}`}>
        <div className="message-content">
          {resultMessage && (
            <>
              <h2 className={`message-title ${resultMessage.isWin ? 'win' : 'lose'}`}>
                {resultMessage.title}
              </h2>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameView;
