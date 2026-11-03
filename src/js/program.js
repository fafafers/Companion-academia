/* =========================================================
   EDITAR TREINO
   O programa editado fica no aparelho, em S.prog (cópia de PROG).
   Exercícios novos criados aqui ficam em S.customEx.
   ========================================================= */
const BLOCK_NAME = { odd: 'ímpar (semanas 1, 3, 5, 7, 9 e 11)', even: 'par (semanas 2, 4, 6, 8, 10 e 12)' };
const clone = o => JSON.parse(JSON.stringify(o));
let pgCtx = { b: 'odd', d: 'A' };

const pgList = () => (S.prog || PROG)[pgCtx.b][pgCtx.d];
// Antes de mudar o programa: os treinos já feitos guardam o programa com que foram feitos,
// para as estatísticas (séries planejadas, volume) não se embaralharem.
function editableProg() {
  S.sessions.forEach(s => { if (!s.plan) s.plan = clone(plan(s.week, s.day)); });
  if (!S.prog) S.prog = clone(PROG);
  return S.prog[pgCtx.b][pgCtx.d];
}

function openProgEdit() {
  const list = pgList();
  sheet(`<div class="sh-h"><div><h2>Editar Treino ${pgCtx.d}</h2><p>Bloco ${BLOCK_NAME[pgCtx.b]}. As mudanças valem a partir do próximo treino.</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <section class="blk">${list.map((rx, i) => `<div class="ed-food pg-row"><span><b>${esc(EX[rx.id].n)}</b><small>${rxText(rx)}, ${loadText(rx)}, descanso ${restText(rx.rest)}</small></span>
      <div class="pg-btns">
        <button data-act="pg-move" data-i="${i}" data-to="${i - 1}" ${i ? '' : 'disabled'} aria-label="Subir ${esc(EX[rx.id].n)}">${I.up}</button>
        <button data-act="pg-move" data-i="${i}" data-to="${i + 1}" ${i < list.length - 1 ? '' : 'disabled'} aria-label="Descer ${esc(EX[rx.id].n)}">${I.down}</button>
        <button data-act="pg-ex" data-i="${i}" aria-label="Editar ${esc(EX[rx.id].n)}">${I.edit}</button>
        <button data-act="pg-del" data-i="${i}" ${list.length > 1 ? '' : 'disabled'} aria-label="Remover ${esc(EX[rx.id].n)}">${I.x}</button></div></div>`).join('')}
      <button class="linkadd" data-act="pg-ex" data-i="new">+ Adicionar exercício</button></section>
    <div class="row2" style="margin-top:18px"><button class="ghost" data-act="pg-reset">Restaurar original</button><button class="cta sm" data-act="close">Pronto</button></div>`);
}

function openExForm(i) {
  const isNew = i === 'new';
  const rx = isNew ? { id: '', s: 3, r: 10, kg: '', u: 'kg', rest: 90, t: 'rir' } : pgList()[+i];
  const ids = Object.keys(EX).sort((a, b) => EX[a].n.localeCompare(EX[b].n));
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  sheet(`<div class="sh-h"><div><h2>${isNew ? 'Adicionar exercício' : 'Editar exercício'}</h2><p>Treino ${pgCtx.d}, bloco ${pgCtx.b === 'odd' ? 'ímpar' : 'par'}</p></div><button class="x" data-act="close" aria-label="Fechar">${I.x}</button></div>
    <div class="bform">
      <label class="bf wide"><span>Exercício</span>${sel('pf-id', [...(isNew ? [['', 'Escolha um exercício']] : []),
        ...ids.map(id => [id, esc(EX[id].n) + (EX[id].pt ? ` (${esc(EX[id].pt)})` : '')]), ['__new', '+ Outro, vou escrever o nome']], rx.id)}</label>
      <label class="bf wide" id="pf-nbox" hidden><span>Nome do exercício</span><input id="pf-n" class="txtin" placeholder="Ex.: Remada na máquina articulada" maxlength="60"></label>
      <label class="bf wide" id="pf-mbox" hidden><span>Músculo principal</span>${sel('pf-m', Object.entries(MUSCLES), 'chest')}</label>
      <label class="bf"><span>Séries</span><input id="pf-s" inputmode="numeric" value="${rx.s}"></label>
      <label class="bf"><span>Reps (meta)</span><input id="pf-r" inputmode="numeric" value="${rx.r}"></label>
      <label class="bf"><span>Carga</span><input id="pf-kg" inputmode="decimal" value="${isNew ? '' : num(curKg(rx))}" placeholder="0"></label>
      <label class="bf"><span>Descanso (seg)</span><input id="pf-rest" inputmode="numeric" value="${rx.rest}"></label>
      <label class="bf"><span>Unidade</span>${sel('pf-u', Object.entries(UNIT), rx.u)}</label>
      <label class="bf"><span>Esforço</span>${sel('pf-t', [['rir', '1–2 sobrando'], ['fail', 'Última até a falha']], rx.t)}</label>
    </div>
    <p class="figcap" style="text-align:left">Mudar a carga aqui vale para o próximo treino. Depois, o app volta a usar a carga da última série que você fizer.</p>
    <button class="cta sm" data-act="pg-save" data-i="${i}">Salvar</button>`);
}

