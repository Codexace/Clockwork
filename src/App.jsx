import { useState, useEffect } from 'react';
import { firebaseConfigured } from './firebase.js';
import { getPlayerId } from './lib/identity.js';
import { useGame } from './hooks/useGame.js';
import JoinScreen from './components/JoinScreen.jsx';
import Lobby from './components/Lobby.jsx';
import PhrasePhase from './components/PhrasePhase.jsx';
import DecodePhase from './components/DecodePhase.jsx';
import GameOver from './components/GameOver.jsx';
import ConfigNotice from './components/ConfigNotice.jsx';

const CODE_KEY = 'clockwork-code';

export default function App() {
  const playerId = getPlayerId();
  const [code, setCode] = useState(() => localStorage.getItem(CODE_KEY) || '');
  const { game, loading } = useGame(code);

  useEffect(() => {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  }, [code]);

  function leave() {
    setCode('');
  }

  if (!firebaseConfigured) {
    return <ConfigNotice />;
  }

  if (!code) {
    return <JoinScreen playerId={playerId} onJoined={setCode} />;
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

  const inGame = !!game.players?.[playerId];
  if (!inGame && game.phase !== 'lobby') {
    return (
      <Centered>
        <p>Game <strong>{code}</strong> is already in progress and you're not in it.</p>
        <button onClick={leave}>Back</button>
      </Centered>
    );
  }

  return (
    <div className="app">
      <TopBar game={game} code={code} playerId={playerId} onLeave={leave} />
      <main className="content">
        {game.phase === 'lobby' && (
          <Lobby game={game} code={code} playerId={playerId} />
        )}
        {game.phase === 'phrase' && (
          <PhrasePhase game={game} code={code} playerId={playerId} />
        )}
        {game.phase === 'decode' && (
          <DecodePhase game={game} code={code} playerId={playerId} />
        )}
        {game.phase === 'gameover' && (
          <GameOver game={game} code={code} playerId={playerId} />
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
