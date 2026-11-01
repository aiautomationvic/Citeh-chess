# Citeh Chess rooms server

Lets two people play on the site with no Lichess account. One Cloudflare Durable Object per game.
Moves are checked with chess.js, the server keeps the clocks, and it handles resign, draw offers and rematch.

## Deploy (Cloudflare dashboard, no pasting)
1. Workers & Pages > Create > Import a repository > pick `aiautomationvic/Citeh-chess`.
2. Name it `citeh-rooms`. Set **Root directory** to `rooms`. Leave the build command empty.
3. Deploy command: `npx wrangler deploy`. Save and deploy.
4. Its address will look like `https://citeh-rooms.<you>.workers.dev`. The site expects
   `wss://citeh-rooms.finndoolan.workers.dev`. If yours differs, open the site once with
   `?rooms=wss://your-address` and it remembers it (use `?rooms=` to reset).

## Run locally
`cd rooms && npm install && npm run dev` (port 8787), then open the site with `?rooms=ws://localhost:8787`.

## Protocol (JSON over WebSocket at `/room/CODE`)
Client sends `join {tok,name,want,tc}`, `move {uci}`, `resign`, `draw`, `declineDraw`, `rematch`, `sync`, `ping`.
Server sends `state {you,names,moves,wtime,btime,status,winner,wdraw,bdraw,rematch,online,tc}`, `err {m}`, `full`.
`GET /new` returns `{code}`. Only the Pages site (and localhost:8000) may connect.
