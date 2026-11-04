// Offline play: a game "server" that runs inside the browser. Used for (1) playing the built-in Stockfish
// with no Lichess, and (2) a direct friend game over WebRTC where the host's browser is the server and
// the two phones swap two short codes by hand. Speaks the same messages as rooms/src/index.js, so the
// normal netOpen/netMsg/apply code and every cutscene work unchanged. Also serves puzzles from puzzles.json.
// Classic script loaded after index.html's main script: shares its globals (legal, step, fenOf, G, ...).
'use strict';
const OFF_SK=[0,2,5,8,11,14,17,20],OFF_DP=[1,2,3,5,6,8,10,12],OFF_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
let ocl=3;
const offOther=s=>s=='white'?'black':'white';

// ---------- the room (port of the Durable Object) ----------
class LRoom{
 constructor(tc,bot){this.tc=tc;this.bot=bot||null;this.conns=[];this.seats={white:null,black:null};this.rm={white:false,black:false};this.reset();this.s.status='waiting'}
 reset(){const ms=this.tc[0]>0?this.tc[0]*60000:null;this.s={status:'waiting',result:null,moves:[],w:ms,b:ms,turnAt:0,offer:null};this.P=START;this.keys=[];this.half=0;this.note()}
 note(){const n=this.s.moves.length;this.keys.length=n;this.keys[n]=fenOf(this.P,n).split(' ').slice(0,4).join(' ')}
 running(){const s=this.s;return s.status=='started'&&s.moves.length>=2&&s.w!==null}
 clocks(){const s=this.s;if(s.w===null)return[null,null];let w=s.w,b=s.b;if(this.running()){const el=Date.now()-s.turnAt;if(s.moves.length%2==0)w-=el;else b-=el}return[Math.max(0,w),Math.max(0,b)]}
 online(){const o={white:false,black:false};for(const c of this.conns)if(c.seat&&!c.dead)o[c.seat]=true;if(this.bot)o[this.bot.seat]=true;return o}
 view(seat){const s=this.s,[w,b]=this.clocks(),nm=x=>(this.seats[x]&&this.seats[x].name)||'';
  return{t:'state',you:seat,names:{white:nm('white'),black:nm('black')},moves:s.moves.join(' '),wtime:w,btime:b,tc:this.tc,status:s.status=='waiting'?'created':s.status=='started'?'started':s.result.status,winner:s.result&&s.result.winner,wdraw:s.offer=='white',bdraw:s.offer=='black',rematch:this.rm,online:this.online()}}
 broadcast(){for(const c of this.conns)if(c.seat&&!c.dead)c.out(JSON.stringify(this.view(c.seat)));this.plan();this.botTurn()}
 end(status,winner){const s=this.s;s.status='ended';s.result={status,winner};s.offer=null}
 plan(){clearTimeout(this.tm);if(!this.running())return;const[w,b]=this.clocks();this.tm=setTimeout(()=>{if(!this.running())return;const side=this.s.moves.length%2?'black':'white',[w2,b2]=this.clocks();if((side=='white'?w2:b2)<=0){this.end('outoftime',offOther(side));this.broadcast()}else this.plan()},Math.max(50,(this.s.moves.length%2?b:w)+30))}
 attach(out){const c={out,seat:null,dead:false,room:this};c.recv=raw=>this.recv(c,raw);c.close=()=>{c.dead=true;this.conns=this.conns.filter(x=>x!==c);this.broadcast()};this.conns.push(c);return c}
 recv(c,raw){let m;try{m=JSON.parse(raw)}catch{return}const err=x=>c.out(JSON.stringify({t:'err',m:x})),s=this.s;
  if(m.t=='ping')return c.out('{"t":"pong"}');if(m.t=='join')return this.join(c,m,err);const seat=c.seat;if(!seat)return err('Join first');
  if(m.t=='sync')return c.out(JSON.stringify(this.view(seat)));
  if(m.t=='move'){if(s.status!='started')return err('Game not running');if(s.moves.length%2!=(seat=='white'?0:1))return err('Not your turn');if(!this.move(seat,String(m.uci||''))){err('Illegal move');return c.out(JSON.stringify(this.view(seat)))}return}
  if(m.t=='resign'){if(s.status!='started')return;if(s.moves.length<2)this.end('aborted');else this.end('resign',offOther(seat))}
  else if(m.t=='draw'){if(s.status!='started'||s.moves.length<2)return;if(this.bot&&this.bot.seat!=seat)return;if(s.offer&&s.offer!=seat)this.end('draw');else s.offer=seat}
  else if(m.t=='declineDraw'){if(s.offer&&s.offer!=seat)s.offer=null}
  else if(m.t=='rematch'){if(s.status!='ended')return;this.rm[seat]=true;if(this.bot)this.rm[this.bot.seat]=true;
   if(this.rm.white&&this.rm.black){const t=this.seats.white;this.seats.white=this.seats.black;this.seats.black=t;if(this.bot)this.bot.seat=offOther(this.bot.seat);for(const x of this.conns)if(x.seat)x.seat=offOther(x.seat);this.rm={white:false,black:false};this.reset();this.s.status='started';this.s.turnAt=Date.now()}}
  else return;this.broadcast()}
 join(c,m,err){const tok=String(m.tok||'').slice(0,64),name=String(m.name||'').replace(/[^\p{L}\p{N} _.-]/gu,'').trim().slice(0,20)||'Guest';if(tok.length<8)return err('Bad token');
  const sd=this.seats;let seat=sd.white&&sd.white.tok==tok?'white':sd.black&&sd.black.tok==tok?'black':null;
  if(seat)sd[seat].name=name;
  else{const want=m.want=='white'||m.want=='black'?m.want:(crypto.getRandomValues(new Uint8Array(1))[0]&1?'white':'black');
   if(this.bot&&this.bot.seat==want){seat=offOther(want)}else if(!sd[want])seat=want;else if(!sd.white)seat='white';else if(!sd.black)seat='black';
   else{c.out('{"t":"full"}');return}
   sd[seat]={tok,name}}
  c.seat=seat;if(this.bot&&!sd[this.bot.seat])sd[this.bot.seat]={tok:'bot',name:'Computer Lv '+this.bot.lv};
  if(this.s.status=='waiting'&&sd.white&&sd.black){this.s.status='started';this.s.turnAt=Date.now()}
  this.broadcast()}
 // checks a move, plays it, works out whether the game ended
 move(seat,u){const s=this.s;if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))return false;
  const fr=8-u[1],ff=u.charCodeAt(0)-97,tr=8-u[3],tf=u.charCodeAt(2)-97,p=this.P.b[fr][ff];if(p=='.'||isW(p)!=(seat=='white'))return false;
  if(!legal(this.P,fr,ff).some(m=>m[0]==tr&&m[1]==tf))return false;
  const promo=p.toLowerCase()=='p'&&(tr==0||tr==7);if(promo!=!!u[4])return false;
  const[w,b]=this.clocks();if(this.running()&&(seat=='white'?w:b)<=0){this.end('outoftime',offOther(seat));this.broadcast();return true}
  if(this.running()){s.w=w;s.b=b;if(this.tc[1]>0){if(seat=='white')s.w+=this.tc[1]*1000;else s.b+=this.tc[1]*1000}}
  const cap=this.P.b[tr][tf]!='.'||(p.toLowerCase()=='p'&&ff!=tf);this.half=(cap||p.toLowerCase()=='p')?0:this.half+1;
  this.P=step(this.P,u);s.moves.push(u);s.turnAt=Date.now();s.offer=null;this.note();
  const nextW=s.moves.length%2==0,[kr,kf]=kingAt(this.P.b,nextW);
  if(!hasMove(this.P,nextW)){if(attacked(this.P.b,kr,kf,!nextW))this.end('mate',seat);else this.end('stalemate')}
  else if(this.dead()||this.keys.filter(k=>k==this.keys[s.moves.length]).length>=3||this.half>=100)this.end('draw');
  this.broadcast();return true}
 dead(){const pcs=[];for(const r of this.P.b)for(const c of r)if(c!='.'&&c.toLowerCase()!='k')pcs.push(c.toLowerCase());
  return !pcs.length||(pcs.length==1&&(pcs[0]=='n'||pcs[0]=='b'))}
 async botTurn(){const B=this.bot;if(!B||this.thinking||this.s.status!='started')return;const n=this.s.moves.length;if((n%2==0?'white':'black')!=B.seat)return;
  this.thinking=true;try{const w=await getEngine(),t0=Date.now();w.postMessage('setoption name Skill Level value '+OFF_SK[B.lv-1]);const r=await evalFen(w,fenOf(this.P,n),OFF_DP[B.lv-1]);w.postMessage('setoption name Skill Level value 20');
   await sleep(Math.max(0,500-(Date.now()-t0)));this.thinking=false;if(!this.gone&&this.s.status=='started'&&this.s.moves.length==n)this.move(B.seat,r.best)}
  catch{toast('The computer could not start');}this.thinking=false}
 stop(){this.gone=true;clearTimeout(this.tm);for(const c of this.conns)c.dead=true}
}

