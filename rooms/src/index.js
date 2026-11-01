// Citeh Chess rooms: two players, one Durable Object per game. No accounts, no tokens kept
// beyond a random per-seat secret the browser makes up. Moves are checked with chess.js.
import { DurableObject } from 'cloudflare:workers';
import { Chess } from 'chess.js';

const ALLOW = ['https://aiautomationvic.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const IDLE_MS = 6 * 3600e3, AFTER_END_MS = 3 * 3600e3;

const cors = (o) => ({
  'Access-Control-Allow-Origin': ALLOW.includes(o) ? o : ALLOW[0],
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  Vary: 'Origin',
});

export default {
  async fetch(req, env) {
    const o = req.headers.get('Origin'), u = new URL(req.url), h = cors(o);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (o && !ALLOW.includes(o)) return new Response('Not allowed', { status: 403, headers: h });
    if (u.pathname === '/new') {
      let code = '';
      for (const b of crypto.getRandomValues(new Uint8Array(5))) code += CODE_CHARS[b % CODE_CHARS.length];
      return Response.json({ code }, { headers: h });
    }
    const m = u.pathname.match(/^\/room\/([A-Z0-9]{4,8})$/);
    if (m && req.headers.get('Upgrade') === 'websocket') {
      if (!o || !ALLOW.includes(o)) return new Response('Not allowed', { status: 403 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    return new Response('Citeh Chess rooms', { status: 200, headers: h });
  },
};

const other = (s) => (s === 'white' ? 'black' : 'white');
const clean = (n) => String(n || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 20);

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.s = null;
    ctx.blockConcurrencyWhile(async () => { this.s = (await ctx.storage.get('s')) || null; });
  }

  async fetch() {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  fresh(tc) {
    const ms = tc[0] > 0 ? tc[0] * 60000 : null;
    return { tc, moves: [], status: 'waiting', result: null, w: ms, b: ms, turnAt: 0, offer: null, rematch: { white: false, black: false } };
  }

  async save() { await this.ctx.storage.put('s', this.s); }

  running() { return this.s.status === 'started' && this.s.moves.length >= 2 && this.s.w !== null; }

  // remaining time right now for each side
  clocks() {
    const s = this.s;
    if (s.w === null) return [null, null];
    let w = s.w, b = s.b;
    if (this.running()) { const el = Date.now() - s.turnAt; if (s.moves.length % 2 === 0) w -= el; else b -= el; }
    return [Math.max(0, w), Math.max(0, b)];
  }

  online() {
    const o = { white: false, black: false };
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a && a.seat) o[a.seat] = true; }
    return o;
  }

  view(seat) {
    const s = this.s, [w, b] = this.clocks();
    return {
      t: 'state', you: seat, names: { white: s.seats.white?.name || '', black: s.seats.black?.name || '' },
      moves: s.moves.join(' '), wtime: w, btime: b, tc: s.tc,
      status: s.status === 'waiting' ? 'created' : s.status === 'started' ? 'started' : s.result.status,
      winner: s.result?.winner, wdraw: s.offer === 'white', bdraw: s.offer === 'black',
      rematch: s.rematch, online: this.online(),
    };
  }

  broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.seat) ws.send(JSON.stringify(this.view(a.seat)));
    }
  }

  async plan() {
    const s = this.s;
    let at = Date.now() + (s.status === 'ended' ? AFTER_END_MS : IDLE_MS);
    if (this.running()) { const [w, b] = this.clocks(); at = Date.now() + Math.max(50, (s.moves.length % 2 === 0 ? w : b) + 30); }
    await this.ctx.storage.setAlarm(at);
  }

  end(status, winner) { this.s.status = 'ended'; this.s.result = { status, winner }; this.s.offer = null; }

  async alarm() {
    const s = this.s;
    if (!s) return;
    if (this.running()) {
      const [w, b] = this.clocks();
      const side = s.moves.length % 2 === 0 ? 'white' : 'black';
      if ((side === 'white' ? w : b) <= 0) { this.end('outoftime', other(side)); await this.save(); this.broadcast(); }
    } else {
      for (const ws of this.ctx.getWebSockets()) try { ws.close(1000, 'room expired'); } catch {}
      await this.ctx.storage.deleteAll(); this.s = null; return;
    }
    await this.plan();
  }

  load() {
    const c = new Chess();
    for (const u of this.s.moves) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return c;
  }

  async webSocketMessage(ws, raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const err = (x) => ws.send(JSON.stringify({ t: 'err', m: x }));
    if (m.t === 'ping') return ws.send('{"t":"pong"}');
    if (m.t === 'join') return this.join(ws, m, err);
    const a = ws.deserializeAttachment(), seat = a && a.seat, s = this.s;
    if (!seat || !s) return err('Join first');
    if (m.t === 'sync') return ws.send(JSON.stringify(this.view(seat)));
    if (m.t === 'move') {
      if (s.status !== 'started') return err('Game not running');
      if (s.moves.length % 2 !== (seat === 'white' ? 0 : 1)) return err('Not your turn');
      const u = String(m.uci || '');
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) return err('Bad move');
      const [w, b] = this.clocks();
      if (this.running() && (seat === 'white' ? w : b) <= 0) { this.end('outoftime', other(seat)); await this.save(); this.broadcast(); return this.plan(); }
      const c = this.load();
      try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { err('Illegal move'); return ws.send(JSON.stringify(this.view(seat))); }
      if (this.running()) { // the clock was running: charge the mover, then add the increment
        s.w = w; s.b = b; if (s.tc[1] > 0) { if (seat === 'white') s.w += s.tc[1] * 1000; else s.b += s.tc[1] * 1000; }
      }
      s.moves.push(u); s.turnAt = Date.now(); s.offer = null;
      if (c.isCheckmate()) this.end('mate', seat);
      else if (c.isStalemate()) this.end('stalemate');
      else if (c.isInsufficientMaterial() || c.isThreefoldRepetition() || c.isDrawByFiftyMoves()) this.end('draw');
    } else if (m.t === 'resign') {
      if (s.status !== 'started') return;
      if (s.moves.length < 2) this.end('aborted'); else this.end('resign', other(seat));
    } else if (m.t === 'draw') {
      if (s.status !== 'started' || s.moves.length < 2) return;
      if (s.offer && s.offer !== seat) this.end('draw'); else s.offer = seat;
    } else if (m.t === 'declineDraw') {
      if (s.offer && s.offer !== seat) s.offer = null;
    } else if (m.t === 'rematch') {
      if (s.status !== 'ended') return;
      s.rematch[seat] = true;
      if (s.rematch.white && s.rematch.black) {
        const sw = s.seats.white; s.seats.white = s.seats.black; s.seats.black = sw;
        for (const x of this.ctx.getWebSockets()) { const at = x.deserializeAttachment(); if (at && at.seat) x.serializeAttachment({ seat: other(at.seat) }); }
        const n = this.fresh(s.tc); n.seats = s.seats; n.status = 'started'; n.turnAt = Date.now(); this.s = n;
      }
    } else return;
    await this.save(); this.broadcast(); await this.plan();
  }

  async join(ws, m, err) {
    const tok = String(m.tok || '').slice(0, 64), name = clean(m.name) || 'Guest';
    if (tok.length < 8) return err('Bad token');
    if (!this.s) {
      const tc = Array.isArray(m.tc) ? [Math.max(0, Math.min(180, +m.tc[0] || 0)), Math.max(0, Math.min(60, +m.tc[1] || 0))] : [5, 0];
      this.s = this.fresh(tc); this.s.seats = { white: null, black: null };
      const want = m.want === 'white' || m.want === 'black' ? m.want : crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 'white' : 'black';
      this.s.seats[want] = { tok, name };
      ws.serializeAttachment({ seat: want });
    } else {
      const sd = this.s.seats;
      let seat = sd.white?.tok === tok ? 'white' : sd.black?.tok === tok ? 'black' : null;
      if (seat) sd[seat].name = name;
      else if (!sd.white) seat = 'white';
      else if (!sd.black) seat = 'black';
      else { ws.send('{"t":"full"}'); return ws.close(1000, 'full'); }
      if (!sd[seat]) sd[seat] = { tok, name };
      ws.serializeAttachment({ seat });
      if (this.s.status === 'waiting' && sd.white && sd.black) { this.s.status = 'started'; this.s.turnAt = Date.now(); }
    }
    await this.save(); this.broadcast(); await this.plan();
  }

  async webSocketClose(ws) { try { ws.close(); } catch {} this.broadcast(); }
  async webSocketError() { this.broadcast(); }
}
