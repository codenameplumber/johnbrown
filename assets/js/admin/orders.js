/* Printing orders and Shop orders share this script; <body data-kind="print|shop"> picks the view. */
(async function () {
  const JB = window.JB, esc = JB.esc;
  if (!JB.auth.user()) return;
  const $ = (id) => document.getElementById(id);
  const KIND = document.body.dataset.kind;          // 'print' or 'shop'
  const isPrint = KIND === 'print';
  const S = await JB.store.getSettings();
  const artList = await JB.store.listArt({ all: true });
  let all = await JB.store.listOrders();
  const mine = () => all.filter(isPrint ? JB.hasPrint : JB.hasShop);
  const qs = new URLSearchParams(location.search);
  let status = qs.get('status') || '';
  $('hideSample').checked = all.some((o) => !o.sample) && all.some((o) => o.sample);

  /* ---------- List ---------- */
  const printItems = (o) => o.items.filter((i) => i.type === 'print');
  const shopItems = (o) => o.items.filter((i) => i.type === 'shop');
  const pieces = (list) => list.reduce((s, i) => s + i.qty, 0);
  const orderCol = { key: 'createdAt', label: 'Order', type: 'date', sort: true, primary: true,
    render: (o) => `<span class="ref">${esc(o.ref)}</span> ${o.sample ? '<span class="badge b-sample">Sample</span>' : ''}${isPrint && JB.hasShop(o) ? ' <span class="badge b-shop" title="This order also has shop items">+ shop</span>' : ''}${!isPrint && JB.hasPrint(o) ? ' <span class="badge b-print" title="This order also has custom prints">+ prints</span>' : ''}<span class="sub">${JB.date(o.createdAt, true)}</span>` };
  const common = [
    { key: 'customer', label: 'Customer', type: 'text', sort: (o) => o.customer.name, render: (o) => `${esc(o.customer.name)}<span class="sub">${esc(o.customer.phone)}</span>` },
    { key: 'fulfilment', label: 'Fulfillment', type: 'text', sort: true, render: (o) => (o.fulfilment === 'delivery' ? '<i class="ti ti-truck" aria-hidden="true"></i> Ship' : '<i class="ti ti-building-store" aria-hidden="true"></i> Pickup') },
    { key: 'total', label: 'Total', type: 'num', sort: true, cls: 'num', render: (o) => `<strong>${JB.money(o.total)}</strong>` },
    { key: 'paid', label: 'Paid', type: 'num', sort: (o) => (o.paid ? 1 : 0), render: (o) => (o.paid ? '<span class="paid-yes"><i class="ti ti-check" aria-hidden="true"></i> Paid</span>' : '<span class="paid-no">Not yet</span>') },
    { key: 'status', label: 'Status', type: 'num', sort: (o) => JB.statusRank(o.status), render: (o) => JB.statusBadge(o.status) }
  ];
  const columns = isPrint ? [
    orderCol,
    { key: 'design', label: 'Design', render: (o) => {
      const prevs = printItems(o).flatMap((i) => Object.values(i.sides).map((s) => s.preview)).filter(Boolean);
      return prevs.length ? `<div class="dt-thumbs">${prevs.slice(0, 2).map((p) => `<img src="${p}" alt="">`).join('')}${prevs.length > 2 ? `<span class="more">+${prevs.length - 2}</span>` : ''}</div>`
        : '<span class="dt-noimg" title="Sample order without a design file"><i class="ti ti-photo-off" aria-hidden="true"></i></span>';
    } },
    common[0],
    { key: 'pieces', label: 'Pieces', type: 'num', sort: (o) => pieces(printItems(o)), render: (o) => `<div class="lines">${printItems(o).map((i) => `<span>${esc(i.garmentName)} <span class="sub">× ${i.qty}</span></span>`).join('')}</div>` },
    ...common.slice(1)
  ] : [
    orderCol,
    { key: 'products', label: 'Products', type: 'num', sort: (o) => pieces(shopItems(o)), render: (o) => `<div style="display:flex;gap:10px;align-items:center"><div class="dt-thumbs">${shopItems(o).slice(0, 2).map((i) => `<img class="cover" src="${JB.asset(i.image)}" alt="">`).join('')}</div><div class="lines">${shopItems(o).map((i) => `<span>${esc(i.name)} <span class="sub">× ${i.qty}</span></span>`).join('')}</div></div>` },
    ...common
  ];
  const table = JB.DataTable($('table'), columns, {
    pageSize: 10, sortKey: 'createdAt', sortDir: 'desc', onRowClick: (o) => open(o.ref),
    empty: '<div class="empty" style="border:none;padding:36px"><i class="ti ti-receipt-off" aria-hidden="true"></i><h3>No orders match</h3><p class="muted">Try another status, date or search.</p></div>'
  });

  function tabs() {
    const list = mine();
    const counts = Object.fromEntries(JB.STATUSES.map(([s]) => [s, list.filter((o) => o.status === s).length]));
    $('statusTabs').innerHTML = [['', 'All', list.length], ...JB.STATUSES.map(([s, l]) => [s, l, counts[s]])]
      .map(([s, l, n]) => `<button type="button" data-s="${s}" aria-pressed="${s === status}">${l} <span style="opacity:.6">${n}</span></button>`).join('');
  }
  function filtered() {
    const q = $('q').value.trim().toLowerCase(), days = Number($('when').value), hide = $('hideSample').checked;
    const since = days ? (days === 1 ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(Date.now() - days * 86400000)) : null;
    return mine().filter((o) => (!status || o.status === status) && (!hide || !o.sample) && (!since || new Date(o.createdAt) >= since) &&
      (!q || (o.ref + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.items.map((i) => i.garmentName || i.name).join(' ')).toLowerCase().includes(q)));
  }
  function render(resetPage) {
    tabs();
    const list = filtered();
    table.setRows(list, resetPage);
    $('foot').textContent = `${list.length} order${list.length === 1 ? '' : 's'} · ${JB.money(list.reduce((s, o) => s + o.total, 0))} in total`;
  }
  $('statusTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; render(true); });
  $('q').addEventListener('input', () => render(true));
  ['when', 'hideSample'].forEach((id) => $(id).addEventListener('change', () => render(true)));

  /* ---------- Order detail ---------- */
  const dlg = $('dlg');
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('.lightbox')) { e.target.closest('.lightbox').remove(); return; }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', () => { const u = new URL(location.href); u.searchParams.delete('ref'); history.replaceState(null, '', u); });

  const SIDE = { front: 'Front', back: 'Back' };
  function elementsOf(json) {
    return ((json && json.objects) || []).map((o, idx) => {
      const colour = (c) => (typeof c === 'string' && c && c !== 'none' ? `<i class="chip-colour" style="background:${esc(c)}"></i>${esc(c.toUpperCase())}` : '');
      const firstFill = (x) => { if (x.objects) { for (const c of x.objects) { const f = firstFill(c); if (f) return f; } return null; } return typeof x.fill === 'string' && x.fill !== 'none' ? x.fill : (typeof x.stroke === 'string' ? x.stroke : null); };
      if (o.jbKind === 'text' || /text/i.test(o.type)) {
        return `<li><span class="el-ic"><i class="ti ti-typography" aria-hidden="true"></i></span><div><strong>Text: “${esc(o.text)}”</strong><span class="muted">Font ${esc(o.fontFamily)}${o.fontWeight === 'bold' ? ', bold' : ''}${o.fontStyle === 'italic' ? ', italic' : ''} · ${colour(o.fill)}${o.stroke ? ' · outlined' : ''}</span></div></li>`;
      }
      if (o.jbUpload) {
        const isImg = o.type === 'image' && o.src;
        return `<li><span class="el-ic">${isImg ? `<img src="${o.src}" alt="">` : '<i class="ti ti-upload" aria-hidden="true"></i>'}</span><div><strong>Customer's own artwork</strong><span class="muted">${isImg ? 'Image file' : 'Vector (SVG) file'}${!isImg && firstFill(o) ? ' · ' + colour(firstFill(o)) : ''}</span>${isImg ? `<div style="margin-top:6px"><button class="btn btn-line btn-sm" type="button" data-upload="${idx}"><i class="ti ti-download" aria-hidden="true"></i> Download their file</button></div>` : ''}</div></li>`;
      }
      const art = artList.find((a) => a.id === o.jbArtId);
      return `<li><span class="el-ic">${art ? `<img src="${JB.asset(art.src)}" alt="">` : '<i class="ti ti-palette" aria-hidden="true"></i>'}</span><div><strong>Gallery art: ${esc(art ? art.name : 'Art')}</strong><span class="muted">${o.type === 'image' ? 'Original colors' : 'Color ' + colour(firstFill(o))}${o.flipX ? ' · flipped' : ''}${o.angle ? ` · rotated ${Math.round(o.angle)}°` : ''}</span></div></li>`;
    }).join('');
  }

  function printReview(it, i) {
    const c = it.calc || {};
    const sides = Object.entries(it.sides || {});
    const first = sides[0];
    const hasFiles = sides.some(([, v]) => v.json);
    return `<section class="review" data-item="${i}">
      <div class="review-head">
        <div>
          <span class="badge b-print"><i class="ti ti-wand" aria-hidden="true"></i> Custom print</span>
          <h3>${esc(it.garmentName)}, ${esc(it.colour.name)} <i class="chip-colour" style="background:${esc(it.colour.hex)}"></i></h3>
          <div class="muted" style="font-size:.86rem">${sides.map(([k, v]) => `${SIDE[k]}: ${esc(v.tierName || v.tier)} print${v.win ? ` (about ${Math.round(v.win * 2) / 2} × ${Math.round(v.hin * 2) / 2} in)` : ''}`).join(' · ')}</div>
          <div style="font-size:.9rem;margin-top:.3rem"><strong>Sizes:</strong> ${esc(JB.sizesText(it.sizes))} <span class="muted">(${it.qty} pcs)</span></div>
          <div class="muted" style="font-size:.82rem;margin-top:.2rem">${JB.money(c.unit)} each${c.discount ? ` · bulk ${c.pct}% off (−${JB.money(c.discount)})` : ''}${c.uploadFee ? ` · setup ${JB.money(c.uploadFee)}` : ''}${c.xxlCost ? ` · 2XL+ extra ${JB.money(c.xxlCost)}` : ''}</div>
        </div>
        <strong style="font-size:1.1rem">${JB.money(it.lineTotal)}</strong>
      </div>
      ${hasFiles ? `<div class="review-grid">
        <div class="viewer">
          <img src="${first[1].preview || ''}" alt="${SIDE[first[0]]} of the design" data-zoom>
          ${sides.length > 1 ? `<div class="seg">${sides.map(([k], j) => `<button type="button" data-view="${k}" aria-pressed="${j === 0}">${SIDE[k]}</button>`).join('')}</div>` : ''}
          <button class="zoom-btn" type="button" data-zoom aria-label="View full size"><i class="ti ti-zoom-in" aria-hidden="true"></i></button>
        </div>
        <div>
          <p class="tp-title" style="font-weight:800;font-size:.85rem;margin:0 0 8px">What the customer used · <span data-el-side>${SIDE[first[0]]}</span></p>
          <ul class="elements" data-elements>${elementsOf(first[1].json)}</ul>
          <div class="dl-row">
            <button class="btn btn-dark btn-sm" type="button" data-print><i class="ti ti-download" aria-hidden="true"></i> Print file (PNG)</button>
            <button class="btn btn-line btn-sm" type="button" data-mock><i class="ti ti-photo" aria-hidden="true"></i> Mockup (JPG)</button>
          </div>
          <p class="muted" style="font-size:.78rem;margin:.6rem 0 0">The print file is the artwork alone on a see-through background, at 150 dpi and the real print size.</p>
        </div>
      </div>` : `<div class="viewer"><div class="nodesign"><div><i class="ti ti-photo-off" style="font-size:2rem" aria-hidden="true"></i><br>Sample order: no design file attached.</div></div></div>`}
    </section>`;
  }
  function shopItem(it) {
    return `<div class="od-item"><div class="top"><img src="${JB.asset(it.image)}" alt="" style="width:64px;height:76px;object-fit:cover;border-radius:10px"><div>
      <span class="badge b-shop"><i class="ti ti-hanger" aria-hidden="true"></i> Shop</span>
      <h3 style="margin:.4rem 0 .2rem;font-size:1rem">${esc(it.name)}</h3>
      <div class="muted" style="font-size:.86rem">${it.size && it.size !== 'One size' ? 'Size ' + esc(it.size) + ' · ' : ''}${it.colour ? esc(it.colour) + ' · ' : ''}${it.qty} × ${JB.money(it.price)}</div>
    </div><strong>${JB.money(it.lineTotal)}</strong></div></div>`;
  }

  let current = null;
  function open(ref) {
    current = all.find((o) => o.ref === ref);
    if (!current) { JB.toast('Order ' + ref + ' was not found.', { error: true }); return; }
    const o = current;
    const u = new URL(location.href); u.searchParams.set('ref', ref); history.replaceState(null, '', u);
    $('dlgTitle').innerHTML = `${esc(o.ref)} ${JB.statusBadge(o.status)} ${o.sample ? '<span class="badge b-sample">Sample</span>' : ''}`;
    const custWa = JB.waLink(`Hello ${o.customer.name.replace(/ \(sample\)$/, '')}, this is ${S.businessName} about your order ${o.ref}.`, o.customer.phone);
    const mainItems = isPrint
      ? `<h3 class="sec-title">Design review</h3>${o.items.map((it, i) => (it.type === 'print' ? printReview(it, i) : '')).join('')}
         ${JB.hasShop(o) ? `<h3 class="sec-title">Also in this order</h3>${shopItems(o).map(shopItem).join('')}` : ''}`
      : `<h3 class="sec-title">Products</h3>${shopItems(o).map(shopItem).join('')}
         ${JB.hasPrint(o) ? `<div class="banner info" style="margin-bottom:10px"><i class="ti ti-wand" aria-hidden="true"></i><span>This order also has ${pieces(printItems(o))} custom printed pieces.</span><a href="print-orders.html?ref=${encodeURIComponent(o.ref)}">See the designs →</a></div>` : ''}`;
    $('dlgBody').innerHTML = `
      <div class="od-grid">
        <div>
          ${mainItems}
          <div class="calc-demo">
            ${o.printTotal ? `<div class="sum-row"><span>Custom prints</span><span>${JB.money(o.printTotal)}</span></div>` : ''}
            ${o.shopTotal ? `<div class="sum-row"><span>Shop items</span><span>${JB.money(o.shopTotal)}</span></div>` : ''}
            <div class="sum-row"><span>${o.fulfilment === 'delivery' ? 'Shipping' : 'Local pickup'}</span><span>${o.fee ? JB.money(o.fee) : 'Free'}</span></div>
            ${o.tax ? `<div class="sum-row"><span>Sales tax (${o.taxRate}%)</span><span>${JB.money(o.tax)}</span></div>` : ''}
            <div class="sum-row total"><span>Total</span><span>${JB.money(o.total)}</span></div>
          </div>
        </div>
        <div class="stack">
          <section class="card" style="box-shadow:none;border:1px solid var(--line)">
            <h3 style="margin:0 0 .8rem;font-size:.95rem">Customer</h3>
            <dl class="kv"><dt>Name</dt><dd>${esc(o.customer.name)}</dd><dt>Phone</dt><dd>${esc(o.customer.phone)}</dd>${o.customer.email ? `<dt>Email</dt><dd>${esc(o.customer.email)}</dd>` : ''}
              <dt>Fulfillment</dt><dd>${o.fulfilment === 'delivery' ? 'Ship to customer' : 'Local pickup'}</dd>${o.address ? `<dt>Ship to</dt><dd>${esc(o.address)}</dd>` : ''}${o.notes ? `<dt>Notes</dt><dd>${esc(o.notes)}</dd>` : ''}
              <dt>Placed</dt><dd>${JB.date(o.createdAt, true)}</dd></dl>
            <div class="stack" style="gap:8px;margin-top:14px">
              <a class="btn btn-wa btn-sm" href="${custWa}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> Message customer</a>
              <button class="btn btn-line btn-sm" type="button" id="copyMsg"><i class="ti ti-copy" aria-hidden="true"></i> Copy order summary</button>
            </div>
          </section>
          <section class="card" style="box-shadow:none;border:1px solid var(--line)">
            <h3 style="margin:0 0 .8rem;font-size:.95rem">Progress</h3>
            <div class="field"><label for="odStatus">Status</label><select class="select" id="odStatus">${JB.STATUSES.map(([s, l]) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
            <label class="switch" style="margin-bottom:12px"><input type="checkbox" id="odPaid" ${o.paid ? 'checked' : ''}> Payment received${o.paidAt ? ` <span class="muted" style="font-weight:600">(${JB.date(o.paidAt)})</span>` : ''}</label>
            <div class="field"><label for="odNote">Add a note <span class="muted">(only you see this)</span></label><textarea class="textarea" id="odNote" style="min-height:60px" placeholder="e.g. Customer approved the design, paid by Zelle"></textarea></div>
            <button class="btn btn-dark btn-sm btn-block" type="button" id="odSave"><i class="ti ti-device-floppy" aria-hidden="true"></i> Save changes</button>
            <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Marking an order as paid counts it in Sales.</p>
          </section>
          <section class="card" style="box-shadow:none;border:1px solid var(--line)">
            <h3 style="margin:0 0 .8rem;font-size:.95rem">History</h3>
            <ul class="timeline">${(o.history || []).slice().reverse().map((h) => `<li><span class="dot"></span><div><strong>${esc(h.note || JB.statusLabel(h.status))}</strong><small>${JB.date(h.at, true)} · ${esc(JB.statusLabel(h.status))}</small></div></li>`).join('')}</ul>
          </section>
          <button class="btn btn-line btn-sm" type="button" id="odDelete" style="color:var(--red)"><i class="ti ti-trash" aria-hidden="true"></i> Delete order</button>
        </div>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }

  const viewSide = (sec) => { const b = sec.querySelector('[data-view][aria-pressed="true"]'); return b ? b.dataset.view : Object.keys(current.items[Number(sec.dataset.item)].sides)[0]; };
  $('dlgBody').addEventListener('click', async (e) => {
    const o = current; if (!o) return;
    const sec = e.target.closest('.review');
    if (sec) {
      const it = o.items[Number(sec.dataset.item)];
      const v = e.target.closest('[data-view]');
      if (v) {
        const s = it.sides[v.dataset.view];
        sec.querySelector('.viewer img').src = s.preview || '';
        sec.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b === v));
        sec.querySelector('[data-elements]').innerHTML = elementsOf(s.json);
        sec.querySelector('[data-el-side]').textContent = SIDE[v.dataset.view];
        return;
      }
      const side = viewSide(sec);
      if (e.target.closest('[data-zoom]')) {
        const box = document.createElement('div'); box.className = 'lightbox';
        box.innerHTML = `<img alt="Full-size ${SIDE[side]} of the design" src="${it.sides[side].preview || ''}"><button type="button" aria-label="Close"><i class="ti ti-x" aria-hidden="true"></i></button>`;
        dlg.appendChild(box);
        if (it.sides[side].json) JB.mockup(it.sides[side].json, it.garmentId, side, it.colour.hex, 1100).then((url) => { const im = box.querySelector('img'); if (im) im.src = url; });
        return;
      }
      const btn = e.target.closest('[data-print],[data-mock],[data-upload]');
      if (btn) {
        const label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Preparing…';
        try {
          if (btn.matches('[data-print]')) JB.download(await JB.printFile(it.sides[side].json, it.garmentId, side, 150), `${o.ref}-${it.garmentId}-${side}-print.png`);
          else if (btn.matches('[data-mock]')) JB.download(await JB.mockup(it.sides[side].json, it.garmentId, side, it.colour.hex, 1200), `${o.ref}-${it.garmentId}-${side}-mockup.jpg`);
          else { const obj = it.sides[side].json.objects[Number(btn.dataset.upload)]; const ext = /image\/png/.test(obj.src) ? 'png' : 'jpg'; JB.download(obj.src, `${o.ref}-customer-artwork.${ext}`); }
        } catch (err) { JB.toast('Could not make the file: ' + err.message, { error: true }); }
        btn.disabled = false; btn.innerHTML = label;
        return;
      }
    }
    if (e.target.closest('#copyMsg')) {
      try { await navigator.clipboard.writeText(JB.orderMessage(o, S)); JB.toast('Order summary copied'); } catch (err) { JB.toast('Copy is blocked in this browser.', { error: true }); }
      return;
    }
    if (e.target.closest('#odSave')) {
      const patch = { status: $('odStatus').value, paid: $('odPaid').checked };
      if (patch.status === 'paid' && !patch.paid) patch.paid = true;
      const note = $('odNote').value.trim();
      const saved = await JB.store.updateOrder(o.ref, patch, note || null);
      all = await JB.store.listOrders();
      render(); open(saved.ref);
      JB.toast('Order ' + saved.ref + ' updated');
      return;
    }
    if (e.target.closest('#odDelete')) {
      if (!confirm(`Delete order ${o.ref}? This cannot be undone.`)) return;
      await JB.store.deleteOrder(o.ref);
      all = await JB.store.listOrders();
      dlg.close(); render(); JB.toast('Order deleted');
    }
  });

  render(true);
  if (qs.get('ref')) open(qs.get('ref'));
})();
