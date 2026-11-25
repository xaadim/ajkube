/* Cubix — cours : suivi, favoris, parcours (carte), leçons, mini cubes et feuille d'animation */
let demo={algo:null,idx:0,playing:false};
/* ---------- suivi (J'apprends / C'est bon), favoris, mini cubes ---------- */
let prog={},favs=new Set();
try{prog=JSON.parse(localStorage.getItem('cubix.prog')||'{}');Object.keys(prog).forEach(k=>{if(prog[k]==='no')prog[k]='learn'});favs=new Set(JSON.parse(localStorage.getItem('cubix.fav')||'[]'))}catch(e){}
const aid=a=>a.cat+'|'+a.title+'|'+a.seq;
const ALL=Object.entries(COURSES).flatMap(([lv,c])=>c.algos.map(a=>(a.lv=lv,a.id=aid(a),a)));
ALL.forEach((a,i)=>a.k=i);
const LVN={n1:'N1',cfop:'CFOP',adv:'Avancé'};
const stOf=a=>prog[a.id]||'none';
const cnt=l=>l.filter(a=>stOf(a)==='ok').length,cntL=l=>l.filter(a=>stOf(a)==='learn').length;
const store=()=>{try{localStorage.setItem('cubix.prog',JSON.stringify(prog));localStorage.setItem('cubix.fav',JSON.stringify([...favs]))}catch(e){}};
function refresh(){renderMap();renderLesson();renderFav();syncSheet()}
function setProg(a,v){if(prog[a.id]===v)delete prog[a.id];else prog[a.id]=v;store();refresh()}
function toggleFav(a){if(favs.has(a.id))favs.delete(a.id);else favs.add(a.id);store();refresh()}

function miniSVG(a){
  if(a._svg)return a._svg;
  const f2l=a.cat.startsWith('f2l_');
  // F2L : les pièces du dernier étage (hors paire) sont grisées pour ne montrer que le cas
  const {U,F,R}=grids(stateOf(expandSeq(a.seq).reverse().map(inv)),f2l?(col,i)=>Math.floor((i%9)/3)===0?'#8c95a8':col:null);
  const X=[.866,.5],Y=[0,1],Z=[-.866,.5],P=(x,y,z)=>[x*X[0]+y*Y[0]+z*Z[0],x*X[1]+y*Y[1]+z*Z[1]];
  const pt=p=>p[0].toFixed(2)+','+p[1].toFixed(2);
  let o='';
  const base=(...q)=>{o+=`<polygon points="${q.map(pt).join(' ')}" fill="#0c0f16" stroke="#0c0f16" stroke-width=".12" stroke-linejoin="round"/>`};
  base(P(-1.5,-1.5,-1.5),P(1.5,-1.5,-1.5),P(1.5,-1.5,1.5),P(-1.5,-1.5,1.5));
  base(P(-1.5,-1.5,1.5),P(1.5,-1.5,1.5),P(1.5,1.5,1.5),P(-1.5,1.5,1.5));
  base(P(1.5,-1.5,1.5),P(1.5,-1.5,-1.5),P(1.5,1.5,-1.5),P(1.5,1.5,1.5));
  const cell=(q,col)=>{const m=[0,1].map(i=>q.reduce((s,p)=>s+p[i],0)/4);
    o+=`<polygon points="${q.map(p=>pt([m[0]+(p[0]-m[0])*.84,m[1]+(p[1]-m[1])*.84])).join(' ')}" fill="${col}" stroke="${col}" stroke-width=".1" stroke-linejoin="round"/>`};
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){
    const x=c-1,z=r-1,y=r-1,zr=1-c;
    cell([P(x-.5,-1.5,z-.5),P(x+.5,-1.5,z-.5),P(x+.5,-1.5,z+.5),P(x-.5,-1.5,z+.5)],U[r][c]);
    cell([P(x-.5,y-.5,1.5),P(x+.5,y-.5,1.5),P(x+.5,y+.5,1.5),P(x-.5,y+.5,1.5)],F[r][c]);
    cell([P(1.5,y-.5,zr-.5),P(1.5,y-.5,zr+.5),P(1.5,y+.5,zr+.5),P(1.5,y+.5,zr-.5)],R[r][c])}
  return a._svg=`<svg viewBox="-2.75 -3.1 5.5 6.2" aria-hidden="true">${o}</svg>`}
