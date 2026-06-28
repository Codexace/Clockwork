// Pure game-logic helpers: scoring, win/loss checks, alt-win verification.
// No Firebase, no React — easy to reason about and (later) unit test.
import { CATEGORIES, BALANCE } from '../data/gameData.js';

// Status values used in the decode tracker.
export const DECODE_STATUS = {
  UNDECODED: 'undecoded',
  FAILED_ONCE: 'failedOnce',
  LOCKED: 'lockedOut',
  DECODED: 'decoded',
};

export function emptyTracker() {
  const t = {};
  for (const cat of CATEGORIES) t[cat] = DECODE_STATUS.UNDECODED;
  return t;
}

// Score a single card toward a chosen category.
// Wildcards: always +1. Matching category (or a bonus category): +weight.
// Anything else: -weight.
export function scoreCard(card, chosenCategory, bonusCategories = []) {
  if (!card) return 0;
  if (card.isWildcard) return 1;
  if (card.category === chosenCategory || bonusCategories.includes(card.category)) {
    return card.weight;
  }
  return -card.weight;
}

// Total a list of cards toward a category.
export function tallyCards(cards, chosenCategory, bonusCategories = []) {
  return (cards || []).reduce(
    (sum, c) => sum + scoreCard(c, chosenCategory, bonusCategories),
    0,
  );
}

// Per-category weight available in a hand, plus flexible wildcard weight.
export function handWeightByCategory(hand) {
  const byCat = {};
  for (const cat of CATEGORIES) byCat[cat] = 0;
  let wildcard = 0;
  for (const c of hand || []) {
    if (c.isWildcard) wildcard += c.weight;
    else if (byCat[c.category] != null) byCat[c.category] += c.weight;
  }
  return { byCat, wildcard };
}

// Can this hand satisfy a sleeper alt-win requirement?
// Requirement is { category: weightNeeded, ... }. Wildcards fill any deficit.
export function checkAltWin(hand, requirement) {
  if (!requirement) return false;
  const { byCat, wildcard } = handWeightByCategory(hand);
  let deficit = 0;
  for (const [cat, need] of Object.entries(requirement)) {
    deficit += Math.max(0, need - (byCat[cat] || 0));
  }
  return wildcard >= deficit;
}

// Count tracker statuses.
export function countStatus(tracker, status) {
  return Object.values(tracker || {}).filter((s) => s === status).length;
}

// Determine win/loss from the tracker alone (alt-win is handled separately).
// Returns null if the game is still going.
export function checkBoardWin(tracker) {
  const decoded = countStatus(tracker, DECODE_STATUS.DECODED);
  const locked = countStatus(tracker, DECODE_STATUS.LOCKED);
  if (decoded >= BALANCE.CATEGORIES_TO_WIN) {
    return { winner: 'loyal', reason: `${decoded} categories decoded.` };
  }
  if (locked >= BALANCE.CATEGORIES_TO_LOSE) {
    return { winner: 'sleeper', reason: `${locked} categories permanently locked out.` };
  }
  return null;
}

// Apply a decode result to a category's tracker status. Returns the new status.
export function nextTrackerStatus(currentStatus, success) {
  if (success) return DECODE_STATUS.DECODED;
  if (currentStatus === DECODE_STATUS.FAILED_ONCE) return DECODE_STATUS.LOCKED;
  return DECODE_STATUS.FAILED_ONCE;
}
