/* =========================================================
   PERFIL — conquistas, sequência, totais e configurações
   S.ach = { idDaConquista: dataDoDesbloqueio }
   ========================================================= */

/* ---------- Métricas usadas pelas conquistas ---------- */
function bestStreak() {
  const days = [...new Set(S.sessions.map(s => dayStart(s.date)))].sort((a, b) => a - b);
  let best = 0, run = 0;
  days.forEach((d, i) => { run = i && (d - days[i - 1]) / DAY <= 3 ? run + 1 : 1; best = Math.max(best, run); });
  return Math.max(best, streak());
}
function fullWeeks() {
  let n = 0, wk = null, seen = new Set();
  S.sessions.forEach(s => {
    if (s.week !== wk) { wk = s.week; seen = new Set(); }
    seen.add(s.day);
    if (seen.size === 3) { n++; seen = new Set(); wk = null; }
  });
  return n;
}
const perfectCount = () => S.sessions.filter(s => s.ex.every(e => !e.skip && e.sets.every(z => z.done))).length;
const totalPRs = () => S.sessions.reduce((a, s) => a + (s.prs || []).length, 0);
const totalVol = () => S.sessions.reduce((a, s) => a + (s.vol || 0), 0);
const waterDays = () => Object.keys(S.water.log).filter(k => waterToday(k) >= waterGoal()).length;

const ACH = [
  { id: 'first', icon: '🏁', t: 'Primeiro treino', d: 'Conclua seu primeiro treino', goal: 1, val: () => S.sessions.length },
  { id: 't10', icon: '🔟', t: '10 treinos', d: 'Conclua 10 treinos', goal: 10, val: () => S.sessions.length },
  { id: 't25', icon: '🥉', t: '25 treinos', d: 'Conclua 25 treinos', goal: 25, val: () => S.sessions.length },
  { id: 't50', icon: '🥈', t: '50 treinos', d: 'Conclua 50 treinos', goal: 50, val: () => S.sessions.length },
  { id: 't100', icon: '🥇', t: '100 treinos', d: 'Conclua 100 treinos', goal: 100, val: () => S.sessions.length },
  { id: 's3', icon: '🔥', t: 'Pegando fogo', d: '3 treinos em sequência', goal: 3, val: bestStreak },
  { id: 's9', icon: '☄️', t: 'Imparável', d: '9 treinos em sequência', goal: 9, val: bestStreak },
  { id: 's18', icon: '🌋', t: 'Lenda da constância', d: '18 treinos em sequência', goal: 18, val: bestStreak },
  { id: 'week', icon: '📅', t: 'Semana fechada', d: 'Faça os treinos A, B e C da mesma semana', goal: 1, val: fullWeeks },
  { id: 'cycle', icon: '🏆', t: 'Ciclo completo', d: 'Conclua o Treino C da semana 12', goal: 1, val: () => S.sessions.filter(s => s.week === 12 && s.day === 'C').length },
  { id: 'pr1', icon: '💥', t: 'Primeiro recorde', d: 'Bata um recorde pessoal', goal: 1, val: totalPRs },
  { id: 'pr10', icon: '📈', t: 'Colecionador de PRs', d: 'Bata 10 recordes pessoais', goal: 10, val: totalPRs },
  { id: 'perfect', icon: '✨', t: 'Treino perfeito', d: 'Todas as séries feitas, nenhum exercício pulado', goal: 1, val: perfectCount },
  { id: 'early', icon: '🌅', t: 'Madrugador', d: 'Termine um treino antes das 9h', goal: 1, val: () => S.sessions.filter(s => new Date(s.date).getHours() < 9).length },
  { id: 'vol5', icon: '🏗️', t: '5 toneladas', d: '5 t de volume em um treino', goal: 5000, val: () => Math.max(0, ...S.sessions.map(s => s.vol || 0)), fmt: v => num(Math.round(v / 100) / 10) + ' t' },
  { id: 'vol100', icon: '🚛', t: '100 toneladas', d: '100 t de volume somado', goal: 100000, val: totalVol, fmt: v => num(Math.round(v / 100) / 10) + ' t' },
  { id: 'water1', icon: '💧', t: 'Hidratado', d: 'Bata a meta de água em um dia', goal: 1, val: waterDays },
  { id: 'water7', icon: '🌊', t: 'Oceano', d: 'Bata a meta de água em 7 dias', goal: 7, val: waterDays },
  { id: 'diet', icon: '🍽️', t: 'No alvo', d: 'Atinja a meta de calorias do dia', goal: 1, val: () => (eatenToday().kcal >= S.diet.goals.kcal * 0.98 ? 1 : 0) },
  { id: 'body', icon: '📏', t: 'Fita métrica', d: 'Registre peso ou medidas', goal: 1, val: () => S.body.length }
];

