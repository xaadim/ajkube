/* Cubix — timer : N1 débutant (sans interruption) et CFOP (cube complet ou une étape seule) */
const PH=['Cross','F2L','OLL','PLL'],PC=['var(--p0)','var(--p1)','var(--p2)','var(--p3)'];
const SCOPES=[['all','Tout le cube'],['cross','Cross'],['f2l','F2L'],['oll','OLL'],['pll','PLL']];
let cfg={mode:'n1',scope:'all',splits:true,start:'tap',sound:true,goals:{}},solves=[];
try{Object.assign(cfg,JSON.parse(localStorage.getItem('cubix.t2')||'{}'));solves=JSON.parse(localStorage.getItem('cubix.s2')||'[]')}catch(e){}
const saveT=()=>{try{localStorage.setItem('cubix.t2',JSON.stringify(cfg));localStorage.setItem('cubix.s2',JSON.stringify(solves.slice(-500)))}catch(e){}};
const tkey=()=>cfg.mode==='n1'?'n1':'cfop.'+cfg.scope;
const useSplits=()=>cfg.mode==='cfop'&&cfg.scope==='all'&&cfg.splits;
const goalOf=k=>+cfg.goals[k]||0;
const T={st:'idle',t0:0,sp:[],raf:0,hold:0,beeped:{},pend:null};
const fmt=ms=>{if(ms==null||isNaN(ms))return '—';const s=ms/1000;return s>=60?Math.floor(s/60)+':'+(s%60).toFixed(2).padStart(5,'0'):s.toFixed(2)};
const fmtBig=ms=>{const s=Math.max(0,ms||0)/1000;return Math.floor(s/60)+':'+(s%60).toFixed(2).padStart(5,'0')};
const gs=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const mine=()=>solves.filter(s=>s.k===tkey());

/* ---- bip (WebAudio) : le contexte audio est débloqué au premier toucher ---- */
let AC=null;
function audio(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}}
function beep(n=3){
  try{navigator.vibrate&&navigator.vibrate([140,60,140])}catch(e){}
  if(!cfg.sound||!AC)return;
  for(let i=0;i<n;i++){const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+i*.22;
    o.type='square';o.frequency.value=880;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.17);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+.2)}}

/* ---- objectifs applicables au chrono courant ---- */
function goalKeys(){
  if(cfg.mode==='n1')return [['n1','Objectif']];
  if(cfg.scope!=='all')return [['cfop.'+cfg.scope,'Objectif '+SCOPES.find(s=>s[0]===cfg.scope)[1]]];
  return [['cfop.all','Total'],...(cfg.splits?PH.map((n,i)=>['cfop.all.'+(i+1),n]):[])]}
function live(){
  const n=performance.now()-T.t0,tot=goalOf(tkey()),ph=useSplits()?T.sp.length:-1;
  const pe=ph>=0&&ph<4?n-(T.sp[ph-1]||0):null,pg=ph>=0&&ph<4?goalOf('cfop.all.'+(ph+1)):0;
  return {n,tot,ph,pe,pg,over:(tot&&n>tot*1000)||(pg&&pe>pg*1000)}}
function mkRec(t,spl,dnf){
  const k=tkey();let p=null;
  if(useSplits()){const c=[...spl,t];p=PH.map((_,i)=>i<c.length?c[i]-(c[i-1]||0):null)}
  return {t,p,dnf:!!dnf,k,g:goalOf(k),d:Date.now()}}

/* ---- machine à états : idle -> (hold -> ready) -> run -> idle | ask -> idle ---- */
function start(){audio();T.st='run';T.t0=performance.now();T.sp=[];T.beeped={};cancelAnimationFrame(T.raf);tick()}
function tick(){
  if(T.st!=='run')return;
  const I=live();
  if(I.tot&&I.n>I.tot*1000&&!T.beeped.t){T.beeped.t=1;beep()}
  if(I.pg&&I.pe>I.pg*1000&&!T.beeped['p'+I.ph]){T.beeped['p'+I.ph]=1;beep()}
  render();T.raf=requestAnimationFrame(tick)}
function press(){
  const now=performance.now();
  if(T.st==='run'){
    if(useSplits()&&T.sp.length<3){T.sp.push(now-T.t0);render();return}
    T.st='idle';cancelAnimationFrame(T.raf);solves.push(mkRec(now-T.t0,T.sp,false));saveT();render();stats();return}
  if(T.st!=='idle')return;
  audio();
  if(cfg.start==='tap'){start();return}
  T.st='hold';render();clearTimeout(T.hold);
  T.hold=setTimeout(()=>{if(T.st==='hold'){T.st='ready';render();try{navigator.vibrate&&navigator.vibrate(25)}catch(e){}}},400)}
function release(){
  if(T.st==='ready')start();
  else if(T.st==='hold'){clearTimeout(T.hold);T.st='idle';render()}}