// ---------- sockets that look like a WebSocket to netOpen ----------
function offSock(room){const ws={readyState:1,onopen:null,onmessage:null,onclose:null,send(s){conn.recv(s)},close(){ws.readyState=3;conn.close();if(ws.onclose)ws.onclose()}},
 conn=room.attach(s=>{if(ws.onmessage)ws.onmessage({data:s})});setTimeout(()=>ws.onopen&&ws.onopen(),0);return ws}

function offOpen(room,o,p2p){const code='OFFL'+Math.random().toString(36).slice(2,5).toUpperCase();
 joinRoom(code,{...o,local:g=>{g.room=room;return offSock(room)},p2p:p2p});}

// ---------- 1. play the computer ----------
function offCpu(){const name=fname(),want=fcol=='random'?(Math.random()<.5?'white':'black'):fcol;
 const room=new LRoom(ftc,{seat:offOther(want),lv:ocl});offOpen(room,{name,want,tc:ftc})}

// ---------- 2. direct friend game over WebRTC ----------
const offB64=u8=>btoa(String.fromCharCode(...u8)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),offUn=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function offPack(o){const t=new TextEncoder().encode(JSON.stringify(o));if(typeof CompressionStream=='undefined')return'r'+offB64(t);
 return'z'+offB64(new Uint8Array(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()))}
