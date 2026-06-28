import { useState } from 'react';
import { CHARACTER_BY_ID, SLEEPER_ALT_WINS } from '../data/gameData.js';
import GameLog from './GameLog.jsx';
import { resetToLobby } from '../lib/rtdb.js';

// Final screen: all Identity Cards are revealed simultaneously.
export default function GameOver({ game, code, playerId }) {
  const [busy, setBusy] = useState(false);
  const winner = game.winner || {};
  const isHost = game.hostId === playerId;
  const players = Object.values(game.players || {}).sort(
    (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0),
  );

  const title = winner.winner === 'loyal' ? 'Loyal Analysts win!' : 'Sleeper Agents win!';

  return (
    <div className="gameover grid-2">
      <section className="panel">
        <h1 className={winner.winner === 'loyal' ? 'win-loyal' : 'win-sleeper'}>{title}</h1>
        <p>{winner.reason}</p>

        <h3>Identities revealed</h3>
        <ul className="reveal-list">
          {players.map((p) => {
            const priv = game.private?.[p.id] || {};
            const ch = CHARACTER_BY_ID[p.characterId];
            const isSleeper = priv.identity === 'sleeper';
            return (
              <li key={p.id} className={isSleeper ? 'r-sleeper' : 'r-loyal'}>
                <strong>{p.name}</strong>{p.id === playerId ? ' (you)' : ''} —{' '}
                {isSleeper ? '🕵 Sleeper Agent' : '🛡 Loyal Analyst'}
                <span className="muted small"> · {ch?.name}</span>
                {isSleeper && priv.altWinIndex != null && (
                  <div className="muted small">
                    Secret combo: {Object.entries(SLEEPER_ALT_WINS[priv.altWinIndex])
                      .map(([c, w]) => `${c} ${w}`).join(', ')}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {isHost ? (
          <button className="big" disabled={busy}
            onClick={async () => { setBusy(true); try { await resetToLobby(code, playerId); } finally { setBusy(false); } }}>
            Back to lobby (new game, same players)
          </button>
        ) : (
          <p className="muted">Waiting for the host to start a new game…</p>
        )}
      </section>

      <section className="panel">
        <GameLog log={game.log} />
      </section>
    </div>
  );
}
