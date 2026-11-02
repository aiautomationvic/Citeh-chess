// Live-game UI: ratings, opponent disconnected (+claim win), extra zen (game and analysis). Lichess is simulated.
const {chromium}=require('playwright');
(async()=>{const O=(process.env.OUT||'/tmp')+'/',b=await chromium.launch(),errs=[];
for(const [name,vp] of [['phone',{width:390,height:780}],['wide',{width:1100,height:800}]]){
 const pg=await (await b.newContext({viewport:vp,deviceScaleFactor:name=='phone'?2:1})).newPage();pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8000/');await pg.waitForSelector('#login:not(.hide)');
 await pg.evaluate(()=>{me={id:'tester',username:'tester',perfs:{}};tok='x';openGame('t1');
  onGame({type:'gameFull',white:{id:'tester',name:'tester',rating:1500},black:{id:'bob',name:'bob',rating:1623,provisional:true},state:{moves:'e2e4 e7e5',status:'started',wtime:300000,btime:300000}})});
 await pg.waitForTimeout(300);
 console.log(name,'rows:',await pg.evaluate(()=>$('#ot').innerText.replace(/\n/g,' ')+' || '+$('#mt').innerText.replace(/\n/g,' ')));
 await pg.evaluate(()=>onGame({type:'opponentGone',gone:true,claimWinInSeconds:2}));await pg.waitForTimeout(200);
 console.log(name,'gone:',await pg.evaluate(()=>$('#og').innerText));await pg.screenshot({path:O+`s_gone_${name}.png`});
 await pg.waitForTimeout(2300);console.log(name,'after countdown:',await pg.evaluate(()=>$('#og').innerText.replace(/\n/g,' ')));
 await pg.evaluate(()=>onGame({type:'opponentGone',gone:false}));console.log(name,'back:',await pg.evaluate(()=>$('#og').classList.contains('hide')));
 await pg.evaluate(()=>onGame({type:'opponentGone',gone:true,claimWinInSeconds:50}));
 await pg.evaluate(()=>{setS('zx',true);setS('zen','x')});await pg.waitForTimeout(300);await pg.screenshot({path:O+`s_zenx_${name}.png`});
 console.log(name,'zenx visible side:',await pg.evaluate(()=>getComputedStyle($('#side')).display+' '+getComputedStyle($('#ctl')).display+' eye '+getComputedStyle($('#zb')).display));
 await pg.evaluate(()=>setS('zen',false));await pg.waitForTimeout(200);console.log(name,'normal again:',await pg.evaluate(()=>!document.body.classList.contains('zenx')&&getComputedStyle($('#ctl')).display));
 // analysis in extra zen with engine arrow
 await pg.evaluate(()=>{G=null;openAnalysis(['e2e4','e7e5']);setS('zen','x')});await pg.waitForTimeout(400);
 await pg.evaluate(()=>{$('#arr').innerHTML='<line x1="4.5" y1="6.5" x2="4.5" y2="4.5" stroke="#3a8" stroke-width=".3"/>'});await pg.screenshot({path:O+`s_zenx_an_${name}.png`});
 console.log(name,'analysis zenx:',await pg.evaluate(()=>getComputedStyle($('#side')).display+' '+document.body.classList.contains('zenx')));
 await pg.evaluate(()=>setS('zen',false));
}
console.log('errors',errs);await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
