(async function () {
  const JB = window.JB, esc = JB.esc;
  if (!JB.auth.user()) return;
  const $ = (id) => document.getElementById(id);
  const S = await JB.store.getSettings();
  let products = await JB.store.listProducts({ all: true });
  const cats = S.categories || [];
  $('cat').innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  $('fCat').innerHTML = cats.map((c) => `<option>${esc(c)}</option>`).join('');
  $('fPriceWrap').innerHTML = JB.moneyInput('fPrice', '', 'required');
  $('fOldWrap').innerHTML = JB.moneyInput('fOld', '');

  const stockVal = (p) => (p.stock === null || p.stock === undefined || p.stock === '' ? Infinity : Number(p.stock));
  const table = JB.DataTable($('table'), [
    { key: 'name', label: 'Product', type: 'text', sort: true, primary: true, render: (p) => `<div style="display:flex;gap:12px;align-items:center" data-id="${esc(p.id)}"><img class="th" src="${JB.asset(p.images[0])}" alt=""><div><strong>${esc(p.name)}</strong>${p.sample ? ' <span class="badge b-sample">Sample</span>' : ''}<span class="sub">${esc((p.sizes || []).join(', ') || 'One size')}</span></div></div>` },
    { key: 'category', label: 'Category', type: 'text', sort: true, render: (p) => esc(p.category) },
    { key: 'price', label: 'Price', type: 'num', sort: true, cls: 'num', render: (p) => `${JB.money(p.price)}${p.oldPrice ? `<span class="sub"><s>${JB.money(p.oldPrice)}</s></span>` : ''}` },
    { key: 'stock', label: 'Stock', type: 'num', sort: stockVal, cls: 'num', render: (p) => (stockVal(p) === Infinity ? '<span class="muted">Not tracked</span>' : stockVal(p) <= 0 ? '<span style="color:var(--red);font-weight:800">Sold out</span>' : p.stock) },
    { key: 'featured', label: 'Featured', type: 'num', sort: (p) => (p.featured ? 1 : 0), render: (p) => `<label class="switch"><input type="checkbox" data-feat="${esc(p.id)}" ${p.featured ? 'checked' : ''} aria-label="Feature ${esc(p.name)} on the home page"></label>` },
    { key: 'active', label: 'In shop', type: 'num', sort: (p) => (p.active !== false ? 1 : 0), render: (p) => `<label class="switch"><input type="checkbox" data-active="${esc(p.id)}" ${p.active !== false ? 'checked' : ''} aria-label="Show ${esc(p.name)} in the shop"></label>` },
    { key: 'actions', label: 'Actions', cls: 'num', render: (p) => `<button class="icon-btn" type="button" data-edit="${esc(p.id)}" aria-label="Edit ${esc(p.name)}"><i class="ti ti-pencil" aria-hidden="true"></i></button> <button class="icon-btn" type="button" data-del="${esc(p.id)}" aria-label="Delete ${esc(p.name)}"><i class="ti ti-trash" aria-hidden="true"></i></button>` }
  ], { pageSize: 10, sortKey: 'name', sortDir: 'asc', onRowClick: (p) => openForm(p),
    empty: '<div class="empty" style="border:none;padding:36px"><i class="ti ti-hanger" aria-hidden="true"></i><h3>No products here</h3><p class="muted">Add your first product with the button above.</p></div>' });
  function render(resetPage) {
    const q = $('q').value.trim().toLowerCase(), c = $('cat').value;
    table.setRows(products.filter((p) => (!c || p.category === c) && (!q || p.name.toLowerCase().includes(q))), resetPage);
  }
  $('q').addEventListener('input', () => render(true));
  $('cat').addEventListener('change', () => render(true));

  $('table').addEventListener('change', async (e) => {
    const id = e.target.dataset.feat || e.target.dataset.active; if (!id) return;
    const p = products.find((x) => x.id === id);
    if (e.target.matches('[data-feat]')) p.featured = e.target.checked;
    if (e.target.matches('[data-active]')) p.active = e.target.checked;
    await JB.store.saveProduct(Object.assign({}, p, { sample: p.sample }));
    products = await JB.store.listProducts({ all: true });
    JB.toast(p.name + ' updated');
  });
  $('table').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-edit],[data-del]'); if (!b) return;
    const p = products.find((x) => x.id === (b.dataset.edit || b.dataset.del));
    if (b.dataset.edit) openForm(p);
    if (b.dataset.del) {
      if (!confirm(`Delete "${p.name}"? It will disappear from the shop.`)) return;
      await JB.store.deleteProduct(p.id); products = await JB.store.listProducts({ all: true }); render(); JB.toast('Product deleted');
    }
  });

  /* ---------- Form ---------- */
  const dlg = $('dlg');
  let editing = null, images = [];
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  function paintImages() {
    $('imgRow').innerHTML = images.map((src, i) => `<div class="img-slot"><img src="${JB.asset(src)}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join('') +
      `<label class="img-add" for="fImgs" title="Add photos"><i class="ti ti-camera-plus" aria-hidden="true"></i></label>`;
  }
  $('imgRow').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { images.splice(Number(b.dataset.rm), 1); paintImages(); } });
  $('fImgs').addEventListener('change', async (e) => {
    for (const f of [...e.target.files]) {
      try { images.push(await JB.compressImage(f, 900, 'image/jpeg', 0.8)); } catch (err) { JB.toast(err.message, { error: true }); }
    }
    e.target.value = ''; $('imgErr').textContent = ''; paintImages();
  });
  function openForm(p) {
    editing = p || null;
    $('dlgTitle').textContent = p ? 'Edit product' : 'Add product';
    $('fName').value = p ? p.name : '';
    $('fCat').value = p ? p.category : cats[0];
    $('fStock').value = p && p.stock !== null && p.stock !== undefined ? p.stock : '';
    $('fPrice').value = p ? p.price : '';
    $('fOld').value = p && p.oldPrice ? p.oldPrice : '';
    $('fSizes').value = p ? (p.sizes || []).filter((s) => s !== 'One size').join(', ') : '';
    $('fColours').value = p ? (p.colours || []).join(', ') : '';
    $('fDesc').value = p ? p.description || '' : '';
    $('fFeat').checked = p ? !!p.featured : false;
    $('fActive').checked = p ? p.active !== false : true;
    images = p ? (p.images || []).slice() : [];
    dlg.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    dlg.querySelectorAll('.err').forEach((x) => { x.textContent = ''; });
    paintImages();
    dlg.showModal(); $('fName').focus();
  }
  $('addBtn').addEventListener('click', () => openForm(null));
  const list = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
  $('pform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fail = (id, msg) => { const f = $(id).closest('.field'); f.classList.add('invalid'); f.querySelector('.err').textContent = msg; };
    dlg.querySelectorAll('.field.invalid').forEach((f) => { f.classList.remove('invalid'); f.querySelector('.err').textContent = ''; });
    let ok = true;
    if (!$('fName').value.trim()) { fail('fName', 'Give the product a name.'); ok = false; }
    if (!(Number($('fPrice').value) > 0)) { fail('fPrice', 'Enter a price.'); ok = false; }
    if (!images.length) { $('imgErr').textContent = 'Add at least one photo.'; ok = false; }
    if (!ok) return;
    const sizes = list($('fSizes').value);
    const p = Object.assign({}, editing || {}, {
      name: $('fName').value.trim(), category: $('fCat').value, price: JB.round2($('fPrice').value),
      oldPrice: Number($('fOld').value) > 0 ? JB.round2($('fOld').value) : null,
      stock: $('fStock').value === '' ? null : Math.max(0, parseInt($('fStock').value, 10)),
      sizes: sizes.length ? sizes : ['One size'], colours: list($('fColours').value), description: $('fDesc').value.trim(),
      featured: $('fFeat').checked, active: $('fActive').checked, images, sample: false
    });
    try {
      await JB.store.saveProduct(p);
      products = await JB.store.listProducts({ all: true });
      dlg.close(); render(); JB.toast(editing ? 'Product saved' : 'Product added to the shop');
    } catch (err) { JB.toast(err.message, { error: true, ms: 6000 }); }
  });

  render(true);
  if (new URLSearchParams(location.search).get('new')) openForm(null);
})();
