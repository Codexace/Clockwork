// Deck construction and shuffling. Pure functions — no Firebase here.
import {
  CATEGORIES,
  PHRASES,
  PHRASE_BY_ID,
  SKILL_CARD_TEMPLATES,
} from '../data/gameData.js';

// Fisher–Yates shuffle (returns a new array).
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _seq = 0;
function nextId(prefix) {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${_seq}`;
}

// Build the 30-card Phrase Deck (one card per phrase).
export function buildPhraseDeck() {
  const cards = [];
  for (const cat of CATEGORIES) {
    for (const p of PHRASES[cat]) {
      cards.push({
        id: nextId('phr'),
        type: 'phrase',
        phraseId: p.id,
        category: cat,
        text: p.text,
      });
    }
  }
  return shuffle(cards);
}

// Build the 100-card Skill Deck from the templates in gameData.
export function buildSkillDeck() {
  const cards = [];
  const t = SKILL_CARD_TEMPLATES;

  const makeSkill = (weight, category, tpl) => ({
    id: nextId('skl'),
    type: 'skill',
    weight,
    category,
    isWildcard: false,
    effect: tpl.effect,
    timing: tpl.timing,
    addsToPile: !!tpl.addsToPile,
    selfDraw: tpl.selfDraw || 0,
  });

  for (const cat of CATEGORIES) {
    // Weight-1 (45 total)
    for (const tpl of t.weight1) {
      for (let i = 0; i < tpl.copiesPerCategory; i++) {
        cards.push(makeSkill(1, cat, tpl));
      }
    }
    // Weight-2 (30 total)
    for (const tpl of t.weight2) {
      for (let i = 0; i < tpl.copiesPerCategory; i++) {
        cards.push(makeSkill(2, cat, tpl));
      }
    }
    // Weight-3 (10 total)
    const w3 = t.weight3[cat];
    for (let i = 0; i < t.weight3CopiesPerCategory; i++) {
      cards.push(makeSkill(3, cat, w3));
    }
  }

  // Wildcards (15 total)
  for (let i = 0; i < t.wildcard.count; i++) {
    cards.push({
      id: nextId('wild'),
      type: 'skill',
      weight: t.wildcard.weight,
      category: null,
      isWildcard: true,
      effect: t.wildcard.effect,
      timing: 'any',
      addsToPile: false,
      selfDraw: 0,
    });
  }

  return shuffle(cards);
}

// Draw `n` cards off the top of a deck, reshuffling the discard pile in if the
// deck runs dry. Returns { drawn, deck, discard } as NEW arrays.
export function drawCards(deck, discard, n) {
  let d = [...(deck || [])];
  let disc = [...(discard || [])];
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break; // both empty — nothing left to draw
      d = shuffle(disc);
      disc = [];
    }
    drawn.push(d.shift());
  }
  return { drawn, deck: d, discard: disc };
}

// Human label for a card (used in the UI / log).
export function cardLabel(card) {
  if (!card) return '—';
  if (card.type === 'phrase') {
    return `${card.category}: "${card.text}"`;
  }
  if (card.isWildcard) return 'Wildcard (w1, +1 any)';
  return `${card.category} w${card.weight}`;
}

export { PHRASE_BY_ID };
