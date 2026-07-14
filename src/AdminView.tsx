import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, X, Clock, Play } from 'lucide-react';
import type { GameState, HostMessage, ClientMessage, PlayerScore } from './types';

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface ConnectedPlayer {
  id: string;
  name: string;
  score: number;
  conn: DataConnection;
}

const AdminView: React.FC = () => {
  const [lobbyCode, setLobbyCode] = useState('');
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Timer State
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdownValue, setCountdownValue] = useState(5);
  
  const peerRef = useRef<Peer | null>(null);
  const timerRef = useRef<number | null>(null);
  const gameStateRef = useRef(gameState);
  const timeLeftRef = useRef(timeLeft);

  // Sync refs to state for use in callbacks
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const broadcast = useCallback((msg: HostMessage) => {
    setPlayers(prev => {
      prev.forEach(p => p.conn.send(msg));
      return prev;
    });
  }, []);

  const broadcastLeaderboard = useCallback((currentPlayers: ConnectedPlayer[]) => {
    const leaderboard: PlayerScore[] = currentPlayers.map(p => ({ name: p.name, score: p.score }));
    currentPlayers.forEach(p => p.conn.send({ type: 'LEADERBOARD', players: leaderboard }));
  }, []);

  // Timer Tick Effect
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'round_end') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('game_over');
            broadcast({ type: 'GAME_STATE', state: 'game_over' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, broadcast]);

  // Sync time to clients
  useEffect(() => {
    if ((gameState === 'playing' || gameState === 'round_end') && timeLeft > 0) {
      broadcast({ type: 'TIMER_SYNC', timeLeft });
    }
  }, [timeLeft, gameState, broadcast]);

  // Countdown Effect
  useEffect(() => {
    let interval: number;
    if (gameState === 'starting') {
      interval = window.setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeLeft(durationMinutes * 60);
            setGameState('playing');
            broadcast({ type: 'GAME_STATE', state: 'playing' });
            return 0;
          }
          broadcast({ type: 'COUNTDOWN_SYNC', count: prev - 1 });
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, durationMinutes, broadcast]);

  const startGame = () => {
    setGameState('starting');
    setCountdownValue(5);
    broadcast({ type: 'GAME_STATE', state: 'starting' });
    broadcast({ type: 'COUNTDOWN_SYNC', count: 5 });
  };

  const resetToLobby = () => {
    setPlayers(prev => {
      const nextPlayers = prev.map(p => ({ ...p, score: 0 }));
      const leaderboard: PlayerScore[] = nextPlayers.map(p => ({ name: p.name, score: p.score }));
      nextPlayers.forEach(p => p.conn.send({ type: 'LEADERBOARD', players: leaderboard }));
      return nextPlayers;
    });
    setGameState('lobby');
    broadcast({ type: 'GAME_STATE', state: 'lobby' });
  };

  useEffect(() => {
    const code = generateRandomCode();
    setLobbyCode(code);
    const peer = new Peer(`gitam-crowd-${code}`);
    peerRef.current = peer;

    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        const msg = data as ClientMessage;
        
        if (msg.type === 'JOIN') {
          setPlayers(prev => {
            if (prev.find(p => p.id === conn.peer)) return prev;
            const newPlayer = { id: conn.peer, name: msg.name, score: 0, conn };
            const nextPlayers = [...prev, newPlayer];
            
            conn.send({ type: 'GAME_STATE', state: gameStateRef.current });
            if (timeLeftRef.current > 0) {
              conn.send({ type: 'TIMER_SYNC', timeLeft: timeLeftRef.current });
            }
            
            broadcastLeaderboard(nextPlayers);
            return nextPlayers;
          });
        }
        
        if (msg.type === 'SCORE_UPDATE' && gameStateRef.current === 'playing') {
          setPlayers(prev => {
            // Update score
            const nextPlayers = prev.map(p => p.id === conn.peer ? { ...p, score: p.score + msg.points } : p);
            broadcastLeaderboard(nextPlayers);
            return nextPlayers;
          });
        }
      });

      conn.on('close', () => {
        setPlayers(prev => {
          const next = prev.filter(p => p.id !== conn.peer);
          broadcastLeaderboard(next);
          return next;
        });
      });
    });

    return () => {
      peer.destroy();
    };
  }, [broadcastLeaderboard]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#111' }}>
      
      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#222', borderBottom: '2px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff' }}>Admin Panel</h2>
            <p style={{ margin: 0, color: '#aaa' }}>Lobby Code: <strong style={{ fontSize: '1.5rem', color: '#FFB300', letterSpacing: '2px' }}>{lobbyCode}</strong></p>
          </div>
          {lobbyCode && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="admin-action-btn" onClick={() => setShowQRModal(true)}>
                <QrCode size={18} /> QR Code
              </button>
              <button className="admin-action-btn" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/game/join/${lobbyCode}`);
                alert('Join link copied to clipboard!');
              }}>
                <Copy size={18} /> Join Link
              </button>
            </div>
          )}
        </div>
        <div>
          {gameState === 'lobby' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <Clock size={18} />
                <span>Timer: </span>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={durationMinutes} 
                  onChange={(e) => setDurationMinutes(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  style={{ width: '50px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '5px', padding: '5px', textAlign: 'center' }}
                />
                <span> min</span>
              </div>
              <button className="btn-primary" onClick={startGame} disabled={players.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} /> Start Game
              </button>
            </div>
          )}
          {(gameState === 'playing' || gameState === 'starting' || gameState === 'round_end') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#EF6C00' : '#fff' }}>
                <Clock size={28} />
                {gameState === 'starting' ? '--:--' : formatTime(timeLeft)}
              </div>
              <button 
                className="btn-primary" 
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setGameState('game_over');
                  broadcast({ type: 'GAME_STATE', state: 'game_over' });
                }} 
                style={{ backgroundColor: '#EF6C00', padding: '8px 16px', fontSize: '1rem' }}
              >
                End Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Game Status / Dashboard */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          {gameState === 'lobby' ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: '#fff', fontSize: '3rem', marginBottom: '20px' }}>Ready to Start?</h1>
              <p style={{ color: '#aaa', fontSize: '1.5rem' }}>Tell players to join using code <strong style={{ color: '#FFC107' }}>{lobbyCode}</strong></p>
            </div>
          ) : gameState === 'starting' ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: '#fff', fontSize: '4rem', marginBottom: '20px' }}>Get Ready!</h1>
              <div style={{ fontSize: '10rem', color: '#FFC107', fontWeight: 'bold', textShadow: '0 0 20px rgba(255, 193, 7, 0.5)' }}>
                {countdownValue}
              </div>
            </div>
          ) : gameState === 'game_over' ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '5rem', color: '#EF6C00', marginBottom: '20px' }}>Time's Up!</h1>
              {sortedPlayers.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '3rem', color: '#FFC107', marginBottom: '10px' }}>Winner: {sortedPlayers[0].name}</h2>
                  <p style={{ fontSize: '2rem', color: '#aaa' }}>with {sortedPlayers[0].score} points!</p>
                </div>
              )}
              <div style={{ marginTop: '40px' }}>
                <button className="btn-primary" onClick={resetToLobby} style={{ fontSize: '1.5rem', padding: '15px 40px' }}>
                  Return to Lobby
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: '#fff', fontSize: '4rem', marginBottom: '20px' }}>Game in Progress</h1>
              <p style={{ color: '#aaa', fontSize: '1.5rem' }}>Players are frantically finding items!</p>
            </div>
          )}
        </div>

        {/* Right Side: Live Leaderboard */}
        <div style={{ flex: 1, backgroundColor: '#1a1a1a', borderLeft: '2px solid #333', padding: '30px', overflowY: 'auto' }}>
          <h2 style={{ borderBottom: '2px solid #444', paddingBottom: '15px', marginBottom: '25px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Live Leaderboard
          </h2>
          {sortedPlayers.length === 0 ? (
            <p style={{ color: '#666', fontSize: '1.2rem' }}>No players joined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {sortedPlayers.map((p, idx) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: idx === 0 ? 'rgba(255, 193, 7, 0.1)' : '#2a2a2a', border: idx === 0 ? '1px solid #FFC107' : '1px solid transparent', borderRadius: '10px', transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#FFC107' : '#888' }}>#{idx+1}</span>
                    <span style={{ fontSize: '1.2rem', color: '#fff' }}>{p.name}</span>
                  </div>
                  <strong style={{ color: '#FFC107', fontSize: '1.5rem' }}>{p.score}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Screen QR Modal */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={() => setShowQRModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>Scan to Join</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '15px' }}>
              <QRCodeSVG value={`${window.location.origin}/game/join/${lobbyCode}`} size={300} />
            </div>
            <p style={{ color: '#aaa', marginTop: '20px', fontSize: '1.2rem', letterSpacing: '5px' }}>
              {lobbyCode}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
