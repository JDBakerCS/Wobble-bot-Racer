# Wobblebot Racer — Individual circuits

Public browser party race for 2–4 players, with solo practice. React/TypeScript and a requestAnimationFrame canvas frontend, Vinext handlers on Cloudflare Workers, and D1 compare-and-swap room storage. Voice chat is not included.

## Local development

Requirements: Node.js 22.13 or newer and pnpm 11.25.0.

```sh
corepack enable
pnpm install --frozen-lockfile
npm run db:local
npm run dev
```

The `db:local` command initializes the local `rooms` table and is safe to repeat. Open http://localhost:5173 after starting the development server. The Wrangler configuration uses a placeholder database ID and local persistence; it does not connect to the production database.

## Architecture

Wobblebot Racer is one full-stack application rather than separate frontend and backend deployments.

- `frontend/app/` contains the React interface and the thin `/api/game` route.
- `frontend/features/game/` contains game-specific canvas, presentation components, and browser hooks.
- `frontend/public/` contains browser-served static assets.
- `backend/server/game/` contains server-only request validation, room persistence, session checks, and API orchestration.
- `backend/db/`, `backend/drizzle/`, and `backend/worker/` contain the D1 schema, migration, and Cloudflare entry point.
- `shared/` contains deterministic game, drawing, audio, and timing logic used across both sides.
- `tests/` contains fast gameplay and request-boundary tests.

The server is authoritative for schedules, scoring, elimination, session verification, and database writes. The browser receives only the state needed to render the race. See `SECURITY.md` for the trust boundary and secret-handling rules.

The local `.openai/hosting.json` file is intentionally Git-ignored because it identifies a specific hosting project. Use `.openai/hosting.example.json` as the template for a separate deployment. Production credentials belong in Cloudflare secrets or environment bindings, never in this repository.

## Project checks

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Robot selection

Pick a robot before creating/joining a room or starting practice: Opti-Mist (tall, monochrome Tesla-bot inspiration), Pocket Rocket (compact runner inspired by the uploaded race footage), Track Star (slim white sports robot), or Crash Test (broad red/silver race robot). They have different proportions, head shapes, armor, shoes and stride animation. Gameplay stats and collision/scoring rules are identical. The server validates and stores the selection; rematches preserve it. Picker thumbnails and track rendering use the same model definitions.

## Tracks

Practice racers and multiplayer hosts choose a track before entering: Sunset Circuit (the original course), Heck Highway (lava and volcanoes), Heaven Express (clouds and golden gates), or Rainbow Road (a rainbow ribbon in space, with stars, a ringed planet and rainbow arch). The selector previews the actual animated course immediately. Track thumbnails and canvas use the same palette definitions. Joining racers inherit the server-stored room track; it stays selected through rematches and lobby resets. Invalid track IDs are rejected on creation; older rooms default to Sunset Circuit. All four courses sweep through left/right bends and brief straight sections. One shared camera projection keeps road edges, lanes, rainbow stripes, scenery, distant gates/arches, rivals, hurdles, the hurdle ring and finish markings aligned. The local runner stays centered; bends require no steering. Course selection changes scenery only: jump projection, timing windows, pace, obstacles, scoring, audio and robot behavior are identical.

## Gameplay

Each round contains three hurdles. Everyone receives the same number of hurdle/boost opportunities and the same speed progression, but individual green-light and jump timings differ. Timing slots are shuffled each hurdle, separated by at least 130ms, and spread over at most 590ms. Solo practice uses the same course rules. Approach duration remains 2300ms at starting pace, falling to a 900ms minimum; only the takeoff window is tighter. The shared event settles after the last player's contact plus transport grace, so all racers receive their full input window.

Press Space when the ground ring at your hurdle’s feet turns green. The grey ring is drawn as a flattened ground ellipse beneath the prop and follows it on the curved road, including its fade-in preview, and turns green over exactly the shared clearance window. The ideal takeoff is still 520ms before contact at your feet. Hurdles fade in over 350ms, up to 900ms before approach begins, as small readable silhouettes at the horizon, then grow continuously and fade out after passing. Labels are drawn at readable screen size; your own ring and label take visual priority over rivals. Miss results report early/late milliseconds or absent input. Perfect ±90ms gives 20m; any other jump with enough height to clear the hurdle gives 10m. The same shared jump arc and clearance check decide server scoring, the green cue/guide, stumble animation and stumble sound. At contact, a 56px body lift (including tucked-foot clearance) clears every character prop for all four robot models. This yields an approximately ±334ms clear window at the current 520ms takeoff lead. A miss gives zero and adds one cumulative trip. Jump input closes at contact, preventing a new jump after the collision has already happened; pre-contact timestamps still receive the existing transport grace. AIR TIME switches to LANDED when the arc ends. A successful jump does not erase trips. At three trips, your robot explodes and becomes a spectator. Eliminated robots cannot submit gameplay inputs, gain distance or win. The last survivor wins multiplayer; if everyone explodes there is no winner. Otherwise, after a completed round reaches 60m, the highest-scoring surviving racer wins. Ties share victory. Ten rounds is the safety cap. Rematch resets scores, trips, explosions, pace and input state.

