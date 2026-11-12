/* Admin shell: login guard, sidebar, top bar, toasts and shared helpers. */
(function () {
  const JB = window.JB, esc = JB.esc;
  const page = document.body.dataset.admin;
  if (page !== 'login' && !JB.auth.guard()) return;

  JB.STATUSES = [
    ['new', 'New', 'ti-sparkles'], ['confirmed', 'Confirmed', 'ti-message-check'], ['paid', 'Paid', 'ti-cash'],
    ['in_production', 'In production', 'ti-tools'], ['ready', 'Ready', 'ti-package'], ['delivered', 'Delivered', 'ti-truck-delivery'], ['cancelled', 'Cancelled', 'ti-x']
  ];
  JB.statusLabel = (s) => (JB.STATUSES.find((x) => x[0] === s) || [s, s])[1];
  JB.statusBadge = (s) => { const x = JB.STATUSES.find((y) => y[0] === s) || [s, s, 'ti-point']; return `<span class="badge st-${x[0]}"><i class="ti ${x[2]}" aria-hidden="true"></i>${x[1]}</span>`; };
  JB.kindBadges = (o) => {
    const p = o.items.filter((i) => i.type === 'print').reduce((s, i) => s + i.qty, 0);
    const sh = o.items.filter((i) => i.type === 'shop').reduce((s, i) => s + i.qty, 0);
    return (p ? `<span class="badge b-print"><i class="ti ti-wand" aria-hidden="true"></i>${p} printed</span> ` : '') + (sh ? `<span class="badge b-shop"><i class="ti ti-hanger" aria-hidden="true"></i>${sh} shop</span>` : '');
  };

  /* ---------- Toast ---------- */
  let wrap;
  JB.toast = function (msg, opts) {
    opts = opts || {};
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast' + (opts.error ? ' error' : '');
    t.innerHTML = `<i class="ti ${opts.error ? 'ti-alert-circle' : 'ti-circle-check'}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, opts.ms || 3000);
  };

  /* ---------- Image helper: shrink photos before saving ---------- */
  JB.compressImage = function (file, max, type, quality) {
    return new Promise((resolve, reject) => {
      if (/svg/.test(file.type)) { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); return; }
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve(c.toDataURL(type || 'image/jpeg', quality || 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  };
  JB.csv = function (rows, filename) {
    const text = rows.map((r) => r.map((c) => { const s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  JB.moneyInput = (id, value, attrs) => `<div class="money-in"><span>${esc(JB.settings().currency || '$')}</span><input class="input" type="number" min="0" step="0.01" inputmode="decimal" id="${id}" value="${value == null ? '' : value}" ${attrs || ''}></div>`;

  /* ---------- Orders: which page an order belongs on ---------- */
  JB.hasPrint = (o) => o.items.some((i) => i.type === 'print');
  JB.hasShop = (o) => o.items.some((i) => i.type === 'shop');
  JB.orderLink = (o) => (JB.hasPrint(o) ? 'print-orders.html' : 'shop-orders.html') + '?ref=' + encodeURIComponent(o.ref);
  JB.statusRank = (s) => JB.STATUSES.findIndex((x) => x[0] === s);

  /* ---------- Data table: sortable columns, pages; scrolls sideways on phones ----------
     columns: [{ key, label, render(row), sort: true | fn(row), type: 'date'|'num'|'text', cls, primary }]
     opts: { pageSize, sortKey, sortDir, onRowClick(row), empty, rowClass(row), paginate } */
  JB.DataTable = function (mount, columns, opts) {
    opts = opts || {};
    const st = { rows: [], page: 1, size: opts.pageSize || 10, key: opts.sortKey || null, dir: opts.sortDir || 'desc', pageRows: [] };
    const getter = (c) => (typeof c.sort === 'function' ? c.sort : (r) => r[c.key]);
    function sorted() {
      const c = columns.find((x) => x.key === st.key && x.sort);
      if (!c) return st.rows.slice();
      const g = getter(c), m = st.dir === 'asc' ? 1 : -1;
      return st.rows.slice().sort((a, b) => {
        let x = g(a), y = g(b);
        if (typeof x === 'string') x = x.toLowerCase(); if (typeof y === 'string') y = y.toLowerCase();
        return (x > y ? 1 : x < y ? -1 : 0) * m;
      });
    }
    function pager(pages) {
      if (pages <= 1) return '';
      const nums = [];
      for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
      return `<nav class="pager" aria-label="Pages">
        <button type="button" data-pg="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
        ${nums.map((p) => p === '…' ? '<span class="gap">…</span>' : `<button type="button" data-pg="${p}"${p === st.page ? ' aria-current="page"' : ''}>${p}</button>`).join('')}
        <button type="button" data-pg="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="Next page"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
      </nav>`;
    }
    function render() {
      const all = sorted(), total = all.length;
      const paginate = opts.paginate !== false;
      const pages = paginate ? Math.max(1, Math.ceil(total / st.size)) : 1;
      if (st.page > pages) st.page = pages;
      const start = paginate ? (st.page - 1) * st.size : 0;
      st.pageRows = paginate ? all.slice(start, start + st.size) : all;
      const head = columns.map((c) => {
        if (!c.sort) return `<th class="${c.cls || ''}">${c.label}</th>`;
        const on = st.key === c.key;
        const icon = on ? (st.dir === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending') : 'ti-arrows-sort';
        return `<th class="${c.cls || ''}" aria-sort="${on ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-sort${on ? ' on' : ''}" data-sort="${c.key}">${c.label}<i class="ti ${icon}" aria-hidden="true"></i></button></th>`;
      }).join('');
      const body = st.pageRows.length ? st.pageRows.map((r, i) => `<tr class="${opts.onRowClick ? 'click ' : ''}${opts.rowClass ? opts.rowClass(r) : ''}" data-i="${i}">${columns.map((c) =>
        `<td class="${c.cls || ''}${c.primary ? ' dt-primary' : ''}" data-label="${esc(c.label)}"><div class="dt-cell">${c.render ? c.render(r) : esc(r[c.key])}</div></td>`).join('')}</tr>`).join('')
        : `<tr class="dt-empty"><td colspan="${columns.length}">${opts.empty || '<p class="muted">Nothing to show.</p>'}</td></tr>`;
      mount.innerHTML = `
        ${total ? '<p class="dt-swipe"><i class="ti ti-arrows-horizontal" aria-hidden="true"></i> Swipe the table sideways to see every column</p>' : ''}
        <div class="tbl-wrap"><table class="tbl dt-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
        ${paginate && total ? `<div class="dt-foot">
          <span class="muted">Showing ${start + 1}–${Math.min(start + st.size, total)} of ${total}</span>
          <label class="dt-size">Rows <select class="select" data-size>${[10, 25, 50].map((n) => `<option${n === st.size ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          ${pager(pages)}
        </div>` : ''}`;
    }
    mount.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sort]');
      if (s) {
        const c = columns.find((x) => x.key === s.dataset.sort);
        if (st.key === c.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.key = c.key; st.dir = c.type === 'text' ? 'asc' : 'desc'; }
        st.page = 1; render(); return;
      }
      const pg = e.target.closest('[data-pg]');
      if (pg && !pg.disabled) { st.page = Number(pg.dataset.pg); render(); mount.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (opts.onRowClick && !e.target.closest('a,button,input,select,label,textarea')) {
        const tr = e.target.closest('tr[data-i]'); if (tr) opts.onRowClick(st.pageRows[Number(tr.dataset.i)]);
      }
    });
    mount.addEventListener('change', (e) => {
      if (e.target.matches('[data-size]')) { st.size = Number(e.target.value); st.page = 1; render(); }
    });
    return {
      setRows(rows, resetPage) { st.rows = rows; if (resetPage) st.page = 1; render(); },
      rowAt: (i) => st.pageRows[i],
      sortedRows: () => sorted()
    };
  };

  if (page === 'login') return;

  /* ---------- Shell ---------- */
  const user = JB.auth.user();
  const nav = [
    ['index.html', 'Dashboard', 'ti-layout-dashboard', 'dashboard'],
    'Orders',
    ['print-orders.html', 'Printing orders', 'ti-wand', 'print-orders'],
    ['shop-orders.html', 'Shop orders', 'ti-shopping-bag', 'shop-orders'],
    ['sales.html', 'Sales', 'ti-chart-bar', 'sales'],
    'Catalogue',
    ['products.html', 'Products', 'ti-hanger', 'products'],
    ['pricing.html', 'Print prices', 'ti-tag', 'pricing'],
    ['gallery.html', 'Art gallery', 'ti-palette', 'gallery'],
    'Account',
    ['settings.html', 'Profile & settings', 'ti-settings', 'settings']
  ];
  JB.store.listOrders().then((orders) => {
    const fresh = orders.filter((o) => o.status === 'new');
    [['print-orders', fresh.filter(JB.hasPrint).length], ['shop-orders', fresh.filter(JB.hasShop).length]].forEach(([k, n]) => {
      const el = document.querySelector(`[data-nav="${k}"]`);
      if (el && n) el.insertAdjacentHTML('beforeend', `<span class="count" title="${n} new">${n}</span>`);
    });
  });
  document.getElementById('admSide').innerHTML = `
    <a class="adm-brand" href="index.html"><img src="../assets/logo/jj-mark.svg" alt=""><span><b>JJ BOWEN</b><small>ADMIN</small></span></a>
    <nav class="adm-nav" aria-label="Admin">
      ${nav.map((n) => typeof n === 'string' ? `<span class="group">${n}</span>` : `<a href="${n[0]}" data-nav="${n[3]}"${n[3] === page ? ' class="active" aria-current="page"' : ''}><i class="ti ${n[2]}" aria-hidden="true"></i>${n[1]}</a>`).join('')}
    </nav>
    <div class="adm-foot">
      <a href="../index.html" target="_blank" rel="noopener"><i class="ti ti-external-link" aria-hidden="true"></i> View website</a>
      <button type="button" id="logout"><i class="ti ti-logout" aria-hidden="true"></i> Log out</button>
    </div>`;
  document.getElementById('admTop').innerHTML = `
    <button class="icon-btn adm-burger" type="button" id="burger" aria-label="Open menu"><i class="ti ti-menu-2" aria-hidden="true"></i></button>
    <h1>${esc(document.body.dataset.title || '')}</h1>
    <div class="who"><span>${esc(user.name)}</span><a class="avatar" href="settings.html" title="Profile">${esc((user.name || 'A').trim().charAt(0).toUpperCase())}</a></div>`;
  const side = document.getElementById('admSide'), scrim = document.getElementById('admScrim');
  const close = () => { side.classList.remove('open'); scrim.classList.remove('open'); };
  document.getElementById('burger').addEventListener('click', () => { side.classList.add('open'); scrim.classList.add('open'); });
  scrim.addEventListener('click', close);
  document.getElementById('logout').addEventListener('click', () => { JB.auth.logout(); location.href = 'login.html'; });

  /* ---------- Setup reminders ---------- */
  JB.setupBanners = async function (el) {
    const [S, pricing, products] = await Promise.all([JB.store.getSettings(), JB.store.getPricing(), JB.store.listProducts({ all: true })]);
    const out = [];
    if (JB.isPlaceholderWa(S.whatsapp)) out.push(['ti-brand-whatsapp', 'Add your WhatsApp number so customer orders reach your phone.', 'settings.html#business', 'Add number']);
    if (S.taxRate === null || S.taxRate === undefined || S.taxRate === '') out.push(['ti-receipt-tax', 'Set your sales tax rate so checkout totals include tax (enter 0 if you do not charge it).', 'settings.html#shipping', 'Set tax']);
    if (pricing.sample) out.push(['ti-tag', 'Print prices are still the sample prices. Set your real prices before you go live.', 'pricing.html', 'Set prices']);
    if (products.some((p) => p.sample)) out.push(['ti-hanger', 'Some products still use sample photos and prices. Edit or replace them with your own.', 'products.html', 'Review products', 'info']);
    el.innerHTML = out.map((b) => `<div class="banner ${b[4] || ''}"><i class="ti ${b[0]}" aria-hidden="true"></i><span>${b[1]}</span><a href="${b[2]}">${b[3]} →</a></div>`).join('');
  };

  document.body.classList.add('authed');
})();
