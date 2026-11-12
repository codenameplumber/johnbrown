(async function () {
  const JB = window.JB;
  const esc = JB.esc;
  const [S, pricing, products] = await Promise.all([JB.store.getSettings(), JB.store.getPricing(), JB.store.listProducts()]);

  /* Hero: live T-shirt colour tester */
  const tee = pricing.garments.find((g) => g.id === 'tee' && g.enabled !== false) || pricing.garments[0];
  const stage = document.getElementById('teeStage');
  const sw = document.getElementById('teeSwatches');
  const go = document.getElementById('teeGo');
  function paintTee(i) {
    const c = tee.colours[i];
    stage.innerHTML = JB.garmentSVG(tee.id, 'front', c.hex, { width: '100%', height: '100%' });
    sw.querySelectorAll('.swatch').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    go.href = `studio.html?g=${tee.id}&c=${encodeURIComponent(c.name)}`;
  }
  sw.innerHTML = tee.colours.slice(0, 8).map((c, i) => `<button type="button" class="swatch" style="background:${c.hex}" aria-label="${esc(c.name)}" title="${esc(c.name)}" data-i="${i}"></button>`).join('');
  sw.addEventListener('click', (e) => { const b = e.target.closest('.swatch'); if (b) paintTee(Number(b.dataset.i)); });
  paintTee(1 < tee.colours.length ? 1 : 0);

  /* Categories */
  const catImg = { 'Suits': 'assets/img/products/suit-navy.jpg', 'Shirts': 'assets/img/products/shirts-assorted.jpg', 'Polos': 'assets/img/products/polo-colours.jpg',
    'Caps & hats': 'assets/img/cat-caps.jpg', 'T-shirts': 'assets/img/look-tee.jpg' };
  document.getElementById('cats').innerHTML = (S.categories || []).map((c) => {
    const inCat = products.filter((p) => p.category === c);
    const img = catImg[c] || (inCat[0] && inCat[0].images[0]) || 'assets/img/cat-rack.jpg';
    return `<a class="cat-tile reveal" href="shop.html?cat=${encodeURIComponent(c)}"><img src="${JB.asset(img)}" alt="" loading="lazy"><span class="cat-name">${esc(c)}<small>${inCat.length} item${inCat.length === 1 ? '' : 's'}</small></span><i class="ti ti-arrow-up-right" aria-hidden="true"></i></a>`;
  }).join('');

  /* Featured products */
  const featured = products.filter((p) => p.featured).slice(0, 8);
  document.getElementById('featured').innerHTML = (featured.length ? featured : products.slice(0, 8)).map(JB.productCard).join('');

  /* Bulk tiers from live pricing */
  const tiers = (pricing.bulk || []).slice().sort((a, b) => a.min - b.min);
  document.querySelectorAll('[data-bulk-min]').forEach((el) => { if (tiers[0]) el.textContent = tiers[0].min; });
  document.getElementById('bulkTiers').innerHTML = tiers.map((t) => `<div class="tier reveal"><strong>${t.pct}%</strong><span>off from ${t.min} pieces</span></div>`).join('');
  document.getElementById('bulkWa').href = JB.waLink(`Hello ${S.businessName}, I need branded clothing for a team/event. Can I get a quote?`);

  /* Contact cards */
  const cards = [
    { ic: 'ti-brand-whatsapp', t: 'WhatsApp', d: 'Fastest way to reach us. Send a photo of your idea.', a: `<a class="btn btn-wa btn-sm" href="${JB.waLink('Hello ' + S.businessName + '!')}" target="_blank" rel="noopener">Start a chat</a>` },
    S.phone ? { ic: 'ti-phone', t: 'Call', d: esc(S.phone), a: `<a class="btn btn-line btn-sm" href="tel:${esc(S.phone.replace(/\s/g, ''))}">Call now</a>` } : null,
    S.email ? { ic: 'ti-mail', t: 'Email', d: esc(S.email), a: `<a class="btn btn-line btn-sm" href="mailto:${esc(S.email)}">Send an email</a>` } : null,
    { ic: 'ti-map-pin', t: 'Visit or pick up', d: esc(S.pickupAddress || S.address || 'Address shared on WhatsApp'), a: '' },
    { ic: 'ti-clock', t: 'Store hours', d: esc(S.hours || 'Ask on WhatsApp'), a: '' }
  ].filter(Boolean).slice(0, 4);
  document.getElementById('contactCards').innerHTML = cards.map((c) => `<article class="contact-card reveal"><span class="service-ic"><i class="ti ${c.ic}" aria-hidden="true"></i></span><h3>${c.t}</h3><p>${c.d}</p>${c.a}</article>`).join('');

  JB.reveal();
})();
