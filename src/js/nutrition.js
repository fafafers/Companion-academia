/* =========================================================
   DIETA E ÁGUA
   S.diet.plan  = refeições do plano
   S.diet.log   = só o dia de hoje: { meals: { m1: {kcal,p,c,f} } } (alimenta a calculadora)
   S.water.log[data] = [ { t: horário, ml } ]
   ========================================================= */
let dietOpen = {};
const todayKey = () => isoDay(Date.now());
const r1 = n => Math.round(n * 10) / 10;
const g1 = n => num(r1(n));
const sumFoods = foods => foods.reduce((a, x) => ({ kcal: a.kcal + (+x.kcal || 0), p: a.p + (+x.p || 0), c: a.c + (+x.c || 0), f: a.f + (+x.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
const kfmt = n => Math.round(n).toLocaleString('pt-BR');
const mlfmt = n => (n >= 1000 ? num(Math.round(n / 100) / 10) + ' L' : Math.round(n) + ' ml');

/* Refeições marcadas hoje (o check é só ajuda para a calculadora, sem histórico) */
function todayLog() { return S.diet.log[todayKey()] || { meals: {}, extras: [] }; }
function eatenToday() { return sumFoods(Object.values(todayLog().meals)); }
const ring = (pctv, color, size = 120, stroke = 12) => {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pctv));
  return `<svg viewBox="0 0 ${size} ${size}" class="ring-svg" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--s2)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-arc"/></svg>`;
};

/* =========================================================
   DIETA
   ========================================================= */
function planTotals() { return sumFoods(S.diet.plan.flatMap(m => m.foods)); }
function nextMeal() {
  const n = new Date(), mins = n.getHours() * 60 + n.getMinutes();
  const ms = S.diet.plan.map(m => { const [h, mm] = m.time.split(':').map(Number); return { m, at: h * 60 + mm }; }).sort((a, b) => a.at - b.at);
  const L = todayLog(), open = ms.filter(x => !L.meals[x.m.id]);   // pula as já marcadas
  if (!open.length) return null;
  return (open.find(x => x.at >= mins - 15) || open[0]).m;
}
function renderDiet() {
  const D = S.diet, G = D.goals, T = eatenToday(), P = planTotals(), L = todayLog();
  const n = D.plan.filter(m => L.meals[m.id]).length;
  const bar = (k, label, color) => {
    const left = G[k] - T[k];
    return `<div class="mac"><div class="mac-h"><span>${label}</span><b>${kfmt(T[k])}<small> / ${G[k]} g</small></b></div>
      <div class="mac-bar"><i style="width:${Math.min(100, T[k] / G[k] * 100)}%;background:${color}"></i></div>
      <small class="mac-left">${left > G[k] * 0.02 ? `faltam ${kfmt(left)} g` : 'meta atingida'}</small></div>`;
  };
  const diff = G.kcal - T.kcal, done = diff <= G.kcal * 0.02;   // até 2% de diferença conta como meta atingida
  const nm = nextMeal();
  $('#v-dieta').innerHTML = `
    <header class="an-top"><h1>Dieta</h1></header>
    <section class="an-card kcal-card">
      <div class="kcal-ring">${ring(T.kcal / G.kcal, done ? 'var(--green)' : 'var(--y)')}
        <div class="kcal-mid"><b>${kfmt(T.kcal)}</b><span>de ${kfmt(G.kcal)} kcal</span></div></div>
      <div class="kcal-side">
        <p class="kcal-left">${!n ? 'Marque o que já comeu e veja quanto falta.' : done ? `<b class="ok">Meta atingida ✓</b>` : `Faltam <b>${kfmt(diff)} kcal</b> hoje`}</p>
        ${bar('p', 'Proteína', 'var(--org)')}${bar('c', 'Carboidrato', 'var(--blue)')}${bar('f', 'Gordura', 'var(--y)')}
      </div>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Refeições de hoje</h2><span>${nm ? `próxima: ${esc(nm.name.toLowerCase())}, ${nm.time}` : 'todas marcadas'}</span></div>
      <div class="meals">${D.plan.map(m => mealRow(m, !!nm && m.id === nm.id, L)).join('')}</div>
      <p class="an-note">O plano completo soma ${kfmt(P.kcal)} kcal e ${Math.round(P.p)} g de proteína. As marcações recomeçam a cada dia.</p>
      <button class="ghost wide" data-act="dt-edit" style="margin-top:12px">Editar plano e metas</button>
    </section>`;
}
function mealRow(m, isNext, L) {
  const t = sumFoods(m.foods), open = dietOpen[m.id], done = !!L.meals[m.id];
  return `<div class="meal ${done ? 'done' : ''} ${isNext ? 'next' : ''}">
    <button class="meal-chk" data-act="dt-meal" data-id="${m.id}" aria-pressed="${done}" aria-label="Marcar ${esc(m.name)} como comida">${I.check}</button>
    <button class="meal-main" data-act="dt-open" data-id="${m.id}" aria-expanded="${!!open}">
      <span class="meal-t">${m.time}${isNext ? ' <em>próxima</em>' : ''}</span><b>${esc(m.name)}</b><small>${kfmt(t.kcal)} kcal, ${Math.round(t.p)} g proteína</small>
      <span class="chev">${open ? '−' : '+'}</span></button>
    ${open ? `<ul class="foods">${m.foods.map(f => `<li><span>${esc(f.n)}<small>${esc(f.q)}</small></span><em>${kfmt(f.kcal)}</em></li>`).join('')}
      <li class="tot"><span>P ${g1(t.p)} g, C ${g1(t.c)} g, G ${g1(t.f)} g</span><em>${kfmt(t.kcal)}</em></li></ul>` : ''}
  </div>`;
}

/* Edição do plano */
function openDietEdit() {
  const D = S.diet;
  sheet(`<div class="sh-h"><div><h2>Plano e metas</h2><p>As mudanças valem para os próximos registros.</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="bform">${[['kcal', 'Calorias (kcal)'], ['p', 'Proteína (g)'], ['c', 'Carboidrato (g)'], ['f', 'Gordura (g)']].map(([k, l]) =>
      `<label class="bf"><span>${l}</span><input inputmode="numeric" data-goal="${k}" value="${D.goals[k]}"></label>`).join('')}</div>
    ${D.plan.map((m, mi) => `<section class="blk ed-meal"><div class="ed-h"><input class="ed-time" value="${m.time}" data-mt="${mi}" aria-label="Horário"><input class="ed-name" value="${esc(m.name)}" data-mn="${mi}" aria-label="Nome da refeição"></div>
      ${m.foods.map((f, fi) => `<div class="ed-food"><span><b>${esc(f.n)}</b><small>${esc(f.q)}, ${kfmt(f.kcal)} kcal, P ${g1(f.p)} C ${g1(f.c)} G ${g1(f.f)}</small></span>
        <button data-act="dt-fdel" data-m="${mi}" data-f="${fi}" aria-label="Remover ${esc(f.n)}">${I.x}</button></div>`).join('')}
      <button class="linkadd" data-act="dt-fadd" data-m="${mi}">+ Adicionar alimento</button></section>`).join('')}
    <div class="row2" style="margin-top:18px"><button class="ghost" data-act="dt-reset">Restaurar plano original</button><button class="cta sm" data-act="dt-save">Salvar</button></div>`);
}
function openFoodForm(target) {
  sheet(`<div class="sh-h"><div><h2>Adicionar alimento</h2><p>Entra na refeição do plano.</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="bform">
      <label class="bf wide"><span>Alimento</span><input id="ff-n" placeholder="Ex.: Whey protein" style="font-family:var(--font);font-size:17px;font-weight:600"></label>
      <label class="bf wide"><span>Quantidade</span><input id="ff-q" placeholder="Ex.: 30 g" style="font-family:var(--font);font-size:17px;font-weight:600"></label>
      <label class="bf"><span>Calorias (kcal)</span><input id="ff-kcal" inputmode="decimal"></label>
      <label class="bf"><span>Proteína (g)</span><input id="ff-p" inputmode="decimal"></label>
      <label class="bf"><span>Carboidrato (g)</span><input id="ff-c" inputmode="decimal"></label>
      <label class="bf"><span>Gordura (g)</span><input id="ff-f" inputmode="decimal"></label>
    </div>
    ${target === 'extra' ? `<label class="tgl"><input type="checkbox" id="ff-fav"> <span>Salvar nos favoritos</span></label>` : ''}
    <button class="cta sm" data-act="dt-fsave" data-target="${target}">Adicionar</button>`);
}
function readFood() {
  const n = ($('#ff-n').value || '').trim(); if (!n) { toast('Dê um nome ao alimento'); return null; }
  return { n, q: ($('#ff-q').value || '').trim(), kcal: parse($('#ff-kcal').value), p: parse($('#ff-p').value), c: parse($('#ff-c').value), f: parse($('#ff-f').value) };
}

/* =========================================================
   ÁGUA
   ========================================================= */
function lastWeight() { const b = [...S.body].filter(x => x.weight).sort((a, c) => a.date.localeCompare(c.date)); return b.length ? b[b.length - 1].weight : null; }
function waterGoal() {
  if (S.water.goal) return S.water.goal;
  const w = lastWeight();
  return w ? Math.round(w * 35 / 50) * 50 : 2500;
}
const waterToday = (k = todayKey()) => (S.water.log[k] || []).reduce((a, x) => a + x.ml, 0);
function expectedNow() {
  const R = S.water.remind, [fh, fm] = R.from.split(':').map(Number), [th, tm] = R.to.split(':').map(Number);
  const n = new Date(), mins = n.getHours() * 60 + n.getMinutes(), a = fh * 60 + fm, b = th * 60 + tm;
  return Math.max(0, Math.min(1, (mins - a) / Math.max(1, b - a))) * waterGoal();
}
function bottle(p) {
  // nível: y = 214 (vazio) até 52 (cheio)
  const y = 214 - (214 - 52) * Math.min(1, p);
  return `<svg class="bottle" viewBox="0 0 120 226" role="img" aria-label="Garrafa com ${Math.round(p * 100)}% da meta">
    <defs><clipPath id="bclip"><path d="M44 34h32v14c14 8 22 20 22 36v120c0 10-8 18-18 18H40c-10 0-18-8-18-18V84c0-16 8-28 22-36z"/></clipPath></defs>
    <rect x="46" y="6" width="28" height="18" rx="4" fill="var(--s3)"/><rect x="42" y="22" width="36" height="12" rx="3" fill="var(--dim)"/>
    <path d="M44 34h32v14c14 8 22 20 22 36v120c0 10-8 18-18 18H40c-10 0-18-8-18-18V84c0-16 8-28 22-36z" fill="var(--s2)"/>
    <g clip-path="url(#bclip)"><g class="wfill" id="wfill" style="transform:translateY(${y}px)">
      <path class="wave w2" d="M0 6 Q15 0 30 6 T60 6 T90 6 T120 6 T150 6 T180 6 T210 6 T240 6 V240 H0Z" fill="#2F6FD6"/>
      <path class="wave w1" d="M0 4 Q15 10 30 4 T60 4 T90 4 T120 4 T150 4 T180 4 T210 4 T240 4 V240 H0Z" fill="var(--blue)"/></g></g>
    <path d="M44 34h32v14c14 8 22 20 22 36v120c0 10-8 18-18 18H40c-10 0-18-8-18-18V84c0-16 8-28 22-36z" fill="none" stroke="var(--line)" stroke-width="2"/>
    <path d="M32 92v100" stroke="#fff" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/></svg>`;
}
function renderWater(fromZero = true) {
  const W = S.water, goal = waterGoal(), k = todayKey(), got = waterToday(), p = got / goal, w = lastWeight();
  const log = (W.log[k] || []).slice().reverse();
  const days = Array.from({ length: 7 }, (_, i) => isoDay(Date.now() - (6 - i) * DAY));
  const hist = days.map((d, i) => { const v = waterToday(d); return { l: new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), v, t: v ? num(Math.round(v / 100) / 10) + 'L' : '', hi: v >= goal }; });
  const hit = hist.filter(h => h.v >= goal).length;
  $('#v-agua').innerHTML = `
    <header class="an-top"><h1>Água</h1></header>
    <section class="an-card water-card">
      <div class="water-row">${bottle(fromZero ? 0 : p)}
        <div class="water-info"><b id="w-got">${mlfmt(got)}</b><span>de ${mlfmt(goal)}</span>
          <div class="w-pct" id="w-pct">${Math.round(p * 100)}%</div><p class="w-msg" id="w-msg">${waterMsg(got, goal)}</p></div></div>
      <div class="cups">${W.cups.map(ml => `<button class="cup" data-act="w-add" data-ml="${ml}"><span>${ml >= 1000 ? '🫗' : ml >= 500 ? '🍶' : '🥛'}</span><b>+${ml >= 1000 ? num(ml / 1000) : ml}</b><small>${ml >= 1000 ? 'litro' : 'ml'}</small></button>`).join('')}</div>
      <div class="w-extra"><label class="fld w-custom"><input inputmode="numeric" id="w-ml" placeholder="0" aria-label="Outra quantidade em ml"><span>ml</span></label>
        <button class="ghost" data-act="w-custom">Adicionar</button></div>
      ${log.length ? `<div class="wlog">${log.map(x => `<span>${x.t} <b>+${x.ml} ml</b></span>`).join('')}<button class="linkbtn" data-act="w-undo">Desfazer o último</button></div>` : ''}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Últimos 7 dias</h2><span>meta batida em ${hit} de 7</span></div>
      ${barChart(hist, { label: 'Água por dia nos últimos 7 dias', h: 150 })}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Meta diária</h2><span>${W.goal ? 'definida por você' : w ? `${num(w)} kg × 35 ml` : 'padrão'}</span></div>
      <div class="w-goal"><label class="fld"><input inputmode="numeric" id="w-goal" value="${goal}"><span>ml</span></label>
        <button class="ghost" data-act="w-goal">Salvar</button>${W.goal ? `<button class="ghost" data-act="w-auto">Usar meu peso</button>` : ''}</div>
      ${!w && !W.goal ? `<p class="an-note">Registre seu peso em Analytics, aba Corpo, para a meta ser calculada (35 ml por kg).</p>` : ''}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Lembretes</h2><span>${W.remind.on ? 'ligados' : 'desligados'}</span></div>
      <label class="tgl big"><input type="checkbox" id="w-rem" ${W.remind.on ? 'checked' : ''}> <span>Lembrar de beber água</span></label>
      <div class="opts">${[60, 90, 120].map(m => `<button class="opt ${W.remind.every === m ? 'on' : ''}" data-act="w-every" data-m="${m}">A cada ${m === 60 ? '1 h' : m === 90 ? '1h30' : '2 h'}</button>`).join('')}</div>
      <div class="bform"><label class="bf"><span>Das</span><input type="time" id="w-from" value="${W.remind.from}"></label><label class="bf"><span>Até</span><input type="time" id="w-to" value="${W.remind.to}"></label></div>
      <p class="an-note">O lembrete conta a partir do último copo. Ele funciona com o app aberto ou recém-minimizado; com o app totalmente fechado, o Android pode não entregar.</p>
    </section>`;
  if (fromZero) requestAnimationFrame(() => requestAnimationFrame(() => setBottle(p)));
}
function setBottle(p) {
  const g = $('#wfill'); if (!g) return;
  g.style.transform = `translateY(${214 - (214 - 52) * Math.min(1, p)}px)`;
}
function waterMsg(got, goal) {
  if (got >= goal) return 'Meta batida. Hidratação em dia 💧';
  const exp = expectedNow(), falta = goal - got;
  if (got + 150 < exp) return `Faltam ${mlfmt(falta)}. Você está ${mlfmt(exp - got)} atrás do ritmo para este horário.`;
  return `Faltam ${mlfmt(falta)}. No ritmo certo para este horário.`;
}
function addWater(ml) {
  if (!(ml > 0) || ml > 3000) return toast('Valor inválido');
  const k = todayKey(), goal = waterGoal(), before = waterToday();
  const n = new Date();
  (S.water.log[k] = S.water.log[k] || []).push({ t: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, ml });
  save(); vibe(15); lastRemind = Date.now();
  const got = before + ml;
  // atualiza sem redesenhar a garrafa, para a água subir animada
  setBottle(got / goal);
  $('#w-got').textContent = mlfmt(got); $('#w-pct').textContent = Math.round(got / goal * 100) + '%'; $('#w-msg').textContent = waterMsg(got, goal);
  if (before < goal && got >= goal) { toast('Meta de água batida 💧'); confetti(90); vibe([40, 60, 120]); }
  achToast();
  clearTimeout(addWater.t); addWater.t = setTimeout(() => { const sy = scrollY; renderWater(false); scrollTo(0, sy); }, 900);
}

/* Notificação do sistema: pelo service worker na versão instalada, ou direto no navegador */
async function notify(body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification('Zézinho Bodybuilder', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'agua', renotify: true });
    else new Notification('Zézinho Bodybuilder', { body });
  } catch (e) {}
}

