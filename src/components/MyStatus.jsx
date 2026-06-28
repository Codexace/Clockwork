import { useState } from 'react';
import { SLEEPER_ALT_WINS, SLEEPER_POWERS } from '../data/gameData.js';
import { handWeightByCategory, checkAltWin } from '../lib/game.js';
import { claimAltWin, useSleeperPower } from '../lib/rtdb.js';

// PRIVATE panel: your identity card + (for sleepers) secret win condition,
// progress, activated powers, and the alternate-victory claim.
export default function MyStatus({ game, code, playerId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const priv = game.private?.[playerId];
  const me = game.players?.[playerId];
  if (!priv || !priv.identity) {
    return (
      <div className="mystatus">
        <h3>Your Identity</h3>
        <p className="muted">Not dealt yet.</p>
      </div>
    );
  }

  const isSleeper = priv.identity === 'sleeper';
  const hand = priv.hand || [];
  const requirement = isSleeper ? SLEEPER_ALT_WINS[priv.altWinIndex] : null;
  const { byCat, wildcard } = handWeightByCategory(hand);
  const altMet = isSleeper && checkAltWin(hand, requirement);

  async function run(fn) {
    setError('');
    setBusy(true);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className={`mystatus ${isSleeper ? 'sleeper' : 'loyal'}`}>
      <h3>Your Identity (private)</h3>
      <p className="identity-line">
        {isSleeper ? '🕵 SLEEPER AGENT' : '🛡 LOYAL ANALYST'}
        {isSleeper && me?.activated && <span className="activated-tag"> · ACTIVATED</span>}
      </p>

      {isSleeper && (
        <>
          <div className="altwin">
            <div className="muted small">Secret win — hold this hand weight (total 20):</div>
            <ul className="altwin-list">
              {Object.entries(requirement).map(([cat, need]) => {
                const have = byCat[cat] || 0;
                return (
                  <li key={cat} className={have >= need ? 'ok' : ''}>
                    {cat}: {have}/{need}
                  </li>
                );
              })}
              <li className="muted">Wildcards available: {wildcard}</li>
            </ul>
            <button
              disabled={!altMet || !me?.activated || busy}
              onClick={() => run(() => claimAltWin(code, playerId))}
            >
              {altMet ? 'Claim alternate victory!' : 'Combination not yet held'}
            </button>
            {!me?.activated && (
              <p className="muted small">You must be activated to claim this.</p>
            )}
          </div>

          {me?.activated && (
            <div className="powers">
              <div className="muted small">Activated powers:</div>
              {[...SLEEPER_POWERS.oncePerTurn, ...SLEEPER_POWERS.oncePerRound].map((pw) => (
                <button
                  key={pw.id}
                  className="small block"
                  disabled={busy}
                  title={pw.desc}
                  onClick={() => run(() => useSleeperPower(code, playerId, pw))}
                >
                  {pw.label}
                </button>
              ))}
              <p className="muted small">
                Most powers are resolved at the table; the button announces them in the log.
              </p>
            </div>
          )}
        </>
      )}

      {!isSleeper && (
        <p className="muted small">
          Work with the team to decode 3 categories. Keep this card hidden.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
