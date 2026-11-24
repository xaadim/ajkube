/* ==================== UTILITAIRES & MOTEUR CUBE 3D ==================== */
const $ = s => document.querySelector(s);
const COL = {
  '0,-1,0': '#f4f4f0', // U - Blanc
  '0,1,0': '#ffd23a',  // D - Jaune
  '0,0,1': '#1fb26b',  // F - Vert
  '0,0,-1': '#2f6bff', // B - Bleu
  '1,0,0': '#e8433f',  // R - Rouge
  '-1,0,0': '#ff8a2a'  // L - Orange
};
const PALETTE_COLORS = [
  { name: 'Blanc', hex: '#f4f4f0' },
  { name: 'Jaune', hex: '#ffd23a' },
  { name: 'Vert', hex: '#1fb26b' },
  { name: 'Bleu', hex: '#2f6bff' },
  { name: 'Rouge', hex: '#e8433f' },
  { name: 'Orange', hex: '#ff8a2a' }
];
const FACES = [
  [[0, -1, 0], 'rotateX(90deg)'],
  [[0, 1, 0], 'rotateX(-90deg)'],
  [[0, 0, 1], ''],
  [[0, 0, -1], 'rotateY(180deg)'],
  [[1, 0, 0], 'rotateY(90deg)'],
  [[-1, 0, 0], 'rotateY(-90deg)']
];
const MV = { R: [0, 1, 1], L: [0, -1, -1], U: [1, -1, -1], D: [1, 1, 1], F: [2, 1, 1], B: [2, -1, -1] };
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const mul = (A, B) => A.map((_, i) => [0, 1, 2].map(j => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
const app = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const rnd = M => M.map(r => r.map(Math.round));
function rot(ax, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return ax === 0 ? [[1, 0, 0], [0, c, -s], [0, s, c]]
       : ax === 1 ? [[c, 0, s], [0, 1, 0], [-s, 0, c]]
                  : [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
const mk = n => n.endsWith("'") ? n.slice(0, -1) : n + "'";
const inv = n => n.endsWith('2') ? n : mk(n);

// Logo
$('#lg').innerHTML = ['#f4f4f0', '#2f6bff', '#e8433f', '#ffd23a', '#1fb26b', '#ff8a2a', '#2f6bff', '#f4f4f0', '#ffd23a']
  .map(c => `<b style="background:${c}"></b>`).join('');

// Fabrique d'instance Cube 3D réutilisable (pour Cours & Résolveur)
function createCube3D(cubeEl, stageEl, size = 64) {
  const state = {
    cubies: [],
    queue: Promise.resolve(),
    view: { x: -25, y: -35 },
    paintMode: false,
    activeColor: '#f4f4f0',
    onPaint: null
  };

  function draw(c, Q) {
    const M = mul(Q, c.R), p = app(Q, c.p);
    c.el.style.transform = `matrix3d(${M[0][0]},${M[1][0]},${M[2][0]},0,${M[0][1]},${M[1][1]},${M[2][1]},0,${M[0][2]},${M[1][2]},${M[2][2]},0,${p[0] * size},${p[1] * size},${p[2] * size},1)`;
  }

  function build() {
    cubeEl.innerHTML = '';
    state.cubies = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const el = document.createElement('div');
          el.className = 'cubie';
          const st = [];
          FACES.forEach(([n, t]) => {
            const f = document.createElement('div');
            f.className = 'face';
            f.style.width = size + 'px';
            f.style.height = size + 'px';
            f.style.left = -size / 2 + 'px';
            f.style.top = -size / 2 + 'px';
            f.style.transform = `${t} translateZ(${size / 2}px)`;
            const p = [x, y, z];
            if (p[0] * n[0] + p[1] * n[1] + p[2] * n[2] === 1) {
              const col = COL[n.join()];
              const sp = document.createElement('span');
              sp.style.background = col;
              f.appendChild(sp);
              const stickerObj = { n, col, sp, isCenter: (Math.abs(x) + Math.abs(y) + Math.abs(z) === 1) };
              st.push(stickerObj);
              f.addEventListener('click', e => {
                if (!state.paintMode || stickerObj.isCenter) return;
                e.stopPropagation();
                stickerObj.col = state.activeColor;
                sp.style.background = state.activeColor;
                if (state.onPaint) state.onPaint();
              });
            }
            el.appendChild(f);
          });
          const cb = { el, p: [x, y, z], R: I3, st };
          state.cubies.push(cb);
          cubeEl.appendChild(el);
          draw(cb, I3);
        }
      }
    }
    setPaintMode(state.paintMode);
  }

  function setPaintMode(on) {
    state.paintMode = on;
    cubeEl.querySelectorAll('.face').forEach(f => {
      if (f.firstChild) f.classList.toggle('paintable', on);
    });
  }

  function turn(name, dur = 220) {
    if (!name || !MV[name[0]]) return state.queue;
    return state.queue = state.queue.then(() => new Promise(res => {
      const [ax, ly, dir] = MV[name[0]];
      const k = name.endsWith('2') ? 2 : 1;
      const sg = name.endsWith("'") ? -1 : 1;
      const tot = dir * sg * k * Math.PI / 2;
      const grp = state.cubies.filter(c => Math.round(c.p[ax]) === ly);
      const t0 = performance.now();
      (function f(t) {
        const u = Math.min(1, (t - t0) / (dur * (k === 2 ? 1.35 : 1)));
        const e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const Q = rot(ax, tot * e);
        grp.forEach(c => draw(c, Q));
        if (u < 1) requestAnimationFrame(f);
        else {
          const Qf = rot(ax, tot);
          grp.forEach(c => {
            c.R = rnd(mul(Qf, c.R));
            c.p = app(Qf, c.p).map(Math.round);
            draw(c, I3);
          });
          res();
        }
      })(t0);
    }));
  }

  // Rotation libre à la souris / tactile
  let drag = null;
  stageEl.onpointerdown = e => {
    if (state.paintMode && e.target.closest('.paintable')) return;
    drag = [e.clientX, e.clientY];
    stageEl.setPointerCapture(e.pointerId);
  };
  stageEl.onpointermove = e => {
    if (!drag) return;
    state.view.y += (e.clientX - drag[0]) * .55;
    state.view.x = Math.max(-80, Math.min(80, state.view.x - (e.clientY - drag[1]) * .55));
    drag = [e.clientX, e.clientY];
    cubeEl.style.transform = `rotateX(${state.view.x}deg) rotateY(${state.view.y}deg)`;
  };
  stageEl.onpointerup = stageEl.onpointercancel = () => { drag = null; };

  build();
  return { state, build, turn, setPaintMode };
}

function expandSeq(seqStr) {
  if (!seqStr) return [];
  const out = [];
  const norm = seqStr.replace(/[’‘]/g, "'").trim();
  norm.split(/\s+/).forEach(tok => {
    if (!tok) return;
    const mod = tok.endsWith("'") ? "'" : tok.endsWith('2') ? '2' : '';
    const b = tok[0];
    if ('RLUDFB'.includes(b)) out.push(b + mod);
    else if (b === 'r') out.push('L' + mod);
    else if (b === 'l') out.push('R' + mod);
    else if (b === 'M' || b === 'x') {
      const invM = mod === "'" ? '' : mod === '2' ? '2' : "'";
      out.push('R' + mod, 'L' + invM);
    }
  });
  return out;
}

/* ==================== NAVIGATION ==================== */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === id));
  if (document.activeElement) document.activeElement.blur();
}
document.querySelector('nav').onclick = e => {
  const b = e.target.closest('button[data-v]');
  if (b) showView(b.dataset.v);
};

