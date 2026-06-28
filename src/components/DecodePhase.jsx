import { useState } from 'react';
import DecodeTracker from './DecodeTracker.jsx';
import GameLog from './GameLog.jsx';
import PlayerBoards from './PlayerBoards.jsx';
import Hand from './Hand.jsx';
import MyStatus from './MyStatus.jsx';
import DecodePile from './DecodePile.jsx';
import { CATEGORIES, BALANCE } from '../data/gameData.js';
import { DECODE_STATUS } from '../lib/game.js';
import { cardLabel } from '../lib/deck.js';
import {
  callDecode,
  contributeCards,
  resolveDecode,
  startNextRound,
} from '../lib/rtdb.js';

export default function DecodePhase({ game, code, playerId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);

  const n = game.turnOrder?.length || 0;
  const callerId = game.turnOrder?.[game.firstLeaderIndex % n];
  const callerName = game.players[callerId]?.name || '—';
  const isCaller = callerId === playerId;
  const isHost = game.hostId === playerId;
  const d = game.decode;
  const hand = game.private?.[playerId]?.hand || [];
  const tracker = game.public.decodeTracker;

  const players = Object.values(game.players);
  const submittedCount = d ? Object.keys(d.submitted || {}).length : 0;
  const iSubmitted = d && (d.submitted || {})[playerId];

  async function run(fn) {
    setError('');
    setBusy(true);
    try { await fn(); } catch (e) { setError(e.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit() {
    await run(() => contributeCards(code, playerId, selected));
    setSelected([]);
  }

  return (
    <div className="phase grid-3">
      <aside className="col">
        <DecodeTracker tracker={tracker} />
        <MyStatus game={game} code={code} playerId={playerId} />
        <GameLog log={game.log} />
      </aside>

      <section className="col center">
        <div className="panel">
          <h2>Decode Phase</h2>
          <p className="muted small">
            First Team Leader token: <strong>{callerName}</strong>{isCaller ? ' (you)' : ''} —
            must call a decode attempt (mandatory).
          </p>

          {/* Step 1: choose a category */}
          {!d && (
            isCaller ? (
              <div className="category-choice">
                <p>Choose a category to attempt:</p>
                <div className="cat-buttons">
                  {CATEGORIES.map((cat) => {
                    const st = tracker[cat];
                    const done = st === DECODE_STATUS.DECODED || st === DECODE_STATUS.LOCKED;
                    return (
                      <button key={cat} className={`cat-${cat}`} disabled={done || busy}
                        onClick={() => run(() => callDecode(code, playerId, cat))}>
                        {cat}{done ? ` (${st})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="muted">Waiting for {callerName} to call a decode attempt…</p>
            )
          )}

          {/* Step 2-4: contributions */}
          {d && !d.revealed && (
            <div className="decode-active">
              <div className={`phrase-banner cat-${d.category}`}>
                <div className="muted small">Attempting</div>
                <div className="phrase-text">{d.category}</div>
                <div className="muted small">
                  Persistent pile score: <strong>{d.persistentScore}</strong> · need {BALANCE.DECODE_THRESHOLD}
                </div>
              </div>

              <p className="muted small">
                Each player secretly contributes any number of cards (or none). Then {BALANCE.NOISE_CARDS} noise
                cards are added and everything is revealed.
              </p>

              <div className="submit-status muted small">
                Submitted: {submittedCount}/{players.length}
                {' '}({players.filter((p) => (d.submitted || {})[p.id]).map((p) => p.name).join(', ') || 'none'})
              </div>

              {!iSubmitted ? (
                <button disabled={busy} onClick={submit}>
                  Submit {selected.length} card{selected.length === 1 ? '' : 's'} (face-down)
                </button>
              ) : (
                <p className="muted">✓ You submitted. Waiting for others…</p>
              )}

              {(isCaller || isHost) && (
                <button className="big" disabled={busy}
                  onClick={() => run(() => resolveDecode(code, playerId))}>
                  Reveal & resolve {submittedCount < players.length ? `(${players.length - submittedCount} not submitted)` : ''}
                </button>
              )}
            </div>
          )}

          {/* Step 5: revealed result */}
          {d && d.revealed && (
            <div className="decode-result">
              <div className={`result-banner ${d.success ? 'win' : 'fail'}`}>
                {d.category}: total <strong>{d.total}</strong> / {BALANCE.DECODE_THRESHOLD} —{' '}
                {d.success ? 'DECODED ✓' : 'FAILED ✗'}
              </div>
              <div className="revealed-cards">
                <div className="muted small">Revealed (contributions + {BALANCE.NOISE_CARDS} noise):</div>
                <div className="card-row tiny">
                  {(d.revealedCards || []).map((c) => (
                    <span key={c.id} className={`minicard ${c.isWildcard ? 'cat-Wild' : 'cat-' + c.category}`}>
                      {cardLabel(c)}
                    </span>
                  ))}
                </div>
              </div>
              {(isCaller || isHost) ? (
                <button className="big" disabled={busy}
                  onClick={() => run(() => startNextRound(code, playerId))}>
                  Start next round
                </button>
              ) : (
                <p className="muted">Waiting for {callerName} to start the next round…</p>
              )}
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <DecodePile pile={game.public.decodePile} bonusCategories={game.public.bonusCategories} />

        {d && !d.revealed && (
          <div className="panel">
            <Hand
              hand={hand}
              selectedIds={selected}
              onToggleSelect={iSubmitted ? undefined : toggle}
              title={iSubmitted ? 'Your hand (submitted)' : 'Tap cards to contribute, then Submit'}
            />
          </div>
        )}
      </section>

      <aside className="col">
        <PlayerBoards game={game} playerId={playerId} currentLeaderId={null} />
      </aside>
    </div>
  );
}
