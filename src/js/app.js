/* =========================================================
   APP — Zézinho Bodybuilder
   Estado salvo no aparelho (localStorage). Tudo funciona offline.
   ========================================================= */
const KEY = 'zezinho.v1';
const DAYS = ['A', 'B', 'C'];
const UNIT = { total: 'kg total', cada: 'kg cada', kg: 'kg', placas: 'placas', pc: 'peso corporal' };
const PLATES = ['var(--red)', 'var(--blue)', 'var(--y)', 'var(--green)', 'var(--chalk)'];
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Estado ---------- */
const defaults = () => ({
  week: 1, day: 'A', sessions: [], active: null, body: [],
  profile: { name: 'Zézinho', theme: 'dark', vibrate: true, sound: true }, ach: {},
  diet: { plan: JSON.parse(JSON.stringify(DIET_PLAN)), goals: { ...DIET_GOALS }, log: {}, favs: JSON.parse(JSON.stringify(DIET_FAVS)) },
  water: { goal: null, log: {}, cups: [250, 500, 1000], remind: { on: false, every: 90, from: '07:00', to: '21:00' } }
});
let S = load();
function load() {
  try { const r = localStorage.getItem(KEY); if (r) return Object.assign(defaults(), JSON.parse(r)); } catch (e) {}
  return defaults();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- Utilidades ---------- */
const block = w => (w % 2 ? 'odd' : 'even');
const plan = (w, d) => PROG[block(w)][d];
const num = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const parse = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const r05 = n => Math.round(n * 2) / 2;
const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0);
const vibe = p => { if (S.profile && S.profile.vibrate === false) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); };