async function offUnpack(s){s=(s||'').trim().replace(/\s+/g,'');const k=s[0],b=offUn(s.slice(1));
 return JSON.parse(new TextDecoder().decode(k=='z'?new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()):b))}
const offGather=pc=>new Promise(res=>{if(pc.iceGatheringState=='complete')return res();const f=()=>{if(pc.iceGatheringState=='complete'){pc.removeEventListener('icegatheringstatechange',f);res()}};pc.addEventListener('icegatheringstatechange',f);setTimeout(res,5000)});
let offPc=null;
function offBox(h){let e=document.getElementById('offbox');if(!e){e=document.createElement('div');e.id='offbox';e.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--bg1);overflow:auto;padding:16px;display:flex;justify-content:center;align-items:flex-start';document.body.appendChild(e)}
 e.innerHTML=`<div class="card" style="max-width:420px;width:100%;margin-top:24px">${h}</div>`;return e}
function offClose(){const e=document.getElementById('offbox');if(e)e.remove()}
function offCancel(){try{offPc&&offPc.close()}catch{}offPc=null;offClose()}
const offCopy=(id)=>{const t=document.getElementById(id).value;try{navigator.clipboard.writeText(t).then(()=>toast('Copied'),()=>prompt('Copy this',t))}catch{prompt('Copy this',t)}};
async function offShare(id){const t=document.getElementById(id).value;if(navigator.share){try{await navigator.share({text:t});return}catch{}}offCopy(id)}

async function offHost(){const name=fname(),want=fcol,tc=ftc;toast('Getting ready…');
 const pc=offPc=new RTCPeerConnection(OFF_ICE),ch=pc.createDataChannel('chess');await pc.setLocalDescription(await pc.createOffer());await offGather(pc);
 const link=location.origin+location.pathname+'#p='+await offPack({s:pc.localDescription.sdp,n:name,c:want,t:tc});
 offBox(`<b>Play a friend directly</b><div class="dim" style="font-size:13px;margin:10px 0 6px">1. Send this link to your friend</div><textarea id="offl" readonly rows="3" style="width:100%;box-sizing:border-box;font-size:12px">${link}</textarea><div class="row" style="margin:6px 0 14px"><button onclick="offShare('offl')">Share</button><button class="alt" onclick="offCopy('offl')">Copy</button></div>
  <div class="dim" style="font-size:13px;margin-bottom:6px">2. Paste the reply code they send back</div><textarea id="offr" rows="3" placeholder="Reply code" style="width:100%;box-sizing:border-box;font-size:12px"></textarea><div class="row" style="margin-top:6px"><button onclick="offConnect()">Connect</button><button class="alt" onclick="offCancel()">Cancel</button></div>`);
 offPc.hostInfo={name,want,tc,ch};ch.onopen=()=>{
  const room=new LRoom(tc),conn=room.attach(s=>{try{ch.send(s)}catch{}});ch.onmessage=e=>conn.recv(e.data);ch.onclose=()=>conn.close();
  offClose();offOpen(room,{name,want,tc},true);window.offHostRoom=room}}
async function offConnect(){const pc=offPc;if(!pc)return;try{const a=await offUnpack(document.getElementById('offr').value);await pc.setRemoteDescription({type:'answer',sdp:a.s});toast('Connecting…')}catch{toast('That reply code is not right')}}

