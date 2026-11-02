# Citeh Chess

A phone-first chess app. Play on Lichess (log in with your own account), or use it with no account at all: puzzles, Puzzle Rush, friend games by link, two players on one phone, and an analysis board with Stockfish.

Live: https://aiautomationvic.github.io/Citeh-chess/

## Layout
- `site/` the whole app (one `index.html`, no build step) plus Stockfish, the opening book and licences. Published to GitHub Pages on every push to `main`.
- `worker/` Cloudflare Worker relaying Lichess API calls (optional, opt-in with `?api=`).
- `rooms/` Cloudflare Worker game server for friend games by link (not deployed yet, see `rooms/README.md`).
- `tests/` browser checks run by hand, with offline Lichess puzzle fixtures (see `tests/README.md`).
- `CLAUDE.md` project memory for Claude Code sessions: how everything works, decisions, gotchas.

## Credits and licences
Analysis runs Stockfish in your browser: Stockfish 10 (stockfish.js) as the fast default and Stockfish 19 lite (NNUE) as the optional strong engine. Both are GPLv3, see site/stockfish-COPYING.txt.

Piece set "Cburnett" by Colin M.L. Burnett (Wikimedia Commons), CC BY-SA 3.0, via cm-chessboard (MIT).

Opening names and book moves come from lichess-org/chess-openings (CC0), compiled into site/book.json.

Puzzles come from the Lichess puzzle database and API (CC0), fetched live from lichess.org.