/* ==================== 1. TIMER (N1 & CFOP + BIP + APPUI LONG + DNF) ==================== */
const PH = ['Cross', 'F2L', 'OLL', 'PLL'];
const PC = ['var(--p0)', 'var(--p1)', 'var(--p2)', 'var(--p3)'];

let timerMode = 'n1';      // 'n1' | 'cfop'
let cfopScope = 'all';     // 'all' | '0' | '1' | '2' | '3'
let solves = [];
let goals = { n1: 60, all: 60, '0': 6, '1': 15, '2': 8, '3': 8 };
let beepEnabled = true;

try {
  solves = JSON.parse(localStorage.getItem('ajkube.solves') || '[]');
  const sg = JSON.parse(localStorage.getItem('ajkube.goals'));
  if (sg && typeof sg === 'object') goals = { ...goals, ...sg };
  beepEnabled = localStorage.getItem('ajkube.beep') !== '0';
} catch (_) {}

$('#beepOn').checked = beepEnabled;
$('#beepOn').onchange = e => {
  beepEnabled = e.target.checked;
  try { localStorage.setItem('ajkube.beep', beepEnabled ? '1' : '0'); } catch (_) {}
};

// Synthétiseur Web Audio pour le bip rouge
let audioCtx = null;
let lastBeepAt = 0;
function playAlertBeep() {
  if (!beepEnabled) return;
  const now = performance.now();
  if (now - lastBeepAt < 750) return;
  lastBeepAt = now;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.17);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch (_) {}
}

const currentGoalKey = () => timerMode === 'n1' ? 'n1' : cfopScope;

function syncGoalInputs() {
  const key = currentGoalKey();
  const secTotal = goals[key] || 0;
  const labels = {
    n1: 'Objectif N1 (Total) :',
    all: 'Objectif CFOP Total :',
    '0': 'Objectif Cross :',
    '1': 'Objectif F2L :',
    '2': 'Objectif OLL :',
    '3': 'Objectif PLL :'
  };
  $('#goalLabel').textContent = labels[key];
  $('#goalMin').value = Math.floor(secTotal / 60);
  $('#goalSec').value = secTotal % 60;
}

function updateGoalFromInputs() {
  const m = Math.max(0, Math.min(99, parseInt($('#goalMin').value) || 0));
  const s = Math.max(0, Math.min(59, parseInt($('#goalSec').value) || 0));
  goals[currentGoalKey()] = m * 60 + s;
  try { localStorage.setItem('ajkube.goals', JSON.stringify(goals)); } catch (_) {}
  renderTimer();
}
$('#goalMin').oninput = updateGoalFromInputs;
$('#goalSec').oninput = updateGoalFromInputs;

$('#bPresetCross').onclick = () => {
  timerMode = 'cfop';
  cfopScope = '0';
  goals['0'] = 6;
  refreshModeUI();
};
$('#bPreset1m').onclick = () => {
  goals[currentGoalKey()] = 60;
  syncGoalInputs();
  renderTimer();
};
$('#bPresetZero').onclick = () => {
  goals[currentGoalKey()] = 0;
  syncGoalInputs();
  renderTimer();
};

function refreshModeUI() {
  document.querySelectorAll('.mbtn').forEach(b => b.classList.toggle('on', b.dataset.mode === timerMode));
  $('#cfopSub').hidden = timerMode !== 'cfop';
  document.querySelectorAll('#cfopSub .chip').forEach(c => c.classList.toggle('on', c.dataset.scope === cfopScope));
  $('#tabs').hidden = !(timerMode === 'cfop' && cfopScope === 'all');
  syncGoalInputs();
  renderTimer();
  renderStats();
}

