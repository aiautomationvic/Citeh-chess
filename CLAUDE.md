# Citeh Chess (project memory)

A phone-first Lichess client (also plays friends with no Lichess account). One page, plain JavaScript, no build step. The owner is new to coding: explain in plain English, run commands for them, use Australian English. Keep replies and code token-efficient. Say plainly if an idea has a problem, then do what they decide.

## Where it lives
- Repo: `aiautomationvic/Citeh-chess` (public). The app is `site/`. `worker/` and `rooms/` are Cloudflare Workers (not part of the site).
- Live: https://aiautomationvic.github.io/Citeh-chess/ (capital C in the path).
- Deploy: `.github/workflows/pages.yml` publishes `site/` on every push to `main` (about a minute). Check a deploy with the GitHub MCP `actions_list` (list_workflow_runs); the sandbox cannot curl github.io or workers.dev (network policy 403), so live checks must be done by the owner on their phone.
- Commit messages end with the attribution lines the session gives. Pushing to `main` is fine when the owner asks for changes. Commit and push after each finished feature.

## Cloudflare (owner account `finndoolan`)
- `worker/` = Lichess relay, Worker name `citeh-chess`, https://citeh-chess.finndoolan.workers.dev, live and working. Opt-in per browser: open the site with `?api=<url>` (saved in localStorage `bcApi`, `?api=` clears). Only forwards `/api/*`, allows only the Pages origin and localhost:8000. Holds no tokens. Login redirect (`AUTH`) still goes straight to lichess.org.
- `rooms/` = game server for friend games (Durable Object per game, chess.js, clocks). **Not deployed yet**: the owner needs a PC. Steps (in `rooms/README.md`): Workers & Pages > Create > Import a repository > `Citeh-chess`, name `citeh-rooms`, Root directory `rooms`, deploy command `npx wrangler deploy`. The client defaults to `wss://citeh-rooms.finndoolan.workers.dev`; if the real address differs, update `ROOMS` or use `?rooms=wss://...` (saved in `bcRooms`). Until then "Create game" shows "Could not reach the game server".
- The owner could not paste into the Cloudflare code editor (clipboard blocked on their phone), so deploy by connecting the GitHub repo, not by pasting code.
- Local test of rooms: `cd rooms && npm install && npx wrangler dev --local --port 8787`, then the site with `?rooms=ws://localhost:8787`. Two separate Playwright contexts = two players. Stop wrangler with `pkill -f "[w]rangler dev"` (the bracket stops it matching its own command line).

## Files
- `site/index.html`: the whole app (HTML, CSS, JS, thousands of dense lines).
- `site/book.json`: opening book and names (lichess-org/chess-openings, CC0). Key = 53-bit hash (`h53`) of FEN placement + side to move; value = index into a names list.
- `site/stockfish.js`, `stockfish.wasm.js`, `stockfish.wasm`: Stockfish 10 (default). `stockfish-19-lite-single.js/.wasm`: Stockfish 19 lite ("Strong"). `stockfish-COPYING.txt`: GPL.
- Pieces: Cburnett set (CC BY-SA 3.0, via cm-chessboard) inlined as an SVG sprite at the top of `<body>`. Credit lives in Settings, README and an HTML comment. Keep it.
- `README.md`: credits and licences.

## Login and storage
- Lichess OAuth (PKCE, client id `aiav-blue-chess`, scopes `board:play challenge:write`) or a pasted personal token.
- localStorage: `bcTok` token, `bcSet` settings object `S`, `bcApi`, `bcRooms`, `bcName`, `bcRm_<code>` (per-room seat secret). Never put tokens in the repo.
- Start-up never throws the token away because Lichess is slow: only a 401 clears it; otherwise a "Reconnecting to Lichess" card retries every 5 s. Account fetch has an 8 s timeout. Asks the browser for persistent storage after login. (iPhone Safari clears site data after about 7 days unused unless added to Home Screen; private tabs never remember.)

