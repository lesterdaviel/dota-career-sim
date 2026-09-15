/* 200 carreras completas con cinco políticas; falla ante cualquier descuadre. */
const mem={};global.localStorage={setItem:(k,v)=>mem[k]=v,getItem:k=>mem[k]||null,removeItem:k=>delete mem[k]};global.crypto={getRandomValues:a=>a.fill(123456789)};
/* Se carga dist/index.html, el artefacto que se publica. src/ dejó de
   representar el producto el 31 ago 2026: ver tools/load-dist.js. */
require('./load-dist.js')();
DCS.store.setSilent(true);
const target={cash:null,conservative:'funds',risky:'tech',property:'realEstate',luxury:'lifestyle'};
function offers(s){if(!s.offers.length)return;let best=s.offers.slice().sort((a,b)=>b.salary-a.salary)[0];DCS.engine.market.acceptOffer(s,best);s.offers=[];}
function allocate(s,p){let cat=target[p];if(!cat)return;let w=DCS.engine.finance.pull(s);while(w.cash>=25000){let n=w.cash>=100000?100000:25000;let out=p==='luxury'?DCS.engine.finance.luxury(s,n):DCS.engine.finance.invest(s,cat,n);if(!out.ok)break;}}
function run(seed,policy){let s=DCS.store.newState({seed,name:'Test',nick:'test',nationality:'España',region:'weu',role:'mid',archetype:'mechanical'}),guard=0;DCS.game.state=s;
 while(!s.finished&&guard++<2000){if(s.pending){if(s.pending.type==='event')DCS.engine.season.resolvePendingEvent(s,0);else if(s.pending.type==='wealth')DCS.engine.finance.resolveSpecial(s,false);else if(s.pending.type==='tournament'){DCS.engine.season.playLive(s,true);s.pending=null;if(s.season.liveTour&&s.season.liveTour.done)DCS.engine.season.continueCompetition(s);}else{s.pending=null;s.career.lastRetirementPrompt=s.year;}continue;}
  let ph=s.season.phase;let out=DCS.engine.season.advance(s);
  /* El motor publicado bloquea el avance mientras haya ofertas sin
     responder, y usa un pending de torneo. src/ no hacía ninguna de las
     dos cosas: por eso el bucle antiguo se quedaba girando en vacío. */
  if(out&&out.blocked&&out.reason==='offers'){offers(s);continue;}
  if(ph==='review'||ph==='yearEnd')allocate(s,policy);if(ph==='market')offers(s);}
 if(!s.finished)DCS.engine.retirement.retire(s,'test');let snap=DCS.engine.finance.snapshot(s),sum=snap.cash+snap.buckets.reduce((n,b)=>n+b.value,0);
 if(!isFinite(snap.net)||snap.net<0||sum!==snap.net||s.player.age>38||s.wealth.tickedYear!==s.year-1)throw Error('Integridad '+seed+' '+policy);
 return{worth:snap.net,earn:snap.earnings};}
let result={};Object.keys(target).forEach(p=>{let rows=[];for(let i=0;i<10;i++)rows.push(run('FIN-COMMON-'+i,p));result[p]={avg:Math.round(rows.reduce((n,x)=>n+x.worth,0)/rows.length),min:Math.min(...rows.map(x=>x.worth)),max:Math.max(...rows.map(x=>x.worth)),millionaires:rows.filter(x=>x.worth>=1000000).length};});
run('PERSIST-CHECK','property');let snap=JSON.stringify(DCS.game.state.wealth);DCS.store.setSilent(false);DCS.store.save(DCS.game.state);let loaded=DCS.store.load();if(JSON.stringify(loaded.wealth)!==snap)throw Error('Persistencia no conserva patrimonio');
let old=JSON.parse(JSON.stringify(loaded));delete old.wealth;delete old.finances;old.version=3;localStorage.setItem(DCS.store.KEY,JSON.stringify(old));let migrated=DCS.store.load();if(!migrated.wealth||!isFinite(migrated.wealth.cash))throw Error('Migración v3 no crea patrimonio seguro');
console.log(JSON.stringify(result,null,2));console.log('OK: 50 carreras 16→retiro, cinco políticas, contabilidad y persistencia.');
