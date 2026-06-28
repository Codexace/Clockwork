// Per-browser player identity, persisted in localStorage so a player can
// refresh / reconnect and keep their seat (and their private hand & identity).
const KEY = 'clockwork-player-id';
const NAME_KEY = 'clockwork-player-name';

function randomId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

export function getPlayerId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getSavedName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
}

// A fresh identity (e.g. "leave and join a different game as a new person").
export function resetPlayerId() {
  const id = randomId();
  localStorage.setItem(KEY, id);
  return id;
}
