import { CHARACTER_BY_ID, PHRASE_BY_ID } from '../data/gameData.js';

// Public dossiers for every player: character, 6 phrases, activation phrase
// (public), hand size (public), and activated/revealed status.
// Identity is NEVER shown here — only the player themselves sees that.
export default function PlayerBoards({ game, playerId, highlightPhraseId, currentLeaderId }) {
  const players = Object.values(game.players || {}).sort(
    (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0),
  );
  return (
    <div className="boards">
      {players.map((p) => {
        const ch = CHARACTER_BY_ID[p.characterId];
        const handCount = game.private?.[p.id]?.hand?.length ?? 0;
        const activationId = game.public?.activationPhrases?.[p.id];
        const activationText = activationId ? PHRASE_BY_ID[activationId]?.text : null;
        const dossierMatch = ch?.phraseIds?.includes(highlightPhraseId);
        const activationMatch = activationId && activationId === highlightPhraseId;
        return (
          <div
            key={p.id}
            className={`board ${p.activated ? 'activated' : ''} ${p.id === currentLeaderId ? 'is-leader' : ''}`}
          >
            <div className="board-head">
              <span className="bname">
                <span className={`conn ${p.connected ? 'on' : 'off'}`} title={p.connected ? 'online' : 'offline'}>
                  {p.connected ? '●' : '○'}
                </span>{' '}
                {p.name}{p.id === playerId ? ' (you)' : ''}
                {p.id === currentLeaderId ? ' 👑' : ''}
              </span>
              <span className="bhand muted small">{handCount} cards</span>
            </div>
            {!p.connected && p.id !== playerId && (
              <div className="offline-flag small">⚠ disconnected — may rejoin</div>
            )}
            <div className="bchar muted small">
              {ch ? `${ch.name} · ${ch.categories.join(' + ')}` : '—'}
            </div>
            {p.activated && (
              <div className="agent-flag">⚠ ACTIVATED SLEEPER AGENT</div>
            )}
            <ul className="bphrases">
              {ch?.phraseIds.map((pid) => (
                <li
                  key={pid}
                  className={highlightPhraseId === pid ? 'match' : ''}
                >
                  {PHRASE_BY_ID[pid].text}
                </li>
              ))}
            </ul>
            <div className={`bactivation ${activationMatch ? 'match' : ''}`}>
              <span className="muted small">Activation phrase:</span>{' '}
              {activationText || '—'}
            </div>
            {dossierMatch && (
              <div className="match-note small">↑ matches the phrase being read</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
