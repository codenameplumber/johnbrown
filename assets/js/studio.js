/* Design studio: garment + Fabric.js canvas + live price. */
(async function () {
  const JB = window.JB, esc = JB.esc;
  const $ = (id) => document.getElementById(id);
  const [pricing, S, artList] = await Promise.all([JB.store.getPricing(), JB.store.getSettings(), JB.store.listArt()]);
  const garments = pricing.garments.filter((g) => g.enabled !== false && JB.GARMENTS[g.id]);
  if (!garments.length) { $('stage').innerHTML = '<div class="stage-empty">The studio is being set up. Please check back soon.</div>'; return; }

  const qs = new URLSearchParams(location.search);
  const editId = qs.get('edit');
  const editing = editId ? JB.cart.get(editId) : null;

  const FONTS = ['Anton', 'Bebas Neue', 'Montserrat', 'Oswald', 'Playfair Display', 'Cinzel', 'Pacifico', 'Lobster', 'Permanent Marker', 'Manrope'];
  const FONT_WEIGHT = { 'Montserrat': 800, 'Playfair Display': 700, 'Oswald': 600, 'Cinzel': 700, 'Manrope': 800 };
  const QUICK = ['#16181B', '#FFFFFF', '#C9A24A', '#B3261E', '#2851A3', '#1F6B4E', '#F28C28', '#8E44AD'];

  const state = {
    garmentId: (editing && editing.garmentId) || qs.get('g') || garments[0].id,
    colour: null, side: 'front', sides: {}, sizes: {},
    text: { fontFamily: 'Anton', fill: null, bold: false, italic: false, outline: false, charSpacing: 0 }
  };
  if (!garments.find((g) => g.id === state.garmentId)) state.garmentId = garments[0].id;
  const G = () => garments.find((g) => g.id === state.garmentId);
  const DEF = () => JB.GARMENTS[state.garmentId];
  const areaL = () => JB.areaLogical(state.garmentId, state.side);

  function defaultSizes(g) { return g.sizes.length === 1 ? { [g.sizes[0]]: 1 } : { [g.sizes.includes('M') ? 'M' : g.sizes[0]]: 1 }; }
  if (editing) {
    state.colour = editing.colour;
    state.sizes = Object.assign({}, editing.sizes);
    Object.entries(editing.sides || {}).forEach(([k, v]) => { state.sides[k] = { json: v.json }; });
    $('studioTitle').textContent = 'Edit your design';
    $('addBag').querySelector('span').textContent = 'Update cart item';
  } else {
    const g = G();
    const want = (qs.get('c') || '').toLowerCase();
    state.colour = g.colours.find((c) => c.name.toLowerCase() === want) || g.colours.find((c) => /white|natural/i.test(c.name)) || g.colours[0];
    state.sizes = defaultSizes(g);
  }
  $('helpWa').href = JB.waLink(`Hello ${S.businessName}, I need help with a design in the studio.`);
  $('uploadFeeNote').textContent = pricing.uploadFee ? `Using your own artwork adds a one-time ${JB.money(pricing.uploadFee)} setup fee per design.` : 'Uploading your own artwork is free.';

  /* ---------- Fabric canvas ---------- */
  const canvas = new fabric.Canvas('designCanvas', { preserveObjectStacking: true, selection: false, uniformScaling: true, enableRetinaScaling: true });
  const stage = $('stage');
  function styleControls(o) {
    o.set({ transparentCorners: false, cornerColor: '#C9A24A', cornerStrokeColor: '#14181D', borderColor: '#C9A24A', cornerStyle: 'circle',
      cornerSize: 13, touchCornerSize: 34, padding: 6, borderScaleFactor: 1.6, borderDashArray: [5, 4] });
    o.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
  }
  function fit() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    canvas.setDimensions({ width: w, height: h });
    canvas.setZoom(w / JB.LOGICAL.w);
    canvas.getObjects().forEach((o) => o.setCoords());
    canvas.requestRenderAll();
  }
  function setClip() {
    const a = areaL();
    canvas.clipPath = new fabric.Rect({ left: a.x, top: a.y, width: a.w, height: a.h, absolutePositioned: true });
  }
  new ResizeObserver(fit).observe(stage);

  /* ---------- Garment drawing ---------- */
  function drawGarment() {
    $('garment').innerHTML = JB.garmentSVG(state.garmentId, state.side, state.colour.hex, { width: '100%', height: '100%' });
    const a = DEF().sides[state.side].area;
    const pct = (v, d) => (v / d * 100) + '%';
    Object.assign($('areaGuide').style, { left: pct(a.x, 500), top: pct(a.y, 560), width: pct(a.w, 500), height: pct(a.h, 560) });
    Object.assign($('stageEmpty').style, { left: pct(a.x + a.w / 2, 500), top: pct(a.y + a.h / 2, 560), width: pct(a.w * 0.9, 500) });
    const dark = JB.isDark(state.colour.hex);
    $('areaGuide').classList.toggle('dark', dark);
    $('stageEmpty').classList.toggle('dark', dark);
    document.querySelectorAll('.seg [data-side]').forEach((b) => {
      const exists = !!DEF().sides[b.dataset.side];
      b.disabled = !exists; b.title = exists ? '' : G().name + ' prints on the front only';
      b.setAttribute('aria-pressed', b.dataset.side === state.side);
    });
  }

  /* ---------- Side load / save / history ---------- */
  let loading = false;
  const history = {}; const lastSnap = {};
  const snapshot = () => ({ objects: canvas.toJSON(JB.CUSTOM_PROPS).objects });

  function measure() {
    const objs = canvas.getObjects();
    if (!objs.length) return { tier: null, tierName: null, win: 0, hin: 0 };
    const a = areaL();
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    objs.forEach((o) => { const b = o.getBoundingRect(true, true); x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top); x2 = Math.max(x2, b.left + b.width); y2 = Math.max(y2, b.top + b.height); });
    x1 = Math.max(x1, a.x); y1 = Math.max(y1, a.y); x2 = Math.min(x2, a.x + a.w); y2 = Math.min(y2, a.y + a.h);
    if (x2 <= x1 || y2 <= y1) return { tier: null, tierName: null, win: 0, hin: 0, outside: true };
    const inch = DEF().sides[state.side].inch;
    const win = (x2 - x1) / a.w * inch.w, hin = (y2 - y1) / a.h * inch.h;
    const t = JB.tierForIn(Math.max(win, hin), pricing);
    return { tier: t.id, tierName: t.name, win, hin, outside: false };
  }
  function saveCurrent() { state.sides[state.side] = Object.assign({ json: snapshot() }, measure()); }

  async function loadSide(side, silent) {
    loading = true;
    canvas.discardActiveObject();
    const data = state.sides[side] && state.sides[side].json;
    await JB.ensureFonts(data);
    await new Promise((r) => canvas.loadFromJSON({ objects: (data && data.objects) || [] }, r));
    canvas.getObjects().forEach(styleControls);
    setClip(); fit();
    loading = false;
    lastSnap[side] = JSON.stringify(snapshot());
    history[side] = history[side] || [];
    if (!silent) onChange();
  }

  function record() {
    if (loading) return;
    const s = JSON.stringify(snapshot());
    if (s === lastSnap[state.side]) { onChange(); return; }
    const h = (history[state.side] = history[state.side] || []);
    if (lastSnap[state.side] !== undefined) h.push(lastSnap[state.side]);
    if (h.length > 40) h.shift();
    lastSnap[state.side] = s;
    onChange();
  }
  let recT; const recordSoon = () => { clearTimeout(recT); recT = setTimeout(record, 250); };
  canvas.on('object:added', record);
  canvas.on('object:removed', record);
  canvas.on('object:modified', record);
  canvas.on('text:changed', recordSoon);
  canvas.on('selection:created', syncSelection);
  canvas.on('selection:updated', syncSelection);
  canvas.on('selection:cleared', syncSelection);

  async function undo() {
    const h = history[state.side] || [];
    if (!h.length) return;
    const prev = h.pop();
    loading = true;
    await new Promise((r) => canvas.loadFromJSON(JSON.parse(prev), r));
    canvas.getObjects().forEach(styleControls); setClip(); canvas.requestRenderAll();
    loading = false; lastSnap[state.side] = prev;
    onChange();
  }

  async function measureAll() {
    const cur = state.side;
    for (const k of Object.keys(DEF().sides)) {
      if (!state.sides[k] || !JB.hasDesign(state.sides[k].json)) continue;
      state.side = k; await loadSide(k, true);
      Object.assign(state.sides[k], measure());
    }
    state.side = cur; drawGarment(); await loadSide(cur, true);
  }

  async function switchSide(side) {
    if (side === state.side || !DEF().sides[side]) return;
    saveCurrent();
    state.side = side;
    drawGarment();
    await loadSide(side);
  }

  /* ---------- Adding things ---------- */
  function placeNew(obj, frac, maxScale) {
    const a = areaL();
    const s = Math.min(a.w * frac / obj.width, a.h * frac / obj.height, maxScale || 99);
    obj.set({ originX: 'center', originY: 'center', left: a.x + a.w / 2, top: a.y + a.h * 0.42, scaleX: s, scaleY: s });
    styleControls(obj);
    canvas.add(obj); canvas.setActiveObject(obj); canvas.requestRenderAll();
    // On phones the tools sit below the garment: bring the garment back into view.
    if (window.innerWidth <= 860) document.querySelector('.stage-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const loadSVG = (text) => new Promise((resolve, reject) => fabric.loadSVGFromString(text, (objs, opts) => {
    if (!objs || !objs.length) return reject(new Error('That SVG file has nothing we can use.'));
    resolve(fabric.util.groupSVGElements(objs.filter(Boolean), opts));
  }));
  const loadImg = (url) => new Promise((resolve, reject) => fabric.Image.fromURL(url, (img) => (img && img.width ? resolve(img) : reject(new Error('Could not open that image.')))));
  function coloursOf(o, set) {
    set = set || new Set();
    if (o.type === 'group' || o._objects) (o._objects || o.getObjects()).forEach((c) => coloursOf(c, set));
    else { [o.fill, o.stroke].forEach((c) => { if (typeof c === 'string' && c && c !== 'none' && c !== 'transparent') set.add(c.toLowerCase()); }); }
    return set;
  }
  function setColour(o, hex) {
    if (o.jbKind === 'text') {
      o.set('fill', hex);
      if (o.stroke) o.set('stroke', JB.isDark(hex) ? '#FFFFFF' : '#16181B');
    } else {
      (function apply(x) {
        if (x._objects) { x._objects.forEach(apply); x.dirty = true; return; }
        if (typeof x.fill === 'string' && x.fill && x.fill !== 'none' && x.fill !== 'transparent') x.set('fill', hex);
        if (typeof x.stroke === 'string' && x.stroke && x.stroke !== 'none') x.set('stroke', hex);
        x.dirty = true;
      })(o);
    }
    o.dirty = true;
    canvas.requestRenderAll();
  }

  async function addArt(art) {
    try {
      let obj;
      if (/\.svg($|\?)/i.test(art.src) || /^data:image\/svg/i.test(art.src)) {
        const body = art.src.slice(art.src.indexOf(',') + 1);
        const text = !art.src.startsWith('data:') ? await (await fetch(JB.asset(art.src))).text()
          : /;base64,/.test(art.src) ? decodeURIComponent(escape(atob(body))) : decodeURIComponent(body);
        obj = await loadSVG(text);
      } else obj = await loadImg(JB.asset(art.src));
      obj.set({ jbKind: obj.type === 'image' ? 'upload' : 'art', jbArtId: art.id, jbSrc: art.src });
      if (obj.type !== 'image' && coloursOf(obj).size === 1 && JB.isDark(state.colour.hex)) setColour(obj, '#FFFFFF');
      placeNew(obj, 0.55);
    } catch (e) { JB.toast(e.message || 'Could not add that design.', { error: true }); }
  }

  async function addText() {
    const words = $('textInput').value.trim() || 'Your text';
    const st = state.text;
    if (document.fonts) await document.fonts.load(`40px "${st.fontFamily}"`).catch(() => null);
    const fill = st.fill || (JB.isDark(state.colour.hex) ? '#FFFFFF' : '#16181B');
    const t = new fabric.IText(words, {
      fontFamily: st.fontFamily, fontSize: 84, fill, textAlign: 'center', charSpacing: st.charSpacing,
      fontWeight: st.bold ? 'bold' : (FONT_WEIGHT[st.fontFamily] || 'normal'), fontStyle: st.italic ? 'italic' : 'normal', jbKind: 'text'
    });
    applyOutline(t, st.outline);
    placeNew(t, 0.85, 1.4);
  }
  function applyOutline(t, on) {
    if (on) t.set({ stroke: JB.isDark(t.fill) ? '#FFFFFF' : '#16181B', strokeWidth: 4, paintFirst: 'stroke' });
    else t.set({ stroke: null, strokeWidth: 0 });
  }

  function downscale(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }
  async function handleFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { JB.toast('That file is over 10 MB. Try a smaller one.', { error: true }); return; }
    try {
      let obj;
      if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) obj = await loadSVG(await file.text());
      else if (/^image\//.test(file.type)) obj = await loadImg(await downscale(file, 1100));
      else throw new Error('Please choose a PNG, JPG or SVG file.');
      obj.set({ jbKind: obj.type === 'image' ? 'upload' : 'art', jbUpload: true });
      placeNew(obj, 0.7);
      JB.toast('Your artwork is on the ' + G().name.toLowerCase());
    } catch (e) { JB.toast(e.message, { error: true }); }
  }

  /* ---------- Selected item toolbar ---------- */
  const objbar = $('objbar');
  function syncSelection() {
    const o = canvas.getActiveObject();
    objbar.hidden = !o;
    if (!o) return;
    $('obLabel').textContent = o.jbKind === 'text' ? 'Text' : o.jbUpload ? 'Your artwork' : 'Art';
    const cols = [...coloursOf(o)];
    const canColour = o.type !== 'image' && cols.length > 0;
    $('obColour').disabled = !canColour;
    $('obColour').style.opacity = canColour ? 1 : 0.35;
    $('obColour').title = canColour ? 'Color' : 'Photos keep their own colors';
    if (canColour) { const c = toHex(o.jbKind === 'text' ? o.fill : cols[0]); if (c) $('obColour').value = c; }
    if (o.jbKind === 'text') {
      state.text.fontFamily = o.fontFamily; state.text.bold = o.fontWeight === 'bold'; state.text.italic = o.fontStyle === 'italic';
      state.text.outline = !!o.stroke; state.text.charSpacing = o.charSpacing || 0;
      $('textInput').value = o.text;
      paintTextControls();
    }
  }
  function toHex(c) {
    if (!c || typeof c !== 'string') return null;
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('');
    try { return '#' + new fabric.Color(c).toHex(); } catch (e) { return null; }
  }
  $('obColour').addEventListener('input', (e) => { const o = canvas.getActiveObject(); if (o) { setColour(o, e.target.value); if (o.jbKind === 'text') state.text.fill = e.target.value; } });
  $('obColour').addEventListener('change', () => record());
  objbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); const o = canvas.getActiveObject();
    if (!b || !o) return;
    const a = areaL();
    switch (b.dataset.act) {
      case 'forward': canvas.bringForward(o); record(); break;
      case 'backward': canvas.sendBackwards(o); record(); break;
      case 'center': o.setPositionByOrigin(new fabric.Point(a.x + a.w / 2, o.getCenterPoint().y), 'center', 'center'); o.setCoords(); canvas.requestRenderAll(); record(); break;
      case 'flip': o.set('flipX', !o.flipX); canvas.requestRenderAll(); record(); break;
      case 'dup': o.clone((c) => { c.set({ left: o.left + 24, top: o.top + 24 }); styleControls(c); canvas.add(c); canvas.setActiveObject(c); canvas.requestRenderAll(); }, JB.CUSTOM_PROPS); break;
      case 'delete': canvas.remove(o); canvas.discardActiveObject(); canvas.requestRenderAll(); break;
    }
  });
  document.addEventListener('keydown', (e) => {
    const o = canvas.getActiveObject();
    if (!o || o.isEditing || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); canvas.remove(o); canvas.discardActiveObject(); canvas.requestRenderAll(); }
    const step = e.shiftKey ? 20 : 4;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) { e.preventDefault(); o.set({ left: o.left + mv[0], top: o.top + mv[1] }); o.setCoords(); canvas.requestRenderAll(); recordSoon(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });

  /* ---------- Tools panel ---------- */
  const tabs = [...document.querySelectorAll('.tab')];
  function selectTab(t) {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); }
    });
  });

  function paintGarments() {
    $('garmentPick').innerHTML = garments.map((g) => {
      const hex = (g.colours.find((c) => c.name === state.colour.name) || g.colours[0]).hex;
      return `<button type="button" class="gopt" aria-pressed="${g.id === state.garmentId}" data-g="${g.id}">${JB.garmentSVG(g.id, 'front', hex, { width: 62, height: 70 })}${esc(g.name)}<small>from ${JB.money(g.base)}</small></button>`;
    }).join('');
  }
  function paintColours() {
    const g = G();
    $('colourPick').innerHTML = g.colours.map((c) => `<button type="button" class="swatch" style="background:${c.hex}" aria-pressed="${c.name === state.colour.name}" aria-label="${esc(c.name)}" title="${esc(c.name)}" data-c="${esc(c.name)}"></button>`).join('');
    $('colourName').textContent = state.colour.name;
  }
  $('garmentPick').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) setGarment(b.dataset.g); });
  $('colourPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    state.colour = G().colours.find((c) => c.name === b.dataset.c);
    paintColours(); drawGarment(); renderSummary();
  });

  async function setGarment(id) {
    if (id === state.garmentId) return;
    saveCurrent();
    const next = garments.find((g) => g.id === id), nextDef = JB.GARMENTS[id];
    const lost = Object.keys(state.sides).filter((k) => !nextDef.sides[k] && JB.hasDesign(state.sides[k].json));
    if (lost.length && !confirm(`A ${next.name.toLowerCase()} only prints on the front, so your back design will be removed. Carry on?`)) return;
    const oldId = state.garmentId;
    Object.keys(state.sides).forEach((k) => {
      if (!nextDef.sides[k]) { delete state.sides[k]; return; }
      const A = JB.areaLogical(oldId, k), B = JB.areaLogical(id, k), s = Math.min(B.w / A.w, B.h / A.h);
      (state.sides[k].json.objects || []).forEach((o) => {
        o.left = B.x + (o.left - A.x) * (B.w / A.w); o.top = B.y + (o.top - A.y) * (B.h / A.h);
        o.scaleX *= s; o.scaleY *= s;
      });
    });
    state.garmentId = id;
    state.colour = next.colours.find((c) => c.name === state.colour.name) || next.colours.find((c) => /white|natural/i.test(c.name)) || next.colours[0];
    const total = Object.values(state.sizes).reduce((s, n) => s + (Number(n) || 0), 0) || 1;
    const kept = Object.fromEntries(Object.entries(state.sizes).filter(([s, n]) => next.sizes.includes(s) && n > 0));
    state.sizes = Object.keys(kept).length ? kept : next.sizes.length === 1 ? { [next.sizes[0]]: total } : { [next.sizes.includes('M') ? 'M' : next.sizes[0]]: total };
    if (!nextDef.sides[state.side]) state.side = 'front';
    Object.keys(history).forEach((k) => { history[k] = []; });
    paintGarments(); paintColours(); paintSizes(); drawGarment();
    await measureAll();
    onChange();
  }

  /* Art gallery */
  let artCat = '';
  const artCats = ['', ...new Set(artList.map((a) => a.category).filter(Boolean))];
  function paintArt() {
    $('artCats').innerHTML = artCats.map((c) => `<button type="button" class="chip" aria-pressed="${c === artCat}" data-ac="${esc(c)}">${c ? esc(c) : 'All'}</button>`).join('');
    const list = artList.filter((a) => !artCat || a.category === artCat);
    $('artGrid').innerHTML = list.length ? list.map((a) => `<button type="button" class="art" data-art="${esc(a.id)}" title="Add ${esc(a.name)}"><img src="${JB.asset(a.src)}" alt="" loading="lazy"><span>${esc(a.name)}</span></button>`).join('')
      : '<p class="muted" style="grid-column:1/-1">No designs in this group yet.</p>';
  }
  $('artCats').addEventListener('click', (e) => { const b = e.target.closest('[data-ac]'); if (b) { artCat = b.dataset.ac; paintArt(); } });
  $('artGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-art]'); if (b) addArt(artList.find((a) => a.id === b.dataset.art)); });

  /* Text controls */
  function paintTextControls() {
    const st = state.text;
    $('fontList').innerHTML = FONTS.map((f) => `<button type="button" data-font="${f}" aria-pressed="${f === st.fontFamily}" style="font-family:'${f}';font-weight:${FONT_WEIGHT[f] || 400}">${f}</button>`).join('');
    $('tBold').setAttribute('aria-pressed', st.bold);
    $('tItalic').setAttribute('aria-pressed', st.italic);
    $('tOutline').setAttribute('aria-pressed', st.outline);
    $('tSpacing').value = st.charSpacing; $('tSpacingVal').textContent = st.charSpacing;
    if (st.fill) $('tColour').value = toHex(st.fill) || '#16181B';
  }
  const activeText = () => { const o = canvas.getActiveObject(); return o && o.jbKind === 'text' ? o : null; };
  async function styleText(patch) {
    Object.assign(state.text, patch);
    const t = activeText(); if (!t) { paintTextControls(); return; }
    if (patch.fontFamily && document.fonts) await document.fonts.load(`40px "${patch.fontFamily}"`).catch(() => null);
    const st = state.text;
    t.set({ fontFamily: st.fontFamily, fontWeight: st.bold ? 'bold' : (FONT_WEIGHT[st.fontFamily] || 'normal'), fontStyle: st.italic ? 'italic' : 'normal', charSpacing: st.charSpacing });
    if ('fill' in patch) setColour(t, patch.fill);
    if ('outline' in patch) applyOutline(t, st.outline);
    t.initDimensions(); t.setCoords(); canvas.requestRenderAll();
    paintTextControls(); recordSoon();
  }
  $('fontList').addEventListener('click', (e) => { const b = e.target.closest('[data-font]'); if (b) styleText({ fontFamily: b.dataset.font }); });
  $('tBold').addEventListener('click', () => styleText({ bold: !state.text.bold }));
  $('tItalic').addEventListener('click', () => styleText({ italic: !state.text.italic }));
  $('tOutline').addEventListener('click', () => styleText({ outline: !state.text.outline }));
  $('tColour').addEventListener('input', (e) => styleText({ fill: e.target.value }));
  $('tSpacing').addEventListener('input', (e) => styleText({ charSpacing: Number(e.target.value) }));
  $('addText').addEventListener('click', addText);
  $('textInput').addEventListener('input', (e) => { const t = activeText(); if (t) { t.set('text', e.target.value || ' '); t.initDimensions(); t.setCoords(); canvas.requestRenderAll(); recordSoon(); } });

  /* Upload */
  $('file').addEventListener('change', (e) => { handleFile(e.target.files[0]); e.target.value = ''; });
  // "Upload your art" buttons on the canvas and in the Art tab open the file picker straight away.
  document.querySelectorAll('[data-upload-art]').forEach((b) => b.addEventListener('click', () => { selectTab($('t-upload')); $('file').click(); }));
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  /* Stage buttons */
  document.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-side]'); if (b && !b.disabled) switchSide(b.dataset.side); });
  $('undoBtn').addEventListener('click', undo);
  $('guideBtn').addEventListener('click', () => { const off = $('areaGuide').classList.toggle('off'); $('guideBtn').setAttribute('aria-pressed', !off); });
  $('clearBtn').addEventListener('click', () => {
    if (!canvas.getObjects().length) return;
    if (!confirm('Remove everything from the ' + state.side + '?')) return;
    loading = true; canvas.remove(...canvas.getObjects()); canvas.discardActiveObject(); loading = false; record();
  });

  /* ---------- Summary + price ---------- */
  function paintSizes() {
    const g = G();
    $('sizeTitle').textContent = g.sizes.length === 1 ? 'Quantity' : 'Sizes and quantity';
    $('sizeGrid').style.gridTemplateColumns = g.sizes.length === 1 ? '1fr' : `repeat(${Math.min(6, g.sizes.length)},1fr)`;
    $('sizeGrid').innerHTML = g.sizes.map((s) => {
      const n = Number(state.sizes[s]) || 0;
      return `<div class="size-cell${n ? ' has' : ''}"><label for="sz-${esc(s)}">${esc(s)}</label><input id="sz-${esc(s)}" type="number" min="0" inputmode="numeric" value="${n}" data-size="${esc(s)}"></div>`;
    }).join('');
  }
  $('sizeGrid').addEventListener('input', (e) => {
    const inp = e.target.closest('[data-size]'); if (!inp) return;
    state.sizes[inp.dataset.size] = Math.max(0, parseInt(inp.value, 10) || 0);
    inp.closest('.size-cell').classList.toggle('has', state.sizes[inp.dataset.size] > 0);
    $('formErr').textContent = '';
    renderPrice();
  });
  $('sizeGrid').addEventListener('focusin', (e) => { if (e.target.matches('[data-size]')) e.target.select(); });

  const hasUpload = () => Object.entries(state.sides).some(([k, v]) => DEF().sides[k] && (k === state.side ? canvas.getObjects() : (v.json && v.json.objects) || []).some((o) => o.jbUpload));
  function calcInput() {
    const sides = {};
    Object.entries(state.sides).forEach(([k, v]) => { if (DEF().sides[k] && v.tier && JB.hasDesign(v.json)) sides[k] = { tier: v.tier }; });
    return { garmentId: state.garmentId, sides, sizes: state.sizes, hasUpload: hasUpload() };
  }
  function renderSides() {
    const rows = Object.keys(DEF().sides).map((k) => {
      const v = state.sides[k];
      const label = k === 'front' ? 'Front' : 'Back';
      if (v && v.outside && JB.hasDesign(v.json)) return `<div class="side-row empty"><div><strong>${label}</strong><small style="color:var(--red)">Design is outside the print area</small></div></div>`;
      if (!v || !v.tier || !JB.hasDesign(v.json)) return `<div class="side-row empty"><div><strong>${label}</strong><small>No design yet</small></div>${k !== state.side ? `<button class="btn btn-line btn-sm" type="button" data-goto="${k}">Design ${label.toLowerCase()}</button>` : ''}</div>`;
      const t = pricing.printSizes.find((p) => p.id === v.tier);
      return `<div class="side-row"><div><strong>${label} · ${esc(t.name)} print</strong><small>About ${fmtIn(v.win)} × ${fmtIn(v.hin)} in${t.note ? ' · ' + esc(t.note) : ''}</small></div><span class="amt">${JB.money(t.price)}</span></div>`;
    }).join('');
    $('sideRows').innerHTML = rows;
  }
  function fmtIn(n) { return (Math.round(n * 2) / 2).toString(); }
  $('sideRows').addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) switchSide(b.dataset.goto); });
  let lastTotal = null;
  function renderPrice() {
    const c = JB.pricingCalc(calcInput(), pricing);
    const g = G();
    $('priceBox').innerHTML = `
      <div class="pline"><span>${esc(g.name)}</span><span>${JB.money(c.base)}</span></div>
      ${c.sideCosts.map((s) => `<div class="pline"><span>${s.side === 'front' ? 'Front' : 'Back'} print (${esc(s.tierName)})</span><span>+${JB.money(s.price)}</span></div>`).join('')}
      <div class="pline" style="color:var(--text);font-weight:700"><span>Price per piece</span><span>${JB.money(c.unit)}</span></div>
      <div class="pline"><span>Pieces</span><span>× ${c.qty}</span></div>
      ${c.xxlCost ? `<div class="pline"><span>2XL+ extra (${c.xxlQty})</span><span>+${JB.money(c.xxlCost)}</span></div>` : ''}
      ${c.discount ? `<div class="pline save"><span>Bulk ${c.pct}% off</span><span>−${JB.money(c.discount)}</span></div>` : ''}
      ${c.uploadFee ? `<div class="pline"><span>Your artwork setup</span><span>+${JB.money(c.uploadFee)}</span></div>` : ''}
      <div class="ptotal"><span>Total</span><strong id="ptotal">${JB.money(c.total)}</strong></div>
      ${c.next && c.qty > 0 ? `<div class="nudge"><i class="ti ti-discount" aria-hidden="true"></i><span>Order ${c.next.min - c.qty} more to save ${c.next.pct}% on every piece.</span></div>` : ''}`;
    if (lastTotal !== null && lastTotal !== c.total) { const el = $('ptotal'); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 400); }
    lastTotal = c.total;
    return c;
  }
  function renderSummary() {
    const g = G();
    $('sumTitle').textContent = 'Your ' + g.name.toLowerCase().replace(/^t-shirt$/, 'T-shirt');
    $('sumSub').textContent = `${state.colour.name} · prices update as you design`;
    renderSides(); renderPrice();
  }
  function onChange() {
    if (!loading) Object.assign(state.sides[state.side] = state.sides[state.side] || {}, { json: snapshot() }, measure());
    $('stageEmpty').hidden = canvas.getObjects().length > 0;
    $('undoBtn').disabled = !(history[state.side] || []).length;
    document.querySelectorAll('.seg [data-side]').forEach((b) => { const v = state.sides[b.dataset.side]; b.classList.toggle('has', !!(v && JB.hasDesign(v.json))); });
    renderSummary();
  }

  /* ---------- Add to bag / preview ---------- */
  $('addBag').addEventListener('click', async () => {
    saveCurrent();
    const err = (m) => { $('formErr').textContent = m; };
    const designed = Object.entries(state.sides).filter(([k, v]) => DEF().sides[k] && JB.hasDesign(v.json));
    if (!designed.length) return err('Add art, text or your own upload first.');
    if (designed.some(([, v]) => !v.tier)) return err('Move your design inside the dashed print area.');
    const c = JB.pricingCalc(calcInput(), pricing);
    if (!c.qty) return err('Enter how many pieces you want.');
    err('');
    const btn = $('addBag'); btn.disabled = true; btn.querySelector('span').textContent = 'Saving…';
    try {
      const sides = {};
      for (const [k, v] of designed) sides[k] = { json: v.json, tier: v.tier, tierName: v.tierName, win: v.win, hin: v.hin, preview: await JB.mockup(v.json, state.garmentId, k, state.colour.hex, 480) };
      const sizes = Object.fromEntries(Object.entries(state.sizes).filter(([, n]) => n > 0));
      const item = { type: 'print', garmentId: state.garmentId, garmentName: G().name, colour: state.colour, sides, sizes, qty: c.qty, hasUpload: c.uploadFee > 0, calc: c, lineTotal: c.total };
      if (editing) { JB.cart.update(editId, item); location.href = 'cart.html'; return; }
      JB.cart.add(item);
      JB.toast('Added to your cart', { link: { href: 'cart.html', label: 'View cart' }, ms: 5000 });
    } catch (e) {
      JB.toast(e.message, { error: true, ms: 6000 });
    } finally {
      btn.disabled = false; btn.querySelector('span').textContent = editing ? 'Update cart item' : 'Add to cart';
    }
  });
  $('dlPreview').addEventListener('click', async () => {
    saveCurrent();
    const url = await JB.mockup(state.sides[state.side].json, state.garmentId, state.side, state.colour.hex, 1000);
    JB.download(url, `jj-bowen-${state.garmentId}-${state.side}.jpg`);
  });

  /* ---------- Boot ---------- */
  paintGarments(); paintColours(); paintArt(); paintTextControls(); paintSizes();
  drawGarment(); fit(); setClip();
  if (editing) await measureAll(); else await loadSide('front', true);
  onChange();
})();
