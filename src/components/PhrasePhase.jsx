import { useState } from 'react';
import DecodeTracker from './DecodeTracker.jsx';
import GameLog from './GameLog.jsx';
import PlayerBoards from './PlayerBoards.jsx';
import Hand from './Hand.jsx';
import MyStatus from './MyStatus.jsx';
import DecodePile from './DecodePile.jsx';
import {
  readPhrase,
  claimPhrase,
  resolveActivation,
  playPhraseCard,
  passLeader,
} from '../lib/rtdb.js';

export default function PhrasePhase({ game, code, playerId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const me = game.players[playerId];
  const isLeader = game.currentLeaderId === playerId;
  const leaderName = game.players[game.currentLeaderId]?.name || '—';
  const cp = game.public?.currentPhrase || null;
  const priv = game.private?.[playerId] || {};
  const hand = priv.hand || [];
  const leaderDraw = priv.leaderDraw || [];

  const n = game.turnOrder?.length || 0;
  const turnNo = (game.leaderTurnIndex || 0) + 1;

  const myPlayed = cp?.cardsPlayed?.[playerId] || 0;
  const canClaim = cp && cp.eligibleClaimers?.includes(playerId) &&
    !(cp.claimedBy || []).includes(playerId) && (cp.claimedBy || []).length < 2;
  const mustResolveActivation = cp && (cp.activationPending || []).includes(playerId);

  async function run(fn) {
    setError('');
    setBusy(true);
    try { await fn(); } catch (e) { setError(e.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="phase grid-3">
      {/* LEFT */}
      <aside className="col">
        <DecodeTracker tracker={game.public.decodeTracker} />
        <MyStatus game={game} code={code} playerId={playerId} />
        <GameLog log={game.log} />
      </aside>

      {/* CENTER */}
      <section className="col center">
        <div className="panel">
          <h2>Phrase Phase</h2>
          <p className="muted small">
            Team Leader turn {turnNo} of {n} this round · Leader: <strong>{leaderName}</strong>
            {isLeader ? ' (you)' : ''}
          </p>

          {/* Leader picks a phrase to read */}
          {isLeader && !cp && (
            <div className="leader-draw">
              <p>You drew 3 phrase cards. Announce the <em>categories</em> aloud, let the
                group discuss, then read one phrase.</p>
              <div className="card-row">
                {leaderDraw.map((c) => (
                  <div key={c.id} className={`gcard cat-${c.category}`}>
                    <div className="gcard-top">
                      <span className="gcard-cat">{c.category}</span>
                    </div>
                    <div className="gcard-effect">"{c.text}"</div>
                    <button className="small" disabled={busy}
                      onClick={() => run(() => readPhrase(code, playerId, c.id))}>
                      Read this aloud
                    </button>
                  </div>
                ))}
                {leaderDraw.length === 0 && <p className="muted">Drawing…</p>}
              </div>
            </div>
          )}

          {!isLeader && !cp && (
            <p className="muted">Waiting for {leaderName} to choose and read a phrase…</p>
          )}

          {/* A phrase has been read */}
          {cp && (
            <div className="read-phrase">
              <div className={`phrase-banner cat-${cp.category}`}>
                <div className="muted small">{cp.category} — read by {game.players[cp.leaderId]?.name}</div>
                <div className="phrase-text">"{cp.text}"</div>
              </div>

              <div className="claims">
                <span className="muted small">
                  Dossier matches: {(cp.claimedBy || []).map((id) => game.players[id]?.name).join(', ') || 'none yet'}
                  {' '}({(cp.claimedBy || []).length}/2)
                </span>
                {canClaim && (
                  <button disabled={busy} onClick={() => run(() => claimPhrase(code, playerId))}>
                    Claim match — draw 4
                  </button>
                )}
              </div>

              {mustResolveActivation && (
                <div className="activation-prompt">
                  <strong>Your activation phrase was just read.</strong>
                  <p className="muted small">
                    Resolve privately. (Loyal: draw 4. Sleeper: you must reveal & activate.)
                  </p>
                  <button className="danger" disabled={busy}
                    onClick={() => run(() => resolveActivation(code, playerId))}>
                    Resolve activation
                  </button>
                </div>
              )}

              {isLeader && (
                <button className="big" disabled={busy}
                  onClick={() => run(() => passLeader(code, playerId))}>
                  Done — pass Team Leader role
                </button>
              )}
            </div>
          )}
        </div>

        <DecodePile pile={game.public.decodePile} bonusCategories={game.public.bonusCategories} />

        <div className="panel">
          <Hand
            hand={hand}
            onPlay={cp ? (card) => run(() => playPhraseCard(code, playerId, card.id)) : undefined}
            playDisabled={busy || !cp || myPlayed >= 2}
            title={`Your hand — played ${myPlayed}/2 this turn`}
          />
          {!cp && <p className="muted small">You can play cards once a phrase has been read.</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      {/* RIGHT */}
      <aside className="col">
        <PlayerBoards
          game={game}
          playerId={playerId}
          highlightPhraseId={cp?.phraseId}
          currentLeaderId={game.currentLeaderId}
        />
      </aside>
    </div>
  );
}
