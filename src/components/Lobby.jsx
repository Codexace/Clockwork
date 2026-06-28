import { useState } from 'react';
import { CHARACTERS, BALANCE, sleeperCount, PHRASE_BY_ID } from '../data/gameData.js';
import { setCharacter, setReady, startGame, leaveGame } from '../lib/rtdb.js';

export default function Lobby({ game, code, playerId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const players = Object.values(game.players || {}).sort(
    (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0),
  );
  const me = game.players[playerId];
  const isHost = game.hostId === playerId;
  const takenChars = new Set(
    players.filter((p) => p.id !== playerId).map((p) => p.characterId).filter(Boolean),
  );

  const allReady = players.length >= BALANCE.MIN_PLAYERS &&
    players.every((p) => p.characterId && p.ready);

  async function run(fn) {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lobby grid-2">
      <section className="panel">
        <h2>Players ({players.length})</h2>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className={p.ready ? 'ready' : ''}>
              <span className={`conn ${p.connected ? 'on' : 'off'}`} title={p.connected ? 'online' : 'offline'}>
                {p.connected ? '●' : '○'}
              </span>
              <span className="pname">
                {p.name}{p.id === playerId ? ' (you)' : ''}{p.isHost ? ' · host' : ''}
                {!p.connected && p.id !== playerId ? ' · offline' : ''}
              </span>
              <span className="pchar">
                {p.characterId ? CHARACTER_NAME(p.characterId) : <em className="muted">choosing…</em>}
              </span>
              <span className="pready">{p.ready ? '✓ ready' : '…'}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          With {players.length} player{players.length === 1 ? '' : 's'} there will be{' '}
          <strong>{sleeperCount(players.length)}</strong> sleeper agent
          {sleeperCount(players.length) > 1 ? 's' : ''}.
        </p>

        {isHost ? (
          <button
            className="big"
            disabled={!allReady || busy}
            onClick={() => run(() => startGame(code, playerId))}
          >
            Start game
          </button>
        ) : (
          <p className="muted">Waiting for the host to start…</p>
        )}
        {!allReady && isHost && (
          <p className="muted small">
            All players must pick a character and mark ready (min {BALANCE.MIN_PLAYERS}).
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="ghost small" disabled={busy}
          onClick={() => run(() => leaveGame(code, playerId))}>
          Leave seat
        </button>
      </section>

      <section className="panel">
        <h2>Choose your character</h2>
        <p className="muted small">
          Each character's 6 dossier phrases are public. Your allegiance is decided
          secretly at game start — the same character can be loyal or a sleeper.
        </p>
        <div className="char-grid">
          {CHARACTERS.map((c) => {
            const taken = takenChars.has(c.id);
            const mine = me.characterId === c.id;
            return (
              <button
                key={c.id}
                className={`char-card ${mine ? 'selected' : ''}`}
                disabled={taken || busy || me.ready}
                onClick={() => run(() => setCharacter(code, playerId, c.id))}
                title={taken ? 'Taken' : ''}
              >
                <div className="char-name">{c.name}{c.starter ? ' ★' : ''}</div>
                <div className="char-cats muted small">{c.categories.join(' + ')}</div>
                <ul className="char-phrases">
                  {c.phraseIds.map((pid) => (
                    <li key={pid}>{PHRASE_BY_ID[pid].text}</li>
                  ))}
                </ul>
                {taken && <div className="taken-flag">taken</div>}
              </button>
            );
          })}
        </div>
        <div className="ready-row">
          <button
            disabled={!me.characterId || busy}
            className={me.ready ? 'secondary' : ''}
            onClick={() => run(() => setReady(code, playerId, !me.ready))}
          >
            {me.ready ? 'Not ready' : "I'm ready"}
          </button>
          <span className="muted small">★ = Recommended Starter Five</span>
        </div>
      </section>
    </div>
  );
}

function CHARACTER_NAME(id) {
  return CHARACTERS.find((c) => c.id === id)?.name || id;
}
