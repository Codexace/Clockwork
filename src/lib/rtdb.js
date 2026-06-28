// Realtime Database action layer. Every game mutation goes through a
// transaction on the whole /games/{code} node, which keeps decks, hands and
// public state consistent even with several players acting at once.
//
// Private data (identity, hand) lives under game.private[playerId]. The UI only
// renders a player's own private node — see PRIVACY note in the README.
import {
  ref,
  onValue,
  runTransaction,
  get,
  set,
  onDisconnect,
} from 'firebase/database';
import { db } from '../firebase.js';
import {
  buildPhraseDeck,
  buildSkillDeck,
  drawCards,
  cardLabel,
  shuffle,
} from './deck.js';
import {
  emptyTracker,
  tallyCards,
  nextTrackerStatus,
  checkBoardWin,
  checkAltWin,
  DECODE_STATUS,
} from './game.js';
import {
  BALANCE,
  CHARACTER_BY_ID,
  PHRASE_BY_ID,
  SLEEPER_ALT_WINS,
  sleeperCount,
} from '../data/gameData.js';

const gameRef = (code) => ref(db, `games/${code}`);

// ---- small helpers ----------------------------------------------------------
function normalize(g) {
  // Firebase drops empty arrays/objects; restore the shapes we rely on.
  if (!g) return g;
  g.players = g.players || {};
  g.private = g.private || {};
  g.decks = g.decks || {};
  g.decks.phraseDeck = g.decks.phraseDeck || [];
  g.decks.phraseDiscard = g.decks.phraseDiscard || [];
  g.decks.skillDeck = g.decks.skillDeck || [];
  g.decks.skillDiscard = g.decks.skillDiscard || [];
  g.public = g.public || {};
  g.public.decodeTracker = g.public.decodeTracker || emptyTracker();
  g.public.decodePile = g.public.decodePile || [];
  g.public.activationPhrases = g.public.activationPhrases || {};
  g.public.bonusCategories = g.public.bonusCategories || [];
  g.turnOrder = g.turnOrder || [];
  g.log = g.log || [];
  return g;
}

function addLog(g, msg) {
  g.log = g.log || [];
  g.log.push({ t: Date.now(), msg });
  if (g.log.length > 60) g.log = g.log.slice(-60);
}

function handOf(g, pid) {
  g.private[pid] = g.private[pid] || {};
  g.private[pid].hand = g.private[pid].hand || [];
  return g.private[pid].hand;
}

// Draw n skill cards into a player's hand (mutates g). Returns count drawn.
function drawToHand(g, pid, n) {
  const { drawn, deck, discard } = drawCards(
    g.decks.skillDeck,
    g.decks.skillDiscard,
    n,
  );
  g.decks.skillDeck = deck;
  g.decks.skillDiscard = discard;
  const hand = handOf(g, pid);
  hand.push(...drawn);
  return drawn.length;
}

function seatedOrder(g) {
  return Object.values(g.players)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
    .map((p) => p.id);
}

function playerName(g, pid) {
  return g.players[pid]?.name || 'Someone';
}

// Transaction wrapper that throws if the mutator signals an error.
async function txn(code, mutator) {
  const result = await runTransaction(gameRef(code), (current) => {
    if (current === null) return current; // game must already exist — abort
    const g = normalize(current);
    const outcome = mutator(g);
    if (outcome === ABORT) return; // abort transaction
    return g;
  });
  if (!result.committed) {
    throw new Error('Action could not be applied. Try again.');
  }
  return result.snapshot.val();
}

const ABORT = Symbol('abort');

// =============================================================================
// Subscriptions
// =============================================================================
export function subscribeGame(code, cb) {
  return onValue(gameRef(code), (snap) => cb(snap.val()));
}

export async function gameExists(code) {
  const snap = await get(gameRef(code));
  return snap.exists();
}

// One-off fetch of a game's current state (used by the rejoin seat lookup).
export async function fetchGame(code) {
  const snap = await get(gameRef(code));
  return snap.val();
}

// =============================================================================
// Presence (connection status) — stored at presence/{code}/{pid} as a boolean.
// Kept OUTSIDE the transactional /games node so game transactions never clobber
// it. The UI merges it back in for display (see usePresence / App).
// =============================================================================
const presenceRef = (code, pid) => ref(db, `presence/${code}/${pid}`);

export function subscribePresence(code, cb) {
  return onValue(ref(db, `presence/${code}`), (snap) => cb(snap.val() || {}));
}

export async function fetchPresence(code) {
  const snap = await get(ref(db, `presence/${code}`));
  return snap.val() || {};
}

