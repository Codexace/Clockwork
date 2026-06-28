import { useEffect, useState } from 'react';
import { subscribePresence, bindPresence } from '../lib/rtdb.js';

// Tracks connection status for everyone in a game.
//  - Returns a { [playerId]: true|false } presence map for display.
//  - When `active` (this client holds a seat), also publishes our own presence
//    and arms an onDisconnect hook so we flip to offline if the tab/network dies.
export function usePresence(code, playerId, active) {
  const [presence, setPresence] = useState({});

  // Read everyone's presence.
  useEffect(() => {
    if (!code) {
      setPresence({});
      return undefined;
    }
    return subscribePresence(code, setPresence);
  }, [code]);

  // Publish our own presence only once we actually hold a seat.
  useEffect(() => {
    if (!code || !playerId || !active) return undefined;
    return bindPresence(code, playerId);
  }, [code, playerId, active]);

  return presence;
}
