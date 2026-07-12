import React, { useState, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState, HostMessage, RoundConfig } from './types';
import GameView from './GameView';

const PlayerJoin: React.FC = () => {
  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [status, setStatus] = useState<'input' | 'connecting' | 'connected' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [resultMessage, setResultMessage] = useState<{ title: string; isWin: boolean } | null>(null);
  
  const connRef = useRef<DataConnection | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyCode || !playerName) return;
    
    setStatus('connecting');
    const peer = new Peer();
    
    peer.on('open', () => {
      const conn = peer.connect(`gitam-crowd-${lobbyCode.toUpperCase()}`);
      
      conn.on('open', () => {
        connRef.current = conn;
        setStatus('connected');
        conn.send({ type: 'JOIN', name: playerName });
      });

      conn.on('data', (data: any) => {
        const msg = data as HostMessage;
        
        switch (msg.type) {
          case 'GAME_STATE':
            setGameState(msg.state);
            if (msg.state === 'playing') {
              setResultMessage(null); // Clear previous result
            }
            break;
          case 'ROUND_CONFIG':
            setRoundConfig(msg.config);
            break;
          case 'ROUND_RESULT':
            setResultMessage({ title: msg.message, isWin: msg.isWin });
            break;
          case 'LEADERBOARD':
            // Mobile client doesn't explicitly need to show leaderboard during game,
            // but we could if requested. For now, it just plays the game.
            break;
        }
      });

      conn.on('close', () => {
        setStatus('error');
        setErrorMsg('Host disconnected.');
      });

      peer.on('error', (err) => {
        setStatus('error');
        setErrorMsg('Failed to connect to lobby. Check code.');
        console.error(err);
      });
    });
  };

  const handleItemClick = (isTarget: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing' || !connRef.current) return;
    
    // Only send the click to host, host will decide if won
    connRef.current.send({ type: 'ITEM_CLICKED', isTarget });
  };

  if (status === 'connected' && roundConfig) {
    return (
      <GameView 
        roundConfig={roundConfig}
        onItemClick={handleItemClick}
        gameState={gameState}
        resultMessage={resultMessage}
        isHost={false}
      />
    );
  }

  if (status === 'connected' && !roundConfig) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <h2>Connected!</h2>
        <p style={{ opacity: 0.8, marginTop: '1rem' }}>Waiting for the host to start the game...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: '20px' }}>
      <div style={{ backgroundColor: '#222', padding: '30px', borderRadius: '15px', width: '100%', maxWidth: '400px', border: '2px solid #333' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center', color: '#1CBDF9' }}>Join Lobby</h1>
        
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Lobby Code</label>
            <input 
              type="text" 
              value={lobbyCode} 
              onChange={e => setLobbyCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD"
              style={{ width: '100%', padding: '10px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#111', color: '#fff', textTransform: 'uppercase' }}
              maxLength={4}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Your Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              style={{ width: '100%', padding: '10px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
              maxLength={20}
              required
            />
          </div>

          {status === 'error' && <p style={{ color: '#FC665F', textAlign: 'center' }}>{errorMsg}</p>}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={status === 'connecting'}
            style={{ marginTop: '10px', opacity: status === 'connecting' ? 0.7 : 1 }}
          >
            {status === 'connecting' ? 'Connecting...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerJoin;
