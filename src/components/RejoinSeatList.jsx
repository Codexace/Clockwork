import { CHARACTER_BY_ID } from '../data/gameData.js';

// Reusable seat picker for reclaiming a seat after a disconnect.
// Online seats are disabled to avoid hijacking an actively-connected player —
// a disconnected player's seat shows as offline and is reclaimable.
export default function RejoinSeatList({ players = [], presence = {}, onReclaim, busy }) {
  const seats = [...players].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  if (seats.length === 0) {
    return <p className="muted">No seats found in this game.</p>;
  }
  return (
    <ul className="seat-list">
      {seats.map((p) => {
        const online = presence[p.id] === true;
        const ch = CHARACTER_BY_ID[p.characterId];
        return (
          <li key={p.id} className={online ? 'online' : 'offline'}>
            <span className={`conn ${online ? 'on' : 'off'}`}>{online ? '●' : '○'}</span>
            <span className="seat-main">
              <span className="seat-name">{p.name}{p.isHost ? ' · host' : ''}</span>
              <span className="muted small">{ch ? ch.name : 'no character yet'}</span>
            </span>
            <button
              className="small"
              disabled={online || busy}
              title={online ? 'This seat is currently online' : 'Take over this seat'}
              onClick={() => onReclaim(p)}
            >
              {online ? 'online' : 'Reconnect'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