Every second hurdle offers a boost. Each boost window closes fully before the hurdle begins its approach, with a randomized 250–749ms gap. Jump timing stays 520ms before contact. Boost pose animation ends by the close of its window or the start of approach, and can never override an airborne robot, including an older in-flight overlap schedule. The jump arc uses only its original jump timestamp and hurdle schedule. F/Space remain independent. F within 300ms of green earns 5m; within 700ms earns 3m. Early/slower reactions earn zero. The boost only scores if the jump succeeds. Windows close at contact or green+1200ms, whichever comes first. Pace increases 0.1× after each personal boost stage and hurdle even on misses, to a 4× cap.

Original canvas cutout hurdles follow a fixed sequence for every racer: Trump → Elon → Zuckerberg → Altman → Jensen Huang → Dario. These exact short labels appear above the canvas hurdles. The sequence continues across the three-hurdle rounds, repeats after six hurdles and resets to Trump on rematch. Each player retains their own timing. A race may finish before all six appear if a player reaches 60m or wins by survival. Artwork changes neither collision timing nor scoring tolerance. Other racers' obstacles, jumps, boosts, stumbles and explosions render against their own schedules. Multiplayer camera depth follows each racer's score relative to the viewer: leaders appear ahead, trailing robots behind, and ties alongside. Perspective scaling, road-relative lanes, depth drawing order and rival hurdle contacts use the same position.

## Timing and state

Server schedules determine every cue and score; the per-player view projects the caller's schedule into the main controls and includes rival schedules for rendering. Request tokens never appear in public player views. Client input animates immediately; scoped attempt/session/hurdle reconciliation prevents stale responses from unlocking unknown committed actions. Server timestamps synchronize the local monotonic clock, with up to 1500ms transport allowance and 150ms clock tolerance. This is a casual party game, not ranked anti-cheat.

The room copy button copies only the six-character room code, ready to paste into Join. Clients poll every 500ms. Requests time out after eight seconds, including response-body reads, so a stalled poll releases its lock and the next poll can recover. Timed-out gameplay inputs remain uncertain until reconciled, preventing duplicate jumps. Overdue race/results screens offer Refresh race. Every finished screen shows Race again immediately, independently of the winner celebration delay. D1 revision-guarded writes preserve concurrent inputs. Rooms expire after six hours; fewer than two connected multiplayer players resets the lobby. Closing a tab does not automatically remove its racer. Room protocol version 4 requires creating a new room after this update.

## Celebration and sound

After the finish runthrough, actual winners crouch, backflip, land, roundhouse-kick and wave. Ties animate every winner. Original Web Audio square/triangle motifs include a boing and kick chirp. During race and result phases, an original 136 BPM minor-key chip loop layers a syncopated square lead, triangle bass, arpeggios and synthesized percussion. A short lookahead schedules music independently from gameplay clocks. Accepted local jump input plays an immediate ascending chirp; a missed jump plays a descending stumble effect at the local hurdle contact, once per hurdle. Rival actions do not trigger local effects. The header sound toggle mutes all music and effects and resumes race music when re-enabled. Audio is unlocked by player gestures, victory plays once per finish, and everything stops on mute, leave, rematch or unmount. Race music stops at the finish before the winner jingle. Replay victory routine replays locally without changing the outcome. No winners means no winner jingle or victory routine.

## Verification

- `node --test tests/game.test.mjs`: independent schedules, copied-input failure, own-clock scoring, pace bounds, exact jump windows, boost input ordering, elimination, last survivor, all-out losses, rematch, stale responses, ordered hurdles and choreography.
- `node --test tests/game-request.test.mjs`: stalled requests/body reads, recovery, and explicit versus unknown input rejection.
- `node --test tests/audio.test.mjs`: audio scheduling, one music timer, mute/resume, jump/stumble envelopes and cleanup.
- `node --test tests/jump-clearance.test.mjs`: formerly false trips at ±200–300ms, all four robots, slow/fast approaches, delayed inputs, real low/missing jumps, input closure at contact and airborne state.
- `node --test tests/hurdle-visibility.test.mjs`: distant fade-in, continuous approach, moving ring alignment, shared clearance window and pass-by fade-out.
- `node --test tests/road.test.mjs`: smooth left/right turns, straight sections, camera anchor, rival contact alignment, unchanged jump timing and guide projection, and 2–4 player score order from every view with aligned rival hurdles.
- `node node_modules/typescript/bin/tsc --noEmit`: TypeScript.
- `node tests/server.mjs` with a running server (`GAME_TEST_URL` optional): full two-player race with distinct schedules, rematch and third-trip elimination. The public-site API run verified normal scoring, winner selection and rematch reset, but the later survivor-race inputs exceeded the transport window; the full script is not verified end to end. Two browser racers verified the all-out finish and a guest-triggered group rematch.
- Sites build helper: production build and deploy archive.

Physical-device multiplayer and listening checks remain part of the user playtest.