// Bind this client's presence: mark online now, and register an onDisconnect
// hook so Firebase flips us offline if the connection drops. Returns a cleanup
// that marks us offline and cancels the hook (for a clean leave/unmount).
export function bindPresence(code, pid) {
  const connectedRef = ref(db, '.info/connected');
  const myRef = presenceRef(code, pid);
  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Order matters: arm onDisconnect first, then announce we're online.
      onDisconnect(myRef).set(false);
      set(myRef, true);
    }
  });
  return () => {
    unsub();
    onDisconnect(myRef).cancel().catch(() => {});
    set(myRef, false).catch(() => {});
  };
}

// =============================================================================
// Lobby
// =============================================================================
export async function createGame(code, player) {
  const result = await runTransaction(gameRef(code), (current) => {
    if (current && current.players && Object.keys(current.players).length) {
      return; // code already in use — abort
    }
    const g = normalize({
      code,
      phase: 'lobby',
      hostId: player.id,
      createdAt: Date.now(),
      round: 0,
    });
    g.players[player.id] = {
      id: player.id,
      name: player.name,
      characterId: null,
      ready: false,
      isHost: true,
      activated: false,
      joinedAt: Date.now(),
    };
    addLog(g, `${player.name} created the game.`);
    return g;
  });
  if (!result.committed) {
    throw new Error('That game code is already taken. Pick another.');
  }
  return result.snapshot.val();
}

export async function joinGame(code, player) {
  return txn(code, (g) => {
    // Allow reconnect of an existing player at any phase.
    if (g.players[player.id]) {
      g.players[player.id].name = player.name;
      return;
    }
    if (g.phase !== 'lobby') return ABORT; // can't join a game in progress
    g.players[player.id] = {
      id: player.id,
      name: player.name,
      characterId: null,
      ready: false,
      isHost: false,
      activated: false,
      joinedAt: Date.now(),
    };
    addLog(g, `${player.name} joined.`);
  });
}

export async function setCharacter(code, pid, characterId) {
  return txn(code, (g) => {
    if (g.phase !== 'lobby') return ABORT;
    // Prevent two players picking the same character.
    const taken = Object.values(g.players).some(
      (p) => p.id !== pid && p.characterId === characterId,
    );
    if (taken) return ABORT;
    g.players[pid].characterId = characterId;
  });
}

export async function setReady(code, pid, ready) {
  return txn(code, (g) => {
    if (g.phase !== 'lobby') return ABORT;
    if (!g.players[pid].characterId) return ABORT; // must pick a character first
    g.players[pid].ready = ready;
  });
}

export async function leaveGame(code, pid) {
  return txn(code, (g) => {
    if (g.phase !== 'lobby') return ABORT;
    delete g.players[pid];
  });
}

// =============================================================================
// Setup / start
// =============================================================================
export async function startGame(code, hostId) {
  return txn(code, (g) => {
    if (g.hostId !== hostId) return ABORT;
    if (g.phase !== 'lobby') return ABORT;
    const players = Object.values(g.players);
    if (players.length < BALANCE.MIN_PLAYERS) return ABORT;
    if (players.some((p) => !p.characterId || !p.ready)) return ABORT;

    // Build decks.
    g.decks.phraseDeck = buildPhraseDeck();
    g.decks.phraseDiscard = [];
    g.decks.skillDeck = buildSkillDeck();
    g.decks.skillDiscard = [];

    // Assign identities (correct number of sleepers).
    const ids = seatedOrder(g);
    const nSleepers = Math.min(sleeperCount(ids.length), ids.length - 1);
    const shuffledIds = shuffle(ids);
    const sleeperSet = new Set(shuffledIds.slice(0, nSleepers));

    // Activation phrases: one distinct phrase per player.
    const allPhraseIds = shuffle(Object.keys(PHRASE_BY_ID));

    // Sleeper alt-win combos: one distinct combo per sleeper.
    const altWinPool = shuffle(SLEEPER_ALT_WINS.map((_, i) => i));

    ids.forEach((pid) => {
      const isSleeper = sleeperSet.has(pid);
      g.private[pid] = g.private[pid] || {};
      g.private[pid].identity = isSleeper ? 'sleeper' : 'loyal';
      g.private[pid].hand = [];
      g.private[pid].leaderDraw = null;
      if (isSleeper) {
        g.private[pid].altWinIndex = altWinPool.pop();
      }
      // Activation phrase (public, shown on dossier bonus slot).
      const phraseId = allPhraseIds.pop();
      g.public.activationPhrases[pid] = phraseId;
      // Starting hand.
      drawToHand(g, pid, BALANCE.STARTING_HAND);
    });

    // Turn order + first leader.
    g.turnOrder = ids;
    g.firstLeaderIndex = Math.floor(Math.random() * ids.length);
    g.leaderTurnIndex = 0;
    g.round = 1;
    g.public.decodeTracker = emptyTracker();
    g.public.decodePile = [];
    g.public.bonusCategories = [];

    g.phase = 'phrase';
    addLog(
      g,
      `Game started. ${nSleepers} sleeper agent${nSleepers > 1 ? 's' : ''} among ${ids.length} players.`,
    );
    startLeaderTurn(g);
  });
}

