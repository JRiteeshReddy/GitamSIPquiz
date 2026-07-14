import React, { useState, useRef, useEffect } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState, HostMessage, RoundConfig, PlayerScore } from './types';
import GameView from './GameView';
import { Clock } from 'lucide-react';
import { generateRandomRound } from './gameLogic';

interface PlayerJoinProps {
  initialCode?: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const PlayerJoin: React.FC<PlayerJoinProps> = ({ initialCode = '' }) => {
  const [lobbyCode, setLobbyCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState('');
  const [status, setStatus] = useState<'input' | 'connecting' | 'connected' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<{ title: string; isWin: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<PlayerScore[]>([]);
  
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    // Generate the first round as soon as the game starts
    if (gameState === 'playing' && !roundConfig) {
      setRoundConfig(generateRandomRound());
      setOverlayMessage(null);
    }
  }, [gameState, roundConfig]);

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
              setRoundConfig(generateRandomRound());
              setOverlayMessage(null);
            } else if (msg.state === 'lobby') {
              setRoundConfig(null);
              setOverlayMessage(null);
              setTimeLeft(null);
              setCountdownValue(null);
            }
            break;
          case 'COUNTDOWN_SYNC':
            setCountdownValue(msg.count);
            break;
          case 'TIMER_SYNC':
            setTimeLeft(msg.timeLeft);
            break;
          case 'LEADERBOARD':
            setFinalLeaderboard(msg.players);
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
    if (gameState !== 'playing' || !connRef.current || overlayMessage) return;
    
    if (isTarget) {
      setOverlayMessage({ title: 'Right Answer! +1 Point', isWin: true });
      connRef.current.send({ type: 'SCORE_UPDATE', points: 1 });
      
      // Auto advance locally
      setTimeout(() => {
        setRoundConfig(generateRandomRound());
        setOverlayMessage(null);
      }, 500);
    } else {
      setOverlayMessage({ title: 'Wrong answer', isWin: false });
      
      // Hide message, but don't change board
      setTimeout(() => {
        setOverlayMessage(null);
      }, 500);
    }
  };

  if (status === 'connected') {
    if (gameState === 'game_over') {
      const playerRecord = finalLeaderboard.find(p => p.name === playerName);
      const myScore = playerRecord?.score || 0;
      const rank = playerRecord ? finalLeaderboard.findIndex(p => p.name === playerName) + 1 : 0;
      
      if (!playerRecord || myScore === 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: '#EF6C00', fontSize: '3rem', marginBottom: '20px' }}>Round Over</h1>
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>{playerName}</h2>
            <p style={{ marginTop: '20px', color: '#aaa', fontSize: '1.2rem' }}>Waiting for the host to start the next round...</p>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: '#EF6C00', fontSize: '3rem', marginBottom: '10px' }}>Time's Up!</h1>
          <h2 style={{ color: '#fff' }}>{playerName}</h2>
          <h1 style={{ color: '#FFC107', fontSize: '4rem', margin: '20px 0' }}>{myScore} <span style={{ fontSize: '1.5rem', color: '#aaa' }}>pts</span></h1>
          {rank > 0 && <h3 style={{ color: '#FF9800' }}>Rank #{rank}</h3>}
          <p style={{ marginTop: '40px', color: '#666' }}>Look at the big screen for the final results.</p>
        </div>
      );
    }

    if (gameState === 'starting' && countdownValue !== null) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: '3rem', marginBottom: '20px' }}>GET READY!</h1>
          <div style={{ fontSize: '8rem', color: '#FFC107', fontWeight: 'bold', textShadow: '0 0 20px rgba(255, 193, 7, 0.5)' }}>
            {countdownValue}
          </div>
        </div>
      );
    }

    if (roundConfig) {
      return (
        <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
          {/* Mobile Timer Overlay */}
          {timeLeft !== null && (gameState === 'playing' || gameState === 'round_end') && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '8px 20px',
              borderRadius: '20px',
              color: timeLeft <= 10 ? '#EF6C00' : '#fff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              backdropFilter: 'blur(5px)',
              border: `1px solid ${timeLeft <= 10 ? '#EF6C00' : '#444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>
              <Clock size={20} />
              {formatTime(timeLeft)}
            </div>
          )}
          
          <GameView 
            roundConfig={roundConfig}
            onItemClick={handleItemClick}
            resultMessage={overlayMessage}
          />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <h2>Connected!</h2>
        <p style={{ opacity: 0.8, marginTop: '1rem' }}>Waiting for the host to start the game...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: '20px' }}>
      <div style={{ backgroundColor: '#222', padding: '30px', borderRadius: '15px', width: '100%', maxWidth: '400px', border: '2px solid #333' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center', color: '#FF9800' }}>Join Lobby</h1>
        
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

          {status === 'error' && <p style={{ color: '#EF6C00', textAlign: 'center' }}>{errorMsg}</p>}

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
