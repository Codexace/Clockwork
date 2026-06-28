import { useState } from 'react';
import RejoinSeatList from './RejoinSeatList.jsx';

// Shown when the local player holds a game code but is not seated in it
// (new device, cleared storage, or rejoining a game in progress).
export default function RejoinScreen({ code, game, presence, onReclaim, onBack }) {
  const [busy, setBusy] = useState(false);
  const players = Object.values(game.players || {});
  const inProgress = game.phase !== 'lobby';

  async function reclaim(seat) {
    setBusy(true);
    try { await onReclaim(seat); } finally { setBusy(false); }
  }

  return (
    <div className="centered">
      <div className="card">
        <h1>Rejoin game {code}</h1>
        <p className="muted">
          {inProgress
            ? 'This game is in progress. Pick your seat to reconnect with your hand and identity.'
            : 'Pick your seat to reconnect.'}
        </p>
        <RejoinSeatList players={players} presence={presence} onReclaim={reclaim} busy={busy} />
        <p className="muted small">
          Only offline seats can be reclaimed. If your seat still shows online,
          wait a few seconds for the disconnect to register.
        </p>
        <button className="ghost" onClick={onBack}>Back to start</button>
      </div>
    </div>
  );
}
