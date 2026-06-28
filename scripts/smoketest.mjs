// Logic smoke test — run with: node scripts/smoketest.mjs
// Exercises the pure modules (no Firebase) to validate deck composition,
// scoring, win conditions, and data integrity.
import { buildSkillDeck, buildPhraseDeck } from '../src/lib/deck.js';
import {
  tallyCards, scoreCard, checkAltWin, checkBoardWin,
  nextTrackerStatus, emptyTracker, DECODE_STATUS, handWeightByCategory,
} from '../src/lib/game.js';
import {
  CATEGORIES, CHARACTERS, PHRASES, PHRASE_BY_ID,
  SLEEPER_ALT_WINS, SKILL_CARD_TEMPLATES, BALANCE,
} from '../src/data/gameData.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.error('  FAIL', name); }
}
function eq(name, got, want) {
  check(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want);
}

console.log('\n# Skill deck');
const skill = buildSkillDeck();
eq('total skill cards', skill.length, 100);
eq('wildcards', skill.filter((c) => c.isWildcard).length, 15);
eq('weight-1 (non-wild)', skill.filter((c) => c.weight === 1 && !c.isWildcard).length, 45);
eq('weight-2', skill.filter((c) => c.weight === 2).length, 30);
eq('weight-3', skill.filter((c) => c.weight === 3).length, 10);
for (const cat of CATEGORIES) {
  eq(`  ${cat} weight-3 count`, skill.filter((c) => c.weight === 3 && c.category === cat).length, 2);
  eq(`  ${cat} weight-1 count`, skill.filter((c) => c.weight === 1 && !c.isWildcard && c.category === cat).length, 9);
}
check('all skill card ids unique', new Set(skill.map((c) => c.id)).size === 100);

console.log('\n# Phrase deck');
const phrase = buildPhraseDeck();
eq('total phrase cards', phrase.length, 30);
for (const cat of CATEGORIES) {
  eq(`  ${cat} phrases`, phrase.filter((c) => c.category === cat).length, 6);
}

console.log('\n# Phrase ownership');
const owners = {};
for (const id of Object.keys(PHRASE_BY_ID)) owners[id] = [];
for (const ch of CHARACTERS) for (const pid of ch.phraseIds) owners[pid]?.push(ch.id);
const allTwo = Object.values(owners).every((o) => o.length === 2);
// NOTE: This is faithful to design doc v0.4, which is internally INCONSISTENT
// here — it claims "each phrase owned by exactly two characters" but its own
// assignments give some 1 owner and some 3. Reported as a data note, not a
// code failure (see gameData.js comment + README).
if (allTwo) {
  check('every phrase owned by exactly 2 characters (full roster)', true);
} else {
  console.warn('  ⚠ DATA NOTE: doc invariant "exactly 2 owners" is violated by the doc itself:');
  for (const [pid, o] of Object.entries(owners)) {
    if (o.length !== 2) console.warn(`     ${pid} (${PHRASE_BY_ID[pid].text}) -> ${o.length} owners: ${o.join(', ')}`);
  }
}
// Starter Five should partition all 30 phrases exactly once.
const starters = CHARACTERS.filter((c) => c.starter);
eq('starter five count', starters.length, 5);
const starterCounts = {};
for (const id of Object.keys(PHRASE_BY_ID)) starterCounts[id] = 0;
for (const ch of starters) for (const pid of ch.phraseIds) starterCounts[pid]++;
check('starter five partition all 30 phrases exactly once',
  Object.values(starterCounts).every((n) => n === 1));
check('every character has 6 phrases', CHARACTERS.every((c) => c.phraseIds.length === 6));

console.log('\n# Scoring');
const fre1 = { category: 'Frequencies', weight: 2, isWildcard: false };
const enc3 = { category: 'Encryption', weight: 3, isWildcard: false };
const wild = { isWildcard: true, weight: 1 };
eq('match +weight', scoreCard(fre1, 'Frequencies'), 2);
eq('mismatch -weight', scoreCard(enc3, 'Frequencies'), -3);
eq('wildcard +1', scoreCard(wild, 'Frequencies'), 1);
eq('bonus category counts positive', scoreCard(enc3, 'Frequencies', ['Encryption']), 3);
eq('tally', tallyCards([fre1, enc3, wild], 'Frequencies'), 2 - 3 + 1);

console.log('\n# Alt-win checks');
SLEEPER_ALT_WINS.forEach((combo, i) => {
  const total = Object.values(combo).reduce((a, b) => a + b, 0);
  eq(`combo ${i + 1} sums to ${BALANCE.SLEEPER_ALT_WIN_TOTAL}`, total, BALANCE.SLEEPER_ALT_WIN_TOTAL);
});
// Build a hand satisfying combo 1: {Frequencies:5,Encryption:5,Coordinates:5,Protocols:5}
function cardsFor(cat, weightTotal) {
  const out = [];
  let left = weightTotal;
  while (left > 0) { const w = Math.min(left, 1); out.push({ category: cat, weight: w, isWildcard: false }); left -= w; }
  return out;
}
const winHand = [
  ...cardsFor('Frequencies', 5), ...cardsFor('Encryption', 5),
  ...cardsFor('Coordinates', 5), ...cardsFor('Protocols', 5),
];
check('hand meeting combo 1 -> alt win true', checkAltWin(winHand, SLEEPER_ALT_WINS[0]));
check('short hand -> alt win false', !checkAltWin(cardsFor('Frequencies', 5), SLEEPER_ALT_WINS[0]));
// Wildcards can fill a deficit.
const wildHand = [...cardsFor('Frequencies', 5), ...cardsFor('Encryption', 5),
  ...cardsFor('Coordinates', 5), ...Array.from({ length: 5 }, () => ({ isWildcard: true, weight: 1 }))];
check('wildcards fill Protocols deficit -> alt win true', checkAltWin(wildHand, SLEEPER_ALT_WINS[0]));

console.log('\n# Board win + tracker');
const t = emptyTracker();
t.Frequencies = DECODE_STATUS.DECODED; t.Encryption = DECODE_STATUS.DECODED; t.Coordinates = DECODE_STATUS.DECODED;
check('3 decoded -> loyal win', checkBoardWin(t)?.winner === 'loyal');
const t2 = emptyTracker();
t2.Frequencies = DECODE_STATUS.LOCKED; t2.Encryption = DECODE_STATUS.LOCKED; t2.Coordinates = DECODE_STATUS.LOCKED;
check('3 locked -> sleeper win', checkBoardWin(t2)?.winner === 'sleeper');
check('nothing -> no win', checkBoardWin(emptyTracker()) === null);
eq('fail once', nextTrackerStatus(DECODE_STATUS.UNDECODED, false), DECODE_STATUS.FAILED_ONCE);
eq('fail twice -> locked', nextTrackerStatus(DECODE_STATUS.FAILED_ONCE, false), DECODE_STATUS.LOCKED);
eq('success -> decoded', nextTrackerStatus(DECODE_STATUS.FAILED_ONCE, true), DECODE_STATUS.DECODED);

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