const LVMETA={
 n1:{n:'1',name:'N1 · Débutant',sub:'Les bases : mouvements, croix, couronne et face jaune'},
 cfop:{n:'2',name:'CFOP · 2-Look',sub:'Cross, les 41 cas F2L, puis OLL et PLL en deux temps'},
 adv:{n:'3',name:'Avancé · Pro',sub:'X-Cross, F2L avancés, PLL et OLL complets'}};
const LABEL={ok:'C’est bon',learn:'J’apprends',none:'À découvrir'};
// une leçon = une catégorie ; le parcours les enchaîne dans l'ordre N1 -> CFOP -> Avancé
const LESSONS=[];
Object.keys(LVMETA).forEach(lv=>COURSES[lv].cats.forEach(c=>LESSONS.push({id:c.id,lv,name:c.name,tip:c.tip,algos:COURSES[lv].algos.filter(a=>a.cat===c.id)})));
LESSONS.forEach((l,i)=>l.i=i);
const lessonState=l=>{const o=cnt(l.algos);return o===l.algos.length?'ok':(o||cntL(l.algos))?'learn':'none'};
let curLesson=null;

function tileHTML(a){
  const v=stOf(a),f=favs.has(a.id);
  return `<div class="tile st-${v}" data-k="${a.k}">${f?'<span class="tile-star">★</span>':''}
    <button class="tile-open" data-act="open" aria-label="Voir l’aperçu : ${a.title}"><span class="tile-cube">${miniSVG(a)}</span><span class="tile-t">${a.title}</span><span class="tile-s">${a.tag}</span></button>
    <div class="tile-b"><button class="s-learn${v==='learn'?' on':''}" data-act="learn" aria-pressed="${v==='learn'}" aria-label="J’apprends : ${a.title}">✎</button><button class="s-ok${v==='ok'?' on':''}" data-act="ok" aria-pressed="${v==='ok'}" aria-label="C’est bon : ${a.title}">✓</button></div></div>`}

// ----- parcours : une carte linéaire, on avance leçon après leçon -----
const WAVE=[50,70,76,70,50,30,24,30],SP=126;
function renderMap(){
  const T=ALL.length,ok=cnt(ALL),le=cntL(ALL),cur=LESSONS.find(l=>lessonState(l)!=='ok');
  $('#mapSum').innerHTML=`<div class="pline" style="margin-bottom:10px"><div class="pbar"><i style="width:${ok/T*100}%;background:var(--tob)"></i><i style="width:${le/T*100}%;background:var(--tlb)"></i></div><span><b>${ok}/${T}</b> maîtrisés</span></div>
    <div class="legend"><span><i class="lg-n"></i>À faire</span><span><i class="lg-l"></i>En cours</span><span><i class="lg-o"></i>Terminé</span></div>
    <div class="btns" style="margin-top:12px"><button class="btn" id="bFavs">⭐ Mes favoris${favs.size?' ('+favs.size+')':''}</button>${cur?`<button class="btn alt" data-l="${cur.id}">▶ Continuer</button>`:''}<button class="btn alt" id="bProgRst" style="margin-left:auto">Réinitialiser</button></div>`;
  $('#map').innerHTML=Object.keys(LVMETA).map(lv=>{
    const ls=LESSONS.filter(l=>l.lv===lv),m=LVMETA[lv],H=ls.length*SP+8;
    const pts=ls.map((l,i)=>[WAVE[i%8],i*SP+40]);
    const segs=pts.slice(1).map((p,i)=>{const a=pts[i],my=(a[1]+p[1])/2;return `<path d="M${a[0]} ${a[1]} C${a[0]} ${my},${p[0]} ${my},${p[0]} ${p[1]}" class="${lessonState(ls[i])==='ok'?'done':''}"/>`}).join('');
    const nodes=ls.map((l,i)=>{
      const s=lessonState(l),n=l.algos.length||1,o=cnt(l.algos),e=cntL(l.algos),A=o/n*100,B=A+e/n*100;
      return `<button class="pnode st-${s}${cur===l?' cur':''}" style="left:${pts[i][0]}%;top:${pts[i][1]-38}px" data-l="${l.id}" aria-label="${l.name} : ${o} sur ${n} validés">
        <span class="ring" style="background:conic-gradient(var(--tob) 0 ${A}%,var(--tlb) ${A}% ${B}%,var(--tnb) ${B}% 100%)"><span class="core">${s==='ok'?'✓':i+1}</span></span>
        <span class="plabel">${l.name}</span><span class="pcount">${o}/${l.algos.length}</span></button>`}).join('');
    return `<div class="lv-banner"><span class="hub-n">${m.n}</span><div><b>${m.name}</b><small>${m.sub}</small></div></div>
      <div class="pmap" style="height:${H}px"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${segs}</svg>${nodes}</div>`}).join('');
}
// ----- page d'une leçon -----
function renderLesson(){
  const l=LESSONS.find(x=>x.id===curLesson);if(!l)return;
  const o=cnt(l.algos),all=o===l.algos.length,prev=LESSONS[l.i-1],next=LESSONS[l.i+1];
  $('#lsTitle').textContent=l.name;
  $('#lsSub').textContent=LVMETA[l.lv].name+' · leçon '+(l.i+1)+' sur '+LESSONS.length+' · '+o+'/'+l.algos.length+' validés';
  $('#lsTip').innerHTML=l.tip;
  $('#lsTiles').innerHTML=l.algos.map(tileHTML).join('');
  $('#lsNav').innerHTML=`<button class="btn ${all?'alt':''}" data-all="1">${all?'↺ Tout décocher':'✓ Tout marquer « C’est bon »'}</button>
    <div class="ls-pn">${prev?`<button class="btn alt" data-go="${prev.id}">‹ Précédente</button>`:'<span></span>'}${next?`<button class="btn" data-go="${next.id}">Suivante ›</button>`:'<span></span>'}</div>`;
}
function renderFav(){
  const l=ALL.filter(a=>favs.has(a.id));
  $('#favCount').textContent=l.length?l.length+' cas':'';
  $('#favGrid').innerHTML=l.length?l.map(tileHTML).join(''):`<div class="none-msg">Aucun favori pour l’instant.<br>Ouvre un cas dans une leçon et appuie sur ☆ pour le retrouver ici.</div>`}
