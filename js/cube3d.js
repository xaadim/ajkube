/* Cubix — moteur du cube 3D (CSS 3D), mouvements et utilitaires */
const $=s=>document.querySelector(s);
const COL={'0,-1,0':'#ffd23a','0,1,0':'#f4f4f0','0,0,1':'#1fb26b','0,0,-1':'#2f6bff','1,0,0':'#ff8a2a','-1,0,0':'#e8433f'};
const FACES=[[[0,-1,0],'rotateX(90deg)'],[[0,1,0],'rotateX(-90deg)'],[[0,0,1],''],[[0,0,-1],'rotateY(180deg)'],[[1,0,0],'rotateY(90deg)'],[[-1,0,0],'rotateY(-90deg)']];
const MV={M:[0,0,-1],R:[0,1,1],L:[0,-1,-1],U:[1,-1,-1],D:[1,1,1],F:[2,1,1],B:[2,-1,-1]};
const S=70, I3=[[1,0,0],[0,1,0],[0,0,1]];
const mul=(A,B)=>A.map((_,i)=>[0,1,2].map(j=>A[i][0]*B[0][j]+A[i][1]*B[1][j]+A[i][2]*B[2][j]));
const app=(M,v)=>M.map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]);
const rnd=M=>M.map(r=>r.map(Math.round));
function rot(ax,a){const c=Math.cos(a),s=Math.sin(a);
  return ax==0?[[1,0,0],[0,c,-s],[0,s,c]]:ax==1?[[c,0,s],[0,1,0],[-s,0,c]]:[[c,-s,0],[s,c,0],[0,0,1]]}
const mk=n=>n.endsWith("'")?n.slice(0,-1):n+"'";
const inv=n=>n.endsWith('2')?n:mk(n);
// logo
/* ---------- cube 3D (fabrique : chaque cube est indépendant) ---------- */
function makeCube(host,onChange){
  const el=document.createElement('div');el.className='cube';host.appendChild(el);
  const o={cubies:[],hist:[],queue:Promise.resolve(),gen:0,view:{x:-25,y:-35}};
  const setView=()=>{el.style.transform=`rotateX(${o.view.x}deg) rotateY(${o.view.y}deg)`};
  const draw=(c,Q)=>{const M=mul(Q,c.R),p=app(Q,c.p);
    c.el.style.transform=`matrix3d(${M[0][0]},${M[1][0]},${M[2][0]},0,${M[0][1]},${M[1][1]},${M[2][1]},0,${M[0][2]},${M[1][2]},${M[2][2]},0,${p[0]*S},${p[1]*S},${p[2]*S},1)`};
  const parse=name=>{const [ax,ly,dir]=MV[name[0]],k=name.endsWith('2')?2:1,sg=name.endsWith("'")?-1:1;return {ax,ly,k,tot:dir*sg*k*Math.PI/2}};
  o.changed=()=>onChange&&onChange(o);
  o.solved=()=>o.cubies.every(c=>c.st.every(([n,col])=>COL[app(c.R,n).map(Math.round).join()]===col));
  o.resetView=()=>{o.view={x:-25,y:-35};setView()};
  o.build=()=>{
    o.gen++;o.queue=Promise.resolve();el.innerHTML='';o.cubies=[];o.hist=[];
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      const ce=document.createElement('div');ce.className='cubie';const st=[],p=[x,y,z];
      FACES.forEach(([n,t])=>{
        const f=document.createElement('div');f.className='face';f.style.transform=t+' translateZ('+S/2+'px)';
        if(p[0]*n[0]+p[1]*n[1]+p[2]*n[2]===1){const c=COL[n.join()];f.innerHTML=`<span style="background:${c}"></span>`;st.push([n,c,f.firstChild])}
        ce.appendChild(f)});
      const cb={el:ce,p,R:I3,st};o.cubies.push(cb);el.appendChild(ce);draw(cb,I3)}
    o.changed()};
  // mouvement animé (file d'attente) ; une reconstruction annule les mouvements en attente
  o.turn=(name,dur=230,log=true)=>{const g=o.gen;
    return o.queue=o.queue.then(()=>new Promise(res=>{
      if(g!==o.gen)return res();
      const {ax,ly,k,tot}=parse(name),grp=o.cubies.filter(c=>Math.round(c.p[ax])===ly),t0=performance.now(),D=dur*(k==2?1.4:1);
      if(log)o.hist.push(name);
      (function f(t){
        if(g!==o.gen)return res();
        const u=Math.min(1,(t-t0)/D),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,Q=rot(ax,tot*e);
        grp.forEach(c=>draw(c,Q));
        if(u<1)return requestAnimationFrame(f);
        const F=rot(ax,tot);grp.forEach(c=>{c.R=rnd(mul(F,c.R));c.p=app(F,c.p).map(Math.round);draw(c,I3)});
        o.changed();res()})(t0)}))};
  // mouvements posés d'un coup, sans animation (pour afficher un cas de départ)
  o.instant=moves=>{
    moves.forEach(n=>{const {ax,ly,tot}=parse(n),Q=rot(ax,tot);
      o.cubies.filter(c=>Math.round(c.p[ax])===ly).forEach(c=>{c.R=rnd(mul(Q,c.R));c.p=app(Q,c.p).map(Math.round)})});
    o.cubies.forEach(c=>draw(c,I3));o.changed()};
  // colorie directement les autocollants depuis une chaîne de 54 lettres (ordre U R F D L B, convention Kociemba)
  o.setColors=fl=>{o.build();o.fmap=[];
    o.cubies.forEach(cb=>cb.st.forEach(s=>{const L=FLET[s[0].join()],[r,q]=FPOS[L](...cb.p),i=FOFF[L]+r*3+q,col=LETCOL[fl[i]]||'#8c95a8';s[1]=col;s[2].style.background=col;o.fmap[i]=s}))};
  o.paintOne=(i,letter)=>{const s=o.fmap&&o.fmap[i];if(s){s[1]=LETCOL[letter];s[2].style.background=s[1]}};
  o.applyAlg=(a,d=70)=>{a.forEach(m=>o.turn(m,d));return o.queue};
  let drag=null;
  host.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];host.setPointerCapture(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!drag)return;o.view.y+=(e.clientX-drag[0])*.5;o.view.x=Math.max(-80,Math.min(80,o.view.x-(e.clientY-drag[1])*.5));drag=[e.clientX,e.clientY];setView()});
  ['pointerup','pointercancel'].forEach(t=>host.addEventListener(t,()=>{drag=null}));
  setView();o.build();return o}
