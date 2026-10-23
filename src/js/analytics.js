/* =========================================================
   ANALYTICS — progresso, recordes, frequência, corpo
   Tudo calculado a partir de S.sessions e S.body.
   ========================================================= */
const DAY = 864e5;
let anTab = 'geral', anEx = null, anCmp = [];
const MAJOR = ['chest', 'lats', 'upperback', 'delts', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps'];
const MEAS = [['weight', 'Peso', 'kg'], ['waist', 'Cintura', 'cm'], ['chest', 'Peito', 'cm'], ['arm', 'Braço', 'cm'], ['thigh', 'Coxa', 'cm']];

/* ---------- Utilidades de data ---------- */
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const weekStart = d => { const x = new Date(dayStart(d)); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
const fmtDay = d => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);

/* ---------- Estatísticas por treino ---------- */
function sesStats(s) {
  const list = plan(s.week, s.day);
  let planned = 0, done = 0, vol = 0;
  const sets = {};                         // séries feitas por músculo principal
  s.ex.forEach((e, i) => {
    const rx = list[i] || { s: e.sets.length, u: 'kg' };
    planned += rx.s;
    if (e.skip) return;
    e.sets.forEach(z => {
      if (!z.done) return;
      done++;
      vol += parse(z.kg) * parse(z.reps) * volMult(rx);
      (EX[e.id] ? EX[e.id].p : []).forEach(m => { sets[m] = (sets[m] || 0) + 1; });
    });
  });
  return { planned, done, vol, sets, date: new Date(s.date).getTime() };
}
function rangeStats(from, to) {
  const r = { n: 0, planned: 0, done: 0, vol: 0, sets: {}, prs: [], skips: [], min: 0 };
  S.sessions.forEach(s => {
    const t = new Date(s.date).getTime(); if (t < from || t >= to) return;
    const st = sesStats(s);
    r.n++; r.planned += st.planned; r.done += st.done; r.vol += st.vol; r.min += s.dur || 0;
    for (const m in st.sets) r.sets[m] = (r.sets[m] || 0) + st.sets[m];
    r.prs.push(...(s.prs || []));
    s.ex.forEach(e => { if (e.skip) r.skips.push({ id: e.id, why: e.skip }); });
  });
  return r;
}
/* Histórico de um exercício: melhor série por treino */
function exHistory(id) {
  const out = [];
  S.sessions.forEach(s => {
    const e = s.ex.find(x => x.id === id && !x.skip && x.sets.some(z => z.done));
    if (!e) return;
    let best = null;
    e.sets.forEach(z => {
      if (!z.done) return;
      const kg = parse(z.kg), reps = parse(z.reps), v = e1rm(kg, reps);
      if (!best || v > best.e1 || (v === best.e1 && kg > best.kg)) best = { kg, reps, e1: v };
    });
    const top = Math.max(...e.sets.filter(z => z.done).map(z => parse(z.kg)));
    const reps = e.sets.filter(z => z.done).reduce((a, z) => a + parse(z.reps), 0);
    out.push({ t: new Date(s.date).getTime(), week: s.week, best, top, reps, sets: e.sets.filter(z => z.done) });
  });
  return out;
}

/* ---------- Gráficos em SVG ---------- */
function lineChart(series, opt = {}) {
  const W = 340, H = opt.h || 170, P = { l: 36, r: 12, t: 14, b: 26 };
  const pts = series.flatMap(s => s.pts);
  if (pts.length < 1) return '';
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
  let y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  if (x0 === x1) { x0 -= DAY; x1 += DAY; }
  const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.1); y0 -= pad; y1 += pad;
  if (opt.zero) y0 = Math.min(0, y0);
  const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r), Y = y => H - P.b - (y - y0) / (y1 - y0) * (H - P.t - P.b);
  let g = '';
  for (let k = 0; k <= 3; k++) {
    const v = y0 + (y1 - y0) * k / 3, y = Y(v);
    g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="ch-grid"/><text x="${P.l - 6}" y="${y + 4}" class="ch-ax" text-anchor="end">${num(Math.round(v * 10) / 10)}</text>`;
  }
  g += `<text x="${P.l}" y="${H - 6}" class="ch-ax">${fmtDay(x0 + (pts.length > 1 ? 0 : DAY))}</text><text x="${W - P.r}" y="${H - 6}" class="ch-ax" text-anchor="end">${fmtDay(x1 - (pts.length > 1 ? 0 : DAY))}</text>`;
  series.forEach(s => {
    const sp = [...s.pts].sort((a, b) => a.x - b.x);
    if (sp.length > 1) {
      const d = sp.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
      if (s.fill) g += `<path d="${d} L${X(sp[sp.length - 1].x).toFixed(1)} ${H - P.b} L${X(sp[0].x).toFixed(1)} ${H - P.b} Z" fill="${s.color}" opacity=".12"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="4 4"' : ''}/>`;
    }
    sp.forEach(p => { g += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.hi ? 5 : 3.2}" fill="${p.hi ? 'var(--y)' : s.color}" stroke="var(--s1)" stroke-width="1.5"/>`; });
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Gráfico')}">${g}</svg>`;
}
function barChart(items, opt = {}) {
  const W = 340, H = opt.h || 160, P = { l: 8, r: 8, t: 18, b: 26 };
  const max = Math.max(1, ...items.map(i => i.v));
  const bw = (W - P.l - P.r) / items.length;
  let g = '';
  items.forEach((it, k) => {
    const h = (H - P.t - P.b) * it.v / max, x = P.l + k * bw + bw * 0.18, y = H - P.b - h;
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(it.v ? 2 : 0, h).toFixed(1)}" rx="4" fill="${it.hi ? 'var(--y)' : 'var(--s3)'}"/>`;
    if (it.v) g += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${(y - 5).toFixed(1)}" class="ch-val" text-anchor="middle">${it.t || num(it.v)}</text>`;
    g += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${H - 8}" class="ch-ax" text-anchor="middle">${it.l}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Gráfico de barras')}">${g}</svg>`;
}
function heatmap() {
  const weeks = 18, today = dayStart(Date.now()), start = weekStart(today) - (weeks - 1) * 7 * DAY;
  const byDay = {};
  S.sessions.forEach(s => { const k = dayStart(s.date); byDay[k] = (byDay[k] || 0) + sesStats(s).done; });
  const C = 16, G = 3, L = 22;
  let g = '';
  ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach((d, r) => { if (r % 2 === 0) g += `<text x="0" y="${r * (C + G) + C - 4}" class="ch-ax">${d}</text>`; });
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const ws = start + w * 7 * DAY, m = new Date(ws).getMonth();
    if (m !== lastMonth) { g += `<text x="${L + w * (C + G)}" y="${7 * (C + G) + 10}" class="ch-ax">${new Date(ws).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</text>`; lastMonth = m; }
    for (let d = 0; d < 7; d++) {
      const t = ws + d * DAY; if (t > today) continue;
      const v = byDay[t] || 0, lvl = v ? (v >= 20 ? 3 : v >= 10 ? 2 : 1) : 0;
      g += `<rect x="${L + w * (C + G)}" y="${d * (C + G)}" width="${C}" height="${C}" rx="4" class="hm hm${lvl}${t === today ? ' hm-today' : ''}"><title>${fmtDay(t)}: ${v ? v + ' séries' : 'descanso'}</title></rect>`;
    }
  }
  return `<svg class="chart" viewBox="0 0 ${L + weeks * (C + G)} ${7 * (C + G) + 14}" role="img" aria-label="Calendário de treinos das últimas ${weeks} semanas">${g}</svg>`;
}

/* ---------- Insights automáticos ---------- */
function insights(cur, prev, label) {
  const out = [];
  if (!cur.n) return [`Nenhum treino registrado ${label === 'semana' ? 'nesta semana' : 'neste mês'} ainda.`];
  if (prev.n) {
    const d = cur.n - prev.n;
    out.push(d > 0 ? `${cur.n} treinos, ${d} a mais que no mesmo ponto ${label === 'semana' ? 'da semana passada' : 'do mês anterior'}.` :
      d < 0 ? `${cur.n} treino${cur.n > 1 ? 's' : ''}, ${-d} a menos que no mesmo ponto ${label === 'semana' ? 'da semana passada' : 'do mês anterior'}.` :
        `${cur.n} treino${cur.n > 1 ? 's' : ''}, o mesmo ritmo ${label === 'semana' ? 'da semana passada' : 'do mês anterior'}.`);
    if (prev.vol > 0 && cur.vol > 0) {
      const v = Math.round((cur.vol - prev.vol) / prev.vol * 100);
      if (Math.abs(v) >= 5) out.push(`Volume ${v > 0 ? 'subiu' : 'caiu'} ${Math.abs(v)}% (${num(Math.round(cur.vol / 100) / 10)} t).`);
    }
  } else out.push(`${cur.n} treino${cur.n > 1 ? 's' : ''} e ${cur.done} séries feitas.`);
  if (cur.prs.length) out.push(`🏆 ${cur.prs.length} recorde${cur.prs.length > 1 ? 's' : ''}: ${[...new Set(cur.prs)].slice(0, 3).map(id => EX[id].n).join(', ')}.`);
  const top = Object.entries(cur.sets).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push(`Músculo mais treinado: ${MUSCLES[top[0]].toLowerCase()}, com ${top[1]} séries.`);
  if (label === 'semana' && cur.n >= 2) {
    const miss = MAJOR.filter(m => !cur.sets[m]);
    if (miss.length && miss.length <= 4) out.push(`Sem séries ainda para ${miss.map(m => MUSCLES[m].toLowerCase()).join(', ')}.`);
  }
  const rate = pct(cur.done, cur.planned);
  if (rate < 85) out.push(`Conclusão de ${rate}% das séries planejadas.`);
  else out.push(`Conclusão de ${rate}% das séries planejadas. Consistência em dia.`);
  if (cur.skips.length) {
    const why = {}; cur.skips.forEach(s => { why[s.why] = (why[s.why] || 0) + 1; });
    const w = Object.entries(why).sort((a, b) => b[1] - a[1])[0];
    out.push(`${cur.skips.length} exercício${cur.skips.length > 1 ? 's' : ''} pulado${cur.skips.length > 1 ? 's' : ''}, mais por “${w[0].toLowerCase()}”.`);
  }
  return out;
}

/* =========================================================
   RENDER
   ========================================================= */
function renderAnalytics() {
  const tabs = [['geral', 'Visão geral'], ['ex', 'Exercícios'], ['corpo', 'Corpo']];
  $('#v-analytics').innerHTML = `
    <header class="an-top"><h1>Progresso</h1>
      <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${anTab === k}" class="${anTab === k ? 'on' : ''}" data-act="an-tab" data-k="${k}">${l}</button>`).join('')}</div></header>
    <div id="an-body">${anTab === 'geral' ? anGeral() : anTab === 'ex' ? anExercises() : anCorpo()}</div>`;
  if (anTab === 'corpo') loadProgPhotos();
}

/* ---------- Visão geral ---------- */
function anGeral() {
  if (!S.sessions.length) return `<div class="empty big">Conclua o primeiro treino e seus gráficos aparecem aqui: carga por exercício, volume semanal, recordes e frequência.</div>`;
  const now = Date.now(), ws = weekStart(now);
  const wk = rangeStats(ws, ws + 7 * DAY), pw = rangeStats(ws - 7 * DAY, Math.min(ws, now - 7 * DAY));   // semana passada até o mesmo dia
  const ms = new Date(now); ms.setDate(1); ms.setHours(0, 0, 0, 0);
  const pm = new Date(ms); pm.setMonth(pm.getMonth() - 1);
  const pmEnd = new Date(now); pmEnd.setMonth(pmEnd.getMonth() - 1);
  const mo = rangeStats(ms.getTime(), now + DAY), pmo = rangeStats(pm.getTime(), Math.min(ms.getTime(), pmEnd.getTime()));   // mês anterior até o mesmo dia
  // volume e treinos por semana (últimas 8)
  const weeks = Array.from({ length: 8 }, (_, k) => { const a = ws - (7 - k) * 7 * DAY; return { a, r: rangeStats(a, a + 7 * DAY) }; });
  const volBars = weeks.map((w, k) => ({ l: fmtDay(w.a).split(' ')[0] + '/' + (new Date(w.a).getMonth() + 1), v: Math.round(w.r.vol), t: w.r.vol >= 1000 ? num(Math.round(w.r.vol / 100) / 10) + 't' : String(Math.round(w.r.vol)), hi: k === 7 }));
  // séries por grupo muscular (últimos 7 dias)
  const last7 = rangeStats(dayStart(now) - 6 * DAY, now + DAY);
  const groups = Object.entries(last7.sets).sort((a, b) => b[1] - a[1]);
  const maxG = Math.max(1, ...groups.map(g => g[1]));
  // conclusão
  const all = rangeStats(0, now + DAY);
  const lastS = S.sessions.slice(-8).map(s => ({ s, st: sesStats(s) }));
  return `
    <section class="an-card">
      <div class="an-h"><h2>Esta semana</h2><span>${fmtDay(ws)} a ${fmtDay(ws + 6 * DAY)}</span></div>
      <div class="kpis"><div><b>${wk.n}</b><span>treinos</span></div><div><b>${wk.done}</b><span>séries</span></div>
        <div><b>${wk.vol >= 1000 ? num(Math.round(wk.vol / 100) / 10) + 't' : Math.round(wk.vol)}</b><span>${wk.vol >= 1000 ? 'volume' : 'kg de volume'}</span></div><div><b>${wk.prs.length}</b><span>recordes</span></div></div>
      <ul class="ins">${insights(wk, pw, 'semana').map(t => `<li>${t}</li>`).join('')}</ul>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Este mês</h2><span>${new Date(now).toLocaleDateString('pt-BR', { month: 'long' })}</span></div>
      <ul class="ins">${insights(mo, pmo, 'mês').map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="an-note">Média de ${num(Math.round(mo.n / Math.max(1, (now - ms.getTime()) / (7 * DAY)) * 10) / 10)} treinos por semana e ${mo.min} minutos treinados.</p>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Frequência</h2><span>${S.sessions.length} treinos no total</span></div>
      <div class="scroll-x">${heatmap()}</div>
      <div class="hm-leg"><span>Descanso</span><i class="hm0"></i><i class="hm1"></i><i class="hm2"></i><i class="hm3"></i><span>Mais séries</span></div>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Volume por semana</h2><span>séries × reps × carga</span></div>
      ${barChart(volBars, { label: 'Volume por semana' })}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Séries por grupo muscular</h2><span>últimos 7 dias</span></div>
      ${groups.length ? `<div class="mbars">${groups.map(([m, v]) => `<div class="mbar"><span>${MUSCLES[m]}</span><div><i style="width:${v / maxG * 100}%"></i></div><b>${v}</b></div>`).join('')}</div>
        <p class="an-note">Conta as séries feitas para o músculo principal de cada exercício.</p>` : `<p class="empty">Nenhuma série nos últimos 7 dias.</p>`}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Feito vs. planejado</h2><span>${pct(all.done, all.planned)}% no geral</span></div>
      <div class="donerow">${lastS.map(({ s, st }) => { const p = pct(st.done, st.planned); return `<div class="done-col" title="${fmtDay(s.date)}: ${st.done} de ${st.planned} séries">
        <div class="done-bar"><i style="height:${p}%" class="${p >= 90 ? 'ok' : p >= 60 ? 'mid' : 'low'}"></i></div><b>${p}%</b><span>${s.day}${s.week}</span></div>`; }).join('')}</div>
      ${all.skips.length ? `<p class="an-note">Pulados: ${all.skips.slice(-4).reverse().map(k => `${EX[k.id].n} (${esc(k.why)})`).join(', ')}.</p>` : ''}
    </section>`;
}

/* ---------- Exercícios ---------- */
function anExercises() {
  const seen = new Map();
  for (let i = S.sessions.length - 1; i >= 0; i--) S.sessions[i].ex.forEach(e => { if (!e.skip && e.sets.some(z => z.done) && !seen.has(e.id)) seen.set(e.id, new Date(S.sessions[i].date).getTime()); });
  if (!seen.size) return `<div class="empty big">Ainda sem séries registradas. Cada exercício que você fizer ganha um gráfico de evolução aqui.</div>`;
  if (!anEx || !seen.has(anEx)) anEx = [...seen.keys()][0];
  const h = exHistory(anEx), X = EX[anEx];
  const bestIdx = h.reduce((b, p, i) => (h[b].best.e1 >= p.best.e1 ? b : i), 0);
  const e1Pts = h.filter(p => p.best.e1 > 0).map((p, i) => ({ x: p.t, y: Math.round(p.best.e1 * 10) / 10, hi: h.indexOf(p) === bestIdx }));
  const topPts = h.filter(p => p.top > 0).map(p => ({ x: p.t, y: p.top }));
  const repsPts = h.map(p => ({ x: p.t, y: p.reps }));
  const bw = !e1Pts.length;   // exercício de peso corporal
  const first = h[0], last = h[h.length - 1];
  const gain = !bw && first.best.e1 ? Math.round((last.best.e1 - first.best.e1) / first.best.e1 * 100) : 0;
  // recordes de todos os exercícios
  const prs = [...seen.keys()].map(id => { const hh = exHistory(id); const b = hh.reduce((m, p) => (!m || p.best.e1 > m.best.e1 ? p : m), null); return { id, b }; })
    .filter(p => p.b && p.b.best.e1 > 0).sort((a, b) => b.b.t - a.b.t);
  return `
    <div class="chips scroll-x">${[...seen.keys()].map(id => `<button class="chip-btn ${id === anEx ? 'on' : ''}" data-act="an-ex" data-id="${id}">${EX[id].n}</button>`).join('')}</div>
    <section class="an-card">
      <div class="an-h"><h2>${X.n}</h2><span>${h.length} treino${h.length > 1 ? 's' : ''}</span></div>
      ${bw ? `<div class="kpis three"><div><b>${Math.max(...h.map(p => p.reps))}</b><span>mais reps num treino</span></div><div><b>${last.reps}</b><span>reps no último</span></div><div><b>${h.length}</b><span>treinos</span></div></div>
        ${lineChart([{ pts: repsPts, color: 'var(--blue)', fill: true }], { label: 'Repetições totais por treino' })}<p class="an-note">Repetições totais por treino.</p>`
      : `<div class="kpis three"><div><b>${num(Math.round(h[bestIdx].best.e1 * 10) / 10)}</b><span>1RM estimado (kg)</span></div><div><b>${num(Math.max(...h.map(p => p.top)))}</b><span>maior carga (kg)</span></div>
        <div><b class="${gain > 0 ? 'up' : gain < 0 ? 'down' : ''}">${gain > 0 ? '+' : ''}${gain}%</b><span>desde o 1º treino</span></div></div>
        ${lineChart([{ pts: e1Pts, color: 'var(--y)', fill: true }, { pts: topPts, color: 'var(--blue)', dash: true }], { label: 'Evolução de carga' })}
        <div class="ch-leg"><span><i style="background:var(--y)"></i>1RM estimado</span><span><i style="background:var(--blue)"></i>maior carga do dia</span><span><i class="dot"></i>recorde</span></div>`}
      <div class="hist">${[...h].reverse().slice(0, 6).map(p => `<div><span>${fmtDay(p.t)}, semana ${p.week}</span><span class="e1">${p.best.e1 ? num(Math.round(p.best.e1 * 10) / 10) + ' kg' : p.reps + ' reps'}</span>
        <small>${p.sets.map(z => `${num(parse(z.kg))}×${z.reps}`).join(', ')}</small></div>`).join('')}</div>
    </section>
    ${prs.length ? `<section class="an-card"><div class="an-h"><h2>Recordes pessoais</h2><span>1RM estimado</span></div>
      <div class="prlist">${prs.slice(0, 6).map(prRow).join('')}</div>
      ${prs.length > 6 ? `<details class="prmore"><summary>Ver todos (${prs.length})</summary><div class="prlist">${prs.slice(6).map(prRow).join('')}</div></details>` : ''}
      <p class="an-note">1RM estimado pela fórmula de Epley: carga × (1 + reps ÷ 30). Para halteres, vale a carga de um haltere.</p></section>` : ''}`;
}

const prRow = p => `<button data-act="an-ex" data-id="${p.id}"><span><b>${EX[p.id].n}</b><small>${num(p.b.best.kg)} kg × ${p.b.best.reps}, ${fmtDay(p.b.t)}</small></span><em>${num(Math.round(p.b.best.e1 * 10) / 10)}</em></button>`;

/* ---------- Corpo: peso, medidas e fotos ---------- */
function anCorpo() {
  const B = [...S.body].sort((a, b) => a.date.localeCompare(b.date));
  const last = B[B.length - 1] || {}, first = B[0] || {};
  const wPts = B.filter(b => b.weight).map(b => ({ x: new Date(b.date + 'T12:00').getTime(), y: b.weight }));
  const delta = k => (first[k] && last[k] && B.length > 1 ? Math.round((last[k] - first[k]) * 10) / 10 : null);
  return `
    <section class="an-card">
      <div class="an-h"><h2>Registrar medidas</h2><span>em branco o que não medir</span></div>
      <div class="bform">
        <label class="bf wide"><span>Data</span><input type="date" id="b-date" value="${isoDay(Date.now())}"></label>
        ${MEAS.map(([k, l, u]) => `<label class="bf"><span>${l} (${u})</span><input id="b-${k}" inputmode="decimal" placeholder="${last[k] ? num(last[k]) : '–'}"></label>`).join('')}
      </div>
      <button class="cta sm" data-act="an-body-save">Salvar medidas</button>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Peso corporal</h2><span>${last.weight ? num(last.weight) + ' kg' : 'sem registros'}</span></div>
      ${wPts.length ? lineChart([{ pts: wPts, color: 'var(--green)', fill: true }], { label: 'Peso corporal' }) : '<p class="empty">Registre seu peso para ver a evolução. Ele também calcula a sua meta de água na etapa 3.</p>'}
      ${B.length > 1 ? `<div class="mdelta">${MEAS.map(([k, l, u]) => { const d = delta(k); return d === null ? '' : `<div><span>${l}</span><b>${num(last[k])} ${u}</b><em>${d > 0 ? '+' : ''}${num(d)}</em></div>`; }).join('')}</div>
        <p class="an-note">Diferença desde ${fmtDay(first.date + 'T12:00')}.</p>` : ''}
      ${B.length ? `<details class="blist"><summary>Ver registros (${B.length})</summary>${[...B].reverse().map(b => `<div><span>${fmtDay(b.date + 'T12:00')}</span><span>${MEAS.filter(([k]) => b[k]).map(([k, l, u]) => `${l} ${num(b[k])}${u === 'kg' ? ' kg' : ''}`).join(', ')}</span>
        <button data-act="an-body-del" data-d="${b.date}" aria-label="Apagar registro">${I.x}</button></div>`).join('')}</details>` : ''}
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Fotos de progresso</h2><span>ficam só no seu celular</span></div>
      <div id="prog-cmp"></div>
      <div id="prog-grid" class="pgrid"><p class="an-note">Carregando…</p></div>
      <label class="addimg"> ${I.photo}Adicionar foto<input type="file" accept="image/*" data-prog="1"></label>
      <p class="an-note">Toque em duas fotos para comparar lado a lado.</p>
    </section>`;
}

/* Fotos de progresso (IndexedDB, store "prog") */
let progCache = [];
async function progAll() {
  try {
    const db = await Photos.open();
    return await new Promise(res => {
      const out = [], rq = db.transaction('prog').objectStore('prog').openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { out.push({ key: c.key, ...c.value }); c.continue(); } else res(out); };
      rq.onerror = () => res(out);
    });
  } catch (e) { return []; }
}
async function loadProgPhotos() {
  progCache = (await progAll()).sort((a, b) => a.date.localeCompare(b.date));
  if (anCmp.length === 0 && progCache.length >= 2) anCmp = [progCache[0].key, progCache[progCache.length - 1].key];
  drawProg();
}
function drawProg() {
  const grid = $('#prog-grid'), cmp = $('#prog-cmp'); if (!grid) return;
  grid.innerHTML = progCache.length ? progCache.map(p => `<button class="pthumb ${anCmp.includes(p.key) ? 'on' : ''}" data-act="an-pick" data-k="${p.key}">
      <img src="${p.img}" alt="Foto de ${fmtDay(p.date + 'T12:00')}"><span>${fmtDay(p.date + 'T12:00')}</span></button>`).join('')
    : `<p class="empty">Nenhuma foto ainda. Tire sempre no mesmo lugar e com a mesma luz para comparar melhor.</p>`;
  const sel = anCmp.map(k => progCache.find(p => p.key === k)).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  cmp.innerHTML = sel.length === 2 ? `<div class="pcmp">${sel.map((p, i) => `<figure><img src="${p.img}" alt=""><figcaption>${i ? 'Depois' : 'Antes'}, ${fmtDay(p.date + 'T12:00')}</figcaption></figure>`).join('')}</div>
    <p class="an-note">${Math.round((new Date(sel[1].date) - new Date(sel[0].date)) / DAY)} dias entre as fotos. <button class="linkbtn" data-act="an-pdel" data-k="${sel[1].key}">Apagar a foto “depois”</button></p>` : '';
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="an-"]'); if (!b) return;
  const d = b.dataset;
  if (d.act === 'an-tab') { anTab = d.k; renderAnalytics(); }
  if (d.act === 'an-ex') { anEx = d.id; anTab = 'ex'; renderAnalytics(); scrollTo({ top: 0, behavior: 'smooth' }); }
  if (d.act === 'an-body-save') {
    const date = $('#b-date').value || isoDay(Date.now()), rec = { date };
    let any = false;
    MEAS.forEach(([k]) => { const v = parse($('#b-' + k).value); if (v > 0) { rec[k] = v; any = true; } });
    if (!any) return toast('Preencha pelo menos uma medida');
    const i = S.body.findIndex(x => x.date === date);
    if (i >= 0) S.body[i] = { ...S.body[i], ...rec }; else S.body.push(rec);
    save(); renderAnalytics(); toast('Medidas salvas'); vibe(15); achToast();
  }
  if (d.act === 'an-body-del') { S.body = S.body.filter(x => x.date !== d.d); save(); renderAnalytics(); }
  if (d.act === 'an-pick') {
    const k = +d.k;
    anCmp = anCmp.includes(k) ? anCmp.filter(x => x !== k) : [...anCmp, k].slice(-2);
    drawProg();
  }
  if (d.act === 'an-pdel' && confirm('Apagar esta foto?')) {
    Photos.open().then(db => { db.transaction('prog', 'readwrite').objectStore('prog').delete(+d.k); anCmp = []; setTimeout(loadProgPhotos, 100); });
  }
});
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t.dataset.prog || !t.files.length) return;
  try {
    const img = await prepImage(t.files[0]), key = Date.now();
    const db = await Photos.open();
    db.transaction('prog', 'readwrite').objectStore('prog').put({ date: isoDay(Date.now()), img }, key);
    anCmp = []; setTimeout(loadProgPhotos, 100); toast('Foto salva');
  } catch (e) { toast('Não deu para abrir essa imagem. Tente outra em JPG ou PNG.'); }
});
