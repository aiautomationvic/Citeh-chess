// Downloads Lichess puzzles (CC0) into site/puzzles.json so the site has puzzles when Lichess is blocked.
// Run: node tools/harvest-puzzles.js   (slow on purpose: Lichess rate-limits this endpoint hard)
const fs=require('fs'),sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=new Map();
const TH=['mix','mate','mateIn1','mateIn2','fork','pin','endgame','middlegame'];
const save=()=>fs.writeFileSync('site/puzzles.json',JSON.stringify([...out.values()]));
(async()=>{for(const th of TH)for(const df of['easiest','easier','normal','harder','hardest']){
 for(let t=0;t<6;t++){try{const r=await fetch(`https://lichess.org/api/puzzle/batch/${th}?nb=50&difficulty=${df}`);
  if(r.status==429){console.log('429, waiting');await sleep(90000);continue}
  const j=await r.json();for(const x of j.puzzles||[])out.set(x.puzzle.id,{i:x.puzzle.id,r:x.puzzle.rating,s:x.puzzle.solution.join(' '),t:(x.puzzle.themes||[]).join(' '),p:x.game.pgn});save();break}catch(e){console.log('err',e.message);await sleep(10000)}}
 console.log(th,df,out.size);await sleep(15000)}
 console.log('done',out.size)})();
