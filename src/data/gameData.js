// =============================================================================
// Clockwork — ALL game data lives here.
//
// Tweak phrases, characters, card effects, weights, and balance constants in
// THIS file between playtests. Nothing in the components or logic hardcodes
// these values — they all read from here.
//
// Reflects the design doc "Clockwork" v0.4 (pre-playtest draft).
// =============================================================================

// ---- Categories -------------------------------------------------------------
export const CATEGORIES = [
  'Frequencies',
  'Encryption',
  'Coordinates',
  'Protocols',
  'Transportation',
];

// ---- Balance constants (playtest baselines — safe to tweak) ------------------
export const BALANCE = {
  STARTING_HAND: 4,        // cards drawn at setup
  PHRASE_MATCH_DRAW: 4,    // cards drawn when you match a read phrase / loyal activation bonus
  NOISE_CARDS: 2,          // face-down cards added to every decode attempt
  DECODE_THRESHOLD: 7,     // total weight needed to decode a category
  CATEGORIES_TO_WIN: 3,    // loyal analysts decode this many of 5 to win
  CATEGORIES_TO_LOSE: 3,   // this many permanently-locked categories = sleepers win
  FAILURES_TO_LOCK: 2,     // failure markers that permanently lock a category
  SLEEPER_ALT_WIN_TOTAL: 20, // total hand weight in the secret combination
  MIN_PLAYERS: 2,          // doc says 5–10, but allow small tables for testing
  MAX_PLAYERS: 10,
};

// Sleeper count by player count (doc: 1 at 5–6, 2 at 7–8, 3 at 9–10).
// Generalised so small test tables still get exactly one sleeper.
export function sleeperCount(playerCount) {
  if (playerCount <= 6) return 1;
  if (playerCount <= 8) return 2;
  return 3;
}

// ---- Phrases ----------------------------------------------------------------
// 6 phrases per category. Each phrase has a stable id used everywhere.
export const PHRASES = {
  Frequencies: [
    { id: 'FRE-1', text: 'Nightingale broadcast on Channel Seven' },
    { id: 'FRE-2', text: 'Static interference at the usual frequency' },
    { id: 'FRE-3', text: 'Carrier wave detected at zero-six-hundred hours' },
    { id: 'FRE-4', text: 'Signal strength diminishing, relocate antenna' },
    { id: 'FRE-5', text: 'White noise pattern on the northern band' },
    { id: 'FRE-6', text: "Tune to the songbird's frequency at dawn" },
  ],
  Encryption: [
    { id: 'ENC-1', text: 'Victor Echo Romeo activation sequence' },
    { id: 'ENC-2', text: 'Cipher key rotated. Three seven nine zero.' },
    { id: 'ENC-3', text: 'The hammer has struck. Repeat: the hammer has struck.' },
    { id: 'ENC-4', text: 'Decrypt using protocol Moonlight' },
    { id: 'ENC-5', text: 'Authentication code Blackbird confirmed' },
    { id: 'ENC-6', text: 'New codebook arrives with the morning post' },
  ],
  Coordinates: [
    { id: 'COO-1', text: 'The nest sits where the rivers meet' },
    { id: 'COO-2', text: 'Foxhole position at the red barn' },
    { id: 'COO-3', text: 'Rendezvous point: three clicks north of the stone bridge' },
    { id: 'COO-4', text: "The eagle's perch overlooks the valley" },
    { id: 'COO-5', text: 'Dead drop beneath the old oak, eastern sector' },
    { id: 'COO-6', text: 'Safe house marked by the twin peaks' },
  ],
  Protocols: [
    { id: 'PRO-1', text: 'All personnel stand down until the bell tolls thrice' },
    { id: 'PRO-2', text: 'Proceed with caution. Trust only those who know the password' },
    { id: 'PRO-3', text: 'Report status every hour on the hour' },
    { id: 'PRO-4', text: 'Do not deviate from the approved route' },
    { id: 'PRO-5', text: 'Acknowledge receipt with three short bursts' },
    { id: 'PRO-6', text: 'Only the red phone receives confirmed orders' },
  ],
  Transportation: [
    { id: 'TRA-1', text: 'The truck departs at dawn with the usual cargo' },
    { id: 'TRA-2', text: 'Three railcars loaded and ready for departure' },
    { id: 'TRA-3', text: 'Convoy moves northeast under cover of darkness' },
    { id: 'TRA-4', text: 'Shipment delayed. Reroute through the secondary checkpoint' },
    { id: 'TRA-5', text: 'The package travels with standard security detail' },
    { id: 'TRA-6', text: 'All boats return to harbor before sunset' },
  ],
};

// Flat lookup: phrase id -> { id, text, category }
export const PHRASE_BY_ID = Object.fromEntries(
  CATEGORIES.flatMap((cat) =>
    PHRASES[cat].map((p) => [p.id, { ...p, category: cat }]),
  ),
);

