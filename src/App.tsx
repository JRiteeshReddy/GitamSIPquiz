import { useState, useEffect } from 'react';
import AdminView from './AdminView';
import PlayerJoin from './PlayerJoin';
import Preloader from './Preloader';
import { preloadAssets } from './gameLogic';
import './index.css';

function App() {
  const path = window.location.pathname;
  const match = path.match(/^\/game\/join\/([A-Za-z0-9]+)\/?$/);
  const initialCode = match ? match[1].toUpperCase() : '';
  const [isAdmin, setIsAdmin] = useState(!initialCode && window.innerWidth >= 1024);

  useEffect(() => {
    preloadAssets();
  }, []);

  useEffect(() => {
    if (initialCode) return;

    const handleResize = () => {
      setIsAdmin(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialCode]);

  return (
    <>
      <Preloader />
      {isAdmin ? <AdminView /> : <PlayerJoin initialCode={initialCode || ''} />}
      <div style={{ position: 'fixed', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9999, pointerEvents: 'none' }}>
        <span style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 600 }}>Built by</span>
        <img src="/img/HIVE logo.png" alt="HIVE" style={{ height: '25px', opacity: 0.8 }} />
      </div>
    </>
  );
}

export default App;