function stopAsk(){ // arrêt volontaire : on demande si le cube est fini ou abandonné
  if(T.st!=='run')return;
  T.pend={t:performance.now()-T.t0,sp:T.sp.slice()};T.st='ask';cancelAnimationFrame(T.raf);render()}
function answer(done){
  if(T.st!=='ask')return;
  solves.push(mkRec(T.pend.t,T.pend.sp,!done));T.pend=null;T.st='idle';saveT();render();stats()}
function cancelRun(){clearTimeout(T.hold);cancelAnimationFrame(T.raf);T.st='idle';T.pend=null;render()}

/* ---- affichage ---- */
function render(){
  const run=T.st==='run',I=run?live():null,lastRec=mine().slice(-1)[0];
  const shown=run?I.n:T.st==='ask'?T.pend.t:lastRec?lastRec.t:0;
  const c=$('#clock');
  ['run','hold','ready','ask','over'].forEach(k=>c.classList.toggle(k,k==='over'?!!(run&&I.over):T.st===k));
  $('#big').textContent=fmtBig(shown);
  const g=goalOf(tkey());
  $('#tmTag').textContent=(cfg.mode==='n1'?'N1 · Débutant':'CFOP · '+SCOPES.find(s=>s[0]===cfg.scope)[1])+(g?'  ·  objectif '+gs(g):'');
  let sub={idle:cfg.start==='tap'?'Touche pour démarrer':'Maintiens, puis relâche pour démarrer',hold:'Maintiens…',ready:'Relâche !',
    ask:'Chrono arrêté',run:useSplits()&&I&&I.ph<4?`${PH[I.ph]} en cours — touche pour valider l’étape`:'Touche pour arrêter'}[T.st];
  if(T.st==='idle'&&lastRec){
    const d=lastRec.g?lastRec.t-lastRec.g*1000:null;
    sub=lastRec.dnf?'DNF · abandonné':(d==null?'Terminé':d<=0?`Objectif atteint ✓ (${fmt(-d)} s d’avance)`:`Objectif dépassé de ${fmt(d)} s`)}
  $('#sub').textContent=sub;
  $('#tmStop').style.display=run?'':'none';
  $('#tmAsk').hidden=T.st!=='ask';
  // onglets d'étapes (cube complet découpé)
  const tp=$('#tmPhases');tp.style.display=useSplits()?'':'none';
  if(useSplits()){
    const last=T.st==='idle'&&lastRec&&lastRec.p?lastRec.p:null,cur=run?(()=>{const c=[...T.sp,I.n];return PH.map((_,i)=>i<c.length?c[i]-(c[i-1]||0):null)})():T.st==='ask'?(()=>{const c=[...T.pend.sp,T.pend.t];return PH.map((_,i)=>i<c.length?c[i]-(c[i-1]||0):null)})():last||PH.map(()=>null);
    const best=PH.map((_,i)=>Math.min(...mine().filter(s=>!s.dnf&&s.p&&s.p[i]!=null).map(s=>s.p[i])));
    tp.innerHTML=PH.map((n,i)=>{const gl=goalOf('cfop.all.'+(i+1)),v=cur[i],bad=gl&&v!=null&&v>gl*1000,live=run&&I.ph===i;
      return `<div class="tab${live?' cur':''}${bad?' bad':''}${live&&bad?' over':''}" style="--c:${PC[i]}"><small>${n}</small><strong>${v==null?'—':fmt(v)}</strong><em>${gl?'obj. '+gs(gl):(isFinite(best[i])?'meilleur '+fmt(best[i]):'')}</em></div>`}).join('')}
}
function stats(){
  const l=mine(),ok=l.filter(s=>!s.dnf),t=ok.map(s=>s.t),l5=t.slice(-5);
  $('#tmStats').innerHTML=`<div>Meilleur<b>${t.length?fmt(Math.min(...t)):'—'}</b></div><div>Moy. 5<b>${l5.length===5?fmt(avg(l5)):'—'}</b></div><div>Moyenne<b>${t.length?fmt(avg(t)):'—'}</b></div><div>Essais<b>${l.length}</b></div><div>DNF<b>${l.length-ok.length}</b></div>`;
  const h=l.slice().reverse().slice(0,25);
  $('#tmHist').innerHTML=h.length?h.map(s=>`<li><b class="${s.dnf?'dnf':s.g&&s.t>s.g*1000?'late':''}">${s.dnf?'DNF':fmt(s.t)}</b>${s.dnf?`<span class="stat">${fmt(s.t)}</span>`:s.p?`<div class="seg2" title="${s.p.map((v,j)=>v==null?'':PH[j]+' '+fmt(v)).join(' · ')}">${s.p.map((v,j)=>v==null?'':`<i style="width:${v/s.t*100}%;background:${PC[j]}"></i>`).join('')}</div>`:`<span class="stat">${s.g?(s.t<=s.g*1000?'✓ objectif':'✕ objectif'):''}</span>`}<button data-d="${s.d}" aria-label="Supprimer">×</button></li>`).join(''):'<li class="empty">Aucun essai pour ce chrono.</li>'}
