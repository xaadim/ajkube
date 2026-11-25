/* Cubix — résolveur : un mélange saisi ou un état dessiné -> solution (min2phase, ≤ 21 mouvements) animée sur le cube 3D */
const C3=makeCube($('#stage3'),()=>{});
const FLS=Object.keys(FOFF);                       // ordre U R F D L B
const SV={spd:300,fl:FLS.map(L=>L.repeat(9)).join('').split(''),moves:[],idx:0,playing:false,brush:'U',tok:0};
const FACEPOS={U:[0,3],L:[3,0],F:[3,3],R:[3,6],B:[3,9],D:[6,3]};
const SVERR={1:'Il faut exactement 9 cases de chaque couleur.',2:'Une arête est manquante ou en double : vérifie les couleurs des bords.',3:'Une arête est retournée : cet état est impossible sur un vrai cube.',4:'Un coin est manquant ou en double : vérifie les couleurs des coins.',5:'Un coin est tourné sur lui-même : cet état est impossible sur un vrai cube.',6:'Deux pièces sont échangées : cet état est impossible sur un vrai cube.',7:'Aucune solution trouvée : vérifie l’état saisi.',8:'Aucune solution trouvée : vérifie l’état saisi.'};
SVERR.bad='Cet état est impossible sur un vrai cube : vérifie les couleurs des coins et des arêtes.';
const invAlg=a=>a.slice().reverse().map(m=>m.endsWith('2')?m:m.endsWith("'")?m[0]:m+"'");
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function buildNet(){
  $('#svNet').innerHTML=FLS.map(L=>{let h='';for(let r=0;r<3;r++)for(let c=0;c<3;c++){const [br,bc]=FACEPOS[L];
    h+=`<button class="nc${r===1&&c===1?' ctr':''}" data-i="${FOFF[L]+r*3+c}" style="grid-row:${br+r+1};grid-column:${bc+c+1}" aria-label="Face ${L}, ligne ${r+1}, colonne ${c+1}"></button>`}return h}).join('');
  $('#svPal').innerHTML=FLS.map(L=>`<button class="pc" data-b="${L}" style="--pc:${LETCOL[L]}" aria-label="Couleur ${L}"><span></span><em></em></button>`).join('')}
function paintUI(){
  $('#svNet').querySelectorAll('.nc').forEach(b=>b.style.background=LETCOL[SV.fl[+b.dataset.i]]||'#8c95a8');
  const n={};SV.fl.forEach(l=>n[l]=(n[l]||0)+1);
  $('#svPal').querySelectorAll('.pc').forEach(b=>{const L=b.dataset.b;b.classList.toggle('on',SV.brush===L);b.querySelector('em').textContent=(n[L]||0)+'/9';b.classList.toggle('bad',(n[L]||0)!==9)})}
function sync3D(){SV.tok++;SV.playing=false;C3.setColors(SV.fl.join(''))}
function clearOut(){SV.moves=[];SV.idx=0;SV.playing=false;$('#svOut').innerHTML=''}
function svErr(m){SV.tok++;SV.playing=false;SV.moves=[];$('#svOut').innerHTML=`<div class="sv-err" role="alert">${m}</div>`}
function setState(fl){SV.fl=fl.split('');clearOut();sync3D();paintUI()}

$('#svApply').onclick=()=>{
  const raw=$('#svScr').value.replace(/[’‘`]/g,"'").trim();
  if(!raw)return svErr('Entre un mélange, par exemple : R U R\' U\' F2 D L\'');
  const bad=raw.split(/\s+/).find(t=>!/^[RLUDFBMrlx](2|')?$/.test(t));
  if(bad)return svErr(`Mouvement non reconnu : « ${bad} ». Utilise R, L, U, D, F, B (avec ' ou 2).`);
  setState(faceletsOf(stateOf(expandSeq(raw))))};
$('#svRand').onclick=()=>{$('#svScr').value=scrambleSeq(20).join(' ');$('#svApply').onclick()};
$('#svReset').onclick=()=>{$('#svScr').value='';setState(FLS.map(L=>L.repeat(9)).join(''))};
$('#svPal').onclick=e=>{const b=e.target.closest('[data-b]');if(b){SV.brush=b.dataset.b;paintUI()}};
$('#svNet').onclick=e=>{
  const b=e.target.closest('.nc');if(!b||b.classList.contains('ctr'))return;
  SV.fl[+b.dataset.i]=SV.brush;clearOut();C3.setColors(SV.fl.join(''));SV.tok++;paintUI()};

function showSol(){
  const m=SV.moves,done=SV.idx>=m.length;
  $('#svOut').innerHTML=m.length?`<div class="sv-head"><b>${m.length} mouvements</b><span class="stat">solution Kociemba</span></div>
    <div class="sv-moves">${m.map((x,i)=>`<span class="${i<SV.idx?'done':i===SV.idx&&SV.playing?'act':''}">${x}</span>`).join('')}</div>
    <div class="dc"><button id="svBack">↺ Départ</button><button id="svStep">Pas +1</button><button id="svPlay" class="pri">${SV.playing?'⏸ Pause':done?'↻ Rejouer':'▶ Animer'}</button></div>
    <div class="dspd">Vitesse <select id="svSpd">${[[520,'Lent'],[300,'Normal'],[140,'Rapide']].map(([v,n])=>`<option value="${v}"${SV.spd===v?' selected':''}>${n}</option>`).join('')}</select></div>`
    :`<div class="sv-ok">Le cube est déjà résolu ✓</div>`}
const svSpd=()=>SV.spd;
$('#svOut').addEventListener('change',e=>{if(e.target.id==='svSpd')SV.spd=+e.target.value||300});
function rewind(){SV.tok++;SV.playing=false;SV.idx=0;C3.setColors(SV.fl.join(''))}
async function svPlay(){
  if(SV.playing){SV.playing=false;showSol();return}
  if(SV.idx>=SV.moves.length)rewind();
  const tok=++SV.tok;SV.playing=true;showSol();
  while(SV.playing&&tok===SV.tok&&SV.idx<SV.moves.length){
    await C3.turn(SV.moves[SV.idx],svSpd(),false);
    if(tok!==SV.tok)return;SV.idx++;showSol();await wait(90)}
  if(tok===SV.tok){SV.playing=false;showSol()}}
async function svStep(){
  SV.playing=false;const tok=++SV.tok;
  if(SV.idx>=SV.moves.length)return;
  await C3.turn(SV.moves[SV.idx],svSpd(),false);
  if(tok===SV.tok){SV.idx++;showSol()}}
$('#svOut').onclick=e=>{
  const id=(e.target.closest('button')||{}).id;
  if(id==='svPlay')svPlay();else if(id==='svStep')svStep();else if(id==='svBack'){rewind();showSol()}};

$('#svSolve').onclick=()=>{
  const n={};SV.fl.forEach(l=>n[l]=(n[l]||0)+1);
  if(FLS.some(l=>n[l]!==9))return svErr(SVERR[1]);
  $('#svOut').innerHTML='<div class="sv-ok">Calcul en cours…</div>';
  setTimeout(()=>{
    let r;try{r=min2phase.solve(SV.fl.join(''))}catch(e){r='Error 7'}
    if(/^Error/.test(r))return svErr(SVERR[+r.slice(6)]||SVERR[7]);
    const mv=r.trim()?r.trim().split(/\s+/):[];
    if(min2phase.fromScramble(invAlg(mv).join(' '))!==SV.fl.join(''))return svErr(SVERR.bad);
    SV.moves=mv;SV.idx=0;SV.playing=false;SV.tok++;showSol()},40)};
buildNet();paintUI();sync3D();
