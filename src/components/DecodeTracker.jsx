import { CATEGORIES, BALANCE } from '../data/gameData.js';
import { DECODE_STATUS, countStatus } from '../lib/game.js';

const LABELS = {
  [DECODE_STATUS.UNDECODED]: 'undecoded',
  [DECODE_STATUS.FAILED_ONCE]: 'failed once',
  [DECODE_STATUS.LOCKED]: 'LOCKED',
  [DECODE_STATUS.DECODED]: 'DECODED',
};

export default function DecodeTracker({ tracker }) {
  const t = tracker || {};
  const decoded = countStatus(t, DECODE_STATUS.DECODED);
  const locked = countStatus(t, DECODE_STATUS.LOCKED);
  return (
    <div className="tracker">
      <div className="tracker-head">
        <h3>Decode Tracker</h3>
        <span className="muted small">
          Decoded {decoded}/{BALANCE.CATEGORIES_TO_WIN} · Locked {locked}/{BALANCE.CATEGORIES_TO_LOSE}
        </span>
      </div>
      <ul className="tracker-list">
        {CATEGORIES.map((cat) => {
          const status = t[cat] || DECODE_STATUS.UNDECODED;
          return (
            <li key={cat} className={`status-${status}`}>
              <span className="tcat">{cat}</span>
              <span className="tstatus">{LABELS[status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