// =============================================================================
// Phrase phase
// =============================================================================
function startLeaderTurn(g) {
  const n = g.turnOrder.length;
  const leaderId = g.turnOrder[(g.firstLeaderIndex + g.leaderTurnIndex) % n];
  g.currentLeaderId = leaderId;
  g.public.currentPhrase = null;
  // Draw 3 phrase cards privately for the leader.
  const { drawn, deck, discard } = drawCards(
    g.decks.phraseDeck,
    g.decks.phraseDiscard,
    3,
  );
  g.decks.phraseDeck = deck;
  g.decks.phraseDiscard = discard;
  g.private[leaderId] = g.private[leaderId] || {};
  g.private[leaderId].leaderDraw = drawn;
  addLog(g, `${playerName(g, leaderId)} is Team Leader. Drawing 3 phrase cards.`);
}

export async function readPhrase(code, pid, phraseCardId) {
  return txn(code, (g) => {
    if (g.phase !== 'phrase') return ABORT;
    if (g.currentLeaderId !== pid) return ABORT;
    const draw = g.private[pid]?.leaderDraw || [];
    const idx = draw.findIndex((c) => c.id === phraseCardId);
    if (idx === -1) return ABORT;
    const chosen = draw[idx];
    const others = draw.filter((_, i) => i !== idx);

    // Chosen card -> phrase discard. Others -> bottom of phrase deck.
    g.decks.phraseDiscard.push(chosen);
    g.decks.phraseDeck.push(...others);
    g.private[pid].leaderDraw = null;

    // Who can claim this phrase via their dossier?
    const eligibleClaimers = Object.values(g.players)
      .filter((p) => {
        const ch = CHARACTER_BY_ID[p.characterId];
        return ch && ch.phraseIds.includes(chosen.phraseId);
      })
      .map((p) => p.id);

    // Whose ACTIVATION phrase matches (public knowledge)?
    const activationPending = Object.entries(g.public.activationPhrases)
      .filter(([, ph]) => ph === chosen.phraseId)
      .map(([who]) => who);

    g.public.currentPhrase = {
      leaderId: pid,
      phraseId: chosen.phraseId,
      category: chosen.category,
      text: chosen.text,
      eligibleClaimers,
      claimedBy: [],
      activationPending,
      cardsPlayed: {},
    };
    addLog(
      g,
      `${playerName(g, pid)} reads a ${chosen.category} phrase: "${chosen.text}"`,
    );
  });
}

export async function claimPhrase(code, pid) {
  return txn(code, (g) => {
    const cp = g.public.currentPhrase;
    if (!cp) return ABORT;
    if (!cp.eligibleClaimers?.includes(pid)) return ABORT;
    cp.claimedBy = cp.claimedBy || [];
    if (cp.claimedBy.includes(pid)) return ABORT;
    if (cp.claimedBy.length >= 2) return ABORT; // at most two matches per phrase
    cp.claimedBy.push(pid);
    const drew = drawToHand(g, pid, BALANCE.PHRASE_MATCH_DRAW);
    addLog(g, `${playerName(g, pid)} matched the phrase and drew ${drew} cards.`);
  });
}

// Resolve an activation-phrase match. Looks identical from the outside until
// resolved: loyal silently draws the bonus; sleeper reveals and activates.
export async function resolveActivation(code, pid) {
  return txn(code, (g) => {
    const cp = g.public.currentPhrase;
    if (!cp || !cp.activationPending?.includes(pid)) return ABORT;
    cp.activationPending = cp.activationPending.filter((x) => x !== pid);
    const identity = g.private[pid]?.identity;
    if (identity === 'sleeper') {
      g.players[pid].activated = true;
      g.players[pid].revealedIdentity = 'sleeper';
      addLog(g, `⚠ ${playerName(g, pid)} declares "AGENT ACTIVATED" and is revealed as a Sleeper Agent!`);
    } else {
      const drew = drawToHand(g, pid, BALANCE.PHRASE_MATCH_DRAW);
      addLog(g, `${playerName(g, pid)}'s activation phrase was read — drew ${drew} bonus cards.`);
    }
  });
}

