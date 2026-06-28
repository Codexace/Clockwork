// Shown when Firebase env vars are missing so the app doesn't crash silently.
export default function ConfigNotice() {
  return (
    <div className="centered">
      <div className="card">
        <h1>Clockwork</h1>
        <p>⚠ Firebase is not configured.</p>
        <p>
          Create a <code>.env</code> file (copy <code>.env.example</code>) and set the{' '}
          <code>VITE_FIREBASE_*</code> values from your Firebase project's Realtime
          Database, then restart the dev server.
        </p>
        <p className="muted">
          On Render, set the same variables in the Static Site's Environment tab.
        </p>
      </div>
    </div>
  );
}
