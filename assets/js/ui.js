/* Shared public-site chrome: header, footer, cart badge, toasts, reveal-on-scroll. */
(function () {
  const JB = (window.JB = window.JB || {});
  const page = document.body.dataset.page || '';
  const S = JB.settings();
  const esc = JB.esc;

  function header() {
    const links = [
      ['index.html', 'Home', 'home'], ['studio.html', 'Design studio', 'studio'], ['shop.html', 'Shop', 'shop'],
      ['index.html#about', 'About', 'about'], ['index.html#contact', 'Contact', 'contact']
    ];
    return `
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="index.html" aria-label="${esc(S.businessName)} home">
      <img src="assets/logo/jj-mark.svg?v=2" alt="" width="44" height="44">
      <span class="brand-words"><span class="brand-name">JJ BOWEN</span><span class="brand-sub">ART &amp; DESIGN</span></span>
    </a>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${links.map(([href, label, key]) => `<a href="${href}"${key === page ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('')}
    </nav>
    <div class="header-actions">
      <a class="cart-link" href="cart.html" aria-label="Your cart"><i class="ti ti-shopping-cart" aria-hidden="true"></i><span class="cart-count" data-n="0">0</span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><i class="ti ti-menu-2" aria-hidden="true"></i></button>
    </div>
  </div>
</header>`;
  }

  function footer() {
    const cats = (S.categories || []).map((c) => `<li><a href="shop.html?cat=${encodeURIComponent(c)}">${esc(c)}</a></li>`).join('');
    const contact = [
      `<li><a href="${JB.waLink('Hello ' + S.businessName + '!')}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Chat on WhatsApp</a></li>`,
      S.phone ? `<li><a href="tel:${esc(S.phone.replace(/\s/g, ''))}"><i class="ti ti-phone"></i> ${esc(S.phone)}</a></li>` : '',
      S.email ? `<li><a href="mailto:${esc(S.email)}"><i class="ti ti-mail"></i> ${esc(S.email)}</a></li>` : '',
      S.pickupAddress || S.address ? `<li><i class="ti ti-map-pin"></i> ${esc(S.pickupAddress || S.address)}</li>` : '',
      S.hours ? `<li><i class="ti ti-clock"></i> ${esc(S.hours)}</li>` : '',
      S.instagram ? `<li><a href="https://instagram.com/${esc(S.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener"><i class="ti ti-brand-instagram"></i> @${esc(S.instagram.replace(/^@/, ''))}</a></li>` : ''
    ].join('');
    return `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <img class="footer-logo" src="assets/logo/jj-logo-light.svg?v=2" alt="${esc(S.businessName)}">
        <p>${esc(S.tagline)}. Design it yourself, see the price, then send the order straight to us on WhatsApp.</p>
      </div>
      <div><h4>Shop</h4><ul>${cats}<li><a href="shop.html">Everything</a></li></ul></div>
      <div><h4>Design studio</h4><ul>
        <li><a href="studio.html?g=tee">Custom T-shirt</a></li><li><a href="studio.html?g=polo">Custom polo</a></li>
        <li><a href="studio.html?g=hoodie">Custom hoodie</a></li><li><a href="studio.html?g=cap">Custom cap</a></li><li><a href="studio.html?g=tote">Custom tote bag</a></li></ul></div>
      <div><h4>Talk to us</h4><ul>${contact}</ul></div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(S.businessName)}${S.website ? ` · <a href="https://${esc(S.website.replace(/^https?:\/\//, ''))}">${esc(S.website.replace(/^https?:\/\//, ''))}</a>` : ''}</span><a href="admin/login.html">Staff login</a></div>
  </div>
</footer>`;
  }

  /* ---------- Mount ---------- */
  const h = document.getElementById('site-header'); if (h) h.outerHTML = header();
  const f = document.getElementById('site-footer'); if (f) f.outerHTML = footer();
  if (!document.body.hasAttribute('data-no-wa')) {
    const wa = document.createElement('a');
    wa.className = 'wa-float'; wa.href = JB.waLink('Hello ' + S.businessName + ', I have a question.'); wa.target = '_blank'; wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Chat with us on WhatsApp'); wa.innerHTML = '<i class="ti ti-brand-whatsapp" aria-hidden="true"></i>';
    document.body.appendChild(wa);
  }

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.innerHTML = `<i class="ti ${open ? 'ti-x' : 'ti-menu-2'}" aria-hidden="true"></i>`;
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.innerHTML = '<i class="ti ti-menu-2" aria-hidden="true"></i>'; } });
  }

  function paintCount(n) {
    document.querySelectorAll('.cart-count').forEach((el) => {
      const prev = el.dataset.n; el.dataset.n = n; el.textContent = n > 99 ? '99+' : n;
      if (prev !== undefined && String(prev) !== String(n)) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 260); }
    });
  }
  paintCount(JB.cart.count());
  window.addEventListener('jb:cart', (e) => paintCount(e.detail));
  window.addEventListener('storage', (e) => { if (e.key === 'jb.cart') paintCount(JB.cart.count()); });

  /* ---------- Toasts ---------- */
  let wrap;
  JB.toast = function (msg, opts) {
    opts = opts || {};
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast' + (opts.error ? ' error' : '');
    t.innerHTML = `<i class="ti ${opts.error ? 'ti-alert-circle' : (opts.icon || 'ti-circle-check')}" aria-hidden="true"></i><span>${esc(msg)}</span>${opts.link ? `<a href="${opts.link.href}">${esc(opts.link.label)}</a>` : ''}`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, opts.ms || 3200);
  };

  /* ---------- Reveal on scroll ---------- */
  JB.reveal = function (root) {
    const els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
  };
  JB.reveal();

  /* ---------- Product card (shop + home) ---------- */
  JB.productCard = function (p) {
    const out = p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0;
    const needsChoice = (p.sizes || []).length > 1 || (p.colours || []).length > 1;
    return `
<article class="pcard reveal">
  <a href="product.html?id=${encodeURIComponent(p.id)}" class="media" aria-label="${esc(p.name)}"><img src="${JB.asset(p.images && p.images[0])}" alt="${esc(p.name)}" loading="lazy"></a>
  ${out ? '<span class="tag out">Sold out</span>' : p.oldPrice ? '<span class="tag">Sale</span>' : ''}
  <div class="body">
    <span class="cat">${esc(p.category)}</span>
    <a class="name" href="product.html?id=${encodeURIComponent(p.id)}" style="text-decoration:none">${esc(p.name)}</a>
    <div class="row">
      <span class="price">${JB.money(p.price)}${p.oldPrice ? `<s>${JB.money(p.oldPrice)}</s>` : ''}</span>
      ${out ? '' : needsChoice
        ? `<a class="add-mini" href="product.html?id=${encodeURIComponent(p.id)}"><i class="ti ti-adjustments-horizontal" aria-hidden="true"></i><span>Choose</span></a>`
        : `<button class="add-mini" type="button" data-quick-add="${esc(p.id)}"><i class="ti ti-shopping-cart-plus" aria-hidden="true"></i><span>Add to cart</span></button>`}
    </div>
  </div>
</article>`;
  };
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-quick-add]');
    if (!b) return;
    const p = await JB.store.getProduct(b.dataset.quickAdd);
    if (!p) return;
    JB.cart.add({ type: 'shop', productId: p.id, name: p.name, image: p.images[0], price: p.price, size: p.sizes[0] || '', colour: p.colours[0] || '', qty: 1, lineTotal: p.price });
    JB.toast(p.name + ' added to your cart', { link: { href: 'cart.html', label: 'View cart' } });
  });
})();
