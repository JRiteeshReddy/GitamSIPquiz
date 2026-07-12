import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, X } from 'lucide-react';
import type { GameState, HostMessage, ClientMessage, PlayerScore, RoundConfig, ItemConfig } from './types';
import GameView from './GameView';

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

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [resultMessage, setResultMessage] = useState<{ title: string; isWin: boolean } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const peerRef = useRef<Peer | null>(null);

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

  useEffect(() => {
    const code = generateRandomCode();
    setLobbyCode(code);
    const peer = new Peer(`gitam-crowd-${code}`);
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('Host connected with ID:', id);
    });

    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        const msg = data as ClientMessage;
        
        if (msg.type === 'JOIN') {
          setPlayers(prev => {
            // Prevent duplicates
            if (prev.find(p => p.id === conn.peer)) return prev;
            const newPlayer = { id: conn.peer, name: msg.name, score: 0, conn };
            const nextPlayers = [...prev, newPlayer];
            
            // Send current state
            conn.send({ type: 'GAME_STATE', state: gameState });
            if (roundConfig) {
              conn.send({ type: 'ROUND_CONFIG', config: roundConfig });
            }
            
            // Broadcast updated leaderboard
            broadcastLeaderboard(nextPlayers);
            return nextPlayers;
          });
        }
        
        if (msg.type === 'ITEM_CLICKED' && gameState === 'playing') {
          if (msg.isTarget) {
            setGameState('round_end');
            
            setPlayers(prev => {
              const nextPlayers = prev.map(p => p.id === conn.peer ? { ...p, score: p.score + 1 } : p);
              
              const winnerName = nextPlayers.find(p => p.id === conn.peer)?.name || 'Someone';
              
              const resultMsg = `${winnerName} found it!`;
              setResultMessage({ title: resultMsg, isWin: true });
              
              // Broadcast to everyone
              nextPlayers.forEach(p => {
                p.conn.send({ type: 'GAME_STATE', state: 'round_end' });
                p.conn.send({ type: 'ROUND_RESULT', message: p.id === conn.peer ? 'You won the round!' : `${winnerName} won the round!`, isWin: p.id === conn.peer });
                p.conn.send({ type: 'LEADERBOARD', players: nextPlayers.map(np => ({ name: np.name, score: np.score })) });
              });
              
              return nextPlayers;
            });
          }
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
  }, []);

  const generateRound = useCallback(() => {
    const targetSide = Math.random() > 0.5 ? 'left' : 'right';
    const targetIndex = Math.floor(Math.random() * ITEM_COUNT);
    const roundAssets = shuffle(ALL_ASSETS).slice(0, ITEM_COUNT);

    const generateSideItems = (side: 'left' | 'right'): ItemConfig[] => {
      const items: ItemConfig[] = [];
      const positions: {cx: number, cy: number}[] = [];

      roundAssets.forEach((asset, index) => {
        let x = 0, y = 0, rotation = 0;
        let isValid = false;
        let attempts = 0;
        const itemRadius = 11;
        
        while (!isValid && attempts < 500) {
          x = Math.random() * (100 - itemRadius * 2);
          y = Math.random() * (100 - itemRadius * 2);
          rotation = Math.random() * 360;
          isValid = true;

          const cx = x + itemRadius;
          const cy = y + itemRadius;
          
          const distFromCenter = (cx - 50) * (cx - 50) + (cy - 50) * (cy - 50);
          if (distFromCenter > (50 - itemRadius) * (50 - itemRadius)) {
            isValid = false;
            attempts++;
            continue;
          }

          for (const pos of positions) {
            const dx = cx - pos.cx;
            const dy = cy - pos.cy;
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
          cx: x + itemRadius,
          cy: y + itemRadius,
          x,
          y,
          rotation,
          isTarget: isCorrectItem,
        });
      });
      return items;
    };

    const newRound = {
      leftItems: generateSideItems('left'),
      rightItems: generateSideItems('right'),
    };

    setRoundConfig(newRound);
    setGameState('playing');
    setResultMessage(null);

    broadcast({ type: 'ROUND_CONFIG', config: newRound });
    broadcast({ type: 'GAME_STATE', state: 'playing' });
  }, [broadcast]);

  const handleHostItemClick = () => {
    // Host doesn't play directly, just views.
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#111' }}>
      
      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#222', borderBottom: '2px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff' }}>Admin Panel</h2>
            <p style={{ margin: 0, color: '#aaa' }}>Lobby Code: <strong style={{ fontSize: '1.5rem', color: '#ff3366', letterSpacing: '2px' }}>{lobbyCode}</strong></p>
          </div>
          {lobbyCode && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="admin-action-btn"
                onClick={() => setShowQRModal(true)}
              >
                <QrCode size={18} /> QR Code
              </button>
              <button 
                className="admin-action-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/game/join/${lobbyCode}`);
                  alert('Join link copied to clipboard!');
                }}
              >
                <Copy size={18} /> Join Link
              </button>
            </div>
          )}
        </div>
        <div>
          {gameState === 'lobby' && (
            <button className="btn-primary" onClick={generateRound} disabled={players.length === 0}>
              Start Game ({players.length} players)
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Game Preview */}
        <div style={{ flex: 3, position: 'relative' }}>
          {gameState === 'lobby' ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <h1 style={{ color: '#555' }}>Waiting for players...</h1>
              <p>Tell players to join using code <strong>{lobbyCode}</strong></p>
            </div>
          ) : (
            roundConfig && (
              <GameView 
                roundConfig={roundConfig} 
                onItemClick={handleHostItemClick} 
                gameState={gameState}
                resultMessage={resultMessage}
                isHost={true}
                onNextRound={generateRound}
              />
            )
          )}
        </div>

        {/* Live Leaderboard */}
        <div style={{ flex: 1, backgroundColor: '#1a1a1a', borderLeft: '2px solid #333', padding: '20px', overflowY: 'auto' }}>
          <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '20px' }}>Live Leaderboard</h3>
          {sortedPlayers.length === 0 ? (
            <p style={{ color: '#666' }}>No players joined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedPlayers.map((p, idx) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                  <span><strong style={{ opacity: 0.5, marginRight: '10px' }}>#{idx+1}</strong> {p.name}</span>
                  <strong style={{ color: '#4ade80' }}>{p.score}</strong>
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
