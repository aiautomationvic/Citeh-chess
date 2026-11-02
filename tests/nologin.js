const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});const pg=await c.newPage();
const O=(process.env.OUT||'/tmp')+'/';const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await pg.goto('http://localhost:8000/');await pg.waitForTimeout(800);
console.log('login visible',await pg.evaluate(()=>!$('#login').classList.contains('hide')));
await pg.screenshot({path:O+'s_login2.png',fullPage:true});
// two players anonymous
await pg.evaluate(()=>openTwo());await pg.waitForTimeout(200);
await pg.evaluate(()=>{playAn('e2e4');playAn('e7e5')});console.log('two moves',await pg.evaluate(()=>G.moves.length));
await pg.evaluate(()=>goHome());await pg.waitForTimeout(200);console.log('home->login',await pg.evaluate(()=>!$('#login').classList.contains('hide')&&!G));
// analysis anonymous
await pg.evaluate(()=>openAnalysis());await pg.waitForTimeout(300);console.log('analysis open',await pg.evaluate(()=>!$('#game').classList.contains('hide')+''));
await pg.evaluate(()=>goHome());await pg.waitForTimeout(200);console.log('home->login',await pg.evaluate(()=>!$('#login').classList.contains('hide')));
// rush quiet mode: mate should not trigger fx; non-rush should
const run=async rush=>{await pg.evaluate(()=>{openAnalysis(['f2f3','e7e5','g2g4']);window.__m=0;window.mateFx=()=>{window.__m++};});
 await pg.evaluate(r=>{G.puz={ok:false,sol:[],i:0,d:{puzzle:{}},o:{}};Rsh=r?{m:'3',score:0}:null;playAn('d8h4',1)},rush);await pg.waitForTimeout(1500);return pg.evaluate(()=>window.__m)};
console.log('mateFx calls in rush',await run(true),'| outside rush',await run(false));
console.log('errors',errs);await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