function rxText(rx) {
  const reps = rx.rl === 'passos' ? `${rx.r} passos por perna` : rx.side ? `${rx.r} por perna` : `${rx.r}`;
  return `${rx.s} séries de ${reps}`;
}
function loadText(rx) {
  if (rx.u === 'pc') return 'Peso corporal';
  return `${num(rx.kg)} ${UNIT[rx.u]}`;
}
function restText(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m}min${String(s).padStart(2, '0')}` : `${m} min`;
}
function warmLoad(rx, pct) {
  if (rx.u === 'pc') return '';
  if (rx.u === 'placas') return `≈ ${Math.max(1, Math.round(rx.kg * pct / 100))} placas`;
  return `≈ ${num(r05(rx.kg * pct / 100))} kg`;
}
function estMinutes(list) {
  let s = 0;
  for (const rx of list) s += rx.w.length * 45 + rx.s * 50 + (rx.s - 1 + rx.w.length * 0.5) * rx.rest + 90;
  return Math.round(s / 60 / 5) * 5;
}
const volMult = rx => (rx.u === 'cada' ? 2 : rx.u === 'pc' || rx.u === 'placas' ? 0 : 1);

/* Último registro de um exercício */
function lastFor(id) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const e = S.sessions[i].ex.find(x => x.id === id && !x.skip && x.sets.some(s => s.done));
    if (e) return { ses: S.sessions[i], ex: e };
  }
  return null;
}
function bestE1(id, upto = S.sessions.length) {
  let b = 0;
  for (let i = 0; i < upto; i++) for (const e of S.sessions[i].ex)
    if (e.id === id) for (const s of e.sets) if (s.done) b = Math.max(b, e1rm(parse(s.kg), parse(s.reps)));
  return b;
}

/* Sequência: treinos seguidos sem passar de 2 dias de descanso */
function streak() {
  const days = [...new Set(S.sessions.map(s => dayKey(s.date)))].map(k => { const [y, m, d] = k.split('-'); return new Date(y, m - 1, d).getTime(); }).sort((a, b) => b - a);
  if (!days.length) return 0;
  const DAY = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
  if ((today - days[0]) / DAY > 3) return 0;
  let n = 1;
  for (let i = 1; i < days.length; i++) { if ((days[i - 1] - days[i]) / DAY <= 3) n++; else break; }
  return n;
}

/* ---------- Ícones ---------- */
const I = {
  treino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-6"/></svg>',
  dieta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3"/><path d="M5 3v4M3.5 3v3a1.5 1.5 0 003 0V3M19 3v18"/></svg>',
  agua: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z"/></svg>',
  perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.5"/></svg>',
  skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l8 7-8 7zM17 5v14"/></svg>'
};
function plateBadge(letter) {
  return `<svg class="plate-badge" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="var(--y)"/><circle cx="50" cy="50" r="40" fill="none" stroke="var(--y-ink)" stroke-opacity=".18" stroke-width="2"/>
    <circle cx="50" cy="50" r="9" fill="var(--bg)"/><circle cx="50" cy="50" r="13" fill="none" stroke="var(--y-ink)" stroke-opacity=".25" stroke-width="2"/>
    <text x="50" y="35" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="22" fill="var(--y-ink)">${letter}</text>
    <text x="50" y="80" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="11" fill="var(--y-ink)" fill-opacity=".6">treino</text></svg>`;
}

/* ---------- Mapa muscular ---------- */
function bodyMap(p, s, mini) {
  const c = ids => { ids = [].concat(ids); return ids.some(i => p.includes(i)) ? 'mz p' : ids.some(i => s.includes(i)) ? 'mz s' : 'mz'; };
  const e = (cx, cy, rx, ry, cls) => `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><ellipse class="${cls}" cx="${100 - cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const base = `<circle class="mz-base" cx="50" cy="15" r="10"/><rect class="mz-base" x="45" y="24" width="10" height="9" rx="3"/>
    <rect class="mz-base" x="31" y="34" width="38" height="66" rx="13"/><rect class="mz-base" x="35" y="94" width="30" height="20" rx="8"/>
    <circle class="mz-base" cx="18" cy="108" r="4.5"/><circle class="mz-base" cx="82" cy="108" r="4.5"/>
    <ellipse class="mz-base" cx="40" cy="183" rx="6" ry="4"/><ellipse class="mz-base" cx="60" cy="183" rx="6" ry="4"/>`;
  const front = base + e(29, 44, 8.5, 9, c('delts')) + e(41, 52, 10, 8.5, c('chest')) + e(25, 67, 5.5, 11, c('biceps')) +
    e(20.5, 91, 4.5, 12, c('forearms')) + `<rect class="${c('abs')}" x="43.5" y="62" width="13" height="32" rx="4"/>` +
    e(36, 79, 4, 11, c('obliques')) + e(46.5, 114, 3.5, 11, c('adductors')) + e(40, 126, 8, 22, c('quads')) + e(40, 164, 5, 14, c('calves'));
  const back = base + `<path class="${c('traps')}" d="M50 26 L35 39 L50 58 L65 39 Z"/>` + e(29, 44, 8.5, 9, c(['reardelts', 'delts'])) +
    `<rect class="${c('upperback')}" x="42" y="44" width="16" height="15" rx="3"/>` + e(37, 68, 7, 14, c('lats')) + e(25, 67, 5.5, 11, c('triceps')) +
    e(20.5, 91, 4.5, 12, c('forearms')) + `<rect class="${c('lowerback')}" x="44" y="82" width="12" height="15" rx="4"/>` +
    e(42, 105, 9, 9, c('glutes')) + e(41, 133, 7, 18, c('hamstrings')) + e(40, 165, 5.5, 14, c('calves'));
  if (mini) return `<svg viewBox="0 0 100 190" aria-hidden="true">${front}</svg><svg viewBox="0 0 100 190" aria-hidden="true">${back}</svg>`;
  return `<div class="bodymap"><figure style="margin:0"><svg viewBox="0 0 100 190" aria-hidden="true">${front}</svg><figcaption>Frente</figcaption></figure>
    <figure style="margin:0"><svg viewBox="0 0 100 190" aria-hidden="true">${back}</svg><figcaption>Costas</figcaption></figure></div>
    <div class="mlist">${p.map(m => `<span class="chip p">${MUSCLES[m]}</span>`).join('')}${s.map(m => `<span class="chip s">${MUSCLES[m]}</span>`).join('')}</div>`;
}

/* =========================================================
   IMAGENS DOS EXERCÍCIOS
   Ordem de prioridade: fotos suas (salvas no aparelho) →
   imagens embutidas → ilustração início/fim.
   ========================================================= */
const Photos = {
  cache: {}, db: null,
  has(id) { return !!(this.cache[id] && this.cache[id].length); },
  async open() {
    if (this.db) return this.db;
    this.db = await new Promise((res, rej) => {
      const r = indexedDB.open('zezinho-fotos', 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('img')) db.createObjectStore('img');
        if (!db.objectStoreNames.contains('prog')) db.createObjectStore('prog');   // fotos de progresso
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return this.db;
  },
  async loadAll() {
    try {
      const db = await this.open();
      await new Promise(res => {
        const tx = db.transaction('img'), st = tx.objectStore('img'), rq = st.openCursor();
        rq.onsuccess = () => { const c = rq.result; if (c) { this.cache[c.key] = c.value; c.continue(); } else res(); };
        rq.onerror = () => res();
      });
    } catch (e) {}
  },
  async put(id, imgs) {
    this.cache[id] = imgs;
    try { const db = await this.open(); db.transaction('img', 'readwrite').objectStore('img').put(imgs, id); } catch (e) {}
  },
  async del(id) {
    delete this.cache[id];
    try { const db = await this.open(); db.transaction('img', 'readwrite').objectStore('img').delete(id); } catch (e) {}
  }
};
function media(id, inSheet) {
  const X = EX[id], imgs = Photos.cache[id] || BUILTIN[id];
  if (imgs && imgs.length) {
    const two = imgs.length > 1;
    return `<div class="photo ${two ? 'two' : ''}">${imgs.slice(0, 2).map((src, k) => `<figure><img src="${src}" alt="${two ? (k ? 'Posição final' : 'Posição inicial') : 'Posição inicial e final'} de ${esc(X.pt)}">${two ? `<figcaption>${k ? 'Fim' : 'Início'}</figcaption>` : ''}</figure>`).join('')}</div>`;
  }
  if (inSheet) return '';
  // Sem imagem: mapa muscular com os músculos ativos em laranja + atalho para adicionar
  return `<div class="noimg"><div class="noimg-map">${bodyMap(X.p, X.s, true)}</div>
    <div class="noimg-txt"><b>${X.p.map(m => MUSCLES[m]).join(', ')}</b>${X.s.length ? `<span>e ${X.s.map(m => MUSCLES[m].toLowerCase()).join(', ')}</span>` : ''}
    <label class="addimg">${I.photo}Adicionar imagem<input type="file" accept="image/*" multiple data-photo="${id}"></label></div></div>`;
}
/* Reduz a imagem para caber no aparelho (mantém a foto como está) */
async function prepImage(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
  const webp = cv.toDataURL('image/webp', .85);
  return webp.startsWith('data:image/webp') ? webp : cv.toDataURL('image/png');
}
function refreshMedia() {
  if (S.active && $('#wo').classList.contains('on')) renderWorkout();
  if ($('#sheet').classList.contains('on') && infoCtx) { const st = $('#sheet').scrollTop; openInfo(...infoCtx); $('#sheet').scrollTop = st; }
}

/* =========================================================
   TELA INICIAL (aba Treino)
   ========================================================= */
function greet() {
  const h = new Date().getHours();
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function renderHome() {
  const list = plan(S.week, S.day), st = streak();
  const doneWeeks = new Set(S.sessions.map(s => s.week));
  const act = S.active;
  const actProg = act ? progress(act) : null;
  const last = S.sessions[S.sessions.length - 1];
  const tagLeg = `<div class="legend"><span><i class="t rir"></i>1–2 reps sobrando</span><span><i class="t fail"></i>última série até a falha</span></div>`;
  $('#v-treino').innerHTML = `
    <header class="top">
      <p class="hello">${greet()}, ${esc(S.profile.name || 'atleta')}<small>${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</small></p>
      <div class="streak ${st ? '' : 'cold'}" title="Treinos seguidos, com no máximo 2 dias de descanso entre eles"><span class="fl">🔥</span><b>${st}</b><span>em<br>sequência</span></div>
    </header>
    <section class="cycle">
      <h2>Semana <b>${S.week}</b> de 12, bloco ${S.week % 2 ? 'ímpar' : 'par'}</h2>
      <div class="weeks" role="tablist" aria-label="Semana do ciclo">
        ${Array.from({ length: 12 }, (_, i) => i + 1).map(w => `<button class="wk ${w === S.week ? 'on' : doneWeeks.has(w) ? 'done' : ''}" data-act="week" data-w="${w}" aria-label="Semana ${w}" ${act ? 'disabled' : ''}>${w}</button>`).join('')}
      </div>
    </section>
    <div class="days">
      ${DAYS.map(d => `<button class="day ${d === S.day ? 'on' : ''}" data-act="day" data-d="${d}" ${act ? 'disabled' : ''}><b>Treino ${d}</b><span>${plan(S.week, d).length} exercícios</span></button>`).join('')}
    </div>
    <article class="today">
      <div class="today-head">${plateBadge(act ? act.day : S.day)}
        <div><h1>${act ? `Treino ${act.day} em andamento` : `Treino ${S.day}`}</h1>
        <p>${act ? `${actProg.done} de ${actProg.total} séries feitas` : `${list.length} exercícios, cerca de ${estMinutes(list)} min`}</p></div>
      </div>
      <ol class="today-list">
        ${(act ? plan(act.week, act.day) : list).map(rx => `<li><button data-act="info" data-id="${rx.id}" data-w="${act ? act.week : S.week}" data-d="${act ? act.day : S.day}">
          <span class="nm"><i class="t ${rx.t}"></i>${EX[rx.id].n}</span><span class="rx">${rx.s}×${rx.r}${rx.u === 'pc' ? '' : `, ${num(rx.kg)} ${rx.u === 'placas' ? 'pl' : 'kg'}`}</span></button></li>`).join('')}
      </ol>
      <button class="cta" data-act="${act ? 'resume' : 'start'}">${act ? 'Continuar treino' : `Começar treino ${S.day}`}</button>
      ${tagLeg}
    </article>
    ${homeMinis()}
    ${last ? `<p class="last">Último treino: <b>Treino ${last.day}, semana ${last.week}</b>, ${new Date(last.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}, ${last.dur} min, ${last.sets} série${last.sets === 1 ? '' : 's'}${last.prs.length ? `, ${last.prs.length} recorde${last.prs.length > 1 ? 's' : ''} 🏆` : ''}.</p>`
      : `<p class="last">Nenhum treino registrado ainda. Seu primeiro treino vira a referência de cargas e recordes.</p>`}`;
}

/* =========================================================
   TREINO ATIVO
   ========================================================= */
function startWorkout() {
  const list = plan(S.week, S.day);
  S.active = {
    week: S.week, day: S.day, start: Date.now(), open: 0, rest: null,
    ex: list.map(rx => {
      const last = lastFor(rx.id);
      return {
        id: rx.id, skip: null, up: false,
        hint: last && last.ex.up ? 'up' : null,
        warm: rx.w.map(() => false),
        sets: Array.from({ length: rx.s }, (_, i) => {
          const ls = last && (last.ex.sets[i] || last.ex.sets[last.ex.sets.length - 1]);
          return { kg: ls ? ls.kg : (rx.u === 'pc' ? '' : rx.kg), reps: ls ? ls.reps : rx.r, done: false };
        })
      };
    })
  };
  platesShown = 0;
  save(); openWorkout(); vibe(20);
}
function progress(a) {
  let total = 0, done = 0, exDone = 0;
  a.ex.forEach(e => {
    if (e.skip) { exDone++; return; }
    total += e.sets.length; const d = e.sets.filter(s => s.done).length; done += d;
    if (d === e.sets.length) exDone++;
  });
  return { total, done, exDone, exTotal: a.ex.length };
}
const exComplete = e => e.skip || e.sets.every(s => s.done);

function openWorkout() {
  renderWorkout();
  $('#wo').classList.add('on');
  document.body.style.overflow = 'hidden';
  if (S.active && S.active.rest) showRest();
}
function closeWorkout() {
  $('#wo').classList.remove('on');
  document.body.style.overflow = '';
  hideRest(true);
  renderHome();
}

let platesShown = -1;
function barbell(a) {
  const p = progress(a), order = [];
  a.ex.forEach((e, i) => { if (exComplete(e)) order.push(i); });
  const n = order.length;
  let plates = '';
  order.forEach((i, k) => {
    const h = 56 - (k % 4) * 4, y = 40 - h / 2, xl = 92 - k * 9.5, xr = 240 + k * 9.5;
    const col = a.ex[i].skip ? 'var(--dim)' : PLATES[i % PLATES.length];
    const isNew = k >= platesShown && platesShown >= 0;
    plates += `<rect class="${isNew ? 'plate-in-l' : ''}" x="${xl}" y="${y}" width="8" height="${h}" rx="2" fill="${col}"/>`;
    plates += `<rect class="${isNew ? 'plate-in-r' : ''}" x="${xr}" y="${y}" width="8" height="${h}" rx="2" fill="${col}"/>`;
  });
  platesShown = n;
  const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
  return `<svg class="barbell" viewBox="0 0 340 84" role="img" aria-label="${p.exDone} de ${p.exTotal} exercícios concluídos, ${pct}% das séries">
    <rect x="4" y="37" width="332" height="6" rx="3" fill="var(--s3)"/>
    <rect x="100" y="30" width="6" height="20" rx="2" fill="var(--dim)"/><rect x="234" y="30" width="6" height="20" rx="2" fill="var(--dim)"/>
    <rect x="106" y="35.5" width="128" height="9" rx="4.5" fill="var(--bg)" stroke="var(--line)"/>
    <rect x="107" y="36.5" width="${Math.max(0, 126 * pct / 100)}" height="7" rx="3.5" fill="var(--y)"/>
    ${plates}
    <text class="bb-txt" x="170" y="24" text-anchor="middle" font-size="17">${p.exDone}/${p.exTotal} exercícios</text>
    <text class="bb-sub" x="170" y="66" text-anchor="middle">${p.done} de ${p.total} séries, ${pct}%</text></svg>`;
}

function renderWorkout() {
  const a = S.active; if (!a) return;
  const list = plan(a.week, a.day);
  const el = $('#wo');
  const keep = el.scrollTop;
  el.innerHTML = `
    <div class="wo-head"><div class="wo-bar">
      <button class="ghost" data-act="leave">Voltar</button>
      <h2>Treino ${a.day}<small>Semana ${a.week}</small></h2>
      <button class="ghost fin" data-act="finish">Finalizar</button></div>
      <div id="bb">${barbell(a)}</div></div>
    <div class="wo-list">${a.ex.map((e, i) => exCard(e, list[i], i, a)).join('')}</div>`;
  el.scrollTop = keep;
}

function exCard(e, rx, i, a) {
  const X = EX[e.id], open = a.open === i, done = exComplete(e);
  const nDone = e.sets.filter(s => s.done).length;
  const unit = rx.u === 'pc' ? '+kg' : rx.u === 'placas' ? 'placas' : 'kg';
  const head = `<button class="ex-head" data-act="toggle" data-i="${i}" aria-expanded="${open}">
      <span class="ex-dot" style="--c:${PLATES[i % PLATES.length]}"></span>
      <span class="ex-t"><b>${X.n}</b><small>${X.pt}</small></span>
      <span class="ex-n">${e.skip ? '–' : `${nDone}/${e.sets.length}`}</span></button>`;
  const meta = `<div class="ex-meta"><span class="chip ${rx.t}">${rx.t === 'rir' ? '🎯 1–2 sobrando' : '🔥 última até a falha'}</span>
      <span class="chip">${rxText(rx)}</span><span class="chip">${loadText(rx)}</span><span class="chip">descanso ${restText(rx.rest)}</span>
      ${e.hint === 'up' ? '<span class="chip up">Hora de subir a carga</span>' : ''}</div>`;
  if (e.skip) return `<section class="ex skipped">${head}<div class="skipbox"><span>Pulado: ${esc(e.skip)}</span><button data-act="unskip" data-i="${i}">Desfazer</button></div></section>`;
  if (!open) return `<section class="ex ${done ? 'done' : ''}">${head}${meta}</section>`;
  const warm = rx.w.map(([pct, reps], k) => `<div class="set warm ${e.warm[k] ? 'is-done' : ''}">
      <span class="set-l">Aquecimento ${pct}%<small>${warmLoad(rx, pct)}</small></span><span class="wrx">${reps} reps</span>
      <button class="chk" data-act="warm" data-i="${i}" data-k="${k}" aria-label="Marcar aquecimento ${k + 1}">${I.check}</button></div>`).join('');
  const sets = e.sets.map((s, k) => `<div class="set ${s.done ? 'is-done' : ''}">
      <span class="set-l">Série ${k + 1}<small>${rx.t === 'fail' && k === e.sets.length - 1 ? 'até a falha' : `meta ${rx.r}+`}</small></span>
      <label class="fld"><input inputmode="decimal" data-f="kg" data-i="${i}" data-k="${k}" value="${s.kg === '' ? '' : num(parse(s.kg))}" placeholder="0" aria-label="Carga da série ${k + 1}"><span>${unit}</span></label>
      <label class="fld"><input inputmode="numeric" data-f="reps" data-i="${i}" data-k="${k}" value="${s.reps}" aria-label="Repetições da série ${k + 1}"><span>reps</span></label>
      <button class="chk" data-act="set" data-i="${i}" data-k="${k}" aria-label="Concluir série ${k + 1}">${I.check}</button></div>`).join('');
  return `<section class="ex open ${done ? 'done' : ''}">${head}${meta}
    <div class="ex-body">
      <div class="ex-top">${media(e.id)}
        <div class="ex-actions"><button data-act="info" data-id="${e.id}" data-w="${a.week}" data-d="${a.day}">${I.info}Como fazer</button>
        <button data-act="skip" data-i="${i}">${I.skip}Pular</button></div></div>
      ${rx.note ? `<p class="note">${rx.note}</p>` : ''}
      <div class="sets">${warm}${sets}</div>
    </div></section>`;
}

/* Marcar série */
function toggleSet(i, k) {
  const a = S.active, e = a.ex[i], rx = plan(a.week, a.day)[i], s = e.sets[k];
  s.done = !s.done;
  if (s.done) {
    vibe(25); unlockAudio();
    const reps = parse(s.reps), kg = parse(s.kg);
    // Regra de progressão: falhou antes das reps → tira ~10% na próxima série
    if (reps < rx.r && k < e.sets.length - 1 && !e.sets[k + 1].done && kg > 0 && rx.u !== 'placas') {
      e.sets[k + 1].kg = r05(kg * 0.9);
      toast(`Abaixo da meta: próxima série com ${num(e.sets[k + 1].kg)} kg (−10%)`);
    }
    if (e.sets.every(x => x.done)) {
      e.up = e.sets.every(x => parse(x.reps) >= rx.r + 4);
      if (e.up) toast('Fez 4 reps a mais em todas as séries: suba a carga no próximo treino 💪');
      const next = a.ex.findIndex((x, j) => j > i && !exComplete(x));
      startRest(rx.rest, next >= 0 ? `Próximo: ${EX[a.ex[next].id].n}` : 'Último exercício feito');
      if (next >= 0) a.open = next;
      setTimeout(() => { const c = $$('.ex')[a.open]; c && c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
    } else {
      startRest(rx.rest, `Próxima: série ${k + 2} de ${e.sets.length}`);
    }
  } else vibe(10);
  save(); renderWorkout();
}

/* ---------- Timer de descanso ---------- */
let restTick = 0, audioCtx = null;
function unlockAudio() {
  try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {}
}
function beep() {
  if (S.profile && S.profile.sound === false) return;
  if (!audioCtx) return;
  try {
    [0, .22, .44].forEach((t, n) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = n === 2 ? 1320 : 880; o.type = 'sine';
      g.gain.setValueAtTime(.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.35, audioCtx.currentTime + t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + t + .18);
      o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .2);
    });
  } catch (e) {}
}
function startRest(sec, label) {
  S.active.rest = { end: Date.now() + sec * 1000, total: sec, label, fired: false };
  save(); showRest();
}
function showRest() {
  const r = $('#rest');
  r.classList.add('on'); r.classList.remove('end');
  clearInterval(restTick); restTick = setInterval(drawRest, 250); drawRest();
}
function drawRest() {
  const a = S.active; if (!a || !a.rest) return hideRest(true);
  const left = Math.max(0, Math.ceil((a.rest.end - Date.now()) / 1000));
  const C = 2 * Math.PI * 30, frac = a.rest.total ? left / a.rest.total : 0;
  $('#rest-t').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('#rest-l').textContent = left ? a.rest.label : 'Bora, próxima série!';
  $('#ring').style.strokeDashoffset = String(C * (1 - frac));
  if (!left && !a.rest.fired) {
    a.rest.fired = true; save();
    $('#rest').classList.add('end'); vibe([220, 90, 220, 90, 320]); beep();
    setTimeout(() => { if (S.active && S.active.rest && S.active.rest.fired) { S.active.rest = null; save(); hideRest(); } }, 4000);
  }
}
function hideRest(silent) {
  clearInterval(restTick);
  $('#rest').classList.remove('on');
  if (!silent && S.active) { S.active.rest = null; save(); }
}
function addRest(d) {
  const r = S.active && S.active.rest; if (!r) return;
  r.end = Math.max(Date.now(), r.end + d * 1000); r.total = Math.max(r.total + d, 1); r.fired = false;
  $('#rest').classList.remove('end'); save(); drawRest();
}

/* ---------- Finalizar treino ---------- */
function askFinish() {
  const p = progress(S.active), left = p.total - p.done;
  if (left === 0) return finish();
  sheet(`<div class="sh-h"><div><h2>Finalizar agora?</h2><p>Ainda ${left === 1 ? 'falta 1 série' : `faltam ${left} séries`}. O que não foi feito fica registrado como não concluído.</p></div>
    <button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="row2"><button class="ghost" data-act="close">Continuar treinando</button><button class="cta" style="min-height:48px;font-size:20px" data-act="finish-now">Finalizar</button></div>`);
}
function finish() {
  const a = S.active, list = plan(a.week, a.day);
  let vol = 0, sets = 0; const prs = [];
  a.ex.forEach((e, i) => {
    if (e.skip) return;
    const rx = list[i]; let best = 0, bestSet = null;
    e.sets.forEach(s => {
      if (!s.done) return;
      sets++; const kg = parse(s.kg), reps = parse(s.reps);
      vol += kg * reps * volMult(rx);
      const v = e1rm(kg, reps); if (v > best) { best = v; bestSet = s; }
    });
    const prev = bestE1(e.id);
    if (best > 0 && prev > 0 && best > prev + 0.01) prs.push({ id: e.id, kg: parse(bestSet.kg), reps: parse(bestSet.reps), e1: best });
  });
  const ses = {
    id: Date.now(), date: new Date().toISOString(), week: a.week, day: a.day,
    dur: Math.max(1, Math.round((Date.now() - a.start) / 60000)), sets, vol: Math.round(vol),
    prs: prs.map(p => p.id),
    ex: a.ex.map((e, i) => ({ id: e.id, skip: e.skip, up: e.up, sets: e.sets.map(s => ({ kg: s.kg, reps: s.reps, done: s.done })) }))
  };
  S.sessions.push(ses);
  // Próximo treino: A → B → C → (semana seguinte) A
  const di = DAYS.indexOf(a.day);
  if (di < 2) { S.week = a.week; S.day = DAYS[di + 1]; }
  else { S.day = 'A'; S.week = a.week >= 12 ? 1 : a.week + 1; }
  S.active = null; save();
  closeSheet(); closeWorkout();
  celebrate(ses, prs, checkAch());
}

function celebrate(ses, prs, newAch = []) {
  const first = S.sessions.length === 1;
  $('#party').innerHTML = `<div class="party-in">
    <svg class="trophy" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M38 18h44v22a22 22 0 01-44 0z" fill="var(--y)"/><path d="M38 24H24a14 14 0 0014 18M82 24h14a14 14 0 01-14 18" fill="none" stroke="var(--y)" stroke-width="6" stroke-linecap="round"/>
      <rect x="54" y="60" width="12" height="18" fill="var(--y)"/><rect x="40" y="78" width="40" height="10" rx="3" fill="var(--y)"/><rect x="34" y="90" width="52" height="12" rx="4" fill="var(--s3)"/>
      <path d="M52 30l5 5 12-12" fill="none" stroke="var(--y-ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>
    <h2>Treino ${ses.day} concluído!</h2>
    <p class="sub">${first ? 'Primeiro treino registrado. Agora o app já sabe suas cargas.' : prs.length ? 'E com recorde pessoal. Que dia!' : 'Mais um tijolo na sequência.'}</p>
    <div class="stats"><div><b>${ses.dur}</b><span>${ses.dur === 1 ? 'minuto' : 'minutos'}</span></div><div><b>${ses.sets}</b><span>${ses.sets === 1 ? 'série' : 'séries'}</span></div><div><b>${ses.vol >= 1000 ? num(ses.vol / 1000) + 't' : ses.vol}</b><span>${ses.vol >= 1000 ? 'volume' : 'kg de volume'}</span></div></div>
    ${prs.length ? `<div class="prs">${prs.map(p => `<div><b>🏆 ${EX[p.id].n}</b>${num(p.kg)} kg × ${p.reps}, 1RM estimado de ${num(p.e1)} kg</div>`).join('')}</div>` : ''}
    ${newAch.length ? `<div class="newach">${newAch.map(x => `<div><span>${x.icon}</span><p><b>Conquista desbloqueada</b>${x.t}</p></div>`).join('')}</div>` : ''}
    <button class="cta" data-act="party-close">Fechar</button></div>`;
  $('#party').classList.add('on');
  confetti(prs.length || newAch.length ? 260 : 160);
  vibe(prs.length ? [60, 60, 60, 60, 200] : [40, 60, 120]);
}

/* ---------- Confete ---------- */
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti'), ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const cols = ['#E5484D', '#4A90FF', '#F2C230', '#3FB27F', '#ECE8DF'];
  const P = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .38,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 15 - 5, r: Math.random() * Math.PI,
    vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 8, c: cols[(Math.random() * 5) | 0]
  }));
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
    if (t - t0 < 3800) requestAnimationFrame(loop); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* =========================================================
   FOLHAS: detalhes do exercício, pular, etc.
   ========================================================= */
function sheet(html) {
  $('#sheet').innerHTML = `<div class="grab"></div>` + html;
  $('#sheet').scrollTop = 0;
  $('#scrim').classList.add('on'); $('#sheet').classList.add('on');
}
function closeSheet() { $('#scrim').classList.remove('on'); $('#sheet').classList.remove('on'); }

let infoCtx = null;
function openInfo(id, w, d) {
  infoCtx = [id, w, d];
  const X = EX[id], rx = plan(+w || S.week, d || S.day).find(r => r.id === id) || null;
  const hist = [];
  for (let i = S.sessions.length - 1; i >= 0 && hist.length < 6; i--) {
    const s = S.sessions[i], e = s.ex.find(x => x.id === id && !x.skip && x.sets.some(z => z.done));
    if (e) hist.push({ s, e });
  }
  const best = bestE1(id);
  sheet(`<div class="sh-h"><div><h2>${X.n}</h2><p>${X.pt}</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="media">${media(id, true)}</div>
    <div class="mine"><label>${I.photo}<span>${Photos.has(id) ? 'Trocar minhas fotos' : 'Usar minhas fotos'}</span><input type="file" accept="image/*" multiple data-photo="${id}"></label>
      ${Photos.has(id) ? `<button data-act="photo-del" data-id="${id}">Remover</button>` : ''}</div>
    <p class="figcap" style="margin-top:6px">Escolha 1 imagem com as duas posições ou 2 imagens (início e fim).</p>
    ${rx ? `<div class="rxbox">
      <div><span>Tipo</span><b>${rx.t === 'rir' ? '🎯 Parar com 1–2 reps sobrando' : '🔥 Só a última série até a falha'}</b></div>
      ${rx.w.length ? `<div><span>Aquecimento</span><b>${rx.w.map(([p, r]) => `${p}% × ${r}`).join(', ')}</b></div>` : ''}
      <div><span>Trabalho</span><b>${rxText(rx)}</b></div><div><span>Carga</span><b>${loadText(rx)}</b></div>
      <div><span>Descanso</span><b>${restText(rx.rest)}</b></div>
      ${best ? `<div><span>Seu 1RM estimado</span><b>${num(best)} kg</b></div>` : ''}</div>` : ''}
    <section class="blk"><h3>Passo a passo</h3><ol class="steps">${X.steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol></section>
    <section class="blk"><h3>Músculos trabalhados</h3>${bodyMap(X.p, X.s)}</section>
    <section class="blk"><h3>Dicas</h3><ul class="bul">${X.tips.map(s => `<li>${s}</li>`).join('')}</ul></section>
    <section class="blk"><h3>Erros comuns</h3><ul class="bul bad">${X.err.map(s => `<li>${s}</li>`).join('')}</ul></section>
    <section class="blk"><h3>Aparelho ocupado? Troque por</h3><div class="subs">${X.subs.map(s => `<div>${s}</div>`).join('')}</div></section>
    <section class="blk"><h3>Histórico</h3>${hist.length ? `<div class="hist">${hist.map(({ s, e }) => {
      const b = Math.max(...e.sets.filter(z => z.done).map(z => e1rm(parse(z.kg), parse(z.reps))));
      return `<div><span>${new Date(s.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}, semana ${s.week}</span>
        <span class="e1">${b ? num(b) + ' kg' : '–'}</span>
        <small>${e.sets.filter(z => z.done).map(z => `${num(parse(z.kg))}×${z.reps}`).join(', ')}</small></div>`; }).join('')}</div>
      <p class="figcap" style="margin-top:8px;text-align:left">O número à direita é o 1RM estimado de cada dia.</p>`
      : `<p class="empty">Ainda sem registros. Depois do primeiro treino, suas cargas aparecem aqui.</p>`}</section>`);
}

let skipReason = '';
function openSkip(i) {
  skipReason = '';
  const R = ['Aparelho ocupado', 'Dor ou desconforto', 'Sem tempo', 'Sem energia hoje'];
  sheet(`<div class="sh-h"><div><h2>Pular exercício</h2><p>${EX[S.active.ex[i].id].n}</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="opts">${R.map(r => `<button class="opt" data-act="reason" data-r="${r}">${r}</button>`).join('')}</div>
    <input class="txt" id="skip-txt" placeholder="Ou escreva o motivo" maxlength="80">
    <button class="cta" data-act="skip-ok" data-i="${i}">Pular exercício</button>`);
}

/* =========================================================
   ABAS
   ========================================================= */
function renderSoon() {
  const soon = (id, icon, title, text) => { $('#v-' + id).innerHTML = `<div class="soon">${icon}<h2>${title}</h2><p>${text}</p></div>`; };
}
function setTab(t) {
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + t));
  $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  if (t === 'analytics') renderAnalytics();
  if (t === 'dieta') renderDiet();
  if (t === 'agua') renderWater();
  if (t === 'treino') renderHome();
  if (t === 'perfil') renderProfile();
  scrollTo(0, 0);
}

/* ---------- Toast ---------- */
let toastT = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

/* =========================================================
   EVENTOS
   ========================================================= */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
  const d = b.dataset, i = +d.i, k = +d.k;
  switch (d.act) {
    case 'tab': setTab(d.t); break;
    case 'week': S.week = +d.w; save(); renderHome(); vibe(8); break;
    case 'day': S.day = d.d; save(); renderHome(); vibe(8); break;
    case 'start': startWorkout(); break;
    case 'resume': openWorkout(); break;
    case 'leave': closeWorkout(); break;
    case 'toggle': S.active.open = S.active.open === i ? -1 : i; save(); renderWorkout(); break;
    case 'set': toggleSet(i, k); break;
    case 'warm': S.active.ex[i].warm[k] = !S.active.ex[i].warm[k]; vibe(12); save(); renderWorkout(); break;
    case 'info': openInfo(d.id, d.w, d.d); break;
    case 'skip': openSkip(i); break;
    case 'reason': skipReason = d.r; $$('.opt').forEach(o => o.classList.toggle('on', o === b)); $('#skip-txt').value = ''; break;
    case 'skip-ok': {
      const r = ($('#skip-txt').value || '').trim() || skipReason || 'sem motivo';
      S.active.ex[i].skip = r; const nx = S.active.ex.findIndex((x, j) => j > i && !exComplete(x));
      S.active.open = nx; save(); closeSheet(); renderWorkout(); break;
    }
    case 'unskip': S.active.ex[i].skip = null; S.active.open = i; save(); renderWorkout(); break;
    case 'finish': askFinish(); break;
    case 'finish-now': finish(); break;
    case 'close': closeSheet(); break;
    case 'photo-del': Photos.del(d.id).then(() => { refreshMedia(); toast('Fotos removidas'); }); break;
    case 'rest-minus': addRest(-15); break;
    case 'rest-plus': addRest(15); break;
    case 'rest-skip': hideRest(); break;
    case 'party-close': $('#party').classList.remove('on'); renderHome(); break;
    case 'reset':
      if (confirm('Apagar todos os treinos e começar do zero? Isso não pode ser desfeito.')) { S = defaults(); save(); platesShown = -1; applyTheme(); renderHome(); renderProfile(); toast('Dados apagados'); }
      break;
  }
});
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.dataset.f || !S.active) return;
  const s = S.active.ex[+t.dataset.i].sets[+t.dataset.k];
  s[t.dataset.f] = t.dataset.f === 'kg' ? t.value.replace(',', '.') : t.value.replace(/\D/g, '');
  save();
});
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t.dataset.photo || !t.files.length) return;
  const files = [...t.files].slice(0, 2);
  toast('Preparando as imagens…');
  try {
    const imgs = [];
    for (const f of files) imgs.push(await prepImage(f));
    await Photos.put(t.dataset.photo, imgs);
    refreshMedia(); toast(imgs.length > 1 ? 'Fotos de início e fim salvas' : 'Foto salva');
  } catch (e) { toast('Não deu para abrir essa imagem. Tente outra em JPG ou PNG.'); }
});
document.addEventListener('focusin', ev => { if (ev.target.matches('.fld input')) ev.target.select(); });
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSheet(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.active && S.active.rest) drawRest(); });

/* ---------- Início ---------- */