async function offGuest(code){let o;try{o=await offUnpack(code)}catch{return toast('That link is not valid')}
 history.replaceState(null,'',location.pathname+location.search);
 offBox(`<b>Join ${String(o.n||'your friend').replace(/[<>&]/g,'')}'s game</b><input id="offn" class="fname" placeholder="Your name" maxlength="20" value="${(ls.g('bcName')||'').replace(/"/g,'')}" style="margin:12px 0"><div class="row"><button id="offgo">Join</button><button class="alt" onclick="offCancel()">Cancel</button></div>`);
 document.getElementById('offgo').onclick=async()=>{const name=(document.getElementById('offn').value||'').trim()||'Guest';ls.s('bcName',name);
  const pc=offPc=new RTCPeerConnection(OFF_ICE);let chn=null;
  pc.ondatachannel=e=>{chn=e.channel;chn.onopen=()=>{offClose();const want=o.c=='white'?'black':o.c=='black'?'white':'random';
    joinRoom('P2P'+Math.random().toString(36).slice(2,4).toUpperCase(),{name,want,tc:o.t,p2p:true,local:g=>{const ws={readyState:1,onopen:null,onmessage:null,onclose:null,send:s=>{try{chn.send(s)}catch{}},close(){ws.readyState=3;try{chn.close()}catch{}}};
      chn.onmessage=e=>ws.onmessage&&ws.onmessage({data:e.data});chn.onclose=()=>{ws.readyState=3;g.lost=true;if(ws.onclose)ws.onclose()};setTimeout(()=>ws.onopen&&ws.onopen(),0);return ws}})}};
  try{await pc.setRemoteDescription({type:'offer',sdp:o.s});await pc.setLocalDescription(await pc.createAnswer());await offGather(pc)}catch{return toast('Could not connect')}
  const rep=await offPack({s:pc.localDescription.sdp});
  offBox(`<b>Nearly there</b><div class="dim" style="font-size:13px;margin:10px 0 6px">Send this reply code back to your friend. The game starts when they paste it.</div><textarea id="offr" readonly rows="4" style="width:100%;box-sizing:border-box;font-size:12px">${rep}</textarea><div class="row" style="margin-top:6px"><button onclick="offShare('offr')">Share</button><button class="alt" onclick="offCopy('offr')">Copy</button><button class="alt" onclick="offCancel()">Cancel</button></div>`)}}

// ---------- UI hooks ----------
function offUI(){return`<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)"><b>No server needed</b><div class="seg g4" style="margin:10px 0">${[1,2,3,4,5,6,7,8].map(n=>`<button class="${ocl==n?'on':''}" onclick="ocl=${n};friendUI()">${n}</button>`).join('')}</div><button style="width:100%;margin-bottom:8px" onclick="offCpu()">Play the computer (level ${ocl})</button><button class="alt" style="width:100%" onclick="offHost()">Play a friend directly</button></div>`}

// ---------- 3. puzzles from puzzles.json when Lichess can't be reached ----------
let offPzP=null;const offPzAll=()=>offPzP||(offPzP=fetch('puzzles.json').then(r=>r.json()).catch(e=>{offPzP=null;throw e}));
const OFF_BAND={easiest:[0,1150],easier:[1150,1400],normal:[1400,1700],harder:[1700,2000],hardest:[2000,9999]};
async function offPz(u){const all=await offPzAll(),url=new URL(u,'http://x'),q=url.searchParams,m=url.pathname.match(/puzzle\/(daily|next|batch)(?:\/(.+))?$/),kind=m[1];
 let angle=kind=='batch'?decodeURIComponent(m[2]||'mix'):q.get('angle')||'mix',df=q.get('difficulty'),co=q.get('color');
 const pick=(a,ang)=>a.filter(x=>(ang=='mix'||x.t.split(' ').includes(ang))&&(!df||df=='any'||(x.r>=OFF_BAND[df][0]&&x.r<OFF_BAND[df][1]))&&(!co||co=='any'||((x.p.split(/\s+/).length%2?'black':'white')==co)));
 let a=pick(all,angle);if(!a.length)a=pick(all,'mix');if(!a.length)a=all;
 const mk=x=>({game:{pgn:x.p},puzzle:{id:x.i,rating:x.r,solution:x.s.split(' '),themes:x.t.split(' ')}}),r=()=>a[Math.floor(Math.random()*a.length)];
 if(kind=='batch'){const nb=+q.get('nb')||8,s=new Set(),o=[];for(let i=0;i<nb*3&&o.length<Math.min(nb,a.length);i++){const x=r();if(!s.has(x.i)){s.add(x.i);o.push(mk(x))}}return{puzzles:o}}
 return mk(r())}

// leaving an offline game also stops its in-browser room and any WebRTC link
const offNc=netClose;netClose=function(){const g=G;offNc();if(g&&g.room)g.room.stop();if(g&&g.p2p&&offPc){try{offPc.close()}catch{}offPc=null}};

// #p=<code> in the address opens the friend-join screen
function offBoot(){const h=location.hash;if(h.startsWith('#p='))offGuest(h.slice(3))}
addEventListener('load',()=>setTimeout(offBoot,300));addEventListener('hashchange',offBoot);