// Play a card from hand during the phrase phase (max 2 per player per leader turn).
export async function playPhraseCard(code, pid, cardId) {
  return txn(code, (g) => {
    if (g.phase !== 'phrase') return ABORT;
    const cp = g.public.currentPhrase;
    if (!cp) return ABORT; // phrase must have been read first
    cp.cardsPlayed = cp.cardsPlayed || {};
    if ((cp.cardsPlayed[pid] || 0) >= 2) return ABORT;

    const hand = handOf(g, pid);
    const idx = hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return ABORT;
    const card = hand[idx];
    hand.splice(idx, 1);
    cp.cardsPlayed[pid] = (cp.cardsPlayed[pid] || 0) + 1;

    // Resolve the mechanical bits the app can handle.
    if (card.selfDraw) drawToHand(g, pid, card.selfDraw);

    if (card.addsToPile) {
      g.public.decodePile.push({ ...card, faceUp: true });
      addLog(g, `${playerName(g, pid)} played ${cardLabel(card)} to the decode pile.`);
    } else {
      g.decks.skillDiscard.push(card);
      // weight-2a: this category counts positive for the next decode check.
      if (card.effect?.startsWith('This category also counts as positive')) {
        g.public.bonusCategories = Array.from(
          new Set([...(g.public.bonusCategories || []), card.category]),
        );
        addLog(g, `${playerName(g, pid)} marked ${card.category} as a bonus category for the next decode.`);
      } else {
        addLog(g, `${playerName(g, pid)} played ${cardLabel(card)}: ${card.effect}`);
      }
    }
  });
}

export async function passLeader(code, pid) {
  return txn(code, (g) => {
    if (g.phase !== 'phrase') return ABORT;
    if (g.currentLeaderId !== pid) return ABORT;
    if (g.public.currentPhrase == null) return ABORT; // must read a phrase first
    const n = g.turnOrder.length;
    g.leaderTurnIndex += 1;
    if (g.leaderTurnIndex >= n) {
      // Everyone led once -> Decode Phase.
      g.phase = 'decode';
      g.currentLeaderId = null;
      g.public.currentPhrase = null;
      g.decode = null;
      const caller = g.turnOrder[g.firstLeaderIndex % n];
      addLog(g, `All players have led. ${playerName(g, caller)} must call a Decode Attempt.`);
    } else {
      startLeaderTurn(g);
    }
  });
}

// =============================================================================
// Decode phase
// =============================================================================
export async function callDecode(code, pid, category) {
  return txn(code, (g) => {
    if (g.phase !== 'decode') return ABORT;
    if (g.decode) return ABORT; // already called
    const n = g.turnOrder.length;
    const caller = g.turnOrder[g.firstLeaderIndex % n];
    if (pid !== caller) return ABORT;
    const status = g.public.decodeTracker[category];
    if (status === DECODE_STATUS.DECODED || status === DECODE_STATUS.LOCKED) {
      return ABORT; // can't attempt a finished category
    }
    const persistentScore = tallyCards(
      g.public.decodePile,
      category,
      g.public.bonusCategories,
    );
    g.decode = {
      category,
      callerId: pid,
      persistentScore,
      contributions: {},
      submitted: {},
      noise: [],
      revealed: false,
    };
    addLog(g, `${playerName(g, pid)} calls a Decode Attempt on ${category}. Persistent pile = ${persistentScore}.`);
  });
}

export async function contributeCards(code, pid, cardIds) {
  return txn(code, (g) => {
    if (g.phase !== 'decode' || !g.decode || g.decode.revealed) return ABORT;
    const hand = handOf(g, pid);
    const chosen = [];
    for (const id of cardIds) {
      const idx = hand.findIndex((c) => c.id === id);
      if (idx !== -1) chosen.push(hand.splice(idx, 1)[0]);
    }
    g.decode.contributions = g.decode.contributions || {};
    g.decode.contributions[pid] = chosen;
    g.decode.submitted = g.decode.submitted || {};
    g.decode.submitted[pid] = true;
    addLog(g, `${playerName(g, pid)} secretly contributed ${chosen.length} card(s).`);
  });
}