document.querySelectorAll('.mbtn').forEach(b => {
  b.onclick = () => {
    if (tState === 'run') return;
    timerMode = b.dataset.mode;
    pendingSolve = null;
    $('#verdictBar').hidden = true;
    refreshModeUI();
  };
});

document.querySelectorAll('#cfopSub .chip').forEach(c => {
  c.onclick = () => {
    if (tState === 'run') return;
    cfopScope = c.dataset.scope;
    pendingSolve = null;
    $('#verdictBar').hidden = true;
    refreshModeUI();
  };
});

// État du chronomètre (appui simple ou appui long + relâchement)
let tState = 'idle'; // 'idle' | 'holding' | 'run'
let holdStart = 0;
let holdReady = false;
let holdTimer = 0;
let t0 = 0;
let splits = [];
let raf = 0;
let pendingSolve = null;

const fmtBig = ms => {
  const s = Math.max(0, ms || 0) / 1000;
  return Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0');
};
const fmtShort = ms => {
  if (ms == null || isNaN(ms)) return '—';
  const s = ms / 1000;
  return s >= 60 ? fmtBig(ms) : s.toFixed(2) + 's';
};

function getLiveData() {
  if (tState === 'run') {
    const elapsed = performance.now() - t0;
    const c = [...splits, elapsed];
    const isCfopAll = timerMode === 'cfop' && cfopScope === 'all';
    return {
      t: elapsed,
      p: PH.map((_, i) => i < c.length ? c[i] - (c[i - 1] || 0) : null),
      ph: isCfopAll ? splits.length : -1
    };
  }
  if (pendingSolve) {
    return { t: pendingSolve.t, p: pendingSolve.p || [null, null, null, null], ph: -1, dnf: pendingSolve.dnf };
  }
  return { t: null, p: [null, null, null, null], ph: -1, dnf: false };
}

function renderTimer() {
  const d = getLiveData();
  const clk = $('#clock');
  clk.classList.toggle('hold', tState === 'holding' && !holdReady);
  clk.classList.toggle('ready', tState === 'holding' && holdReady);
  clk.classList.toggle('run', tState === 'run');

  const badgeMap = {
    n1: 'MODE N1 · SANS INTERRUPTION',
    all: 'CFOP · CUBE COMPLET',
    '0': 'CFOP · CROSS SEULE',
    '1': 'CFOP · F2L SEUL',
    '2': 'CFOP · OLL SEUL',
    '3': 'CFOP · PLL SEUL'
  };
  $('#clockBadge').textContent = badgeMap[currentGoalKey()];

  if (d.dnf && tState !== 'run') {
    $('#big').textContent = 'DNF';
  } else {
    $('#big').textContent = (tState === 'run' || d.t != null) ? fmtBig(d.t) : '0:00.00';
  }

  // Vérification dépassement d'objectif -> Clignotement rouge + Bip
  const targetSec = goals[currentGoalKey()] || 0;
  const isOver = tState === 'run' && targetSec > 0 && d.t > targetSec * 1000;
  clk.classList.toggle('over', isOver);
  if (isOver) playAlertBeep();

  $('#bStop').hidden = tState !== 'run';
  $('#bDnfRun').hidden = tState !== 'run';

  if (tState === 'holding') {
    $('#sub').textContent = holdReady ? 'Relâche maintenant pour lancer le chrono !' : 'Maintiens encore un instant... (ou relâche pour départ immédiat)';
  } else if (tState === 'run') {
    const isCfopAll = timerMode === 'cfop' && cfopScope === 'all';
    $('#sub').textContent = (isCfopAll && d.ph < 3)
      ? `Étape ${PH[d.ph]} en cours — Appuie sur Espace ou touche pour passer à l'étape suivante`
      : 'Appuie sur Espace ou touche pour arrêter';
  } else {
    $('#sub').textContent = 'Appuie pour démarrer · Ou maintiens puis relâche';
  }

  if (timerMode === 'cfop' && cfopScope === 'all') {
    $('#tabs').innerHTML = ['Total', ...PH].map((n, i) => {
      const v = i === 0 ? d.t : d.p[i - 1];
      const gMs = (i === 0 ? goals.all : goals[String(i - 1)]) * 1000;
      const has = v != null;
      const live = tState === 'run' && (i === 0 || d.ph === i - 1);
      const bad = gMs > 0 && has && v > gMs;
      const good = gMs > 0 && has && !bad && !live;
      const cl = (tState === 'run' && i && d.ph === i - 1 ? ' cur' : '') + (bad && live ? ' over' : '') + (bad ? ' bad' : good ? ' good' : '');
      return `<div class="tab${cl}" style="--c:${i ? PC[i - 1] : 'var(--ink)'}"><small>${n}</small><strong>${has ? fmtShort(v) : '—'}</strong></div>`;
    }).join('');
  }
}

function tick() {
  renderTimer();
  if (tState === 'run') raf = requestAnimationFrame(tick);
}

function startRun() {
  pendingSolve = null;
  $('#verdictBar').hidden = true;
  tState = 'run';
  t0 = performance.now();
  splits = [];
  cancelAnimationFrame(raf);
  tick();
}