## Features (all in index.html)
- Play: find a game, challenge a friend by Lichess username, play the computer (levels 1-8), accept/decline challenges, "Game in progress" card.
- Friend games without Lichess ("Play with a link" card on login and lobby): name, colour, time control or no clock, 5-letter code, Share/Copy link (`?room=CODE`). Server state is Lichess-shaped so `apply()`, clocks, resign/draw, rematch (colours swap) and all cutscenes are reused. `G.net` marks a room game. Code: `makeRoom`, `joinRoom`, `netOpen`, `netMsg`, `netUI`, `netSend`, `netAct`. Anonymous players can't open the lobby; `lobbyBack()` returns them to login. No matchmaking queue, accounts, ratings or anti-cheat.
- Two players mode (lobby "Play on this phone", `openTwo`): both sides movable, engine off, Resign button (`resignTest`). Use it to test every effect.
- Board: tap or drag, legal-move dots, check glow, promotion picker (or auto-queen), premoves, flip, last-move highlight, coordinates. Notation list, back/forward, keyboard.
- Analysis board: both sides movable, live Stockfish, recent Lichess games for review. Game analysis with per-move ratings (book, brilliant, great, best, excellent, good, inaccuracy, mistake, blunder; win% loss thresholds 5/10/15; brilliant = sacrifice via capture-only search `qs`; great = only good move, MultiPV gap 15%; SF10 gets a 40 cp tempo fix; depth Quick 12 / Normal 14 / Deep 18). Engine help only after a game or on the analysis board, never in a live game.
- Themes Sky/Night/Sunset/Mint, board colours (`BT`), piece sets (Cburnett default, Staunton, Neo, recolours), piece animations, Zen / Wide / Edge-to-edge / fullscreen. No phone vibration anywhere.
- Sounds are synthesised in the browser (no audio files). `fun(kind)` has helpers `ob({type,f,f2,d,v,lp,at,dt,t0})` and `nz({d,v,ft,f,f2,q,t0})`; keep `at < d`. Sound style: low, dry, realistic, **not cartoony** (owner asked for this).

## Reaction and effect options (Settings)
- Brilliant: Scene (default), Thud, Aura, Fire (Sigma removed; `S.v` migration moves old Sigma/Thud to Scene once). Scene = `awakenFx` full cutscene. Great: green W. Mistake: "oops". Blunder: Banana, Clown (default), Skull, Off.
- Checkmate (`S.mf`): Topple, Quick, Dramatic, UFO, Party, Cutscene ("Siege", `siegeFx`), Off. Quick/Dramatic = execution scenes (`execFx`).
- Castling (`S.ca`, `castleFx`, Fortress), en passant (`S.ep` ghost/scene/off: `epFx` = soul outline torn from the pawn, dragged back with echo trails, snatched; `epSceneFx` = confused king cutscene), promotion (`S.pr`, `crownFx`), resignation (`S.rs` napoleon/flag/off: `resignFx` = Napoleon king in hat and coat on a rock, painting style, cannonball splash, lone-king capture variant; `flagFx` = white flag at dawn).
- Napoleon art: `napK(col)` draws hat and coat on the Cburnett king, fitted to its measured outline (king centre x=20, cross y 4.4-12.5, lobes y 13-26, body 9.8-29.3). Always uses Cburnett.

## Brands (picker = round button top right of login/lobby, hidden in games)
- Citeh (default, untouched), Dhruv (Arsenal), Jethro (US flag). `S.bn`, `BRANDS`, `setBrand()`, CSS `html[data-brand=...]` near the end of the style block. Official colours: Arsenal red #EF0107, navy #063672, gold #9C824A; US red #B22234, blue #3C3B6E, white. Dhruv = red/white board, gold frame, white pieces + navy-with-gold pieces. Jethro = white/navy board, red/white/navy frame, white pieces + red-with-white-outline pieces. The owner dislikes green boards.
- Piece colours: the Cburnett sprite fills are CSS variables (`--wf/--ws` white fill/outline, `--bf/--bs/--bh` black fill/outline/highlight, defaults = originals so Citeh is pixel-identical). Switching brand forces the Cburnett set (previous in `S.pcp`), the Sky theme, and a brand board (`gunner`/`stars`, previous in `S.btp`).
- Themed animation packs: Settings "Animation set" Themed (default) / Standard (`S.bx`); each effect row also has its own Themed button (`S.bxo[key]` override flags for s/ca/ep/pr/rs/mf; `bx()`, `bxk(key)`, `thm()`, `fxSeg`, `setFx`).
  - Dhruv: football sounds (`d_*`), cannon+confetti castling (`dhCastle`), VAR check en passant (`dhEp`), substitution board promotion (`dhCrown`), stadium resignation (`dhResign`), goal-scored checkmate (`dhMate`: keeper dives wrong way, "Checkmate." is said AFTER the goal).
  - Jethro: drum/musket sounds (`j_*`), volley castling (`jtCastle`), Liberty Bell en passant (`jtEp`), eagle+fireworks promotion (`jtCrown`), Yorktown surrender (`jtResign`), battlefield checkmate with flag raising (`jtMate`).
  - Not themed: Brilliant/Great/Mistake/Blunder reactions, game-start sound.