export async function resolveDecode(code, pid) {
  return txn(code, (g) => {
    if (g.phase !== 'decode' || !g.decode || g.decode.revealed) return ABORT;
    const d = g.decode;

    // Draw 2 noise cards from the skill deck.
    const { drawn, deck, discard } = drawCards(
      g.decks.skillDeck,
      g.decks.skillDiscard,
      BALANCE.NOISE_CARDS,
    );
    g.decks.skillDeck = deck;
    g.decks.skillDiscard = discard;
    d.noise = drawn;

    // Gather all face-down cards (contributions + noise), reveal, tally.
    const contributed = Object.values(d.contributions || {}).flat();
    const revealedCards = [...contributed, ...drawn];
    const revealScore = tallyCards(revealedCards, d.category, g.public.bonusCategories);
    const total = d.persistentScore + revealScore;
    const success = total >= BALANCE.DECODE_THRESHOLD;

    d.revealed = true;
    d.revealedCards = revealedCards;
    d.total = total;
    d.success = success;

    // Update tracker.
    const prev = g.public.decodeTracker[d.category];
    g.public.decodeTracker[d.category] = nextTrackerStatus(prev, success);

    // Clear the decode pile + all played cards to the discard.
    g.decks.skillDiscard.push(...g.public.decodePile, ...revealedCards);
    g.public.decodePile = [];
    g.public.bonusCategories = [];

    addLog(
      g,
      `Decode ${d.category}: total ${total} (need ${BALANCE.DECODE_THRESHOLD}) — ${success ? 'DECODED ✓' : 'FAILED ✗'}.`,
    );

    // Win/loss? (handled fully here so the game ends immediately)
    const win = checkBoardWin(g.public.decodeTracker);
    if (win) {
      g.phase = 'gameover';
      g.winner = { ...win, revealed: true };
      addLog(g, `Game over — ${win.winner === 'loyal' ? 'Loyal Analysts' : 'Sleeper Agents'} win! ${win.reason}`);
    }
    // Otherwise stay on the (revealed) decode screen until someone advances.
  });
}

// Advance to the next round after a decode has been revealed.
export async function startNextRound(code, pid) {
  return txn(code, (g) => {
    if (g.phase !== 'decode' || !g.decode || !g.decode.revealed) return ABORT;
    const n = g.turnOrder.length;
    const caller = g.turnOrder[g.firstLeaderIndex % n];
    if (pid !== caller && pid !== g.hostId) return ABORT;
    g.firstLeaderIndex = (g.firstLeaderIndex + 1) % n;
    g.leaderTurnIndex = 0;
    g.round += 1;
    g.decode = null;
    g.phase = 'phrase';
    addLog(g, `Round ${g.round} begins.`);
    startLeaderTurn(g);
  });
}

// =============================================================================
// Sleeper actions
// =============================================================================
export async function claimAltWin(code, pid) {
  return txn(code, (g) => {
    if (g.phase === 'gameover') return ABORT;
    const priv = g.private[pid];
    if (!priv || priv.identity !== 'sleeper') return ABORT;
    if (!g.players[pid].activated) return ABORT; // must be activated
    const requirement = SLEEPER_ALT_WINS[priv.altWinIndex];
    if (!checkAltWin(priv.hand || [], requirement)) return ABORT; // not actually met
    g.phase = 'gameover';
    g.winner = {
      winner: 'sleeper',
      reason: `${playerName(g, pid)} completed their secret weight combination.`,
      altWinnerId: pid,
      revealed: true,
    };
    addLog(g, `⚠ ${playerName(g, pid)} reveals their secret combination and the Sleeper Agents win!`);
  });
}

export async function useSleeperPower(code, pid, power) {
  return txn(code, (g) => {
    const priv = g.private[pid];
    if (!priv || priv.identity !== 'sleeper' || !g.players[pid].activated) return ABORT;
    if (power.auto && power.id === 'spt-draw') {
      drawToHand(g, pid, 1);
      addLog(g, `${playerName(g, pid)} (Agent) used a power: drew 1 card.`);
    } else {
      addLog(g, `${playerName(g, pid)} (Agent) used a power: ${power.label}. (${power.desc})`);
    }
  });
}

// =============================================================================
// Misc
// =============================================================================
export async function resetToLobby(code, hostId) {
  return txn(code, (g) => {
    if (g.hostId !== hostId) return ABORT;
    // Keep players + characters; wipe everything else for a fresh game.
    for (const p of Object.values(g.players)) {
      p.ready = false;
      p.activated = false;
      delete p.revealedIdentity;
    }
    g.private = {};
    g.decks = {};
    g.public = {
      decodeTracker: emptyTracker(),
      decodePile: [],
      activationPhrases: {},
      bonusCategories: [],
      currentPhrase: null,
    };
    g.decode = null;
    g.winner = null;
    g.round = 0;
    g.phase = 'lobby';
    g.currentLeaderId = null;
    addLog(g, 'Returned to lobby for a new game.');
  });
}
