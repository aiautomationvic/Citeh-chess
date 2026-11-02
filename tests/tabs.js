// Tabs: Play / Puzzles / Analysis on login and lobby, phone bottom bar and wide side rail.
const {chromium}=require('playwright');
(async()=>{const O=(process.env.OUT||'/tmp')+'/',b=await chromium.launch(),errs=[];
for(const [name,vp] of [['phone',{width:390,height:780}],['wide',{width:1100,height:800}]]){
 const pg=await (await b.newContext({viewport:vp,deviceScaleFactor:name=='phone'?2:1})).newPage();pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8000/');await pg.waitForSelector('#login:not(.hide)',{timeout:8000});await pg.waitForTimeout(300);
 const vis=()=>pg.evaluate(()=>[...document.querySelectorAll('#login [data-tab],#lobby [data-tab]')].filter(e=>e.offsetParent).map(e=>e.dataset.tab+':'+(e.querySelector('b')||{}).textContent).join(' | '));
 console.log(name,'login play ->',await vis());await pg.screenshot({path:O+`s_tab_${name}_login.png`});
 await pg.click('#tabs button:nth-child(2)');console.log(name,'puzzles ->',await vis());
 await pg.click('#tabs button:nth-child(3)');console.log(name,'analysis ->',await vis());
 await pg.click('#tabs button:nth-child(1)');
 await pg.evaluate(()=>{me={username:'tester',perfs:{}};tok='x';G=null;lobby()});await pg.waitForTimeout(300);
 console.log(name,'lobby play ->',await vis());await pg.screenshot({path:O+`s_tab_${name}_lobby.png`});
 await pg.click('#tabs button:nth-child(2)');await pg.waitForTimeout(150);await pg.screenshot({path:O+`s_tab_${name}_puz.png`});
 await pg.evaluate(()=>openTwo());await pg.waitForTimeout(200);console.log(name,'tabs hidden in game',await pg.evaluate(()=>$('#tabs').classList.contains('hide')));
 await pg.evaluate(()=>lobbyBack());await pg.waitForTimeout(200);console.log(name,'back, tab kept',await pg.evaluate(()=>document.body.dataset.tab+' '+!$('#tabs').classList.contains('hide')));
}
console.log('errors',errs);await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