/* Lembretes (com o app aberto) */
let lastRemind = Date.now(), remindTimer = 0;
function startReminders() {
  clearInterval(remindTimer);
  remindTimer = setInterval(() => {
    const R = S.water.remind; if (!R.on) return;
    const n = new Date(), mins = n.getHours() * 60 + n.getMinutes();
    const [fh, fm] = R.from.split(':').map(Number), [th, tm] = R.to.split(':').map(Number);
    if (mins < fh * 60 + fm || mins > th * 60 + tm) return;
    const log = S.water.log[todayKey()] || [];
    const last = log.length ? new Date(`${todayKey()}T${log[log.length - 1].t}`).getTime() : 0;
    if (Date.now() - Math.max(last, lastRemind) < R.every * 60000) return;
    if (waterToday() >= waterGoal()) return;
    lastRemind = Date.now();
    toast(`Hora da água: faltam ${mlfmt(waterGoal() - waterToday())} 💧`); vibe([120, 80, 120]);
    notify(`Hora de beber água. Faltam ${mlfmt(waterGoal() - waterToday())}.`);
  }, 60000);
}

/* Resumo na tela inicial */
function homeMinis() {
  const goal = waterGoal(), got = waterToday(), G = S.diet.goals, T = eatenToday(), left = G.kcal - T.kcal, nm = nextMeal();
  return `<div class="minis">
    <button class="mini" data-act="tab" data-t="agua">${ring(got / goal, 'var(--blue)', 44, 6)}<span><b>${mlfmt(got)}</b><span>de ${mlfmt(goal)} de água</span></span></button>
    <button class="mini" data-act="tab" data-t="dieta">${ring(T.kcal / G.kcal, left <= G.kcal * 0.02 ? 'var(--green)' : 'var(--y)', 44, 6)}<span><b>${left <= G.kcal * 0.02 ? 'Meta ✓' : `Faltam ${kfmt(left)}`}</b><span>${left <= G.kcal * 0.02 ? 'calorias do dia' : (nm ? `kcal, próxima: ${esc(nm.name.toLowerCase())}` : 'kcal hoje')}</span></span></button>
  </div>`;
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="dt-"],[data-act^="w-"]'); if (!b || b.disabled) return;
  const d = b.dataset, D = S.diet;
  switch (d.act) {
    case 'dt-meal': {
      const k = todayKey(), L = todayLog(), m = S.diet.plan.find(x => x.id === d.id);
      if (L.meals[d.id]) delete L.meals[d.id]; else { L.meals[d.id] = sumFoods(m.foods); vibe(20); }
      // guarda só o dia de hoje: nada de histórico para cobrar
      S.diet.log = { [k]: L }; save(); renderDiet(); achToast(); break;
    }
    case 'dt-open': dietOpen[d.id] = !dietOpen[d.id]; renderDiet(); break;
    case 'dt-fadd': openFoodForm('m' + d.m); break;
    case 'dt-fsave': {
      const f = readFood(); if (!f) return;
      D.plan[+d.target.slice(1)].foods.push(f); save(); openDietEdit();
      break;
    }
    case 'dt-edit': openDietEdit(); break;
    case 'dt-fdel': D.plan[+d.m].foods.splice(+d.f, 1); save(); openDietEdit(); break;
    case 'dt-save':
      $$('[data-goal]').forEach(i => { const v = parse(i.value); if (v > 0) D.goals[i.dataset.goal] = v; });
      $$('[data-mt]').forEach(i => { if (/^\d{1,2}:\d{2}$/.test(i.value)) D.plan[+i.dataset.mt].time = i.value; });
      $$('[data-mn]').forEach(i => { if (i.value.trim()) D.plan[+i.dataset.mn].name = i.value.trim(); });
      save(); closeSheet(); renderDiet(); toast('Plano salvo'); break;
    case 'dt-reset':
      if (confirm('Voltar ao plano e metas originais? Suas mudanças no plano serão perdidas.')) { D.plan = JSON.parse(JSON.stringify(DIET_PLAN)); D.goals = { ...DIET_GOALS }; save(); closeSheet(); renderDiet(); }
      break;
    case 'w-add': addWater(+d.ml); break;
    case 'w-custom': { const v = parse($('#w-ml').value); addWater(v); $('#w-ml').value = ''; break; }
    case 'w-undo': { const L = S.water.log[todayKey()] || []; L.pop(); save(); renderWater(false); break; }
    case 'w-goal': { const v = parse($('#w-goal').value); if (v >= 500 && v <= 8000) { S.water.goal = v; save(); renderWater(false); toast('Meta salva'); } else toast('Use um valor entre 500 e 8.000 ml'); break; }
    case 'w-auto': S.water.goal = null; save(); renderWater(false); break;
    case 'w-every': S.water.remind.every = +d.m; save(); renderWater(false); break;
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'w-rem') {
    S.water.remind.on = t.checked; save(); lastRemind = Date.now();
    if (t.checked) { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
    renderWater(false);
  }
  if (t.id === 'w-from' || t.id === 'w-to') { S.water.remind[t.id === 'w-from' ? 'from' : 'to'] = t.value; save(); }
});