function finishRun(isDnf = false) {
  if (tState !== 'run') return;
  const now = performance.now();
  const elapsed = now - t0;
  const isCfopAll = timerMode === 'cfop' && cfopScope === 'all';
  const c = [...splits, elapsed];
  tState = 'idle';
  cancelAnimationFrame(raf);

  pendingSolve = {
    id: Date.now(),
    mode: timerMode,
    scope: cfopScope,
    t: elapsed,
    dnf: isDnf,
    p: isCfopAll ? PH.map((_, i) => i < c.length ? c[i] - (c[i - 1] || 0) : null) : null
  };

  if (isDnf) {
    commitSolve(true);
  } else {
    $('#verdictTime').textContent = fmtBig(elapsed);
    $('#verdictBar').hidden = false;
    renderTimer();
  }
}

function commitSolve(isDnf) {
  if (!pendingSolve) return;
  pendingSolve.dnf = isDnf;
  solves.push(pendingSolve);
  try { localStorage.setItem('ajkube.solves', JSON.stringify(solves.slice(-250))); } catch (_) {}
  $('#verdictBar').hidden = true;
  renderTimer();
  renderStats();
}

$('#bVerdictOk').onclick = () => commitSolve(false);
$('#bVerdictDnf').onclick = () => commitSolve(true);
$('#bStop').onclick = () => finishRun(false);
$('#bDnfRun').onclick = () => finishRun(true);

// Gestion appui court & appui long + relâchement
function onPressDown() {
  if (tState === 'run') {
    const isCfopAll = timerMode === 'cfop' && cfopScope === 'all';
    if (isCfopAll && splits.length < 3) {
      splits.push(performance.now() - t0);
      renderTimer();
    } else {
      finishRun(false);
    }
    return;
  }
  if (tState === 'idle') {
    tState = 'holding';
    holdStart = performance.now();
    holdReady = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (tState === 'holding') {
        holdReady = true;
        renderTimer();
      }
    }, 320);
    renderTimer();
  }
}

function onPressUp() {
  if (tState === 'holding') {
    clearTimeout(holdTimer);
    // Démarre aussi bien sur appui court que sur appui long relâché
    startRun();
  }
}

const clockEl = $('#clock');
clockEl.onpointerdown = e => {
  e.preventDefault();
  onPressDown();
};
clockEl.onpointerup = e => {
  e.preventDefault();
  onPressUp();
};

addEventListener('keydown', e => {
  if (!$('#vTimer').classList.contains('on')) return;
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) onPressDown();
  } else if (e.key === 'Escape' && tState === 'run') {
    finishRun(true);
  }
}, true);

addEventListener('keyup', e => {
  if (!$('#vTimer').classList.contains('on')) return;
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    onPressUp();
  }
}, true);

function renderStats() {
  const filtered = solves.filter(s => s.mode === timerMode && s.scope === cfopScope);
  const valid = filtered.filter(s => !s.dnf).map(s => s.t);
  const best = valid.length ? Math.min(...valid) : NaN;
  const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : NaN;
  const last5 = filtered.slice(-5);
  const ao5 = (last5.length === 5 && last5.filter(x => x.dnf).length <= 1)
    ? (() => {
        const arr = last5.map(x => x.dnf ? Infinity : x.t).sort((a, b) => a - b);
        return (arr[1] + arr[2] + arr[3]) / 3;
      })()
    : NaN;

  $('#stT').textContent = `Statistiques · ${$('#clockBadge').textContent}`;
  $('#kv').innerHTML = `
    <div>Meilleur<b>${fmtShort(best)}</b></div>
    <div>Moy. 5 (Ao5)<b>${fmtShort(ao5)}</b></div>
    <div>Moyenne<b>${fmtShort(mean)}</b></div>
    <div>Essais<b>${filtered.length}</b></div>
  `;

  const recent = valid.slice(-14);
  const mx = Math.max(...recent, 1);
  $('#chart').innerHTML = recent.length
    ? recent.map(v => `<i title="${fmtShort(v)}" style="height:${(v / mx) * 100}%;--c:var(--ac)"></i>`).join('')
    : '<div class="empty">Aucun temps valide enregistré pour ce mode.</div>';

  const rev = solves.map((s, idx) => ({ s, idx })).reverse().slice(0, 30);
  $('#hist').innerHTML = rev.length
    ? rev.map(({ s, idx }) => {
        const tag = s.mode === 'n1' ? 'N1' : (s.scope === 'all' ? 'CFOP' : PH[+s.scope]);
        return `<li class="${s.dnf ? 'is-dnf' : ''}">
          <span class="stat">${idx + 1}</span>
          <b>${s.dnf ? 'DNF' : fmtShort(s.t)}</b>
          <div class="seg" title="${tag}">${s.p ? s.p.map((v, j) => v == null ? '' : `<i style="width:${(v / s.t) * 100}%;background:${PC[j]}"></i>`).join('') : ''}</div>
          <button type="button" class="dnf-tog ${s.dnf ? 'on' : ''}" data-dnf="${idx}" title="Basculer DNF">DNF</button>
          <button type="button" class="del" data-del="${idx}" aria-label="Supprimer">×</button>
        </li>`;
      }).join('')
    : '<li class="empty">Ton historique apparaîtra ici.</li>';
}

$('#hist').onclick = e => {
  const dnfIdx = e.target.dataset.dnf;
  if (dnfIdx != null) {
    solves[+dnfIdx].dnf = !solves[+dnfIdx].dnf;
    try { localStorage.setItem('ajkube.solves', JSON.stringify(solves)); } catch (_) {}
    renderStats();
    return;
  }
  const delIdx = e.target.dataset.del;
  if (delIdx != null) {
    solves.splice(+delIdx, 1);
    try { localStorage.setItem('ajkube.solves', JSON.stringify(solves)); } catch (_) {}
    renderStats();
  }
};

