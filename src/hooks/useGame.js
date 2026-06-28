import { useEffect, useState } from 'react';
import { subscribeGame } from '../lib/rtdb.js';

// Subscribe to a game's full state. Returns { game, loading }.
// `game` is null until the first snapshot arrives (or if the code doesn't exist).
export function useGame(code) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setGame(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGame(code, (value) => {
      setGame(value);
      setLoading(false);
    });
    return unsub;
  }, [code]);

  return { game, loading };
}
