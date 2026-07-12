import React from 'react';
import { ALL_ASSETS } from './gameLogic';

const Preloader: React.FC = () => {
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
      {ALL_ASSETS.map((asset, idx) => (
        <React.Fragment key={idx}>
          <img src={asset.normal} alt={`preload-normal-${idx}`} />
          <img src={asset.target} alt={`preload-target-${idx}`} />
        </React.Fragment>
      ))}
    </div>
  );
};

export default Preloader;