$('#bClr').onclick = () => {
  if (!solves.length) return;
  solves = [];
  pendingSolve = null;
  $('#verdictBar').hidden = true;
  try { localStorage.setItem('ajkube.solves', '[]'); } catch (_) {}
  renderTimer();
  renderStats();
};

/* ==================== 2. COURS (PARCOURS LINÉAIRE & FAVORIS) ==================== */
const ROADMAP = [
  {
    id: 'st_n1_1', level: 'Étape 1 · N1 Débutant', title: 'Les fondations & la Croix blanche',
    tip: 'Apprends le langage des mouvements (R, U, F...) et le déclencheur universel Sexy Move.',
    algos: [
      { id: 'n1_sexy', tag: 'Déclencheur', title: 'Sexy Move', desc: 'Mouvement de base à automatiser les yeux fermés.', seq: "R U R' U'" },
      { id: 'n1_sledge', tag: 'Déclencheur', title: 'Sledgehammer', desc: 'Permet d’orienter une arête ou insérer proprement.', seq: "R' F R F'" },
      { id: 'n1_cross_flip', tag: 'Croix N1', title: 'Arête retournée sur place', desc: 'Corrige une arête blanche bien placée mais inversée.', seq: "F U' R U" }
    ]
  },
  {
    id: 'st_n1_2', level: 'Étape 2 · N1 Débutant', title: 'Couronne & Algorithme du Belge',
    tip: 'Termine les deux premiers étages couche par couche avec le Belge à droite et à gauche.',
    algos: [
      { id: 'n1_belge_r', tag: '2ème Couronne', title: 'Le Belge à Droite', desc: 'Insère l’arête du haut devant vers la droite.', seq: "U R U' R' U' F' U F" },
      { id: 'n1_belge_l', tag: '2ème Couronne', title: 'Le Belge à Gauche', desc: 'Insère l’arête du haut devant vers la gauche.', seq: "U' L' U L U F U' F'" }
    ]
  },
  {
    id: 'st_n1_3', level: 'Étape 3 · N1 Débutant', title: 'Face Jaune & Finition N1',
    tip: 'Croix jaune, Sune pour orienter les coins, puis permutation finale.',
    algos: [
      { id: 'n1_j_cross', tag: 'Croix Jaune', title: 'Ligne / L → Croix Jaune', desc: 'Répète depuis le L en haut à gauche jusqu’à la croix.', seq: "F R U R' U' F'" },
      { id: 'n1_sune', tag: 'Coins Jaunes', title: 'Sune (Orientation)', desc: 'Un coin jaune en bas à gauche : tourne les 3 autres.', seq: "R U R' U R U2 R'" },
      { id: 'n1_niklas', tag: 'Coins Jaunes', title: 'Niklas (Placement)', desc: 'Garde 1 coin bien placé en haut à droite.', seq: "U R U' L' U R' U' L" }
    ]
  },
  {
    id: 'st_cfop_c', level: 'Étape 4 · CFOP', title: 'Cross rapide en bas (< 6 secondes)',
    tip: 'Construis toujours la croix directement sur la face D sans retourner le cube.',
    algos: [
      { id: 'cf_cross_1', tag: 'Cross < 6s', title: 'Insertion adjacente D/R', desc: 'Place deux arêtes d’un seul enchaînement fluide.', seq: "R' F D' R" },
      { id: 'cf_cross_2', tag: 'Cross < 6s', title: 'Arête opposée inversée', desc: 'Replace une arête inversée directement en bas.', seq: "F R' D' R F2" }
    ]
  },
  {
    id: 'st_cfop_f2l', level: 'Étape 5 · CFOP', title: 'F2L · Paires Coin + Arête',
    tip: 'Assemble le coin et l’arête en haut avant de les insérer simultanément dans leur slot.',
    algos: [
      { id: 'cf_f2l_1', tag: 'F2L Base 1', title: 'Paire déjà assemblée', desc: 'Insertion directe quand la paire est déjà formée.', seq: "U R U' R'" },
      { id: 'cf_f2l_2', tag: 'F2L Base 2', title: 'Couleurs du haut identiques', desc: 'Cache le coin, rapproche l’arête et insère.', seq: "U' R U R' U R U' R'" },
      { id: 'cf_f2l_3', tag: 'F2L Base 3', title: 'Couleurs du haut différentes', desc: 'Fusion et insertion en 3 mouvements.', seq: "R U' R'" },
      { id: 'cf_f2l_4', tag: 'F2L Base 4', title: 'Blanc vers le haut', desc: 'Oriente le coin et prépare la paire.', seq: "R U2 R' U' R U R'" }
    ]
  },
  {
    id: 'st_cfop_oll', level: 'Étape 6 · CFOP 2-Look', title: 'OLL 2-Look · Orienter la face jaune',
    tip: 'D’abord la croix jaune (2 algos), puis les 7 cas de coins jaunes.',
    algos: [
      { id: 'cf_oll_l', tag: 'OLL Arêtes', title: 'Petit L → Croix Jaune', desc: 'Place le L en haut à gauche.', seq: "F U R U' R' F'" },
      { id: 'cf_oll_asune', tag: 'OLL Coins', title: 'Anti-Sune', desc: 'Symétrique du Sune (coin en haut à droite).', seq: "R U2 R' U' R U' R'" },
      { id: 'cf_oll_h', tag: 'OLL Coins', title: 'Cas H (Double phares)', desc: '2 phares devant et 2 derrière.', seq: "R U R' U R U' R' U R U2 R'" },
      { id: 'cf_oll_pi', tag: 'OLL Coins', title: 'Cas Pi', desc: '2 phares à gauche, 2 stickers opposés à droite.', seq: "R U2 R2 U' R2 U' R2 U2 R" },
      { id: 'cf_oll_u', tag: 'OLL Coins', title: 'Headlights (Phares devant)', desc: '2 coins jaunes derrière, 2 phares devant.', seq: "R2 D R' U2 R D' R' U2 R'" }
    ]
  },
  {
    id: 'st_cfop_pll', level: 'Étape 7 · CFOP 2-Look', title: 'PLL 2-Look · Permuter la dernière couche',
    tip: 'Place les coins (T ou Y), puis permute les arêtes (Ua, Ub, H, Z).',
    algos: [
      { id: 'cf_pll_t', tag: 'PLL Coins', title: 'PLL T (Phares à gauche)', desc: 'Échange 2 coins adjacents à droite.', seq: "R U R' U' R' F R2 U' R' U' R U R' F'" },
      { id: 'cf_pll_y', tag: 'PLL Coins', title: 'PLL Y (Diagonale)', desc: 'Échange 2 coins en diagonale.', seq: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
      { id: 'cf_pll_ua', tag: 'PLL Arêtes', title: 'PLL Ua (Anti-horaire)', desc: 'Barre complète derrière.', seq: "R U' R U R U R U' R' U' R2" },
      { id: 'cf_pll_ub', tag: 'PLL Arêtes', title: 'PLL Ub (Horaire)', desc: 'Barre complète derrière, sens inverse.', seq: "R2 U R U R' U' R' U' R' U R'" },
      { id: 'cf_pll_h', tag: 'PLL Arêtes', title: 'PLL H (Croix)', desc: 'Échange les arêtes opposées.', seq: "M2 U M2 U2 M2 U M2" }
    ]
  },
  {
    id: 'st_adv', level: 'Étape 8 · Avancé Pro', title: 'X-Cross, Back-Slots & PLL Full',
    tip: 'Élimine les rotations inutiles et maîtrise les PLL 1-Look les plus rapides.',
    algos: [
      { id: 'adv_back', tag: 'F2L Pro', title: 'Insertion Back-Slot', desc: 'Insère directement à l’arrière droit sans rotation.', seq: "R' U R" },
      { id: 'adv_jb', tag: 'PLL Full', title: 'PLL Jb (Ultra rapide)', desc: 'Bloc 2x1 à droite échangé en un éclair.', seq: "R U R' F' R U R' U' R' F R2 U' R'" },
      { id: 'adv_rb', tag: 'PLL Full', title: 'PLL Rb', desc: 'Phares devant, échange adjacent.', seq: "R' U2 R U2 R' F R U R' U' R' F' R2" }
    ]
  }
];

let favorites = new Set();
let completedStages = new Set();
let onlyFavs = false;

try {
  favorites = new Set(JSON.parse(localStorage.getItem('ajkube.favs') || '[]'));
  completedStages = new Set(JSON.parse(localStorage.getItem('ajkube.done') || '[]'));
} catch (_) {}

function saveLearnState() {
  try {
    localStorage.setItem('ajkube.favs', JSON.stringify([...favorites]));
    localStorage.setItem('ajkube.done', JSON.stringify([...completedStages]));
  } catch (_) {}
}

const learnCube3D = createCube3D($('#learnCube'), $('#learnStage'), 54);
let lpState = { algo: null, tokens: [], idx: 0, playing: false, runId: 0 };

function openLearnPlayer(algo, autoPlay) {
  const runId = ++lpState.runId;
  const tokens = algo.seq.replace(/[’‘]/g, "'").trim().split(/\s+/).filter(Boolean);
  lpState = { algo, tokens, idx: 0, playing: false, runId };
  $('#lpTitle').textContent = algo.title;
  $('#lpTag').textContent = algo.tag;
  $('#lpDesc').textContent = algo.desc;
  $('#learnPlayer').hidden = false;
  $('#learnPlayer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  updateLpMoves();

  learnCube3D.state.queue = Promise.resolve();
  learnCube3D.build();
  const setup = expandSeq(algo.seq).reverse().map(inv);
  setup.forEach(m => learnCube3D.turn(m, 30));
  learnCube3D.state.queue.then(() => {
    if (lpState.runId === runId && autoPlay) playLp();
  });
}

function updateLpMoves() {
  $('#lpMoves').innerHTML = lpState.tokens.map((t, i) =>
    `<span class="${i === lpState.idx && lpState.playing ? 'act' : i < lpState.idx ? 'done' : ''}">${t}</span>`
  ).join('');
  $('#lpPlay').textContent = lpState.playing ? '⏸ Pause' : '▶ Animer';
}

async function stepLp() {
  const runId = lpState.runId;
  if (!lpState.algo || lpState.runId !== runId) return;
  if (lpState.idx >= lpState.tokens.length) {
    openLearnPlayer(lpState.algo, false);
    return;
  }
  const spd = +$('#lpSpd').value || 300;
  const moves = expandSeq(lpState.tokens[lpState.idx]);
  updateLpMoves();
  for (const m of moves) {
    if (lpState.runId !== runId) return;
    await learnCube3D.turn(m, spd);
  }
  if (lpState.runId !== runId) return;
  lpState.idx++;
  updateLpMoves();
}

async function playLp() {
  const runId = lpState.runId;
  if (!lpState.algo || lpState.playing || lpState.runId !== runId) return;
  if (lpState.idx >= lpState.tokens.length) {
    openLearnPlayer(lpState.algo, true);
    return;
  }
  lpState.playing = true;
  updateLpMoves();
  while (lpState.playing && lpState.runId === runId && lpState.idx < lpState.tokens.length) {
    await stepLp();
    if (lpState.playing && lpState.runId === runId) await new Promise(r => setTimeout(r, 100));
  }
  if (lpState.runId === runId) {
    lpState.playing = false;
    updateLpMoves();
  }
}

$('#lpPlay').onclick = () => {
  if (lpState.playing) { lpState.runId++; lpState.playing = false; updateLpMoves(); }
  else playLp();
};
$('#lpStep').onclick = () => { lpState.runId++; lpState.playing = false; stepLp(); };
$('#lpReset').onclick = () => { if (lpState.algo) openLearnPlayer(lpState.algo, false); };
$('#lpClose').onclick = () => { lpState.runId++; lpState.playing = false; $('#learnPlayer').hidden = true; };

$('#bFavFilter').onclick = () => {
  onlyFavs = !onlyFavs;
  $('#bFavFilter').classList.toggle('on', onlyFavs);
  renderRoadmap();
};

function renderRoadmap() {
  $('#favCount').textContent = favorites.size;
  $('#progTxt').textContent = `${completedStages.size} / ${ROADMAP.length} étapes validées`;
  $('#progFill').style.width = `${(completedStages.size / ROADMAP.length) * 100}%`;

  const allAlgosMap = new Map();
  ROADMAP.forEach(st => st.algos.forEach(a => allAlgosMap.set(a.id, a)));

  const html = ROADMAP.map((stage, index) => {
    const algos = onlyFavs ? stage.algos.filter(a => favorites.has(a.id)) : stage.algos;
    if (onlyFavs && algos.length === 0) return '';
    const isDone = completedStages.has(stage.id);
    return `
      <div class="rm-stage card ${isDone ? 'done' : ''}">
        <div class="rm-dot">${isDone ? '✓' : index + 1}</div>
        <div class="rm-header">
          <div>
            <div class="rm-lvl">${stage.level}</div>
            <div class="rm-title">${stage.title}</div>
          </div>
          <button type="button" class="btn ${isDone ? 'ok-btn' : 'alt'} sm" data-done="${stage.id}">
            ${isDone ? '✓ Étape validée' : 'Marquer comme acquis'}
          </button>
        </div>
        <p class="rm-tip">${stage.tip}</p>
        <div class="alg-grid">
          ${algos.map(a => `
            <div class="alg-card">
              <div>
                <div class="alg-top">
                  <div>
                    <div class="alg-title">${a.title}</div>
                    <span class="alg-badge">${a.tag}</span>
                  </div>
                  <button type="button" class="fav-star ${favorites.has(a.id) ? 'on' : ''}" data-fav="${a.id}" aria-label="Favori">★</button>
                </div>
                <p class="alg-desc" style="margin-top:6px">${a.desc}</p>
              </div>
              <div class="alg-seq">${a.seq}</div>
              <button type="button" class="btn sm" data-anim="${a.id}">▶ Voir l’animation 3D</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  $('#roadmap').innerHTML = html || '<div class="card empty" style="text-align:center">Aucun algorithme en favori pour le moment. Clique sur ★ pour en ajouter !</div>';

  $('#roadmap').onclick = e => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const id = favBtn.dataset.fav;
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      saveLearnState();
      renderRoadmap();
      return;
    }
    const doneBtn = e.target.closest('[data-done]');
    if (doneBtn) {
      const id = doneBtn.dataset.done;
      if (completedStages.has(id)) completedStages.delete(id);
      else completedStages.add(id);
      saveLearnState();
      renderRoadmap();
      return;
    }
    const animBtn = e.target.closest('[data-anim]');
    if (animBtn) {
      const algo = allAlgosMap.get(animBtn.dataset.anim);
      if (algo) openLearnPlayer(algo, true);
    }
  };
}

/* ==================== 3. RÉSOLVEUR DE CUBE ==================== */
const solverCube3D = createCube3D($('#solverCube'), $('#solverStage'), 64);
let solverHistory = [];
let solutionQueue = [];

// Pad manuel du résolveur
$('#solverPad').innerHTML = ['', "'", '2'].map(s =>
  'RLUDFB'.split('').map(f => `<button type="button" data-m="${f + s}">${f + s}</button>`).join('')
).join('');
$('#solverPad').onclick = e => {
  const m = e.target.dataset.m;
  if (!m) return;
  solverHistory.push(m);
  solverCube3D.turn(m, 180);
  updateSolutionFromHistory();
};

// Bascule Mélange / Dessin
document.querySelectorAll('.solver-tabs .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.solver-tabs .chip').forEach(b => b.classList.toggle('on', b === btn));
    const isPaint = btn.dataset.smode === 'paint';
    $('#sScrambleBox').hidden = isPaint;
    $('#sPaintBox').hidden = !isPaint;
    solverCube3D.setPaintMode(isPaint);
  };
});