/* Desbloqueia o que foi alcançado; devolve as novas */
function checkAch() {
  const fresh = [];
  ACH.forEach(a => { if (!S.ach[a.id] && a.val() >= a.goal) { S.ach[a.id] = new Date().toISOString(); fresh.push(a); } });
  if (fresh.length) save();
  return fresh;
}
/* Para ações fora do treino (água, dieta, medidas) */
function achToast() {
  const n = checkAch(); if (!n.length) return;
  setTimeout(() => toast(`Conquista desbloqueada: ${n.map(a => a.icon + ' ' + a.t).join(', ')}`), 1400);
  vibe([40, 60, 120]);
}

/* ---------- Tema ---------- */
function applyTheme() {
  const t = (S.profile && S.profile.theme) || 'dark';
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'light' ? '#F4F2ED' : '#121519';
  const cs = document.querySelector('meta[name="color-scheme"]'); if (cs) cs.content = t === 'light' ? 'light' : 'dark';
}

/* =========================================================
   RENDER
   ========================================================= */
function renderProfile() {
  const P = S.profile, st = streak(), best = bestStreak();
  const sets = S.sessions.reduce((a, s) => a + (s.sets || 0), 0), mins = S.sessions.reduce((a, s) => a + (s.dur || 0), 0), vol = totalVol();
  const since = S.sessions.length ? new Date(S.sessions[0].date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null;
  const unlocked = ACH.filter(a => S.ach[a.id]).length;
  const next = S.active ? `Treino ${S.active.day} em andamento` : `Próximo: Treino ${S.day}, semana ${S.week}`;
  const lastDay = S.sessions.length ? dayStart(S.sessions[S.sessions.length - 1].date) : 0;
  const daysLeft = st ? Math.max(0, 3 - Math.round((dayStart(Date.now()) - lastDay) / DAY)) : 0;
  $('#v-perfil').innerHTML = `
    <header class="pf-head">
      <div class="pf-av" aria-hidden="true">${esc((P.name || 'A').trim()[0].toUpperCase())}</div>
      <div><h1>${esc(P.name || 'Atleta')}</h1><p>${since ? `Treinando com o app desde ${since}` : 'Pronto para o primeiro treino'}</p></div>
    </header>
    <section class="an-card pf-streak ${st ? '' : 'cold'}">
      <div class="pf-flame"><span>🔥</span><b>${st}</b></div>
      <div><h2>${st ? `${st} treino${st > 1 ? 's' : ''} em sequência` : 'Sequência zerada'}</h2>
        <p>${st ? (daysLeft ? `Treine em até ${daysLeft} dia${daysLeft > 1 ? 's' : ''} para manter.` : 'Treine hoje para não perder a sequência.') : 'Conclua um treino para começar.'} Seu recorde é ${best}.</p>
        <p class="pf-next">${next}</p></div>
    </section>
    <div class="kpis pf-tot"><div><b>${S.sessions.length}</b><span>treinos</span></div><div><b>${sets}</b><span>séries</span></div>
      <div><b>${vol >= 1000 ? num(Math.round(vol / 100) / 10) + 't' : Math.round(vol)}</b><span>${vol >= 1000 ? 'levantadas' : 'kg levantados'}</span></div><div><b>${mins >= 60 ? num(Math.round(mins / 6) / 10) + 'h' : mins}</b><span>${mins >= 60 ? 'de treino' : 'minutos'}</span></div></div>
    <section class="an-card">
      <div class="an-h"><h2>Conquistas</h2><span>${unlocked} de ${ACH.length}</span></div>
      <div class="ach-grid">${ACH.map(a => {
        const got = S.ach[a.id], v = Math.min(a.val(), a.goal);
        return `<button class="ach ${got ? 'got' : ''}" data-act="pf-ach" data-id="${a.id}" aria-label="${esc(a.t)}${got ? ', desbloqueada' : ''}">
          <span class="ach-i">${a.icon}</span><b>${a.t}</b>
          ${got ? `<small>${new Date(got).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}</small>`
            : `<i class="ach-bar"><i style="width:${v / a.goal * 100}%"></i></i>`}</button>`;
      }).join('')}</div>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Configurações</h2></div>
      <label class="bf wide pf-name"><span>Seu nome</span><input id="pf-name" value="${esc(P.name || '')}" maxlength="24" autocomplete="nickname"></label>
      <div class="pf-row"><span>Tema</span><div class="seg two" role="radiogroup" aria-label="Tema">
        <button role="radio" aria-checked="${P.theme !== 'light'}" class="${P.theme !== 'light' ? 'on' : ''}" data-act="pf-theme" data-v="dark">Escuro</button>
        <button role="radio" aria-checked="${P.theme === 'light'}" class="${P.theme === 'light' ? 'on' : ''}" data-act="pf-theme" data-v="light">Claro</button></div></div>
      <label class="tgl pf-row"><span>Vibração</span><input type="checkbox" id="pf-vib" ${P.vibrate !== false ? 'checked' : ''}></label>
      <label class="tgl pf-row"><span>Som no fim do descanso</span><input type="checkbox" id="pf-snd" ${P.sound !== false ? 'checked' : ''}></label>
    </section>
    <section class="an-card">
      <div class="an-h"><h2>Seus dados</h2><span>salvos só neste aparelho</span></div>
      <p class="an-note" style="margin:0 0 12px">Faça um backup de vez em quando. Se você limpar o navegador ou trocar de celular, é ele que traz tudo de volta: treinos, medidas, plano da dieta, água e conquistas. Fotos não entram no backup.</p>
      <div class="row2"><button class="ghost" data-act="pf-export">Exportar</button>
        <label class="ghost pf-import">Importar<input type="file" accept=".json,application/json" id="pf-import"></label></div>
      <button class="ghost danger wide" data-act="reset">Apagar todos os dados</button>
    </section>`;
}

/* ---------- Backup ---------- */
async function exportBackup() {
  const name = `zezinho-backup-${isoDay(Date.now())}.json`;
  const data = JSON.stringify({ app: 'zezinho', v: 1, at: new Date().toISOString(), state: { ...S, active: null } }, null, 1);
  try {
    // dentro do Claude: o download passa pela confirmação do app
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data }); toast('Backup salvo'); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  try {
    // fora do Claude (versão instalada): download normal do navegador
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Backup salvo');
  } catch (e) { toast('Não deu para salvar o backup aqui'); }
}
async function importBackup(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== 'zezinho' || !j.state || !Array.isArray(j.state.sessions)) throw new Error('formato');
    if (!confirm(`Substituir os dados deste aparelho pelo backup de ${new Date(j.at).toLocaleDateString('pt-BR')}? (${j.state.sessions.length} treinos)`)) return;
    S = Object.assign(defaults(), j.state, { active: null }); save();
    applyTheme(); renderHome(); renderProfile(); toast('Backup restaurado');
  } catch (e) { toast('Esse arquivo não é um backup do app'); }
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="pf-"]'); if (!b) return;
  const d = b.dataset;
  if (d.act === 'pf-theme') { S.profile.theme = d.v; save(); applyTheme(); renderProfile(); }
  if (d.act === 'pf-export') exportBackup();
  if (d.act === 'pf-ach') {
    const a = ACH.find(x => x.id === d.id), got = S.ach[a.id], v = a.val();
    toast(got ? `${a.icon} ${a.t}: ${a.d.toLowerCase()}` : `${a.d}. Progresso: ${a.fmt ? a.fmt(Math.min(v, a.goal)) : Math.min(v, a.goal)} de ${a.fmt ? a.fmt(a.goal) : a.goal}`);
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'pf-vib') { S.profile.vibrate = t.checked; save(); vibe(30); }
  if (t.id === 'pf-snd') { S.profile.sound = t.checked; save(); if (t.checked) { unlockAudio(); beep(); } }
  if (t.id === 'pf-import' && t.files.length) importBackup(t.files[0]);
  if (t.id === 'pf-name') { S.profile.name = t.value.trim().slice(0, 24) || 'Atleta'; save(); renderProfile(); }
});
