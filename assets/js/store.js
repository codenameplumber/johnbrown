/* JB store — the single data seam for the whole site.
   Phase 1 keeps everything in this browser's localStorage.
   Phase 2 swaps the bodies of these functions for fetch() calls to the PHP API;
   every page already awaits them, so nothing else has to change. */
(function () {
  const JB = (window.JB = window.JB || {});
  const K = {
    settings: 'jb.settings', pricing: 'jb.pricing', products: 'jb.products', art: 'jb.art',
    orders: 'jb.orders', cart: 'jb.cart', admin: 'jb.admin', seeded: 'jb.seeded', session: 'jb.session'
  };

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) {
      const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      throw new Error(full ? 'This browser\'s storage is full. Remove some old orders or images, or move to the online version (phase 2).' : 'Could not save: ' + e.message);
    }
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Small SHA-256 (works on http and file:// where crypto.subtle may be missing) ---------- */
  function sha256(str) {
    const ascii = unescape(encodeURIComponent(str));
    const rr = (v, a) => (v >>> a) | (v << (32 - a));
    const maxWord = Math.pow(2, 32); const words = []; const bitLen = ascii.length * 8;
    const hash = []; const k = []; let primeCounter = 0; const isComposite = {};
    for (let c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (let i = 0; i < 313; i += c) isComposite[i] = c;
        hash[primeCounter] = (Math.pow(c, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    let s = ascii + '\x80';
    while (s.length % 64 - 56) s += '\x00';
    for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;
    let H = hash.slice(0, 8);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16)); const old = H; H = H.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2]; const a = H[0], e = H[4];
        const t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H); H[4] = (H[4] + t1) | 0;
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }
  const hashPass = (email, pass) => sha256('jb|' + String(email).trim().toLowerCase() + '|' + pass);

  /* ---------- Pricing maths (shared by studio, cart, admin) ---------- */
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  JB.round2 = r2;
  JB.PLUS_SIZES = ['XXL', '2XL', '3XL', '4XL', '5XL'];
  JB.tierForIn = function (inches, pricing) {
    const tiers = pricing.printSizes.slice().sort((a, b) => a.maxIn - b.maxIn);
    return tiers.find((t) => inches <= t.maxIn) || tiers[tiers.length - 1];
  };
  // Shipping/pickup fee for a cart subtotal (free shipping over a threshold when set).
  JB.fulfilmentFee = function (fulfilment, subtotal, S) {
    if (fulfilment !== 'delivery') return r2(S.pickupFee);
    const free = Number(S.freeShippingOver) || 0;
    return free && subtotal >= free ? 0 : r2(S.deliveryFee);
  };
  JB.pricingCalc = function (input, pricing) {
    const g = pricing.garments.find((x) => x.id === input.garmentId) || pricing.garments[0];
    const sideCosts = Object.entries(input.sides || {}).filter(([, v]) => v && v.tier).map(([side, v]) => {
      const t = pricing.printSizes.find((p) => p.id === v.tier) || pricing.printSizes[0];
      return { side, tierId: t.id, tierName: t.name, price: Number(t.price) || 0 };
    });
    const printPerPiece = r2(sideCosts.reduce((s, x) => s + x.price, 0));
    const unit = r2((Number(g.base) || 0) + printPerPiece);
    const sizes = input.sizes || {};
    const qty = Object.values(sizes).reduce((s, n) => s + (Number(n) || 0), 0);
    const xxlQty = JB.PLUS_SIZES.reduce((s, k) => s + (Number(sizes[k]) || 0), 0);
    const xxlCost = r2(xxlQty * (Number(pricing.xxlFee) || 0));
    const tiers = (pricing.bulk || []).slice().sort((a, b) => a.min - b.min);
    const tier = tiers.filter((t) => qty >= t.min).pop();
    const next = tiers.find((t) => qty < t.min) || null;
    const pct = tier ? Number(tier.pct) : 0;
    const discount = r2((unit * qty * pct) / 100);
    const uploadFee = input.hasUpload ? r2(pricing.uploadFee) : 0;
    const total = r2(unit * qty + xxlCost - discount + uploadFee);
    return { garment: g.name, base: Number(g.base) || 0, sideCosts, printPerPiece, unit, qty, xxlQty, xxlCost, pct, discount, uploadFee, total, next };
  };

  /* ---------- Formatting helpers ---------- */
  let cachedSettings = null;
  JB.money = function (n) {
    const cur = (cachedSettings && cachedSettings.currency) || '$';
    const v = r2(n);
    const cents = Math.abs(Math.round(v * 100)) % 100 !== 0;
    return (v < 0 ? '-' : '') + cur + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
  };
  JB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  JB.date = function (iso, withTime) {
    if (!iso) return '';
    const d = new Date(iso);
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleString('en-US', opts);
  };
  JB.base = (document.body && document.body.dataset.base) || '';
  JB.asset = function (path) {
    if (!path) return '';
    if (/^(data:|blob:|https?:|\/)/.test(path)) return path;
    return JB.base + path;
  };
  JB.waNumber = function (raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10) d = '1' + d;   // US number without the country code -> 1 + 10 digits
    return d;
  };
  JB.isPlaceholderWa = (n) => !n || JB.waNumber(n) === JB.PLACEHOLDER_WA;
  JB.US_STATES = [['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']];
  JB.waLink = function (text, number) {
    const n = JB.waNumber(number || (cachedSettings && cachedSettings.whatsapp));
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  /* ---------- Seeding ---------- */
  function seedIfNeeded() {
    if (read(K.seeded) === JB.SEED_VERSION) return;
    write(K.settings, clone(JB.SEED_SETTINGS));
    write(K.pricing, clone(JB.SEED_PRICING));
    write(K.products, clone(JB.SEED_PRODUCTS));
    write(K.art, clone(JB.SEED_ART));
    write(K.orders, JB.makeSampleOrders(JB.SEED_PRICING, JB.SEED_PRODUCTS, JB.SEED_SETTINGS));
    write(K.admin, { name: JB.SEED_ADMIN.name, email: JB.SEED_ADMIN.email, passHash: hashPass(JB.SEED_ADMIN.email, JB.SEED_ADMIN.password), updatedAt: new Date().toISOString() });
    write(K.seeded, JB.SEED_VERSION);
  }

  const done = (v) => Promise.resolve(clone(v));
  const fail = (msg) => Promise.reject(new Error(msg));

  JB.store = {
    /* settings */
    getSettings() { return done(read(K.settings, JB.SEED_SETTINGS)); },
    saveSettings(patch) {
      const s = Object.assign(read(K.settings, {}), patch, { sample: false });
      write(K.settings, s); cachedSettings = s; return done(s);
    },
    /* pricing */
    getPricing() { return done(read(K.pricing, JB.SEED_PRICING)); },
    savePricing(p) { p = Object.assign({}, p, { sample: false }); write(K.pricing, p); return done(p); },
    /* products */
    listProducts(opts) {
      opts = opts || {};
      let list = read(K.products, []);
      if (!opts.all) list = list.filter((p) => p.active !== false);
      if (opts.category) list = list.filter((p) => p.category === opts.category);
      if (opts.featured) list = list.filter((p) => p.featured);
      return done(list);
    },
    getProduct(id) { return done(read(K.products, []).find((p) => p.id === id) || null); },
    saveProduct(p) {
      const list = read(K.products, []);
      if (!p.id) { p.id = uid('p-'); p.createdAt = new Date().toISOString(); }
      p.sample = p.sample === true;
      const i = list.findIndex((x) => x.id === p.id);
      if (i >= 0) list[i] = Object.assign(list[i], p); else list.unshift(p);
      write(K.products, list); return done(p);
    },
    deleteProduct(id) { write(K.products, read(K.products, []).filter((p) => p.id !== id)); return done(true); },
    /* art gallery */
    listArt(opts) {
      let list = read(K.art, []);
      if (!(opts && opts.all)) list = list.filter((a) => a.active !== false);
      return done(list);
    },
    saveArt(a) {
      const list = read(K.art, []);
      if (!a.id) a.id = uid('a-');
      const i = list.findIndex((x) => x.id === a.id);
      if (i >= 0) list[i] = Object.assign(list[i], a); else list.unshift(a);
      write(K.art, list); return done(a);
    },
    deleteArt(id) { write(K.art, read(K.art, []).filter((a) => a.id !== id)); return done(true); },
    /* orders */
    listOrders() { return done(read(K.orders, [])); },
    getOrder(ref) { return done(read(K.orders, []).find((o) => o.ref === ref) || null); },
    createOrder(o) {
      const list = read(K.orders, []);
      const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.ref).replace(/\D/g, ''), 10) || 0), 24000);
      o.ref = 'JB-' + (max + 1);
      o.createdAt = new Date().toISOString();
      o.status = 'new'; o.paid = false; o.paidAt = null;
      o.history = [{ at: o.createdAt, status: 'new', note: 'Order sent on WhatsApp' }];
      list.unshift(o);
      write(K.orders, list); return done(o);
    },
    updateOrder(ref, patch, note) {
      const list = read(K.orders, []);
      const o = list.find((x) => x.ref === ref);
      if (!o) return fail('Order not found');
      const before = { status: o.status, paid: o.paid };
      Object.assign(o, patch);
      if (patch.paid === true && !before.paid) o.paidAt = new Date().toISOString();
      if (patch.paid === false) o.paidAt = null;
      if ((patch.status && patch.status !== before.status) || patch.paid !== undefined && patch.paid !== before.paid || note) {
        o.history = o.history || [];
        o.history.push({ at: new Date().toISOString(), status: o.status, note: note || (patch.paid !== undefined && patch.paid !== before.paid ? (o.paid ? 'Marked as paid' : 'Marked as unpaid') : 'Status changed') });
      }
      write(K.orders, list); return done(o);
    },
    deleteOrder(ref) { write(K.orders, read(K.orders, []).filter((o) => o.ref !== ref)); return done(true); },
    /* data tools */
    clearSampleData() {
      write(K.orders, read(K.orders, []).filter((o) => !o.sample));
      return done(true);
    },
    exportAll() {
      const out = {}; Object.entries(K).forEach(([name, key]) => { if (name !== 'session') out[name] = read(key, null); });
      out.exportedAt = new Date().toISOString(); return done(out);
    },
    importAll(data) {
      ['settings', 'pricing', 'products', 'art', 'orders', 'admin'].forEach((n) => { if (data[n]) write(K[n], data[n]); });
      write(K.seeded, JB.SEED_VERSION); cachedSettings = read(K.settings); return done(true);
    },
    resetAll() {
      Object.values(K).forEach((k) => localStorage.removeItem(k)); sessionStorage.removeItem(K.session);
      seedIfNeeded(); cachedSettings = read(K.settings); return done(true);
    }
  };

  /* ---------- Cart (always local, even in phase 2) ---------- */
  function emitCart() { window.dispatchEvent(new CustomEvent('jb:cart', { detail: JB.cart.count() })); }
  JB.cart = {
    items() { return read(K.cart, []); },
    get(id) { return read(K.cart, []).find((x) => x.id === id) || null; },
    add(item) {
      const list = read(K.cart, []);
      if (item.type === 'shop') {
        const same = list.find((x) => x.type === 'shop' && x.productId === item.productId && x.size === item.size && x.colour === item.colour);
        if (same) { same.qty += item.qty; same.lineTotal = r2(same.qty * same.price); write(K.cart, list); emitCart(); return same.id; }
      }
      item.id = uid('c-'); item.addedAt = new Date().toISOString();
      list.push(item); write(K.cart, list); emitCart(); return item.id;
    },
    update(id, patch) {
      const list = read(K.cart, []); const it = list.find((x) => x.id === id);
      if (!it) return;
      Object.assign(it, patch);
      if (it.type === 'shop') it.lineTotal = r2(it.qty * it.price);
      write(K.cart, list); emitCart();
    },
    remove(id) { write(K.cart, read(K.cart, []).filter((x) => x.id !== id)); emitCart(); },
    clear() { write(K.cart, []); emitCart(); },
    count() { return read(K.cart, []).reduce((s, x) => s + (Number(x.qty) || 0), 0); },
    totals(fulfilment, settings) {
      const items = read(K.cart, []);
      const printTotal = r2(items.filter((x) => x.type === 'print').reduce((s, x) => s + x.lineTotal, 0));
      const shopTotal = r2(items.filter((x) => x.type === 'shop').reduce((s, x) => s + x.lineTotal, 0));
      const discount = r2(items.filter((x) => x.type === 'print').reduce((s, x) => s + ((x.calc && x.calc.discount) || 0), 0));
      const subtotal = r2(printTotal + shopTotal);
      const fee = JB.fulfilmentFee(fulfilment, subtotal, settings);
      const taxRate = Number(settings.taxRate) || 0;
      const tax = r2(subtotal * taxRate / 100);
      return { printTotal, shopTotal, discount, fee, subtotal, taxRate, tax, total: r2(subtotal + fee + tax) };
    }
  };

  /* ---------- Admin auth (phase 1: a front-end lock only, not real security) ---------- */
  JB.auth = {
    user() {
      const s = read(K.session) || (sessionStorage.getItem(K.session) && JSON.parse(sessionStorage.getItem(K.session)));
      if (!s) return null;
      const a = read(K.admin, {});
      return s.email === a.email ? { name: a.name, email: a.email } : null;
    },
    login(email, pass, remember) {
      const a = read(K.admin, {});
      if (String(email).trim().toLowerCase() !== String(a.email).toLowerCase() || hashPass(a.email, pass) !== a.passHash) return fail('Email or password is not correct.');
      const s = JSON.stringify({ email: a.email, at: new Date().toISOString() });
      sessionStorage.setItem(K.session, s);
      if (remember) localStorage.setItem(K.session, s); else localStorage.removeItem(K.session);
      return done({ name: a.name, email: a.email });
    },
    logout() { sessionStorage.removeItem(K.session); localStorage.removeItem(K.session); },
    // True while the owner still uses the starting demo login (the sign-in page shows it until it is changed).
    isDefault() {
      const a = read(K.admin, {});
      return !!a.email && a.email === JB.SEED_ADMIN.email && a.passHash === hashPass(JB.SEED_ADMIN.email, JB.SEED_ADMIN.password);
    },
    guard() {
      if (!JB.auth.user()) { location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search)); return false; }
      return true;
    },
    updateProfile(p) {
      const a = read(K.admin, {});
      const email = String(p.email || a.email).trim();
      if (email.toLowerCase() !== String(a.email).toLowerCase()) {
        if (!p.currentPassword || hashPass(a.email, p.currentPassword) !== a.passHash) return fail('Enter your current password to change the email.');
        a.passHash = hashPass(email, p.currentPassword);
      }
      a.name = p.name || a.name; a.email = email; a.updatedAt = new Date().toISOString();
      write(K.admin, a);
      const s = JSON.stringify({ email: a.email, at: new Date().toISOString() });
      sessionStorage.setItem(K.session, s); if (localStorage.getItem(K.session)) localStorage.setItem(K.session, s);
      return done({ name: a.name, email: a.email });
    },
    changePassword(current, next) {
      const a = read(K.admin, {});
      if (hashPass(a.email, current) !== a.passHash) return fail('Your current password is not correct.');
      if (String(next).length < 8) return fail('Use at least 8 characters for the new password.');
      a.passHash = hashPass(a.email, next); a.updatedAt = new Date().toISOString();
      write(K.admin, a); return done(true);
    }
  };

  /* ---------- Order text (WhatsApp message, admin copy) ---------- */
  const SIDE_LABEL = { front: 'Front', back: 'Back' };
  JB.sizesText = (sizes) => Object.entries(sizes || {}).filter(([, n]) => n > 0).map(([s, n]) => (s === 'One size' ? n + ' pcs' : s + '×' + n)).join(', ');
  JB.itemLines = function (it) {
    if (it.type === 'print') {
      const sides = Object.entries(it.sides || {}).map(([k, v]) => `${SIDE_LABEL[k] || k}: ${(v.tierName || v.tier || '').replace(/^./, (c) => c.toUpperCase())} print`).join(' · ');
      return [`Custom ${it.garmentName}, ${it.colour && it.colour.name}`, sides + (it.hasUpload ? ' · own artwork' : ''), `Sizes: ${JB.sizesText(it.sizes)} (${it.qty} pcs)`];
    }
    return [`${it.name}${it.size && it.size !== 'One size' ? ' (Size ' + it.size + ')' : ''}${it.colour ? ', ' + it.colour : ''} ×${it.qty}`];
  };
  JB.orderMessage = function (o, S) {
    const L = [];
    L.push(`Hello ${S.businessName}! I'd like to place an order.`, '');
    L.push(`*Order ${o.ref}*`, `Name: ${o.customer.name}`, `Phone: ${o.customer.phone}`);
    if (o.customer.email) L.push(`Email: ${o.customer.email}`);
    L.push('', '*Items*');
    o.items.forEach((it, i) => {
      const lines = JB.itemLines(it);
      L.push(`${i + 1}. ${lines[0]}`); lines.slice(1).forEach((x) => L.push('   ' + x));
      L.push('   ' + JB.money(it.lineTotal));
    });
    L.push('');
    if (o.discount > 0) L.push(`Bulk discount included: ${JB.money(o.discount)} off`);
    L.push(`Subtotal: ${JB.money((o.printTotal || 0) + (o.shopTotal || 0))}`);
    L.push(o.fulfilment === 'delivery' ? `Shipping: ${o.fee ? JB.money(o.fee) : 'Free'}${o.address ? '\nShip to: ' + o.address : ''}` : `Local pickup: ${o.fee ? JB.money(o.fee) : 'Free'}`);
    if (o.tax) L.push(`Sales tax (${o.taxRate}%): ${JB.money(o.tax)}`);
    L.push(`*Total: ${JB.money(o.total)}*`);
    if (o.notes) L.push('', 'Notes: ' + o.notes);
    if (/^https?:/.test(location.protocol)) {
      const base = location.href.replace(/[^/]*([?#].*)?$/, '').replace(/admin\/$/, '');
      L.push('', 'Design previews: ' + base + 'order.html?ref=' + encodeURIComponent(o.ref));
    }
    return L.join('\n');
  };

  /* ---------- Boot ---------- */
  try { seedIfNeeded(); } catch (e) { console.error(e); }
  cachedSettings = read(K.settings, JB.SEED_SETTINGS);
  JB.settings = () => cachedSettings;
  JB.ready = Promise.resolve();
})();
