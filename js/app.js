/* Cubix — navigation (routes par #hash) et démarrage */
$('#lg').innerHTML=['#f4f4f0','#2f6bff','#e8433f','#ffd23a','#1fb26b','#ff8a2a','#2f6bff','#f4f4f0','#ffd23a'].map(c=>`<b style="background:${c}"></b>`).join('');
const TAB={vTimer:'timer',vLearn:'cours',vLesson:'cours',vFavs:'cours',vSolver:'solveur'};
function show(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id===id));
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB[id]));
  if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur()}
// #timer · #cours · #cours/<leçon> · #cours/favoris · #solveur
function route(){
  const p=location.hash.replace(/^#/,'').split('/');let v='vTimer';
  if(p[0]==='cours'){
    if(p[1]==='favoris'){v='vFavs';renderFav()}
    else if(LESSONS.some(l=>l.id===p[1])){curLesson=p[1];renderLesson();v='vLesson'}
    else{v='vLearn';renderMap()}}
  else if(p[0]==='solveur')v='vSolver';
  show(v);try{window.scrollTo(0,0)}catch(e){}}
addEventListener('hashchange',route);
document.querySelector('nav').onclick=e=>{
  const b=e.target.closest('button');if(!b||!b.dataset.t)return;
  if(location.hash==='#'+b.dataset.t)route();else location.hash=b.dataset.t};
renderAll();renderMap();renderFav();route();
