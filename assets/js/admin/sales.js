(async function () {
  const JB = window.JB, esc = JB.esc;
  if (!JB.auth.user()) return;
  const $ = (id) => document.getElementById(id);
  const all = await JB.store.listOrders();
  const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']];
  let range = new URLSearchParams(location.search).get('range') || '30';
  const realPaid = all.some((o) => o.paid && !o.sample);
  $('incSample').checked = !realPaid;

  const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function bounds() {
    const today = day0(new Date());
    const end = new Date(today); end.setHours(23, 59, 59, 999);
    if (range === 'custom') {
      const f = $('from').value ? day0($('from').value + 'T00:00') : today;
      const t = $('to').value ? new Date($('to').value + 'T23:59:59') : end;
      return [f, t];
    }
    if (range === 'today') return [today, end];
    if (range === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); const ye = new Date(y); ye.setHours(23, 59, 59, 999); return [y, ye]; }
    if (range === 'month') return [new Date(today.getFullYear(), today.getMonth(), 1), end];
    if (range === 'year') return [new Date(today.getFullYear(), 0, 1), end];
    if (range === 'all') {
      const first = all.filter((o) => o.paidAt).map((o) => new Date(o.paidAt)).sort((a, b) => a - b)[0];
      return [first ? day0(first) : today, end];
    }
    const s = new Date(today); s.setDate(s.getDate() - (Number(range) - 1));
    return [s, end];
  }

  function shortMoney(n) {
    const cur = JB.settings().currency || '$';
    if (n >= 1e6) return cur + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'm';
    if (n >= 1e3) return cur + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return cur + Math.round(n);
  }
  // Axis top = 4 clean steps (1, 2, 2.5 or 5 × a power of ten) so every gridline label is exact.
  function niceMax(v) {
    if (v <= 0) return 400;
    const raw = v / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((x) => x * p).find((x) => x >= raw);
    return step * 4;
  }

  function buckets(from, to) {
    const days = Math.round((to - from) / 86400000);
    const unit = days <= 35 ? 'day' : days <= 190 ? 'week' : 'month';
    const list = [];
    let cur = new Date(from);
    if (unit === 'week') { const dow = (cur.getDay() + 6) % 7; cur.setDate(cur.getDate() - dow); }
    if (unit === 'month') cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    while (cur <= to) {
      const start = new Date(cur);
      const next = new Date(cur);
      if (unit === 'day') next.setDate(next.getDate() + 1); else if (unit === 'week') next.setDate(next.getDate() + 7); else next.setMonth(next.getMonth() + 1);
      const label = unit === 'month' ? start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const full = unit === 'day' ? start.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
        : unit === 'week' ? 'Week of ' + start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        : start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ start, end: next, label, full, print: 0, shop: 0, fees: 0, n: 0 });
      cur = next;
    }
    return { unit, list };
  }

  let lastData = null;
  function drawChart(data) {
    lastData = data;
    const box = $('chart');
    const W = Math.max(300, box.clientWidth), H = 300, ml = 58, mr = 8, mt = 12, mb = 30;
    const iw = W - ml - mr, ih = H - mt - mb;
    const list = data.list;
    const max = niceMax(Math.max(0, ...list.map((b) => b.print + b.shop)));
    const y = (v) => mt + ih - (v / max) * ih;
    const step = iw / list.length;
    const bw = Math.max(3, Math.min(34, step * 0.62));
    const every = Math.max(1, Math.ceil(list.length / Math.max(2, Math.floor(iw / 64))));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
    const roundTop = (x, yTop, w, h, r) => {
      r = Math.min(r, h, w / 2);
      return `M${x},${yTop + h}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yTop + h}Z`;
    };
    let bars = '';
    list.forEach((b, i) => {
      const cx = ml + step * i + step / 2, x = cx - bw / 2;
      const hp = b.print ? Math.max(1, (b.print / max) * ih) : 0;
      const hs = b.shop ? Math.max(1, (b.shop / max) * ih) : 0;
      const base = mt + ih;
      let g = '';
      if (hp) g += hs ? `<rect class="bar" x="${x}" y="${base - hp}" width="${bw}" height="${hp}" fill="var(--s-print)"/>` : `<path class="bar" d="${roundTop(x, base - hp, bw, hp, 4)}" fill="var(--s-print)"/>`;
      if (hs) { const top = base - hp - (hp ? 2 : 0) - hs; g += `<path class="bar" d="${roundTop(x, top, bw, hs, 4)}" fill="var(--s-shop)"/>`; }
      const aria = `${b.full}: printing ${JB.money(b.print)}, shop ${JB.money(b.shop)}, ${b.n} paid order${b.n === 1 ? '' : 's'}`;
      bars += `<g class="col" data-i="${i}"><rect class="hit" x="${ml + step * i}" y="${mt}" width="${step}" height="${ih}" tabindex="0" role="img" aria-label="${esc(aria)}"/>${g}</g>`;
    });
    const xl = list.map((b, i) => (i % every === 0 ? `<text x="${ml + step * i + step / 2}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text>` : '')).join('');
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Sales chart">
      <g class="grid">${ticks.map((t) => `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
      <g class="axis">${ticks.map((t) => `<text x="${ml - 8}" y="${y(t) + 4}" text-anchor="end">${shortMoney(t)}</text>`).join('')}${xl}</g>
      ${bars}
    </svg><div class="chart-tip" id="tip" hidden></div>`;
    const tip = $('tip');
    const show = (g) => {
      const b = list[Number(g.dataset.i)];
      tip.innerHTML = `<b>${esc(b.full)}</b><div><span><i style="background:var(--s-print)"></i>Printing</span><span>${JB.money(b.print)}</span></div><div><span><i style="background:var(--s-shop)"></i>Shop</span><span>${JB.money(b.shop)}</span></div><div style="border-top:1px solid rgba(255,255,255,.15);margin-top:.25rem;padding-top:.25rem"><span>${b.n} paid order${b.n === 1 ? '' : 's'}</span><strong>${JB.money(b.print + b.shop)}</strong></div>`;
      const i = Number(g.dataset.i);
      const cx = ml + step * i + step / 2;
      const top = mt + ih - ((b.print + b.shop) / max) * ih;
      tip.hidden = false;
      const half = tip.offsetWidth / 2;
      tip.style.left = Math.min(W - half, Math.max(half, cx)) + 'px';
      tip.style.top = top + 'px';
    };
    box.querySelectorAll('.col').forEach((g) => {
      g.addEventListener('mouseenter', () => show(g));
      g.addEventListener('focusin', () => show(g));
      g.addEventListener('mouseleave', () => { tip.hidden = true; });
      g.addEventListener('focusout', () => { tip.hidden = true; });
    });
  }
  new ResizeObserver(() => { if (lastData) drawChart(lastData); }).observe($('chart'));

  function render() {
    $('ranges').innerHTML = RANGES.map(([k, l]) => `<button type="button" data-r="${k}" aria-pressed="${k === range}">${l}</button>`).join('');
    const [from, to] = bounds();
    if (range !== 'custom') { $('from').value = iso(from); $('to').value = iso(to); }
    const inc = $('incSample').checked;
    const paid = all.filter((o) => o.paid && o.paidAt && (inc || !o.sample)).filter((o) => { const d = new Date(o.paidAt); return d >= from && d <= to; })
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    const sum = (k) => paid.reduce((s, o) => s + (o[k] || 0), 0);
    const total = sum('total'), pr = sum('printTotal'), sh = sum('shopTotal'), fees = sum('fee'), tax = sum('tax');
    $('tiles').innerHTML = `
      <div class="tile"><span class="k"><i class="ti ti-cash" aria-hidden="true"></i> Total sales</span><span class="v">${JB.money(total)}</span><span class="s">Includes ${JB.money(fees)} shipping${tax ? ` and ${JB.money(tax)} sales tax` : ''}</span></div>
      <div class="tile"><span class="k"><i class="key" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--s-print)"></i> Printing sales</span><span class="v">${JB.money(pr)}</span><span class="s">${total ? Math.round(pr / total * 100) : 0}% of sales · ${paid.reduce((s, o) => s + o.items.filter((i) => i.type === 'print').reduce((a, i) => a + i.qty, 0), 0)} pieces</span></div>
      <div class="tile"><span class="k"><i class="key" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--s-shop)"></i> Shop sales</span><span class="v">${JB.money(sh)}</span><span class="s">${total ? Math.round(sh / total * 100) : 0}% of sales · ${paid.reduce((s, o) => s + o.items.filter((i) => i.type === 'shop').reduce((a, i) => a + i.qty, 0), 0)} items</span></div>
      <div class="tile"><span class="k"><i class="ti ti-receipt" aria-hidden="true"></i> Paid orders</span><span class="v">${paid.length}</span><span class="s">Average ${JB.money(paid.length ? total / paid.length : 0)} per order</span></div>`;

    const data = buckets(from, to);
    paid.forEach((o) => {
      const d = new Date(o.paidAt);
      const b = data.list.find((x) => d >= x.start && d < x.end);
      if (b) { b.print += o.printTotal || 0; b.shop += o.shopTotal || 0; b.fees += o.fee || 0; b.n++; }
    });
    $('chartTitle').textContent = 'Sales by ' + data.unit;
    drawChart(data);

    const tally = (type, key, valFn) => {
      const m = new Map();
      paid.forEach((o) => o.items.filter((i) => i.type === type).forEach((i) => { const k = key(i); m.set(k, (m.get(k) || 0) + valFn(i)); }));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const list = (rows, fmt, colour) => {
      if (!rows.length) return '<p class="muted">Nothing sold in this period.</p>';
      const top = rows[0][1];
      return rows.map(([k, v]) => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:700"><span>${esc(k)}</span><span>${fmt(v)}</span></div><div style="height:8px;background:var(--bg);border-radius:4px;margin-top:4px"><div style="height:8px;width:${Math.max(3, v / top * 100)}%;background:${colour};border-radius:4px"></div></div></div>`).join('');
    };
    $('topPrint').innerHTML = list(tally('print', (i) => i.garmentName, (i) => i.qty), (v) => v + ' pcs', 'var(--s-print)');
    $('topShop').innerHTML = list(tally('shop', (i) => i.name, (i) => i.lineTotal), JB.money, 'var(--s-shop)');

    const type = $('type').value;
    const rows = paid.filter((o) => !type || (type === 'print' ? o.printTotal > 0 : o.shopTotal > 0));
    const sameDay = iso(from) === iso(to);
    const amount = rows.reduce((s, o) => s + (type === 'print' ? o.printTotal : type === 'shop' ? o.shopTotal : o.total), 0);
    $('tblNote').textContent = `${rows.length} ${type === 'print' ? 'printing ' : type === 'shop' ? 'shop ' : ''}sale${rows.length === 1 ? '' : 's'} ${sameDay ? 'on ' + JB.date(from) : 'from ' + JB.date(from) + ' to ' + JB.date(to)} · ${JB.money(amount)}`;
    table.setRows(rows, true);
    lastPaid = rows;
  }
  let lastPaid = [];
  const table = JB.DataTable($('table'), [
    { key: 'ref', label: 'Order', type: 'text', sort: true, primary: true, render: (o) => `<span class="ref">${esc(o.ref)}</span>${o.sample ? ' <span class="badge b-sample">Sample</span>' : ''}<span class="sub">${esc(o.customer.name)}</span>` },
    { key: 'paidAt', label: 'Paid on', type: 'date', sort: true, render: (o) => `${JB.date(o.paidAt)}<span class="sub">${new Date(o.paidAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>` },
    { key: 'kind', label: 'Type', type: 'text', sort: (o) => (o.printTotal && o.shopTotal ? 'both' : o.printTotal ? 'print' : 'shop'), render: (o) => JB.kindBadges(o) },
    { key: 'printTotal', label: 'Printing', type: 'num', sort: true, cls: 'num', render: (o) => (o.printTotal ? JB.money(o.printTotal) : '–') },
    { key: 'shopTotal', label: 'Shop', type: 'num', sort: true, cls: 'num', render: (o) => (o.shopTotal ? JB.money(o.shopTotal) : '–') },
    { key: 'extras', label: 'Shipping + tax', type: 'num', sort: (o) => (o.fee || 0) + (o.tax || 0), cls: 'num', render: (o) => (o.fee || o.tax ? JB.money((o.fee || 0) + (o.tax || 0)) : '–') },
    { key: 'total', label: 'Total', type: 'num', sort: true, cls: 'num', render: (o) => `<strong>${JB.money(o.total)}</strong>` }
  ], { pageSize: 10, sortKey: 'paidAt', sortDir: 'desc', onRowClick: (o) => { location.href = JB.orderLink(o); },
    empty: '<div class="empty" style="border:none;padding:30px"><i class="ti ti-calendar-off" aria-hidden="true"></i><h3>No sales in this period</h3><p class="muted">Try a wider date range.</p></div>' });
  $('type').addEventListener('change', render);
  $('ranges').addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { range = b.dataset.r; render(); } });
  ['from', 'to'].forEach((id) => $(id).addEventListener('change', () => { range = 'custom'; render(); }));
  $('incSample').addEventListener('change', render);
  $('csv').addEventListener('click', () => {
    JB.csv([['Paid on', 'Order', 'Customer', 'Phone', 'Printing', 'Shop', 'Shipping', 'Sales tax', 'Total', 'Sample'],
      ...lastPaid.map((o) => [o.paidAt.slice(0, 10), o.ref, o.customer.name, o.customer.phone, o.printTotal, o.shopTotal, o.fee, o.tax || 0, o.total, o.sample ? 'yes' : 'no'])], 'jj-bowen-sales.csv');
  });
  render();
})();
