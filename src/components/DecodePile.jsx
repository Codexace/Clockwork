import { CATEGORIES } from '../data/gameData.js';

// The shared, face-up persistent decode pile (cards seeded during phrase phase).
export default function DecodePile({ pile = [], bonusCategories = [] }) {
  const byCat = {};
  for (const cat of CATEGORIES) byCat[cat] = [];
  let wild = 0;
  for (const c of pile) {
    if (c.isWildcard) wild += 1;
    else if (byCat[c.category]) byCat[c.category].push(c);
  }
  return (
    <div className="panel decodepile">
      <h3>Decode Pile (face-up)</h3>
      {pile.length === 0 && <p className="muted small">Empty — nothing seeded yet.</p>}
      {pile.length > 0 && (
        <div className="pile-cats">
          {CATEGORIES.map((cat) => (
            byCat[cat].length > 0 && (
              <div key={cat} className={`pile-cat cat-${cat}`}>
                <strong>{cat}</strong>:{' '}
                {byCat[cat].map((c) => `w${c.weight}`).join(', ')}
                {' '}(Σ{byCat[cat].reduce((s, c) => s + c.weight, 0)})
              </div>
            )
          ))}
          {wild > 0 && <div className="pile-cat cat-Wild"><strong>Wildcards</strong>: {wild} (+{wild})</div>}
        </div>
      )}
      {bonusCategories.length > 0 && (
        <p className="muted small">
          Bonus (count positive next decode): {bonusCategories.join(', ')}
        </p>
      )}
    </div>
  );
}
