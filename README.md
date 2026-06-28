# Clockwork — Multiplayer Playtest Prototype

A browser-based, real-time multiplayer prototype of **Clockwork**, a Cold War
codebreaking board game with hidden traitors (5–10 players). Built for remote
playtesting over a video call — crude and functional, no art.

- **Stack:** React + Vite (plain JS)
- **Shared state:** Firebase Realtime Database
- **Hosting:** static site on Render (via GitHub)

> Reflects design draft **v0.4**. All game content and balance numbers live in a
> single file — [`src/data/gameData.js`](src/data/gameData.js) — so you can tweak
> phrases, characters, card effects, weights, and thresholds between playtests
> without touching the components.

---

## What it does

- **Lobby** — enter a game code + name, pick a character from the roster, mark
  ready. The host starts the game.
- **Setup** (automatic) — assembles and privately distributes each player's
  packet (Identity Card + Activation Phrase Card), places activation phrases
  publicly on dossiers, builds the Phrase and Skill decks, deals starting hands,
  and picks the first Team Leader.
- **Phrase Phase** — the Team Leader privately draws 3 phrase cards, reads one
  aloud (broadcast to all), players claim dossier matches, activation phrases
  trigger sleeper activation / loyal bonus draws, and players play cards.
- **Decode Phase** — the token holder calls a category, players secretly
  contribute cards, noise is added, everything is revealed and tallied, and the
  Decode Tracker updates (decoded / failed / locked out).
- **Win/loss** — 3 categories decoded (loyal win), 3 locked (sleeper win), or an
  activated sleeper claims their secret weight combination. All identities are
  revealed at the end.

Each player's **hand** and **Identity Card** are private (only rendered for that
player). Everything else — dossiers, activation phrases, the decode pile, the
tracker, and the event log — is shared.

### Reconnecting after a disconnect

- **Connection status** is shown next to every player (● online / ○ offline) in
  the lobby and on the player boards, so the table can see who dropped. It uses
  Firebase `onDisconnect`, published at a separate `presence/{code}` node.
- **Same browser** (refresh, closed tab, brief network drop): you rejoin
  automatically — your seat is remembered in `localStorage` and the connection
  resumes.
- **New device / cleared storage / mid-game:** open the app, enter the game code,
  and click **"Disconnected? Rejoin a seat"** (or, if you still have the code,
  the app shows the seat picker directly). Choose your seat to reconnect with
  your original hand and Identity Card. Only **offline** seats can be reclaimed,
  so an actively-connected player can't be bumped — if your seat still shows
  online, wait a few seconds for the disconnect to register.

---

## Run it locally

```bash
cd clockwork
npm install
cp .env.example .env        # then fill in your Firebase values
npm run dev                 # http://localhost:5173
```

To playtest the multiplayer flow on one machine, open the app in several browser
windows (use separate normal + incognito windows, since each window keeps its
own player identity in localStorage). One window **creates** the game; the others
**join** with the same code.

---

## Firebase setup (one-time)

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Realtime Database → Create Database.** Start in **test mode** for a
   quick playtest, or use the rules below.
3. **Project settings → General → Your apps → Web app** and copy the config
   values into your `.env` (see [`.env.example`](.env.example)).

### Suggested Realtime Database rules (playtest)

Test mode is open to the world. For a slightly safer playtest, scope writes to
the `games` tree:

```json
{
  "rules": {
    "games": {
      "$code": {
        ".read": true,
        ".write": true
      }
    },
    "presence": {
      "$code": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> **⚠ Privacy caveat (important for playtesting):** This prototype enforces
> private information **on the client** — the app simply doesn't render other
> players' hands or Identity Cards. Because there is no authentication, the full
> game state (including everyone's private data) is technically readable by
> anyone who opens the browser dev tools. That's fine for a friendly playtest,
> but **don't trust it against players who want to cheat.** Hardening this would
> require Firebase Anonymous Auth + security rules that gate `private/{uid}`
> reads to the owning user — the data is already laid out under
> `games/{code}/private/{playerId}` to make that change straightforward later.

---

## Deploy to Render (static site via GitHub)

1. Push this folder to a GitHub repository.
2. In Render: **New + → Static Site**, connect the repo, and set:
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
3. Add the `VITE_FIREBASE_*` variables (from `.env.example`) under the site's
   **Environment** tab. They're baked into the bundle at build time.
4. Deploy. Render gives you a public URL to share with your group.

A [`render.yaml`](render.yaml) blueprint is included if you prefer
**New + → Blueprint** (you'll still set the secret env var values in the
dashboard).

---

## Project layout

```
src/
  data/gameData.js      ← ALL game content & balance constants (tweak here)
  firebase.js           ← Firebase init from env vars
  lib/
    deck.js             ← deck building, shuffling, drawing
    game.js             ← pure scoring / win-condition logic
    rtdb.js             ← all game mutations (Firebase transactions)
    identity.js         ← per-browser player id (localStorage)
  hooks/useGame.js      ← subscribe to a game's state
  components/           ← Lobby, PhrasePhase, DecodePhase, GameOver, + pieces
  App.jsx               ← routes between phases
```

---

## Tuning between playtests

Open [`src/data/gameData.js`](src/data/gameData.js):

- `BALANCE` — starting hand size, phrase-match draw, noise cards, decode
  threshold (default 7), categories-to-win/lose, sleeper alt-win total.
- `sleeperCount(n)` — sleepers per player count.
- `PHRASES`, `CHARACTERS` — the words and dossiers.
- `SKILL_CARD_TEMPLATES` — card effects, weights, copy counts, timing.
- `SLEEPER_ALT_WINS` — the secret weight combinations.

Changes take effect on the next game (reload + start a new game).

---

## Prototype scope notes

This is a **playtest aid**, not a rules engine. The app automates the
bookkeeping that's tedious by hand (decks, hands, private deal, tally, tracker,
win checks). The more social / freeform card and sleeper-power effects show their
text and are resolved by the group over the call — the relevant buttons move the
cards and announce the action in the shared log. Everything labeled with a ⚠ in
the design doc is a playtest baseline and is easy to change in `gameData.js`.
