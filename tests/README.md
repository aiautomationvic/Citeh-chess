# Tests (browser checks, run by hand)

Plain Playwright scripts, no test framework. They need the site served locally and Playwright's Chromium (already in the Claude sandbox).

```
cd site && python3 -m http.server 8000 &
cd .. && NODE_PATH=$(npm root -g) OUT=/tmp node tests/puzzles.js
NODE_PATH=$(npm root -g) OUT=/tmp node tests/nologin.js
```

- `puzzles.js`: daily puzzle, wrong move, hint, full solution, Puzzle Rush (3 min and Survival), lobby layout. Lichess puzzle calls are answered from `fixtures/` (real Lichess puzzle data, CC0), so it runs offline. Screenshots go to `$OUT/s_*.png`.
- `nologin.js`: login page, Two players and Analysis board without an account, Home button, and that Puzzle Rush switches the checkmate cutscene off.
- `tabs.js`: Play / Puzzles / Analysis tabs on login and lobby, phone bottom bar and wide side rail, tab remembered after a game.
- `game.js`: simulated live Lichess game: rating chips, opponent disconnected + claim win countdown, extra zen on a game and on the analysis board (phone and wide).
- All print `errors []` at the end when nothing threw.