function scrambleSeq(n=20){const a=[];let last='';for(let i=0;i<n;i++){let f;do f='RLUDFB'[Math.random()*6|0];while(f===last);last=f;a.push(f+['',"'",'2'][Math.random()*3|0])}return a}
// Expansion des mouvements avancés (r, l, M, x) pour l'animation 3D
function expandSeq(seqStr){
  const out=[],iv=m=>m==="'"?'':m==='2'?'2':"'";
  seqStr.trim().split(/\s+/).forEach(tok=>{
    if(!tok)return;
    const m=tok.endsWith("'")?"'":tok.endsWith('2')?'2':'',b=tok[0];
    if('RLUDFBM'.includes(b))out.push(tok);
    else if(b==='r')out.push('R'+m,'M'+iv(m));
    else if(b==='l')out.push('L'+m,'M'+m);
    else if(b==='x')out.push('R'+m,'M'+iv(m),'L'+iv(m));
  });
  return out;
}

/* ---- conversion état du cube <-> chaîne de 54 facelets (U R F D L B) ---- */
const FLET={'0,-1,0':'U','1,0,0':'R','0,0,1':'F','0,1,0':'D','-1,0,0':'L','0,0,-1':'B'};
const FPOS={U:(x,y,z)=>[z+1,x+1],R:(x,y,z)=>[y+1,1-z],F:(x,y,z)=>[y+1,x+1],D:(x,y,z)=>[1-z,x+1],L:(x,y,z)=>[y+1,z+1],B:(x,y,z)=>[y+1,1-x]};
const FOFF={U:0,R:9,F:18,D:27,L:36,B:45};
const LETCOL={},COLLET={};Object.keys(COL).forEach(k=>{LETCOL[FLET[k]]=COL[k];COLLET[COL[k]]=FLET[k]});
function faceletsOf(cs){const a=Array(54).fill('?');
  cs.forEach(cb=>cb.st.forEach(([n,col])=>{const L=FLET[app(cb.R,n).map(Math.round).join()],[r,q]=FPOS[L](...cb.p);a[FOFF[L]+r*3+q]=COLLET[col]}));
  return a.join('')}
// état du cube pour un cas (calcul pur, sans DOM) -> mini visuel en SVG isométrique
function stateOf(moves){
  const cs=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const p=[x,y,z],st=[];FACES.forEach(([n])=>{if(p[0]*n[0]+p[1]*n[1]+p[2]*n[2]===1)st.push([n,COL[n.join()]])});cs.push({p,R:I3,st})}
  moves.forEach(name=>{const [ax,ly,dir]=MV[name[0]],k=name.endsWith('2')?2:1,sg=name.endsWith("'")?-1:1,Q=rot(ax,dir*sg*k*Math.PI/2);
    cs.forEach(c=>{if(Math.round(c.p[ax])===ly){c.R=rnd(mul(Q,c.R));c.p=app(Q,c.p).map(Math.round)}})});
  return cs}
function grids(cs,tint){
  const U=[[],[],[]],F=[[],[],[]],R=[[],[],[]];
  cs.forEach((c,i)=>c.st.forEach(([n,col])=>{const w=app(c.R,n).map(Math.round).join(),[x,y,z]=c.p,cc=tint?tint(col,i):col;
    if(w==='0,-1,0')U[z+1][x+1]=cc;else if(w==='0,0,1')F[y+1][x+1]=cc;else if(w==='1,0,0')R[y+1][1-z]=cc}));
  return {U,F,R}}
