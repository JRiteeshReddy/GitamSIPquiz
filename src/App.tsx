import { useState, useEffect } from 'react';
import AdminView from './AdminView';
import PlayerJoin from './PlayerJoin';
import './index.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      // In production, you might not want to switch dynamically on resize, 
      // but it's very useful for testing on desktop.
      setIsAdmin(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isAdmin ? <AdminView /> : <PlayerJoin />;
}

export default App;
