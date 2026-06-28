import { useState, useEffect, useMemo } from 'react';
import { firebaseConfigured } from './firebase.js';
import { getPlayerId, setPlayerId as persistPlayerId } from './lib/identity.js';
import { useGame } from './hooks/useGame.js';
import { usePresence } from './hooks/usePresence.js';
import JoinScreen from './components/JoinScreen.jsx';
import Lobby from './components/Lobby.jsx';
import PhrasePhase from './components/PhrasePhase.jsx';
import DecodePhase from './components/DecodePhase.jsx';
import GameOver from './components/GameOver.jsx';
import ConfigNotice from './components/ConfigNotice.jsx';
import RejoinScreen from './components/RejoinScreen.jsx';

const CODE_KEY = 'clockwork-code';

export default function App() {
  const [playerId, setPlayerId] = useState(getPlayerId);
  const [code, setCode] = useState(() => localStorage.getItem(CODE_KEY) || '');
  const { game, loading } = useGame(code);

  const inGame = !!game?.players?.[playerId];
  const presence = usePresence(code, playerId, inGame);

  // Merge live presence into the game so every component can read p.connected.
  const decoratedGame = useMemo(() => {
    if (!game) return game;
    const players = {};
    for (const [id, p] of Object.entries(game.players || {})) {
      players[id] = { ...p, connected: presence[id] === true };
    }
    return { ...game, players };
  }, [game, presence]);

  useEffect(() => {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  }, [code]);

  function leave() {
    setCode('');
  }

  // Enter a game; optionally adopting a reclaimed seat's id.
  function joined(nextCode, reclaimedId) {
    if (reclaimedId) {
      persistPlayerId(reclaimedId);
      setPlayerId(reclaimedId);
    }
    setCode(nextCode);
  }

  if (!firebaseConfigured) {
    return <ConfigNotice />;
  }

  if (!code) {
    return <JoinScreen playerId={playerId} onJoined={joined} />;
  }

  if (loading) {
    return <Centered>Connecting to game <strong>{code}</strong>…</Centered>;
  }

  if (!game) {
    return (
      <Centered>
        <p>No game found with code <strong>{code}</strong>.</p>
        <button onClick={leave}>Back</button>
      </Centered>
    );
  }

  // Have a code but no seat (new device / cleared storage / mid-game): rejoin.
  if (!inGame) {
    return (
      <RejoinScreen
        code={code}
        game={decoratedGame}
        presence={presence}
        onReclaim={(seat) => { joined(code, seat.id); }}
        onBack={leave}
      />
    );
  }

  return (
    <div className="app">
      <TopBar game={decoratedGame} code={code} playerId={playerId} onLeave={leave} />
      <main className="content">
        {game.phase === 'lobby' && (
          <Lobby game={decoratedGame} code={code} playerId={playerId} />
        )}
        {game.phase === 'phrase' && (
          <PhrasePhase game={decoratedGame} code={code} playerId={playerId} />
        )}
        {game.phase === 'decode' && (
          <DecodePhase game={decoratedGame} code={code} playerId={playerId} />
        )}
        {game.phase === 'gameover' && (
          <GameOver game={decoratedGame} code={code} playerId={playerId} />
        )}
      </main>
    </div>
  );
}

function TopBar({ game, code, playerId, onLeave }) {
  const me = game.players?.[playerId];
  const phaseLabel = {
    lobby: 'Lobby',
    phrase: `Round ${game.round} · Phrase Phase`,
    decode: `Round ${game.round} · Decode Phase`,
    gameover: 'Game Over',
  }[game.phase];
  return (
    <header className="topbar">
      <div>
        <span className="brand">CLOCKWORK</span>
        <span className="code-pill">Code: {code}</span>
      </div>
      <div className="topbar-right">
        <span className="phase-pill">{phaseLabel}</span>
        {me && <span className="you-pill">You: {me.name}</span>}
        <button className="ghost" onClick={onLeave}>Leave</button>
      </div>
    </header>
  );
}

function Centered({ children }) {
  return (
    <div className="centered">
      <div className="card">{children}</div>
    </div>
  );
}