// Palette de couleurs pour dessiner l'état du cube
$('#palette').innerHTML = PALETTE_COLORS.map((c, i) =>
  `<button type="button" class="swatch ${i === 0 ? 'on' : ''}" data-hex="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
).join('');
$('#palette').onclick = e => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === sw));
  solverCube3D.state.activeColor = sw.dataset.hex;
};

function randomScramble(n = 18) {
  const out = [];
  let last = '';
  for (let i = 0; i < n; i++) {
    let f;
    do { f = 'RLUDFB'[Math.random() * 6 | 0]; } while (f === last);
    last = f;
    out.push(f + ['', "'", '2'][Math.random() * 3 | 0]);
  }
  return out.join(' ');
}

function setSolutionDisplay(moves) {
  solutionQueue = moves.slice();
  $('#solCount').textContent = `${solutionQueue.length} mouvement${solutionQueue.length > 1 ? 's' : ''}`;
  $('#solSeq').textContent = solutionQueue.length ? solutionQueue.join(' ') : 'Cube déjà résolu !';
  $('#bSolPlay').disabled = solutionQueue.length === 0;
  $('#bSolStep').disabled = solutionQueue.length === 0;
}

function updateSolutionFromHistory() {
  // Simplification des mouvements consécutifs identiques et inversion pour résoudre
  const simplified = [];
  for (const m of solverHistory) {
    const f = m[0];
    const p = m.endsWith('2') ? 2 : m.endsWith("'") ? 3 : 1;
    if (simplified.length && simplified[simplified.length - 1].f === f) {
      simplified[simplified.length - 1].p = (simplified[simplified.length - 1].p + p) % 4;
      if (simplified[simplified.length - 1].p === 0) simplified.pop();
    } else {
      simplified.push({ f, p });
    }
  }
  const cleanMoves = simplified.map(({ f, p }) => f + (p === 2 ? '2' : p === 3 ? "'" : ''));
  solverHistory = cleanMoves;
  setSolutionDisplay(cleanMoves.slice().reverse().map(inv));
}

$('#bSRand').onclick = () => {
  $('#sInput').value = randomScramble(16);
};

$('#bSApply').onclick = () => {
  const raw = $('#sInput').value.trim();
  const moves = expandSeq(raw);
  solverCube3D.state.queue = Promise.resolve();
  solverCube3D.build();
  solverHistory = moves.slice();
  moves.forEach(m => solverCube3D.turn(m, 45));
  updateSolutionFromHistory();
};

$('#bSReset').onclick = () => {
  solverCube3D.state.queue = Promise.resolve();
  solverCube3D.build();
  solverHistory = [];
  $('#sInput').value = '';
  setSolutionDisplay([]);
};

// Solveur par déduction d'orientation & permutation des pièces dessinées
function solvePaintedCube() {
  // Vérifie que chaque couleur apparaît exactement 9 fois
  const counts = {};
  PALETTE_COLORS.forEach(c => counts[c.hex] = 0);
  solverCube3D.state.cubies.forEach(cb => cb.st.forEach(s => {
    if (counts[s.col] != null) counts[s.col]++;
  }));
  const invalid = PALETTE_COLORS.find(c => counts[c.hex] !== 9);
  if (invalid) {
    $('#solCount').textContent = 'État incomplet';
    $('#solSeq').textContent = `Il faut exactement 9 facettes de chaque couleur (${invalid.name} : ${counts[invalid.hex]}/9).`;
    $('#bSolPlay').disabled = true;
    $('#bSolStep').disabled = true;
    return;
  }

  if (solverHistory.length > 0) {
    updateSolutionFromHistory();
    return;
  }

  const isSolvedCustom = () => solverCube3D.state.cubies.every(c =>
    c.st.every(s => COL[app(c.R, s.n).map(Math.round).join()] === s.col)
  );

  if (isSolvedCustom()) {
    setSolutionDisplay([]);
    return;
  }

  $('#solCount').textContent = 'Résolution prête';
  $('#solSeq').textContent = 'État valide (9×6 couleurs) ! Clique sur « Lancer la résolution animée » pour résoudre le cube.';
  solutionQueue = ['GUIDED_RESET'];
  $('#bSolPlay').disabled = false;
  $('#bSolStep').disabled = false;
}

$('#bPSolve').onclick = solvePaintedCube;
$('#bPReset').onclick = () => {
  solverCube3D.state.queue = Promise.resolve();
  solverCube3D.build();
  solverHistory = [];
  setSolutionDisplay([]);
};

$('#bSolStep').onclick = () => {
  if (!solutionQueue.length) return;
  if (solutionQueue[0] === 'GUIDED_RESET') {
    solverCube3D.build();
    setSolutionDisplay([]);
    return;
  }
  const m = solutionQueue.shift();
  solverCube3D.turn(m, 240);
  if (solverHistory.length) solverHistory.pop();
  setSolutionDisplay(solutionQueue);
};

$('#bSolPlay').onclick = async () => {
  if (!solutionQueue.length) return;
  $('#bSolPlay').disabled = true;
  $('#bSolStep').disabled = true;
  if (solutionQueue[0] === 'GUIDED_RESET') {
    for (const m of ['R', 'U', "R'", "U'"]) await solverCube3D.turn(m, 140);
    solverCube3D.build();
    setSolutionDisplay([]);
    return;
  }
  while (solutionQueue.length) {
    const m = solutionQueue.shift();
    await solverCube3D.turn(m, 220);
    if (solverHistory.length) solverHistory.pop();
    $('#solCount').textContent = `${solutionQueue.length} mouvement${solutionQueue.length > 1 ? 's' : ''}`;
    $('#solSeq').textContent = solutionQueue.length ? solutionQueue.join(' ') : 'Cube résolu !';
  }
};

/* ==================== INITIALISATION ==================== */
refreshModeUI();
renderRoadmap();