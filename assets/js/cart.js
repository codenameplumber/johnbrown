(async function () {
  const JB = window.JB, esc = JB.esc;
  const root = document.getElementById('cartRoot');
  const S = await JB.store.getSettings();
  const pricing = await JB.store.getPricing();
  let fulfilment = 'delivery';

  // Re-price custom items with today's prices, in case the owner changed them.
  JB.cart.items().forEach((it) => {
    if (it.type !== 'print') return;
    const calc = JB.pricingCalc({ garmentId: it.garmentId, sides: it.sides, sizes: it.sizes, hasUpload: it.hasUpload }, pricing);
    if (calc.total !== it.lineTotal) JB.cart.update(it.id, { calc, lineTotal: calc.total, qty: calc.qty });
  });

  function itemHTML(it) {
    if (it.type === 'print') {
      const sides = Object.keys(it.sides || {});
      const c = it.calc;
      const first = sides[0];
      return `
<article class="citem" data-id="${it.id}">
  <div class="thumb mock">
    <img src="${it.sides[first].preview || ''}" alt="Preview of your ${esc(it.garmentName)} design" data-thumb>
    ${sides.length > 1 ? `<div class="flip">${sides.map((s, i) => `<button type="button" aria-pressed="${i === 0}" data-flip="${s}">${s === 'front' ? 'Front' : 'Back'}</button>`).join('')}</div>` : ''}
  </div>
  <div>
    <span class="pill"><i class="ti ti-wand" aria-hidden="true"></i> Custom print</span>
    <h3>${esc(it.garmentName)}, ${esc(it.colour.name)}</h3>
    <div class="meta">
      <span>${sides.map((s) => `${s === 'front' ? 'Front' : 'Back'}: ${esc(it.sides[s].tierName || it.sides[s].tier)} print`).join(' · ')}${it.hasUpload ? ' · your artwork' : ''}</span>
      <span>Sizes: ${esc(JB.sizesText(it.sizes))} (${it.qty} pcs)</span>
    </div>
    <div class="breakdown">
      <div><span>${esc(it.garmentName)}</span><span>${JB.money(c.base)} each</span></div>
      ${c.sideCosts.map((sc) => `<div><span>${sc.side === 'front' ? 'Front' : 'Back'} print (${esc(sc.tierName)})</span><span>${JB.money(sc.price)} each</span></div>`).join('')}
      <div><span>${c.qty} × ${JB.money(c.unit)}</span><span>${JB.money(c.unit * c.qty)}</span></div>
      ${c.xxlCost ? `<div><span>2XL+ extra (${c.xxlQty})</span><span>${JB.money(c.xxlCost)}</span></div>` : ''}
      ${c.discount ? `<div style="color:var(--green)"><span>Bulk ${c.pct}% off</span><span>−${JB.money(c.discount)}</span></div>` : ''}
      ${c.uploadFee ? `<div><span>Artwork setup</span><span>${JB.money(c.uploadFee)}</span></div>` : ''}
    </div>
    ${c.next ? `<div class="hint muted" style="font-size:.8rem;margin-top:.4rem"><i class="ti ti-discount" aria-hidden="true"></i> Add ${c.next.min - c.qty} more piece${c.next.min - c.qty === 1 ? '' : 's'} to get ${c.next.pct}% off.</div>` : ''}
    <div class="actions">
      <a class="edit" href="studio.html?edit=${encodeURIComponent(it.id)}"><i class="ti ti-pencil" aria-hidden="true"></i> Edit design or sizes</a>
      <button type="button" class="linkish" data-remove><i class="ti ti-trash" aria-hidden="true"></i> Remove</button>
    </div>
  </div>
  <div class="right"><span class="line">${JB.money(it.lineTotal)}</span></div>
</article>`;
    }
    return `
<article class="citem" data-id="${it.id}">
  <a class="thumb" href="product.html?id=${encodeURIComponent(it.productId)}"><img src="${JB.asset(it.image)}" alt="${esc(it.name)}"></a>
  <div>
    <span class="pill shop"><i class="ti ti-hanger" aria-hidden="true"></i> Shop</span>
    <h3>${esc(it.name)}</h3>
    <div class="meta">${it.size && it.size !== 'One size' ? `<span>Size: ${esc(it.size)}</span>` : ''}${it.colour ? `<span>Color: ${esc(it.colour)}</span>` : ''}<span>${JB.money(it.price)} each</span></div>
    <div class="actions">
      <div class="qty"><button type="button" data-step="-1" aria-label="Fewer">−</button><input type="number" min="1" value="${it.qty}" aria-label="Quantity" data-qty><button type="button" data-step="1" aria-label="More">+</button></div>
      <button type="button" class="linkish" data-remove><i class="ti ti-trash" aria-hidden="true"></i> Remove</button>
    </div>
  </div>
  <div class="right"><span class="line">${JB.money(it.lineTotal)}</span></div>
</article>`;
  }

  const fee = (n) => (Number(n) ? JB.money(n) : 'Free');
  function summaryHTML() {
    const t = JB.cart.totals(fulfilment, S);
    const freeOver = Number(S.freeShippingOver) || 0;
    const toFree = freeOver && t.subtotal < freeOver ? JB.round2(freeOver - t.subtotal) : 0;
    return `
<aside class="summary">
  <h2>Order summary</h2>
  ${t.printTotal ? `<div class="sum-row"><span>Custom prints</span><span>${JB.money(t.printTotal)}</span></div>` : ''}
  ${t.shopTotal ? `<div class="sum-row"><span>Shop items</span><span>${JB.money(t.shopTotal)}</span></div>` : ''}
  ${t.discount ? `<div class="sum-row save"><span>You saved (bulk)</span><span>${JB.money(t.discount)}</span></div>` : ''}
  <div class="sum-row"><span>${fulfilment === 'delivery' ? 'Shipping' : 'Local pickup'}</span><span>${fee(t.fee)}</span></div>
  ${t.taxRate ? `<div class="sum-row"><span>Sales tax (${t.taxRate}%)</span><span>${JB.money(t.tax)}</span></div>` : ''}
  <div class="sum-row total"><span>Total</span><span>${JB.money(t.total)}</span></div>
  ${fulfilment === 'delivery' && toFree ? `<p class="nudge-line"><i class="ti ti-truck" aria-hidden="true"></i> Add ${JB.money(toFree)} more for free shipping.</p>` : ''}

  <form class="checkout-form" id="checkout" novalidate>
    <h3>How do you want to get it?</h3>
    <div class="radio-cards" style="margin-bottom:16px">
      <label class="radio-card"><input type="radio" name="ful" value="delivery" ${fulfilment === 'delivery' ? 'checked' : ''}><strong>Ship to me</strong><span>${Number(S.deliveryFee) ? JB.money(S.deliveryFee) : 'Free'}${freeOver ? ` · free over ${JB.money(freeOver)}` : ''}</span></label>
      <label class="radio-card"><input type="radio" name="ful" value="pickup" ${fulfilment === 'pickup' ? 'checked' : ''}><strong>Local pickup</strong><span>${fee(S.pickupFee)}${S.pickupAddress ? ' · ' + esc(S.pickupAddress) : ''}</span></label>
    </div>
    ${fulfilment === 'delivery' && S.deliveryNote ? `<p class="muted" style="font-size:.82rem;margin:-6px 0 14px">${esc(S.deliveryNote)}</p>` : ''}
    <h3>Contact</h3>
    <div class="form-2">
      <div class="field"><label for="cFirst">First name</label><input class="input" id="cFirst" autocomplete="given-name" required><span class="err"></span></div>
      <div class="field"><label for="cLast">Last name</label><input class="input" id="cLast" autocomplete="family-name" required><span class="err"></span></div>
    </div>
    <div class="field"><label for="cPhone">Mobile number (for WhatsApp)</label><input class="input" id="cPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(555) 123-4567" required><span class="err"></span></div>
    <div class="field"><label for="cEmail">Email <span class="muted">(optional)</span></label><input class="input" id="cEmail" type="email" autocomplete="email" placeholder="you@example.com"><span class="err"></span></div>
    <div id="shipFields" class="${fulfilment === 'delivery' ? '' : 'hidden'}">
      <h3>Shipping address</h3>
      <div class="field"><label for="cStreet">Street address</label><input class="input" id="cStreet" autocomplete="address-line1" placeholder="123 Main St"><span class="err"></span></div>
      <div class="field"><label for="cApt">Apt, suite, unit <span class="muted">(optional)</span></label><input class="input" id="cApt" autocomplete="address-line2"></div>
      <div class="field"><label for="cCity">City</label><input class="input" id="cCity" autocomplete="address-level2"><span class="err"></span></div>
      <div class="form-2">
        <div class="field"><label for="cState">State</label><select class="select" id="cState" autocomplete="address-level1"><option value="">Choose</option>${JB.US_STATES.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select><span class="err"></span></div>
        <div class="field"><label for="cZip">ZIP code</label><input class="input" id="cZip" autocomplete="postal-code" inputmode="numeric" maxlength="10" placeholder="10001"><span class="err"></span></div>
      </div>
    </div>
    <div class="field"><label for="cNotes">Order notes <span class="muted">(optional)</span></label><textarea class="textarea" id="cNotes" placeholder="Event date, deadline, anything we should know" style="min-height:70px"></textarea></div>
    <button class="btn btn-wa btn-block" type="submit"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> Send order on WhatsApp</button>
    <p class="muted" style="font-size:.8rem;margin:.7rem 0 0;text-align:center">You won't be charged here. We confirm your order and send payment options on WhatsApp.</p>
  </form>
</aside>`;
  }

  const ids = ['cFirst', 'cLast', 'cPhone', 'cEmail', 'cStreet', 'cApt', 'cCity', 'cState', 'cZip', 'cNotes'];
  const readForm = () => Object.fromEntries(ids.map((i) => [i, ((document.getElementById(i) || {}).value || '').trim()]));
  const writeForm = (v) => ids.forEach((i) => { const el = document.getElementById(i); if (el) el.value = v[i] || ''; });

  function render(keepForm) {
    const items = JB.cart.items();
    if (!items.length) {
      root.innerHTML = `<div class="empty"><i class="ti ti-shopping-cart" aria-hidden="true"></i><h3>Your cart is empty</h3><p class="muted">Design something of your own or pick from the shop.</p><div class="hero-ctas" style="justify-content:center"><a class="btn btn-gold" href="studio.html"><i class="ti ti-wand" aria-hidden="true"></i> Design studio</a><a class="btn btn-dark" href="shop.html">Shop</a></div></div>`;
      return;
    }
    const saved = keepForm ? readForm() : null;
    root.innerHTML = `<div class="cart-grid"><div class="cart-list">${items.map(itemHTML).join('')}</div>${summaryHTML()}</div>`;
    if (saved) writeForm(saved);
  }

  root.addEventListener('click', (e) => {
    const card = e.target.closest('.citem');
    const flip = e.target.closest('[data-flip]');
    if (flip && card) {
      const it = JB.cart.get(card.dataset.id);
      card.querySelector('[data-thumb]').src = it.sides[flip.dataset.flip].preview || '';
      card.querySelectorAll('[data-flip]').forEach((b) => b.setAttribute('aria-pressed', b === flip));
      return;
    }
    if (e.target.closest('[data-remove]') && card) { JB.cart.remove(card.dataset.id); render(true); JB.toast('Removed from your cart', { icon: 'ti-trash' }); return; }
    const step = e.target.closest('[data-step]');
    if (step && card) { const it = JB.cart.get(card.dataset.id); JB.cart.update(it.id, { qty: Math.max(1, it.qty + Number(step.dataset.step)) }); render(true); }
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-qty]')) { const card = e.target.closest('.citem'); JB.cart.update(card.dataset.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) }); render(true); }
    if (e.target.name === 'ful') { fulfilment = e.target.value; render(true); }
  });

  function setErr(id, msg) {
    const f = document.getElementById(id).closest('.field');
    f.classList.toggle('invalid', !!msg); f.querySelector('.err').textContent = msg || '';
  }
  root.addEventListener('input', (e) => { if (e.target.closest('.field.invalid')) setErr(e.target.id, ''); });
  root.addEventListener('change', (e) => { if (e.target.closest('.field.invalid')) setErr(e.target.id, ''); });
  const fmtPhone = (raw) => { const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw; };

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm();
    let ok = true;
    if (!v.cFirst) { setErr('cFirst', 'Enter your first name.'); ok = false; }
    if (!v.cLast) { setErr('cLast', 'Enter your last name.'); ok = false; }
    const digits = v.cPhone.replace(/\D/g, '');
    if (!(digits.length === 10 || (digits.length === 11 && digits[0] === '1') || digits.length > 11)) { setErr('cPhone', 'Enter a 10-digit phone number, e.g. (555) 123-4567.'); ok = false; }
    if (v.cEmail && !/^\S+@\S+\.\S+$/.test(v.cEmail)) { setErr('cEmail', 'That email does not look right.'); ok = false; }
    if (fulfilment === 'delivery') {
      if (v.cStreet.length < 4) { setErr('cStreet', 'Enter your street address.'); ok = false; }
      if (v.cCity.length < 2) { setErr('cCity', 'Enter your city.'); ok = false; }
      if (!v.cState) { setErr('cState', 'Choose a state.'); ok = false; }
      if (!/^\d{5}(-\d{4})?$/.test(v.cZip)) { setErr('cZip', 'Enter a 5-digit ZIP code.'); ok = false; }
    }
    if (!ok) { const bad = root.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea'); if (bad) bad.focus(); return; }

    const items = JB.cart.items();
    const t = JB.cart.totals(fulfilment, S);
    const shipTo = fulfilment === 'delivery' ? { street: v.cStreet, apt: v.cApt, city: v.cCity, state: v.cState, zip: v.cZip } : null;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const order = await JB.store.createOrder({
        customer: { name: `${v.cFirst} ${v.cLast}`, phone: fmtPhone(v.cPhone), email: v.cEmail },
        fulfilment, shipTo,
        address: shipTo ? `${shipTo.street}${shipTo.apt ? ', ' + shipTo.apt : ''}, ${shipTo.city}, ${shipTo.state} ${shipTo.zip}` : '',
        notes: v.cNotes,
        items: items.map((it) => { const c = Object.assign({}, it); delete c.id; delete c.addedAt; return c; }),
        printTotal: t.printTotal, shopTotal: t.shopTotal, discount: t.discount, fee: t.fee, taxRate: t.taxRate, tax: t.tax, total: t.total, sample: false
      });
      window.open(JB.waLink(JB.orderMessage(order, S)), '_blank', 'noopener');
      JB.cart.clear();
      location.href = 'order.html?ref=' + encodeURIComponent(order.ref) + '&sent=1';
    } catch (err) {
      btn.disabled = false;
      JB.toast(err.message, { error: true, ms: 6000 });
    }
  });

  render();
})();