function tileClick(e){
  const b=e.target.closest('button[data-act]');if(!b)return;
  const t=b.closest('.tile'),a=ALL[+t.dataset.k];if(!a)return;
  if(b.dataset.act==='open'){openDemo(a,true,[...t.closest('#lsTiles,#favGrid').querySelectorAll('.tile')].map(x=>ALL[+x.dataset.k]))}
  else setProg(a,b.dataset.act)} // ✎ = J'apprends, ✓ = C'est bon, sans ouvrir l'aperçu
$('#map').onclick=e=>{const b=e.target.closest('[data-l]');if(b)location.hash='cours/'+b.dataset.l};
$('#mapSum').onclick=e=>{
  const b=e.target.closest('[data-l]');if(b){location.hash='cours/'+b.dataset.l;return}
  if(e.target.closest('#bFavs'))location.hash='cours/favoris';
  if(e.target.id==='bProgRst'&&confirm('Effacer toute ta progression (les favoris sont conservés) ?')){prog={};store();refresh()}};
$('#lsTiles').onclick=tileClick;$('#favGrid').onclick=tileClick;
$('#lsBack').onclick=()=>{location.hash='cours'};$('#favBack').onclick=()=>{location.hash='cours'};
$('#lsNav').onclick=e=>{
  const g=e.target.closest('[data-go]');if(g){location.hash='cours/'+g.dataset.go;return}
  if(e.target.closest('[data-all]')){const l=LESSONS.find(x=>x.id===curLesson),all=cnt(l.algos)===l.algos.length;l.algos.forEach(a=>{if(all)delete prog[a.id];else prog[a.id]='ok'});store();refresh()}};

const C2=makeCube($('#stage2'),o=>$('#dOk').classList.toggle('on',o.hist.length>0&&o.solved()));
let demoCtx=[];
function openDemo(algo,autoPlay,ctx){
  const first=!$('#demoCard').classList.contains('on');
  const d=demo={algo,idx:0,playing:false,tokens:algo.seq.trim().split(/\s+/)};
  if(ctx)demoCtx=ctx;
  const cat=COURSES[algo.lv].cats.find(c=>c.id===algo.cat);
  $('#demoName').textContent=algo.title;
  $('#demoSub').textContent='('+algo.tag+')';
  $('#dDesc').innerHTML='<small style="color:var(--mu)">'+LVN[algo.lv]+' · '+(cat?cat.name:'')+'</small><br>'+algo.desc;
  $('#dSeq').textContent=algo.seq;
  setSheet(true);
  syncSheet();
  if(first)C2.resetView();
  C2.build();
  C2.instant(expandSeq(algo.seq).reverse().map(inv)); // le cas de départ apparaît d'un coup, sans animation
  C2.hist=[];C2.changed();
  updateDemoMoves();
  if(autoPlay)setTimeout(()=>{if(demo===d)playDemo()},650);
}