function renderSettings(){
  $('#tmMode').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===cfg.mode));
  $('#tmScope').style.display=cfg.mode==='cfop'?'':'none';
  $('#tmScope').innerHTML=SCOPES.map(([k,n])=>`<button data-s="${k}" class="${cfg.scope===k?'on':''}">${n}</button>`).join('');
  const sp=cfg.mode==='cfop'&&cfg.scope==='all';
  $('#tmSet').innerHTML=`<div class="goals">${goalKeys().map(([k,n])=>{const v=goalOf(k);return `<div><small>${n}</small><div class="gi"><input type="number" min="0" max="99" inputmode="numeric" data-gk="${k}" data-u="m" value="${Math.floor(v/60)}" aria-label="${n} minutes">min<input type="number" min="0" max="59" inputmode="numeric" data-gk="${k}" data-u="s" value="${v%60}" aria-label="${n} secondes">s</div></div>`}).join('')}</div>
    <div class="opts"><div class="opt"><span>Départ</span><div class="seg sm" data-opt="start"><button data-v="tap" class="${cfg.start==='tap'?'on':''}">Toucher</button><button data-v="hold" class="${cfg.start==='hold'?'on':''}">Maintenir</button></div></div>
    <div class="opt"><span>Bip objectif</span><div class="seg sm" data-opt="sound"><button data-v="1" class="${cfg.sound?'on':''}">Oui</button><button data-v="0" class="${cfg.sound?'':'on'}">Non</button></div></div>
    ${sp?`<div class="opt"><span>Étapes</span><div class="seg sm" data-opt="splits"><button data-v="1" class="${cfg.splits?'on':''}">Par étape</button><button data-v="0" class="${cfg.splits?'':'on'}">Total seul</button></div></div>`:''}</div>`}
function renderAll(){renderSettings();render();stats()}

/* ---- événements ---- */
const clockEl=$('#clock');
clockEl.addEventListener('pointerdown',e=>{e.preventDefault();try{clockEl.setPointerCapture(e.pointerId)}catch(_){}press()});
['pointerup','pointercancel'].forEach(t=>clockEl.addEventListener(t,release));
clockEl.addEventListener('contextmenu',e=>e.preventDefault());
const timerOn=()=>$('#vTimer').classList.contains('on');
const typing=()=>/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement||{}).tagName||'');
addEventListener('keydown',e=>{
  if(!timerOn()||typing())return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat){const a=document.activeElement;if(a&&a!==document.body&&a.tagName==='BUTTON')a.blur();press()}}
  else if(e.key==='Enter'&&T.st==='run'){e.preventDefault();stopAsk()}
  else if(e.key==='Escape'&&T.st!=='idle')cancelRun()},true);
addEventListener('keyup',e=>{if(timerOn()&&e.code==='Space'&&!typing()){e.preventDefault();release()}},true);
$('#tmStop').onclick=stopAsk;
$('#tmAsk').onclick=e=>{const b=e.target.closest('[data-a]');if(b)answer(b.dataset.a==='yes')};
$('#tmMode').onclick=e=>{const b=e.target.closest('[data-m]');if(b&&T.st==='idle'){cfg.mode=b.dataset.m;saveT();renderAll()}};
$('#tmScope').onclick=e=>{const b=e.target.closest('[data-s]');if(b&&T.st==='idle'){cfg.scope=b.dataset.s;saveT();renderAll()}};
$('#tmSet').onclick=e=>{
  const b=e.target.closest('[data-opt] button');if(!b||T.st!=='idle')return;
  const o=b.parentElement.dataset.opt,v=b.dataset.v;
  if(o==='start')cfg.start=v;
  else if(o==='sound')cfg.sound=v==='1';
  else if(o==='splits')cfg.splits=v==='1';
  saveT();renderAll()};
$('#tmSet').oninput=e=>{
  const i=e.target;if(!i.dataset.gk)return;
  const cell=i.closest('.gi'),[m,s]=[...cell.querySelectorAll('input')].map(x=>Math.max(0,Math.min(+x.max,parseInt(x.value)||0)));
  cfg.goals[i.dataset.gk]=m*60+s;saveT();render()};
$('#tmHist').onclick=e=>{const d=e.target.dataset.d;if(d){solves=solves.filter(s=>String(s.d)!==d);saveT();render();stats()}};
$('#tmClr').onclick=()=>{if(mine().length&&confirm('Effacer l’historique de ce chrono ?')){solves=solves.filter(s=>s.k!==tkey());saveT();render();stats()}};