// ---- Characters -------------------------------------------------------------
// Each character owns 6 phrases (3 primary category + 3 secondary).
// Every phrase is owned by exactly two characters across the full roster.
// The first 5 (the "Starter Five") partition all 30 phrases with no overlap.
export const CHARACTERS = [
  {
    id: 'comms-officer',
    name: 'Communications Officer',
    categories: ['Frequencies', 'Encryption'],
    starter: true,
    phraseIds: ['FRE-1', 'FRE-2', 'FRE-3', 'ENC-1', 'ENC-2', 'ENC-3'],
  },
  {
    id: 'cryptographer',
    name: 'Cryptographer',
    categories: ['Encryption', 'Protocols'],
    starter: true,
    phraseIds: ['ENC-4', 'ENC-5', 'ENC-6', 'PRO-1', 'PRO-2', 'PRO-3'],
  },
  {
    id: 'field-coordinator',
    name: 'Field Coordinator',
    categories: ['Protocols', 'Coordinates'],
    starter: true,
    phraseIds: ['PRO-4', 'PRO-5', 'PRO-6', 'COO-1', 'COO-2', 'COO-3'],
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    categories: ['Coordinates', 'Transportation'],
    starter: true,
    phraseIds: ['COO-4', 'COO-5', 'COO-6', 'TRA-1', 'TRA-2', 'TRA-3'],
  },
  {
    id: 'dispatcher',
    name: 'Dispatcher',
    categories: ['Transportation', 'Frequencies'],
    starter: true,
    phraseIds: ['TRA-4', 'TRA-5', 'TRA-6', 'FRE-4', 'FRE-5', 'FRE-6'],
  },
  // --- Extended roster (introduces intentional phrase overlap) ---
  //
  // ⚠ KNOWN DOC DISCREPANCY (faithfully reproduced from design v0.4):
  // The doc states "each phrase is owned by exactly two characters" and "at most
  // two players can ever match any single phrase", but the doc's OWN extended-
  // roster assignments break that invariant:
  //   • FRE-2, FRE-4, FRE-6 are each owned by only ONE character.
  //   • TRA-1, TRA-3, TRA-5 are each owned by THREE (Cartographer / Security
  //     Officer / Courier all share the Transportation odds).
  // The Starter Five (above) are fine — they partition all 30 phrases exactly
  // once. The conflict only surfaces at 7+ players. The claim cap in rtdb.js
  // stays at 2 (per the doc), so the 3rd owner of a TRA-odd phrase can't claim.
  // Decide the intended fix and edit the phraseIds below — likely give the
  // under-owned FRE-2/4/6 a second owner and drop a duplicate TRA owner.
  {
    id: 'network-specialist',
    name: 'Network Specialist',
    categories: ['Frequencies', 'Protocols'],
    starter: false,
    phraseIds: ['FRE-1', 'FRE-3', 'FRE-5', 'PRO-1', 'PRO-3', 'PRO-5'],
  },
  {
    id: 'intelligence-analyst',
    name: 'Intelligence Analyst',
    categories: ['Encryption', 'Coordinates'],
    starter: false,
    phraseIds: ['ENC-1', 'ENC-3', 'ENC-5', 'COO-1', 'COO-3', 'COO-5'],
  },
  {
    id: 'security-officer',
    name: 'Security Officer',
    categories: ['Encryption', 'Transportation'],
    starter: false,
    phraseIds: ['ENC-2', 'ENC-4', 'ENC-6', 'TRA-1', 'TRA-3', 'TRA-5'],
  },
  {
    id: 'logistics-manager',
    name: 'Logistics Manager',
    categories: ['Coordinates', 'Transportation'],
    starter: false,
    phraseIds: ['COO-2', 'COO-4', 'COO-6', 'TRA-2', 'TRA-4', 'TRA-6'],
  },
  {
    id: 'courier',
    name: 'Courier',
    categories: ['Protocols', 'Transportation'],
    starter: false,
    phraseIds: ['PRO-2', 'PRO-4', 'PRO-6', 'TRA-1', 'TRA-3', 'TRA-5'],
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);

// Shared character bonus (applies to loyal analysts only).
export const CHARACTER_BONUS =
  'When your activation phrase is read aloud, draw four cards immediately (loyal analysts only).';

// ---- Skill cards ------------------------------------------------------------
// Templates the deck builder expands into 100 concrete cards.
// Each concrete card gets: id, weight, category|null, isWildcard, effect,
// timing ('phrase' | 'decode' | 'any'), addsToPile, selfDraw.
export const SKILL_CARD_TEMPLATES = {
  // Weight-1: 9 per category (3 copies of each of 3 effects) = 45 total.
  weight1: [
    {
      key: 'w1a',
      effect: 'Draw three cards. Then add this card to the decode pile face-up.',
      timing: 'phrase',
      addsToPile: true,
      selfDraw: 3,
      copiesPerCategory: 3,
    },
    {
      key: 'w1b',
      effect: 'Choose a player. That player discards two cards. Discard this card.',
      timing: 'phrase',
      addsToPile: false,
      copiesPerCategory: 3,
    },
    {
      key: 'w1c',
      effect:
        'Choose a player. That player draws four cards and discards one. Discard this card.',
      timing: 'phrase',
      addsToPile: false,
      copiesPerCategory: 3,
    },
  ],
  // Weight-2: 6 per category (3 copies of each of 2 effects) = 30 total.
  weight2: [
    {
      key: 'w2a',
      effect:
        'This category also counts as positive for the next decode check. Discard this card.',
      timing: 'phrase',
      addsToPile: false,
      copiesPerCategory: 3,
    },
    {
      key: 'w2b',
      effect:
        'Choose a player. That player draws five cards. Add this card to the decode pile face-up.',
      timing: 'phrase',
      addsToPile: true,
      copiesPerCategory: 3,
    },
  ],
  // Weight-3: 1 unique effect per category, 2 copies each = 10 total.
  weight3CopiesPerCategory: 2,
  weight3: {
    Frequencies: {
      effect:
        'Look at the top five cards of the deck. Choose one and add it face-down to the decode pile. Return the remaining four to the top of the deck in any order.',
      timing: 'phrase',
      addsToPile: true,
    },
    Encryption: {
      effect:
        'After all cards are added to the decode pile and shuffled, look through all cards and choose one. Place it face-down on the bottom of the deck.',
      timing: 'decode',
      addsToPile: false,
    },
    Coordinates: {
      effect:
        'After all cards are added to the decode pile and shuffled, look through all cards, choose one and take it into your hand. Place this card face-down into the decode pile in its place.',
      timing: 'decode',
      addsToPile: true,
    },
    Protocols: {
      effect:
        'Play at the start of the Decode Phase, before contributions begin. All players must contribute at least one card face-up. Discard this card.',
      timing: 'decode',
      addsToPile: false,
    },
    Transportation: {
      effect:
        'All players combine their hands into one pile and shuffle it. Redistribute cards equally. Any leftover cards go face-down into the decode pile. Discard this card.',
      timing: 'phrase',
      addsToPile: false,
    },
  },
  // Wildcards: 15 total, weight-1, no category, always +1.
  wildcard: {
    count: 15,
    weight: 1,
    effect: 'Wildcard — no ability. Always counts as +1 in any decode check.',
  },
};

// ---- Sleeper alternate win conditions ---------------------------------------
// Each is a per-category weight requirement summing to SLEEPER_ALT_WIN_TOTAL.
// Wildcards (flexible weight) can fill any category's requirement.
export const SLEEPER_ALT_WINS = [
  { Frequencies: 5, Encryption: 5, Coordinates: 5, Protocols: 5 },
  { Frequencies: 6, Transportation: 7, Protocols: 7 },
  { Frequencies: 4, Encryption: 4, Coordinates: 4, Protocols: 4, Transportation: 4 },
  { Encryption: 6, Coordinates: 7, Transportation: 7 },
  { Frequencies: 5, Encryption: 5, Transportation: 5, Protocols: 5 },
  { Encryption: 5, Coordinates: 5, Protocols: 5, Transportation: 5 },
  { Frequencies: 6, Coordinates: 6, Protocols: 8 },
  { Frequencies: 7, Encryption: 6, Transportation: 7 },
  { Frequencies: 5, Coordinates: 7, Transportation: 8 },
  { Frequencies: 6, Encryption: 7, Coordinates: 7 },
];

// ---- Activated sleeper powers (shown as action buttons) ---------------------
// `auto` powers the app can fully resolve; others are resolved at the table and
// the button just logs/announces them.
export const SLEEPER_POWERS = {
  oncePerTurn: [
    { id: 'spt-draw', label: 'Draw 1 card', auto: true,
      desc: 'Draw one card from the Skill Deck.' },
    { id: 'spt-recover', label: 'Discard → take matching from discard', auto: false,
      desc: 'Discard a card, then take one card of that category from the discard pile into your hand.' },
  ],
  oncePerRound: [
    { id: 'spr-seed', label: 'Seed a matching card into the pile', auto: false,
      desc: 'Discard a card. Reveal from the deck until a matching-category card appears; add it face-up to the decode pile; shuffle the rest to the bottom.' },
    { id: 'spr-force-discard', label: 'Force a player to discard highest weight', auto: false,
      desc: 'Choose a player. They discard their highest-weight card.' },
    { id: 'spr-peek-noise', label: 'Peek at the 2 noise cards', auto: false,
      desc: 'Look at the two noise cards before they are added; take any or all into your hand.' },
  ],
};