- Cutscene scaffold `cine(svg,D)` returns `{q,qa,A,at,say,showD,hideD,cam,fade,end,k,lay}`; scene SVG is 360x440, camera keyframes `[t,x,y,scale]`, `lay` is a particle layer inside the camera (`LY`, `lconf`, `lflash`, `lsmoke`, `lburst`). `rsInfo(loser)` finds the nearest own piece or (lone king) nearest enemy; `nearest()` lists pieces. Board-overlay effects use `fxk(ms)` (`add`, `xy`, `pc`, `ctr`, `box`). Tap anywhere skips a cutscene.

## Code map (index.html)
- State: `G` (game: `moves`, `pos[]`, `san[]`, `V` viewed ply, `analysis`, `live`, `two`, `net`, `an`, `evc`, `lcls`, `pre`), `S` (settings, defaults `DEF`), `B` (displayed board).
- Chess rules written by hand: `pseudo`, `legal`, `step`, `san`, `attacked`, `qs`, `fenOf`, `sanToUci`.
- `render()` rebuilds the board every time. `fresh` (viewed ply changed) triggers reactions; `st1` (stepped forward exactly one ply) triggers castling/en passant/promotion via `moveFx(i)`. `G.fxUntil` stops a background render cutting effects off.
- Settings UI: `renderSet()`, `setS(key,value)`.

## Working on it
- Edit with small Python patch scripts that `assert` the old text exists (count == 1), then syntax-check every `<script>` block with `new Function(...)` in node. Scratch files go in the session scratchpad.
- Test with Playwright's Chromium (`NODE_PATH=$(npm root -g)`) against `python3 -m http.server 8000` in `site/` (the server sometimes dies between calls: restart it). Phone viewport 390x780, deviceScaleFactor 2, take screenshots and read them. No emoji font in the test browser. Sounds cannot be heard in tests.
- Test effects fast in Two players mode: `openTwo(); playAn('e2e4')...`. Castling `e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 e1g1`; en passant `e2e4 a7a6 e4e5 d7d5 e5d6`; promotion `h2h4 g7g5 h4g5 h7h6 g5h6 f7f6 h6h7 e7e6 h7g8q`; mate (Fool's) `f2f3 e7e5 g2g4 d8h4` (use `openAnalysis([...]); go(3); go(4)`); lone king: overwrite `G.pos[G.moves.length].b` with a board from a FEN placement. Poll for an animation to start (`el.getAnimations().length`) instead of fixed waits, and screenshots take time so absolute times drift.
- Check Citeh unchanged after styling work by diffing screenshots against `git show HEAD:...` served on another port.
- Gotchas learned: transforms on elements inside a nested `<svg viewBox>` are in that svg's scaled units (animate the outer `<g>` instead); SVG `scale()` pivots on the viewBox origin unless `transform-box:fill-box;transform-origin:...` is set; WAAPI transforms override a `transform` attribute (use a wrapper `<g>`); CSS variables inherit into `<use>` shadow trees (that is how brand piece colours work); attribute fills can be overridden by `style="fill:var(--x,#orig)"`; elements with no fill attribute default to black; `.cfx` layer px = scene units * `C.k`.
- The file contains literal U+FE0E characters in a few places, and regex replacement strings treat backslashes specially. Use `lambda m: text` for replacements that contain `\u...`.
- Do not use `pkill -f` with a pattern that matches your own command line.

## Owner preferences
- Mobile first (tests on an iPhone). Calm, high-quality look, not tacky. No explanatory blurbs in the UI (dialogue inside cutscenes is fine).
- Loves dramatic, funny, cinematic animations with sound, but every one must be optional in Settings with a sensible default. Recently wants sounds more serious and less cartoony.
- Wants themed content to be accurate: official club and flag colours, real references (Arsenal cannon, VAR, Yorktown, Liberty Bell).
- Friends: "Dhruv" (Arsenal) and "Jethro" (America) have their own brands. Citeh is the owner's own default.
- Prefers things shown as screenshots-verified; asked about Sonnet vs Opus (Sonnet is fine for this work; Opus only for stubborn bugs or big design calls).
- Ask before anything public or hard to undo (publishing, permanent deletes). Pushing to `main` is fine when asked for changes.

## Open items and ideas
- Deploy `rooms/` from a PC (see Cloudflare section), then test a real friend game on two phones and confirm the worker address.
- Possible next: public matchmaking queue for rooms, themed Brilliant/Great/Mistake/Blunder reactions for Dhruv and Jethro, a bigger Napoleon hand-in-coat, spectators, game history for friend games.
- Known limits: soul-outline en passant and brand piece colours only apply to the Cburnett set; Napoleon and brand cutscenes always draw Cburnett pieces.
