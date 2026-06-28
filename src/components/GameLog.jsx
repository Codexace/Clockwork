// Shared event log so the whole table can follow what happened.
export default function GameLog({ log }) {
  const entries = [...(log || [])].reverse();
  return (
    <div className="gamelog">
      <h3>Log</h3>
      <ul>
        {entries.map((e, i) => (
          <li key={(e.t || 0) + '-' + i}>{e.msg}</li>
        ))}
        {entries.length === 0 && <li className="muted">No events yet.</li>}
      </ul>
    </div>
  );
}
