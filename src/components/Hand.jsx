import { CATEGORIES } from '../data/gameData.js';
import { handWeightByCategory } from '../lib/game.js';

// Renders the current player's PRIVATE hand of skill cards.
// Two interaction modes (both optional):
//  - onPlay(card): shows a "Play" button per card (Phrase Phase).
//  - selectedIds + onToggleSelect(id): tap-to-select (Decode contributions).
export default function Hand({
  hand = [],
  onPlay,
  playDisabled = false,
  selectedIds = [],
  onToggleSelect,
  title = 'Your hand (private)',
}) {
  const selected = new Set(selectedIds);
  const { byCat, wildcard } = handWeightByCategory(hand);

  return (
    <div className="hand">
      <div className="hand-head">
        <h3>{title}</h3>
        <span className="muted small">{hand.length} cards</span>
      </div>

      <div className="weight-summary muted small">
        {CATEGORIES.map((c) => (
          <span key={c} className={`wchip cat-${c}`}>{c.slice(0, 3)} {byCat[c]}</span>
        ))}
        <span className="wchip cat-Wild">Wild {wildcard}</span>
      </div>

      {hand.length === 0 && <p className="muted">Empty.</p>}

      <div className="card-row">
        {hand.map((card) => {
          const isSel = selected.has(card.id);
          return (
            <div
              key={card.id}
              className={`gcard ${card.isWildcard ? 'cat-Wild' : 'cat-' + card.category} ${isSel ? 'sel' : ''} ${onToggleSelect ? 'clickable' : ''}`}
              onClick={onToggleSelect ? () => onToggleSelect(card.id) : undefined}
            >
              <div className="gcard-top">
                <span className="gcard-cat">
                  {card.isWildcard ? 'WILD' : card.category}
                </span>
                <span className="gcard-w">w{card.weight}</span>
              </div>
              <div className="gcard-effect">{card.effect}</div>
              <div className="gcard-meta muted small">
                {card.timing !== 'any' ? card.timing + ' phase' : 'any time'}
                {card.addsToPile ? ' · to pile' : ''}
              </div>
              {onPlay && (
                <button
                  className="small"
                  disabled={playDisabled}
                  onClick={(e) => { e.stopPropagation(); onPlay(card); }}
                >
                  Play
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
