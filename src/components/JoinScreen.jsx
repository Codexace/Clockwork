import { useState } from 'react';
import { getSavedName, saveName } from '../lib/identity.js';
import {
  createGame,
  joinGame,
  gameExists,
  fetchGame,
  fetchPresence,
} from '../lib/rtdb.js';
import RejoinSeatList from './RejoinSeatList.jsx';

// Entry screen: pick a game code + name, then create / join / rejoin.
export default function JoinScreen({ playerId, onJoined }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(getSavedName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Rejoin lookup state: null = not looking up; otherwise { players, presence }.
  const [lookup, setLookup] = useState(null);

  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();
  const codeOk = cleanCode.length >= 3;
  const valid = codeOk && cleanName.length >= 1;

  async function handle(action) {
    setError('');
    if (!valid) {
      setError('Enter a game code (3+ chars) and your name.');
      return;
    }
    setBusy(true);
    try {
      saveName(cleanName);
      const player = { id: playerId, name: cleanName };
      if (action === 'create') {
        await createGame(cleanCode, player);
      } else {
        if (!(await gameExists(cleanCode))) {
          throw new Error(`No game found with code "${cleanCode}".`);
        }
        await joinGame(cleanCode, player);
      }
      onJoined(cleanCode);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function lookupSeats() {
    setError('');
    if (!codeOk) {
      setError('Enter a game code (3+ chars) first.');
      return;
    }
    setBusy(true);
    try {
      const g = await fetchGame(cleanCode);
      if (!g) throw new Error(`No game found with code "${cleanCode}".`);
      const presence = await fetchPresence(cleanCode);
      setLookup({ players: Object.values(g.players || {}), presence });
    } catch (e) {
      setError(e.message || 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  }

  function reclaim(seat) {
    saveName(seat.name);
    onJoined(cleanCode, seat.id);
  }

  return (
    <div className="centered">
      <div className="card join">
        <h1>CLOCKWORK</h1>
        <p className="subtitle">Cold War codebreaking with hidden traitors · 5–10 players</p>

        <label>
          Game code
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setLookup(null); }}
            placeholder="e.g. REDPHONE"
            maxLength={12}
            autoCapitalize="characters"
          />
        </label>
        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morgan"
            maxLength={20}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="row">
          <button disabled={!valid || busy} onClick={() => handle('create')}>
            Create game
          </button>
          <button
            className="secondary"
            disabled={!valid || busy}
            onClick={() => handle('join')}
          >
            Join game
          </button>
        </div>

        <div className="rejoin-block">
          <button className="ghost block" disabled={!codeOk || busy} onClick={lookupSeats}>
            Disconnected? Rejoin a seat
          </button>
          {lookup && (
            <>
              <p className="muted small">Pick your seat to reconnect:</p>
              <RejoinSeatList
                players={lookup.players}
                presence={lookup.presence}
                onReclaim={reclaim}
                busy={busy}
              />
            </>
          )}
        </div>

        <p className="muted small">
          Everyone joining the same game enters the <em>same</em> code. One person
          creates; the rest join. Best played together on a video call.
        </p>
      </div>
    </div>
  );
}
