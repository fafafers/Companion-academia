/* ---------- Início ---------- */
applyTheme();
checkAch();   // desbloqueia em silêncio o que já foi alcançado
// ajustes de versões anteriores: copos 250/500/1 L e lembretes das 7h às 21h
if (S.water) {
  S.water.cups = [250, 500, 1000];
  if (S.water.remind.from === '08:00' && S.water.remind.to === '22:00') { S.water.remind.from = '07:00'; S.water.remind.to = '21:00'; }
  save();
}
renderHome(); renderSoon();
if (S.active) { platesShown = progress(S.active).exDone; }
Photos.loadAll().then(() => { if (Object.keys(Photos.cache).length) refreshMedia(); });
startReminders();
