/* Default data for the phase-1 prototype (US business, prices in USD).
   Everything here is SAMPLE data: the owner replaces prices, products and
   contact details from the admin. Bump SEED_VERSION only when the shape changes. */
(function () {
  const JB = (window.JB = window.JB || {});

  JB.SEED_VERSION = 2;

  // Phase-1 admin login. Change it after first sign-in (Admin > Profile & settings).
  JB.SEED_ADMIN = { name: 'John Brown', email: 'admin@johnbrown.test', password: 'JBstudio#2026' };

  JB.PLACEHOLDER_WA = '15555550100';   // fictional 555 number until the owner sets the real one

  JB.SEED_SETTINGS = {
    businessName: 'John Brown Art & Design',
    tagline: 'Custom prints, apparel branding and menswear',
    whatsapp: JB.PLACEHOLDER_WA,
    phone: '',
    email: '',
    address: '',
    pickupAddress: '',
    hours: 'Mon–Sat, 10am–7pm',
    instagram: '',
    currency: '$',
    deliveryFee: 8.95,          // flat shipping
    freeShippingOver: 150,      // 0 turns free shipping off
    pickupFee: 0,
    taxRate: null,              // sales tax %, null = not set yet (shows a reminder in admin)
    deliveryNote: 'Flat-rate shipping anywhere in the US. We confirm your delivery date on WhatsApp.',
    categories: ['Suits', 'Shirts', 'Polos', 'Caps & hats', 'T-shirts'],
    sample: true
  };

  const C = (name, hex) => ({ name, hex });
  const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

  JB.SEED_PRICING = {
    sample: true,
    garments: [
      { id: 'tee', name: 'T-shirt', base: 12, enabled: true, sizes: APPAREL_SIZES,
        colours: [C('White', '#FFFFFF'), C('Black', '#16181B'), C('Navy', '#1B2A4A'), C('Red', '#B3261E'), C('Royal blue', '#2851A3'),
                  C('Forest green', '#1F4D3A'), C('Heather gray', '#B9BDC2'), C('Gold', '#D4A73C'), C('Maroon', '#5E1A24'), C('Light blue', '#8EC5E8')] },
      { id: 'polo', name: 'Polo shirt', base: 20, enabled: true, sizes: APPAREL_SIZES,
        colours: [C('White', '#FFFFFF'), C('Black', '#16181B'), C('Navy', '#1B2A4A'), C('Burgundy', '#6B1E2B'), C('Gray', '#9AA0A6'), C('Kelly green', '#2E6B4A')] },
      { id: 'hoodie', name: 'Hoodie', base: 32, enabled: true, sizes: APPAREL_SIZES,
        colours: [C('Black', '#16181B'), C('Charcoal', '#3A3F45'), C('Navy', '#1B2A4A'), C('Heather gray', '#A7ABB0'), C('Sand', '#CDB894'), C('Maroon', '#5E1A24')] },
      { id: 'cap', name: 'Cap', base: 14, enabled: true, sizes: ['One size'],
        colours: [C('Black', '#16181B'), C('White', '#FFFFFF'), C('Navy', '#1B2A4A'), C('Red', '#B3261E'), C('Khaki', '#BFA77A'), C('Olive', '#59613B')] },
      { id: 'tote', name: 'Tote bag', base: 10, enabled: true, sizes: ['One size'],
        colours: [C('Natural', '#EFE6D2'), C('Black', '#16181B'), C('Navy', '#1B2A4A')] }
    ],
    // Print price per side, picked automatically from the design's longest edge (inches).
    printSizes: [
      { id: 'small', name: 'Small', maxIn: 4, price: 5, note: 'Left chest, pocket or sleeve' },
      { id: 'medium', name: 'Medium', maxIn: 8, price: 8, note: 'Up to about 8 in' },
      { id: 'large', name: 'Large', maxIn: 12, price: 11, note: 'Up to about letter size' },
      { id: 'full', name: 'Full', maxIn: 999, price: 15, note: 'Whole print area' }
    ],
    uploadFee: 10,   // one-off artwork setup per design when the customer uploads their own file
    xxlFee: 3,       // extra per piece for 2XL and up
    bulk: [ { min: 12, pct: 5 }, { min: 25, pct: 10 }, { min: 50, pct: 15 } ]
  };

  const P = (id, name, category, price, img, extra) => Object.assign({
    id, name, category, price, oldPrice: null, description: '', sizes: [], colours: [], stock: 10,
    featured: false, active: true, images: ['assets/img/products/' + img], createdAt: '2026-11-01T09:00:00.000Z', sample: true
  }, extra || {});
  const SUIT = ['38R', '40R', '42R', '44R', '46R', '48R'];
  const NECK = ['15', '15.5', '16', '16.5', '17', '17.5'];
  const TOPS = ['S', 'M', 'L', 'XL', '2XL'];

  JB.SEED_PRODUCTS = [
    P('p-suit-navy', 'Navy two-piece suit', 'Suits', 349, 'suit-navy.jpg', { sizes: SUIT, colours: ['Navy'], featured: true,
      description: 'A clean navy two-piece for the office, weddings and everything in between.' }),
    P('p-suit-green', 'Forest green double-breasted suit', 'Suits', 395, 'suit-green.jpg', { sizes: SUIT, colours: ['Forest green'], featured: true,
      description: 'Double-breasted jacket and matching pants in a deep forest green.' }),
    P('p-suit-pinstripe', 'Navy pinstripe suit', 'Suits', 425, 'suit-pinstripe.jpg', { sizes: SUIT, colours: ['Navy pinstripe'], featured: true,
      description: 'Bold pinstripes, peak lapels and a sharp shoulder.' }),
    P('p-blazer-check', 'Gray check blazer', 'Suits', 229, 'blazer-check.jpg', { sizes: SUIT, colours: ['Gray check'],
      description: 'Soft-shouldered check blazer. Wear it with a tie or with dark denim.' }),
    P('p-suit-brown', 'Chocolate statement suit', 'Suits', 389, 'suit-brown.jpg', { sizes: SUIT, colours: ['Chocolate'],
      description: 'Brown double-breasted jacket with relaxed, wide-leg pants.' }),
    P('p-jacket-evening', 'Black evening jacket', 'Suits', 279, 'jacket-evening.jpg', { sizes: SUIT, colours: ['Black'],
      description: 'A black jacket for dinners and nights out. Pair it with gray pants or dark denim.' }),
    P('p-shirt-classic', 'Classic dress shirt', 'Shirts', 59, 'shirts-assorted.jpg', { sizes: NECK, colours: ['White', 'Light blue', 'Gray'], featured: true,
      description: 'Everyday dress shirt with a structured collar. Sized by neck.' }),
    P('p-shirt-tie', 'Oxford shirt and tie set', 'Shirts', 79, 'shirt-tie.jpg', { sizes: NECK, colours: ['White', 'Lavender'],
      description: 'Oxford shirt with a matching tie. Ready to gift.' }),
    P('p-shirt-crisp', 'Crisp cotton shirt', 'Shirts', 55, 'shirt-white-sky.jpg', { sizes: TOPS, colours: ['White', 'Light blue'],
      description: 'Light cotton shirt for warm days and long meetings.' }),
    P('p-shirt-check', 'Checked casual shirt', 'Shirts', 49, 'shirt-check.jpg', { sizes: TOPS, colours: ['Brown check', 'White'],
      description: 'Relaxed checked shirt for the weekend.' }),
    P('p-polo-grey', 'Heather gray polo', 'Polos', 38, 'polo-grey.jpg', { sizes: TOPS, colours: ['Heather gray'],
      description: 'Soft piqué polo. A good blank for a chest logo.' }),
    P('p-polo-tipped', 'Tipped-collar polo', 'Polos', 42, 'polo-tipped.jpg', { sizes: TOPS, colours: ['White', 'Steel blue'], featured: true,
      description: 'Polo with a striped collar and cuffs.' }),
    P('p-polo-colours', 'Everyday polo', 'Polos', 34, 'polo-colours.jpg', { sizes: TOPS, colours: ['Green', 'Orange', 'Gray', 'Navy', 'White'],
      description: 'Everyday polo in five colors. Popular for staff uniforms.' }),
    P('p-cap-white', 'Plain white cap', 'Caps & hats', 24, 'cap-white.jpg', { sizes: ['One size'], colours: ['White'], featured: true,
      description: 'Structured six-panel cap. Add your logo in the design studio.' }),
    P('p-cap-yellow', 'Sunshine yellow cap', 'Caps & hats', 24, 'cap-yellow.jpg', { sizes: ['One size'], colours: ['Yellow'],
      description: 'Bright yellow dad hat with an adjustable strap.' }),
    P('p-beanie-charcoal', 'Charcoal patch beanie', 'Caps & hats', 26, 'beanie-charcoal.jpg', { sizes: ['One size'], colours: ['Charcoal'],
      description: 'Cuffed knit beanie with a small woven patch.' }),
    P('p-beanie-mustard', 'Mustard rib beanie', 'Caps & hats', 22, 'beanie-mustard.jpg', { sizes: ['One size'], colours: ['Mustard'],
      description: 'Short ribbed beanie in a warm mustard.' }),
    P('p-beanie-stone', 'Stone chunky beanie', 'Caps & hats', 24, 'beanie-stone.jpg', { sizes: ['One size'], colours: ['Stone'],
      description: 'Chunky knit beanie in stone gray.' }),
    P('p-tee-long', 'Long-sleeve cotton tee', 'T-shirts', 32, 'tee-longsleeve.jpg', { sizes: TOPS, colours: ['White'],
      description: 'Heavyweight cotton long-sleeve tee. Also available as a blank for custom prints.' })
  ];

  const A = (id, name, category, file) => ({ id, name, category, src: 'assets/art/' + file, active: true, sample: true });
  JB.SEED_ART = [
    A('a-jb', 'JB mark', 'Brand', 'jb-mark.svg'),
    A('a-crown', 'Crown', 'Icons', 'crown.svg'),
    A('a-star', 'Star', 'Icons', 'star.svg'),
    A('a-bolt', 'Lightning', 'Icons', 'bolt.svg'),
    A('a-heart', 'Heart', 'Icons', 'heart.svg'),
    A('a-flame', 'Flame', 'Icons', 'flame.svg'),
    A('a-sun', 'Sunburst', 'Nature', 'sunburst.svg'),
    A('a-palm', 'Palm tree', 'Nature', 'palm.svg'),
    A('a-mountain', 'Mountain patch', 'Nature', 'mountain.svg'),
    A('a-waves', 'Waves', 'Nature', 'waves.svg'),
    A('a-zigzag', 'Zigzag band', 'Patterns', 'zigzag.svg'),
    A('a-splash', 'Paint splash', 'Patterns', 'splash.svg')
  ];

  /* ---------- Sample orders so the admin and sales pages have something to show ---------- */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r2 = (n) => Math.round(n * 100) / 100;

  JB.makeSampleOrders = function (pricing, products, settings) {
    const r = rng(20261112);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const names = ['Jordan M.', 'Ashley R.', 'Marcus T.', 'Sofia G.', 'Tyler B.', 'Keisha W.', 'Daniel K.', 'Maria L.', 'Brandon H.', 'Emily C.', 'Andre J.', 'Priya S.'];
    const places = ['Brooklyn, NY 11201', 'Newark, NJ 07102', 'Atlanta, GA 30303', 'Houston, TX 77002', 'Chicago, IL 60607', 'Philadelphia, PA 19103'];
    const orders = [];
    const now = new Date();
    let ref = 24001;
    for (let i = 0; i < 46; i++) {
      const daysAgo = Math.floor(r() * 80);
      const created = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(r() * 9) * 3600000);
      const kindRoll = r();
      const items = [];
      if (kindRoll < 0.7) {
        const g = pick(pricing.garments);
        const colour = pick(g.colours);
        const front = pick(pricing.printSizes);
        const withBack = g.id !== 'cap' && r() < 0.35 ? pick(pricing.printSizes) : null;
        const qty = r() < 0.3 ? 12 + Math.floor(r() * 40) : 1 + Math.floor(r() * 4);
        const sizes = {};
        if (g.sizes.length === 1) sizes[g.sizes[0]] = qty;
        else { let left = qty; g.sizes.forEach((s, idx) => { const n = idx === g.sizes.length - 1 ? left : Math.floor(left * r() * 0.6); if (n > 0) sizes[s] = n; left -= n; }); }
        const sides = { front: { tier: front.id } };
        if (withBack) sides.back = { tier: withBack.id };
        const calc = JB.pricingCalc({ garmentId: g.id, sides, sizes, hasUpload: r() < 0.3 }, pricing);
        items.push({ type: 'print', garmentId: g.id, garmentName: g.name, colour, sides: Object.fromEntries(Object.entries(sides).map(([k, v]) => [k, { tier: v.tier, json: null, preview: null }])),
          sizes, qty: calc.qty, hasUpload: calc.uploadFee > 0, calc, lineTotal: calc.total, sample: true });
      }
      if (kindRoll >= 0.55) {
        const p = pick(products);
        const qty = 1 + Math.floor(r() * 2);
        items.push({ type: 'shop', productId: p.id, name: p.name, image: p.images[0], price: p.price, size: p.sizes[0] || '', colour: p.colours[0] || '', qty, lineTotal: r2(p.price * qty) });
      }
      const fulfilment = r() < 0.45 ? 'pickup' : 'delivery';
      const printTotal = r2(items.filter(x => x.type === 'print').reduce((s, x) => s + x.lineTotal, 0));
      const shopTotal = r2(items.filter(x => x.type === 'shop').reduce((s, x) => s + x.lineTotal, 0));
      const discount = r2(items.filter(x => x.type === 'print').reduce((s, x) => s + x.calc.discount, 0));
      const sub = printTotal + shopTotal;
      const fee = fulfilment === 'pickup' ? Number(settings.pickupFee) || 0 : (settings.freeShippingOver && sub >= settings.freeShippingOver ? 0 : Number(settings.deliveryFee) || 0);
      const taxRate = Number(settings.taxRate) || 0;
      const tax = r2(sub * taxRate / 100);
      let status;
      if (daysAgo > 10) status = r() < 0.08 ? 'cancelled' : 'delivered';
      else if (daysAgo > 5) status = pick(['paid', 'in_production', 'ready', 'delivered']);
      else status = pick(['new', 'new', 'confirmed', 'paid', 'in_production']);
      const paid = ['paid', 'in_production', 'ready', 'delivered'].includes(status);
      orders.push({
        ref: 'JB-' + (ref++), createdAt: created.toISOString(), sample: true,
        customer: { name: pick(names) + ' (sample)', phone: '(555) 010-0100', email: '' },
        fulfilment, address: fulfilment === 'delivery' ? '123 Main St, ' + pick(places) : '', notes: '',
        items, printTotal, shopTotal, discount, fee, taxRate, tax, total: r2(sub + fee + tax),
        status, paid, paidAt: paid ? new Date(Math.min(now.getTime() - 60000, created.getTime() + 3600000 * (2 + Math.floor(r() * 30)))).toISOString() : null,
        history: [{ at: created.toISOString(), status: 'new', note: 'Order sent on WhatsApp' }]
      });
    }
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };
})();
