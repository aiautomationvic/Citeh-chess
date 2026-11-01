// Citeh Chess relay: forwards /api/* calls to lichess.org. Holds no tokens or secrets.
const ALLOW=['https://aiautomationvic.github.io','http://localhost:8000','http://127.0.0.1:8000'];
export default{async fetch(req){
 const o=req.headers.get('Origin'),ok=ALLOW.includes(o);
 const cors={'Access-Control-Allow-Origin':ok?o:ALLOW[0],'Access-Control-Allow-Headers':'Authorization,Content-Type,Accept','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Max-Age':'86400',Vary:'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const u=new URL(req.url);
 if(!ok||!u.pathname.startsWith('/api/'))return new Response('Not allowed',{status:403,headers:cors});
 const h=new Headers();for(const k of['authorization','content-type','accept'])if(req.headers.has(k))h.set(k,req.headers.get(k));
 const r=await fetch('https://lichess.org'+u.pathname+u.search,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body});
 const out=new Headers(r.headers);for(const k in cors)out.set(k,cors[k]);out.delete('set-cookie');
 return new Response(r.body,{status:r.status,headers:out});
}};
