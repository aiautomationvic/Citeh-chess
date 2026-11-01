# Citeh Chess (project memory)

A phone-first Lichess client. One page, plain JavaScript, no build step. The owner is new to coding: explain in plain English, run commands for them, use Australian English. Keep replies and code token-efficient. Say plainly if an idea has a problem, then do what they decide.

## Where it lives
- Repo: `aiautomationvic/Citeh-chess` (public). Everything is in `site/`.
- Live: https://aiautomationvic.github.io/Citeh-chess/ (capital C in the path).
- Deploy: `.github/workflows/pages.yml` publishes `site/` on every push to `main` (Pages source = GitHub Actions). Takes about a minute.
- Commit messages end with the attribution lines the session gives.

## Files
- `site/index.html`: the whole app (HTML, CSS, JS in one file, about 700 lines of dense code).
- `site/book.json`: opening book and names. Built from lichess-org/chess-openings (CC0) with a one-off node script (chess.js). Key = 53-bit hash (`h53`) of FEN placement + side to move; value = index into a names list.
- `site/stockfish.js`, `stockfish.wasm.js`, `stockfish.wasm`: Stockfish 10 (default engine). `stockfish-19-lite-single.js/.wasm`: Stockfish 19 lite (optional "Strong"). `stockfish-COPYING.txt`: GPL licence.
- Pieces: Cburnett set (CC BY-SA 3.0, via cm-chessboard) is inlined as an SVG sprite at the top of `<body>`. Credit lives in Settings, README and an HTML comment. Keep it.
- `README.md`: credits and licences.

## Login and storage
- Lichess OAuth (PKCE, client id `aiav-blue-chess`, scopes `board:play challenge:write`) or a pasted personal token.
- Token in localStorage `bcTok`; settings object in `bcSet`. Never put tokens in the repo.

## Features (all in index.html)
- Play: find a game (time controls, rated or casual), challenge a friend by username, play the computer (levels 1-8), accept or decline challenges, "Game in progress" card with Back to game.
- Board: tap or drag, legal-move dots, check glow, promotion picker (or auto-queen), premoves (one queued move), flip, last-move highlight, coordinates.
- Notation: SAN move list, back/forward buttons, keyboard (left/right step; up/down or Home/End jump), opening name line.
- Analysis board: both sides movable, branching, live Stockfish with 2 lines and best-move arrow, engine on/off, reset. Recent games list loads your last 10 Lichess games (SAN converted to UCI) for review.
- Game analysis (after a game or in review): Stockfish per position, eval graph, accuracy, count table. Ratings per move: book, brilliant, great, best, excellent, good, inaccuracy, mistake, blunder, shown as badges on the destination square plus a text line. Thresholds use win% loss: 5 / 10 / 15. Brilliant = piece sacrifice found with a capture-only search (so recaptures count) and the eval stays fine. Great = the only good move (MultiPV gap of 15 percent or more). Stockfish 10 gets a 40 cp tempo correction. Depth setting: Quick 12 / Normal 14 / Deep 18.
- Engine help is only offered after a game ends or on the analysis board, never in a live game.
- Themes: Sky, Night, Sunset, Mint. 12 board colours. Piece sets: Cburnett (default), Staunton, Neo, plus recolour styles.
- Animations: piece move (slide, hop, bounce, pop), speed setting.
- Sounds are synthesised in the browser (no audio files): move sound Wood / Soft / Beep, capture, castle, check, game start/end, plus effect sounds.
- No phone vibration anywhere (removed on request).
- Modes: Zen (hides header, ratings, notation, analysis panels; only board, names, clocks, buttons), Wide layout (two columns at 760px+), Edge-to-edge board and a fullscreen button.

## Reaction animations (all optional in Settings)
- Brilliant: Thud (default), Aura, Sigma, Fire, Scene. Scene is a full cutscene: the board shows the position before the move, the king gives the order, the piece answers "...ok.", eyes glow blue, it leaps from its own square, spins, crashes onto the target square (board then switches to the real position), glowing hairline cracks, title says only BRILLIANT.
- Great: green W. Mistake: small "oops". Blunder: Banana, Clown (default), Skull, or Off.
- Checkmate: Topple, Quick, Dramatic, UFO, Party, Off. Quick and Dramatic are the execution scenes: a piece drags the mated king to the winner's king and the winner chops it in two. Dramatic adds the king digging in, a whip, a long standoff with heartbeat and spotlight, and a hit-stop. Waddling is distance-driven (a piece only waddles while it moves). The checkmate banner is a dark glass card.

## Code map (index.html)
- State: `G` (game: `moves`, `pos[]` positions, `san[]`, `V` viewed ply, `analysis`, `live`, `an` full analysis, `evc` live evals, `lcls` live ratings, `pre` flag for the cutscene), `S` (settings; defaults in `DEF`), `B` (displayed board).
- Chess rules written by hand: `pseudo`, `legal`, `step`, `san`, `attacked`, `qs` (capture-only search), `fenOf`, `sanToUci`.
- `render()` rebuilds the board HTML every time. `fresh` (the viewed ply changed) triggers reactions, sounds and animations. Effects run on the DOM after render; `G.fxUntil` stops a background render cutting them off.
- Effects live in functions: `brilFx`, `auraFx`, `sigmaFx`, `fireFx`, `awakenFx` (the Scene), `bananaFx`, `clownFx`, `skullFx`, `oopsFx`, `wFx`, `mateFx`, `execFx(…, mode)`, `ufoFx`, `partyFx`. Sounds: `sfx(kind)` and `fun(kind)`.
- Settings UI is built in `renderSet()`; toggles use `setS(key, value)`.

## Working on it
- Edit with small Python patch scripts that `assert` the old text exists, then syntax-check the script block with `new Function(...)` in node.
- Test with Playwright's Chromium against a local server (`python3 -m http.server`, the engine workers need http, not file://). Take screenshots in a phone-sized viewport and read them. The test browser has no emoji font, so emoji look blank there; the owner's phone shows them.
- The file contains literal U+FE0E characters in a few places, and regex replacement strings treat backslashes specially. Use `lambda m: text` for replacements that contain `\u...`.
- Do not use `pkill -f` with a pattern that matches your own command line.

## Owner preferences
- Mobile first. Make it look calm and high quality, not tacky. No explanatory blurbs in the UI.
- Loves dramatic, funny animations, but as options in Settings.
- Wants the checkmate and brilliant effects to feel cinematic, with sound.
- Ask before anything public or hard to undo (publishing, permanent deletes). The Pages site and repo are already public, so pushing to `main` is fine when asked for changes.

## Friend games without Lichess (rooms server)
- `rooms/`: Cloudflare Worker + Durable Object (chess.js checks moves, server keeps clocks). Not part of `site/`; deployed separately from the `rooms` folder (see `rooms/README.md`). Default URL `wss://citeh-rooms.finndoolan.workers.dev`, override with `?rooms=` (saved in localStorage `bcRooms`).
- Client code is the "friend games" block in index.html (`makeRoom`, `joinRoom`, `netOpen`, `netMsg`, `netUI`). The server sends a Lichess-shaped state, so `apply()`, clocks, resign/draw and all the cutscenes are reused. `G.net` marks a room game. Invite link = `?room=CODE`; works with no Lichess login.
- `worker/` is the older Lichess relay (`?api=`), `rooms/` is the game server. Both Cloudflare Workers, different folders.
- Two players mode (lobby, "Play on this phone") is for testing animations: both sides movable, Resign button.
- Cutscenes: resignation (Napoleon, White flag), checkmate "Siege" (`cine()` scaffold), plus castling, en passant, promotion effects, each with a Settings option.