function saveExForm(i) {
  let id = $('#pf-id').value;
  if (!id) { toast('Escolha um exercício'); return; }
  if (id === '__new') {
    const n = $('#pf-n').value.trim(); if (!n) { toast('Escreva o nome do exercício'); return; }
    id = 'meu_' + Date.now().toString(36);
    S.customEx = S.customEx || {};
    S.customEx[id] = { n, pt: 'Exercício próprio', p: [$('#pf-m').value], s: [], steps: [], tips: [], err: [], subs: [] };
    mergeCustomEx();
  }
  const list = editableProg(), old = i === 'new' ? null : list[+i];
  const int = (sel, min, max, def) => { const v = Math.round(parse($(sel).value)); return v >= min && v <= max ? v : def; };
  const rx = { id, s: int('#pf-s', 1, 10, 3), r: int('#pf-r', 1, 100, 10), kg: 0, u: $('#pf-u').value, rest: int('#pf-rest', 0, 600, 90), t: $('#pf-t').value, w: old ? old.w : [] };
  if (rx.u === 'pc') rx.w = [];
  // observações próprias do exercício (por perna, passos, nota) só ficam se ele não mudou
  if (old && old.id === id) ['side', 'rl', 'note', 'kgAt'].forEach(k => { if (old[k] !== undefined) rx[k] = old[k]; });
  const typed = $('#pf-kg').value.trim();
  if (old && old.id === id && typed !== '' && parse(typed) === curKg(old)) rx.kg = old.kg;   // carga não mexida
  else if (typed !== '') { rx.kg = Math.max(0, parse(typed)); rx.kgAt = Date.now(); }
  else if (old && old.id === id) rx.kg = old.kg;
  if (old) list[+i] = rx; else list.push(rx);
  save(); renderHome(); openProgEdit(); toast('Treino salvo');
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="pg-"]'); if (!b || b.disabled) return;
  const d = b.dataset;
  switch (d.act) {
    case 'pg-edit':
      if (S.active) { toast('Finalize o treino em andamento antes de editar'); return; }
      pgCtx = { b: block(S.week), d: S.day }; openProgEdit(); break;
    case 'pg-ex': openExForm(d.i); break;
    case 'pg-save': saveExForm(d.i); break;
    case 'pg-move': { const L = editableProg(), [x] = L.splice(+d.i, 1); L.splice(+d.to, 0, x); save(); renderHome(); openProgEdit(); break; }
    case 'pg-del':
      if (confirm(`Tirar ${EX[pgList()[+d.i].id].n} do Treino ${pgCtx.d}? O histórico dele continua salvo.`)) { editableProg().splice(+d.i, 1); save(); renderHome(); openProgEdit(); }
      break;
    case 'pg-reset':
      if (confirm(`Voltar o Treino ${pgCtx.d} (bloco ${pgCtx.b === 'odd' ? 'ímpar' : 'par'}) ao original? Suas mudanças nele serão perdidas.`)) {
        editableProg(); S.prog[pgCtx.b][pgCtx.d] = clone(PROG[pgCtx.b][pgCtx.d]); save(); renderHome(); openProgEdit();
      }
      break;
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (t.id !== 'pf-id') return;
  const own = t.value === '__new';
  $('#pf-nbox').hidden = !own; $('#pf-mbox').hidden = !own;
  if (own) $('#pf-n').focus();
  else if (t.value) { const k = curKg({ id: t.value, kg: 0, u: 'kg' }); $('#pf-kg').value = k ? num(k) : ''; }
});
