import { useState } from 'react';
import { getSavedName, saveName } from '../lib/identity.js';
import { createGame, joinGame, gameExists } from '../lib/rtdb.js';

// Entry screen: pick a game code + name, then create or join.
export default function JoinScreen({ playerId, onJoined }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(getSavedName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();
  const valid = cleanCode.length >= 3 && cleanName.length >= 1;

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

  return (
    <div className="centered">
      <div className="card join">
        <h1>CLOCKWORK</h1>
        <p className="subtitle">Cold War codebreaking with hidden traitors · 5–10 players</p>

        <label>
          Game code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
        <p className="muted small">
          Everyone joining the same game enters the <em>same</em> code. One person
          creates; the rest join. Best played together on a video call.
        </p>
      </div>
    </div>
  );
}
