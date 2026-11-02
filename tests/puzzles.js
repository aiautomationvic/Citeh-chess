const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});const pg=await c.newPage();
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()=='error')errs.push('CONSOLE '+m.text())});
const F=__dirname+'/fixtures/',O=(process.env.OUT||'/tmp')+'/',J=f=>fs.readFileSync(f,'utf8');
await pg.route('**/api/puzzle/daily',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:J(F+'daily.json')}));
await pg.route('**/api/puzzle/next**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:J(F+'next.json')}));
await pg.route('**/api/puzzle/batch/**',r=>{console.log('BATCH',r.request().url());r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:J(F+'batch.json')})});
await pg.goto('http://localhost:8000/');await pg.waitForTimeout(800);
console.log('pz0 text:',(await pg.textContent('#pz0')).slice(0,80));
await pg.screenshot({path:O+'s_login.png',fullPage:true});
// daily puzzle
await pg.evaluate(()=>pzStart('daily'));await pg.waitForFunction(()=>G&&G.puz,null,{timeout:5000});
console.log('me',await pg.evaluate(()=>G.me+' sol0 '+G.puz.sol[0]+' moves '+G.moves.length));
await pg.screenshot({path:O+'s_daily.png'});
// wrong move
await pg.evaluate(()=>{const Z=G.puz;const u=Z.sol[0];/* make a different legal move: reuse hint */});
const wrong=await pg.evaluate(()=>{const P=cur();for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=P.b[r][f];if(p!='.'&&mine(p)){const L=legal(P,r,f);for(const m of L){const u='abcdefgh'[f]+(8-r)+'abcdefgh'[m[1]]+(8-m[0]);if(u!=G.puz.sol[0])return u}}}});
console.log('wrong',wrong);await pg.evaluate(u=>puzMove(u),wrong);await pg.waitForTimeout(100);console.log('status',await pg.textContent('#st'));await pg.waitForTimeout(1000);
console.log('after undo moves',await pg.evaluate(()=>G.moves.length+' ok '+G.puz.ok));
await pg.evaluate(()=>pzHint());await pg.waitForTimeout(200);await pg.screenshot({path:O+'s_hint.png'});
// play full solution
for(let i=0;i<10;i++){const st=await pg.evaluate(()=>({o:G.puz.over,ok:G.puz.ok,i:G.puz.i,n:G.puz.sol.length}));if(st.o)break;if(st.ok){await pg.evaluate(()=>puzMove(G.puz.sol[G.puz.i]))}await pg.waitForTimeout(700)}
console.log('over',await pg.evaluate(()=>G.puz.over+' '+G.puz.fail),await pg.textContent('#st'));await pg.screenshot({path:O+'s_done.png'});
console.log('puzbox',(await pg.textContent('#puz')).slice(0,120));
// engine hidden checks
console.log('ana hidden',await pg.evaluate(()=>$('#ana').classList.contains('hide')+' ctl2 '+$('#ctl2').classList.contains('hide')));
// rush
await pg.evaluate(()=>{lobbyBack()});
await pg.evaluate(()=>rushStart('3'));await pg.waitForFunction(()=>G&&G.puz&&Rsh,null,{timeout:5000});
await pg.screenshot({path:O+'s_rush.png'});
for(let k=0;k<3;k++){await pg.waitForFunction(()=>G.puz.ok,null,{timeout:4000});for(let i=0;i<8;i++){const st=await pg.evaluate(()=>({ok:G.puz.ok,over:G.puz.over,d:G.puz.d.puzzle.id}));if(st.ok){await pg.evaluate(()=>puzMove(G.puz.sol[G.puz.i]))}await pg.waitForTimeout(600);if(await pg.evaluate(()=>Rsh.score)>k)break}}
console.log('rush score',await pg.evaluate(()=>Rsh.score+' q '+Rsh.q.length+' clock '+pzClock()));
await pg.screenshot({path:O+'s_rush2.png'});
// strike survival
await pg.evaluate(()=>rushStart('s'));await pg.waitForFunction(()=>G&&G.puz&&Rsh&&Rsh.m=='s',null,{timeout:5000});
for(let k=0;k<3;k++){await pg.waitForFunction(()=>G.puz.ok||Rsh.over,null,{timeout:5000});if(await pg.evaluate(()=>Rsh.over))break;await pg.evaluate(()=>rushSkip());await pg.waitForTimeout(500)}
await pg.waitForTimeout(500);console.log('survival over',await pg.evaluate(()=>Rsh.over+' strikes '+Rsh.strikes));await pg.screenshot({path:O+'s_rushend.png'});
// lobby view
await pg.evaluate(()=>{puzStop();me={username:'tester',perfs:{}};tok='x';G=null;lobby()});await pg.waitForTimeout(300);await pg.screenshot({path:O+'s_lobby.png',fullPage:true});
console.log('errors',errs);await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
