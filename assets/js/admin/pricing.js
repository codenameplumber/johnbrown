(async function () {
  const JB = window.JB, esc = JB.esc;
  if (!JB.auth.user()) return;
  const $ = (id) => document.getElementById(id);
  const P = await JB.store.getPricing();          // working copy, saved on submit
  let dirty = false;

  if (P.sample) $('sampleNote').innerHTML = '<div class="banner"><i class="ti ti-alert-triangle" aria-hidden="true"></i><span>These are sample prices. Change them to your real prices and press Save. Customers see the new prices in the studio straight away.</span></div>';

  function garmentsHTML() {
    return P.garments.map((g, i) => `
      <tr>
        <td><label class="switch"><input type="checkbox" data-g-en="${i}" ${g.enabled !== false ? 'checked' : ''} aria-label="Offer ${esc(g.name)}"></label></td>
        <td><input class="input" data-g-name="${i}" value="${esc(g.name)}" aria-label="Garment name" style="min-width:120px"></td>
        <td>${JB.moneyInput('gBase' + i, g.base, `data-g-base="${i}" aria-label="${esc(g.name)} blank price"`)}</td>
        <td><input class="input" data-g-sizes="${i}" value="${esc(g.sizes.join(', '))}" aria-label="${esc(g.name)} sizes"></td>
        <td><div class="colour-chips">${g.colours.map((c, j) => `<span class="cchip"><i style="background:${esc(c.hex)}"></i>${esc(c.name)}<button type="button" data-c-rm="${i}|${j}" aria-label="Remove ${esc(c.name)}">×</button></span>`).join('')}
          <span class="cchip" style="padding:.15rem .3rem"><input type="color" value="#2851a3" data-c-hex="${i}" aria-label="New color" style="width:22px;height:22px;border:none;padding:0;background:none"><input data-c-name="${i}" placeholder="Name" aria-label="New color name" style="border:none;width:70px;font-weight:700;font-size:.78rem;outline:none"><button type="button" data-c-add="${i}" aria-label="Add color" style="color:var(--green)">+</button></span>
        </div></td>
      </tr>`).join('');
  }
  function tiersHTML() {
    const last = P.printSizes.length - 1;
    return P.printSizes.map((t, i) => `
      <tr>
        <td><input class="input" data-t-name="${i}" value="${esc(t.name)}" aria-label="Print size name" style="min-width:90px"></td>
        <td>${i === last ? '<span class="muted" style="font-weight:700">Whole area</span>' : `<input class="input" type="number" min="1" step="0.5" data-t-cm="${i}" value="${t.maxIn}" aria-label="${esc(t.name)} maximum inches" style="width:80px">`}</td>
        <td>${JB.moneyInput('tPrice' + i, t.price, `data-t-price="${i}" aria-label="${esc(t.name)} price"`)}</td>
        <td><input class="input" data-t-note="${i}" value="${esc(t.note || '')}" aria-label="${esc(t.name)} note"></td>
      </tr>`).join('');
  }
  function bulkHTML() {
    return P.bulk.map((b, i) => `
      <tr>
        <td><input class="input" type="number" min="2" data-b-min="${i}" value="${b.min}" aria-label="Minimum pieces" style="width:110px"></td>
        <td><input class="input" type="number" min="1" max="90" data-b-pct="${i}" value="${b.pct}" aria-label="Percent off" style="width:90px"></td>
        <td class="num"><button class="icon-btn" type="button" data-b-rm="${i}" aria-label="Remove level"><i class="ti ti-trash" aria-hidden="true"></i></button></td>
      </tr>`).join('') || '<tr><td colspan="3" class="muted">No bulk discount. Add a level to reward bigger orders.</td></tr>';
  }
  function renderAll() {
    $('garments').innerHTML = garmentsHTML();
    $('tiers').innerHTML = tiersHTML();
    $('bulk').innerHTML = bulkHTML();
    $('uploadFeeWrap').innerHTML = JB.moneyInput('uploadFee', P.uploadFee);
    $('xxlFeeWrap').innerHTML = JB.moneyInput('xxlFee', P.xxlFee);
    $('tG').innerHTML = P.garments.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    const opts = '<option value="">None</option>' + P.printSizes.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    const f = $('tF').value, b = $('tB').value;
    $('tF').innerHTML = opts; $('tB').innerHTML = opts;
    $('tF').value = f || (P.printSizes[1] || P.printSizes[0]).id; $('tB').value = b || '';
    demo();
  }
  function demo() {
    const sides = {}; if ($('tF').value) sides.front = { tier: $('tF').value }; if ($('tB').value) sides.back = { tier: $('tB').value };
    const qty = Math.max(1, parseInt($('tQ').value, 10) || 1);
    const c = JB.pricingCalc({ garmentId: $('tG').value, sides, sizes: { M: qty } }, P);
    $('tOut').innerHTML = `
      <div class="sum-row"><span>${esc(c.garment)} blank</span><span>${JB.money(c.base)}</span></div>
      ${c.sideCosts.map((s) => `<div class="sum-row"><span>${s.side === 'front' ? 'Front' : 'Back'} print (${esc(s.tierName)})</span><span>+${JB.money(s.price)}</span></div>`).join('')}
      <div class="sum-row"><span>Per piece × ${c.qty}</span><span>${JB.money(c.unit)} × ${c.qty} = ${JB.money(c.unit * c.qty)}</span></div>
      ${c.discount ? `<div class="sum-row save"><span>Bulk ${c.pct}% off</span><span>−${JB.money(c.discount)}</span></div>` : ''}
      <div class="sum-row total"><span>Customer pays</span><span>${JB.money(c.total)}</span></div>`;
  }

  const num = (v) => Math.max(0, JB.round2(v));
  $('form').addEventListener('input', (e) => {
    const t = e.target, d = t.dataset;
    if (d.gName !== undefined) P.garments[d.gName].name = t.value;
    else if (d.gBase !== undefined) P.garments[d.gBase].base = num(t.value);
    else if (d.gSizes !== undefined) P.garments[d.gSizes].sizes = t.value.split(',').map((s) => s.trim()).filter(Boolean);
    else if (d.tName !== undefined) P.printSizes[d.tName].name = t.value;
    else if (d.tCm !== undefined) P.printSizes[d.tCm].maxIn = num(t.value);
    else if (d.tPrice !== undefined) P.printSizes[d.tPrice].price = num(t.value);
    else if (d.tNote !== undefined) P.printSizes[d.tNote].note = t.value;
    else if (d.bMin !== undefined) P.bulk[d.bMin].min = Math.round(num(t.value));
    else if (d.bPct !== undefined) P.bulk[d.bPct].pct = Math.min(90, num(t.value));
    else if (t.id === 'uploadFee') P.uploadFee = num(t.value);
    else if (t.id === 'xxlFee') P.xxlFee = num(t.value);
    else if (!/^t[GFBQ]$/.test(t.id)) return;
    if (!/^t[GFBQ]$/.test(t.id)) dirty = true;
    demo();
  });
  $('form').addEventListener('change', (e) => {
    const d = e.target.dataset;
    if (d.gEn !== undefined) { P.garments[d.gEn].enabled = e.target.checked; dirty = true; }
    if (/^t[GFBQ]$/.test(e.target.id)) demo();
  });
  $('form').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-c-rm]'), add = e.target.closest('[data-c-add]'), brm = e.target.closest('[data-b-rm]');
    if (rm) {
      const [i, j] = rm.dataset.cRm.split('|').map(Number);
      if (P.garments[i].colours.length <= 1) { JB.toast('Keep at least one color.', { error: true }); return; }
      P.garments[i].colours.splice(j, 1); dirty = true; $('garments').innerHTML = garmentsHTML();
    }
    if (add) {
      const i = Number(add.dataset.cAdd);
      const name = document.querySelector(`[data-c-name="${i}"]`).value.trim(), hex = document.querySelector(`[data-c-hex="${i}"]`).value;
      if (!name) { JB.toast('Type a name for the color first.', { error: true }); document.querySelector(`[data-c-name="${i}"]`).focus(); return; }
      P.garments[i].colours.push({ name, hex: hex.toUpperCase() }); dirty = true; $('garments').innerHTML = garmentsHTML();
    }
    if (brm) { P.bulk.splice(Number(brm.dataset.bRm), 1); dirty = true; $('bulk').innerHTML = bulkHTML(); demo(); }
  });
  $('addBulk').addEventListener('click', () => {
    const last = P.bulk[P.bulk.length - 1];
    P.bulk.push({ min: last ? last.min * 2 : 12, pct: last ? Math.min(90, last.pct + 5) : 5 }); dirty = true; $('bulk').innerHTML = bulkHTML();
  });

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (P.garments.some((g) => !g.name.trim())) return JB.toast('Every garment needs a name.', { error: true });
    if (P.garments.some((g) => !g.sizes.length)) return JB.toast('Every garment needs at least one size (use "One size").', { error: true });
    if (!P.garments.some((g) => g.enabled !== false)) return JB.toast('Turn on at least one garment.', { error: true });
    const cms = P.printSizes.slice(0, -1).map((t) => t.maxIn);
    if (cms.some((v, i) => !v || (i && v <= cms[i - 1]))) return JB.toast('Print size limits must go up from small to large.', { error: true });
    P.bulk.sort((a, b) => a.min - b.min);
    if (P.bulk.some((b, i) => i && b.min === P.bulk[i - 1].min)) return JB.toast('Two bulk levels start at the same quantity.', { error: true });
    await JB.store.savePricing(P);
    P.sample = false; dirty = false;
    $('sampleNote').innerHTML = '';
    renderAll();
    JB.toast('Prices saved. The studio is using them now.');
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  renderAll();
})();