function updateDemoMoves(){
  if(!demo.algo)return;
  $('#demoMoves').innerHTML=demo.tokens.map((t,i)=>`<span class="${i===demo.idx&&demo.playing?'act':i<demo.idx?'done':''}">${t}</span>`).join('');
  $('#dPlay').textContent=demo.playing?'⏸ Pause':'▶ Animer';
  syncSheet();
}

async function stepDemo(){
  if(!demo.algo)return;
  if(demo.idx>=demo.tokens.length){openDemo(demo.algo,false);return}
  const d=demo,spd=+$('#demoSpd').value||320,moves=expandSeq(d.tokens[d.idx]);
  updateDemoMoves();
  for(const m of moves){await C2.turn(m,spd,true)}
  if(d!==demo)return;
  demo.idx++;
  updateDemoMoves();
}

async function playDemo(){
  if(!demo.algo||demo.playing)return;
  if(demo.idx>=demo.tokens.length){openDemo(demo.algo,true);return}
  const d=demo;d.playing=true;
  updateDemoMoves();
  while(demo===d&&d.playing&&d.idx<d.tokens.length){
    await stepDemo();
    if(demo===d&&d.playing)await new Promise(r=>setTimeout(r,110));
  }
  if(demo===d){d.playing=false;updateDemoMoves()}
}

$('#dSetup').onclick=()=>{if(demo.algo)openDemo(demo.algo,false)};
$('#dStep').onclick=()=>{demo.playing=false;stepDemo()};
$('#dPlay').onclick=()=>{if(demo.playing){demo.playing=false;updateDemoMoves()}else playDemo()};
function syncSheet(){
  if(!demo.algo)return;
  const a=demo.algo,v=stOf(a),f=favs.has(a.id);
  $('#dLearn').classList.toggle('on',v==='learn');$('#dOkB').classList.toggle('on',v==='ok');
  $('#dFavB').classList.toggle('on',f);$('#dFavB').textContent=f?'★':'☆';
  const i=demoCtx.indexOf(a);$('#dPrev').disabled=i<1;$('#dNext').disabled=i<0||i>=demoCtx.length-1}
function stepCase(d){const n=demoCtx[demoCtx.indexOf(demo.algo)+d];if(n){demo.playing=false;openDemo(n,true)}}
$('#dPrev').onclick=()=>stepCase(-1);$('#dNext').onclick=()=>stepCase(1);
function setSheet(on){
  const c=$('#demoCard'),was=c.classList.contains('on');
  c.classList.toggle('on',on);document.body.classList.toggle('so',on);c.style.transform='';
  if(on&&!was){try{history.pushState({sheet:1},'')}catch(e){}} // le bouton Retour du téléphone ferme l'aperçu
}
$('#dLearn').onclick=()=>{if(demo.algo)setProg(demo.algo,'learn')};
$('#dOkB').onclick=()=>{if(demo.algo)setProg(demo.algo,'ok')};
$('#dFavB').onclick=()=>{if(demo.algo)toggleFav(demo.algo)};

function closeDemo(){
  const was=$('#demoCard').classList.contains('on');
  demo.playing=false;demo.algo=null;setSheet(false);
  if(was&&history.state&&history.state.sheet){try{history.back()}catch(e){}}
}
addEventListener('popstate',()=>{if($('#demoCard').classList.contains('on')){demo.playing=false;demo.algo=null;setSheet(false)}});
$('#sheetX').onclick=closeDemo;$('#dClose2').onclick=closeDemo;
(()=>{ // glisser la poignée vers le bas pour fermer
  const g=document.querySelector('.grip'),c=$('#demoCard');let y0=null;
  g.addEventListener('pointerdown',e=>{y0=e.clientY;try{g.setPointerCapture(e.pointerId)}catch(_){}c.style.transition='none'});
  g.addEventListener('pointermove',e=>{if(y0!==null)c.style.transform=`translateY(${Math.max(0,e.clientY-y0)}px)`});
  const end=e=>{if(y0===null)return;const d=e.clientY-y0;y0=null;c.style.transition='';if(d>80)closeDemo();else c.style.transform=''};
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end)})();
$('#dClose').onclick=closeDemo;
$('#sheetBg').onclick=closeDemo; // toucher en dehors de la feuille ferme l'animation
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#demoCard').classList.contains('on'))closeDemo()});

