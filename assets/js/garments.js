/* Recolourable garment drawings for the design studio.
   Every garment is drawn on a 500 x 560 board. `area` is the printable box on that
   board and `inch` is its real-world size in inches, which turns a design's size into a print tier. */
(function () {
  const JB = (window.JB = window.JB || {});
  const W = 500, H = 560;

  const TEE_BODY_TAIL = 'L398 76 L480 170 L414 210 L394 186 L396 524 Q250 536 104 524 L106 186 L86 210 L20 170 L102 76 Z';
  const POLO_BODY_TAIL = 'L396 78 L470 160 L410 196 L392 176 L394 524 Q250 536 106 524 L108 176 L90 196 L30 160 L104 78 Z';
  const HOODIE_BODY = 'M178 74 L322 74 L402 98 L450 250 L472 466 L422 478 L402 292 L398 300 L400 528 Q250 540 100 528 L102 300 L98 292 L78 478 L28 466 L50 250 L98 98 Z';

  JB.GARMENTS = {
    tee: { label: 'T-shirt', sides: {
      front: { area: { x: 165, y: 118, w: 170, h: 227 }, inch: { w: 12, h: 16 } },
      back: { area: { x: 160, y: 100, w: 180, h: 240 }, inch: { w: 12.5, h: 16.7 } } } },
    polo: { label: 'Polo shirt', sides: {
      front: { area: { x: 170, y: 128, w: 160, h: 240 }, inch: { w: 10, h: 15 } },
      back: { area: { x: 160, y: 104, w: 180, h: 240 }, inch: { w: 12.5, h: 16.7 } } } },
    hoodie: { label: 'Hoodie', sides: {
      front: { area: { x: 166, y: 160, w: 168, h: 190 }, inch: { w: 11, h: 12.5 } },
      back: { area: { x: 160, y: 196, w: 180, h: 240 }, inch: { w: 12.5, h: 16.7 } } } },
    cap: { label: 'Cap', sides: {
      front: { area: { x: 182, y: 200, w: 136, h: 92 }, inch: { w: 4.5, h: 3 } } } },
    tote: { label: 'Tote bag', sides: {
      front: { area: { x: 150, y: 262, w: 200, h: 216 }, inch: { w: 12, h: 13 } },
      back: { area: { x: 150, y: 262, w: 200, h: 216 }, inch: { w: 12, h: 13 } } } }
  };
  JB.BOARD = { w: W, h: H };

  function lum(hex) {
    const h = String(hex || '#fff').replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  JB.isDark = (hex) => lum(hex) < 0.18;

  let n = 0;
  JB.garmentSVG = function (id, side, hex, opts) {
    opts = opts || {};
    side = side || 'front';
    const dark = JB.isDark(hex);
    const line = dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.17)';
    const out = dark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.24)';
    const k = 'g' + ++n;
    const sh = `url(#${k}s)`, hl = `url(#${k}h)`;
    const fillShape = (d, extra) => `<path d="${d}" fill="${hex}" stroke="${out}" stroke-width="1.6" stroke-linejoin="round"/><path d="${d}" fill="${sh}"/><path d="${d}" fill="${hl}"/>${extra || ''}`;
    const stroke = (d, w, c, dash) => `<path d="${d}" fill="none" stroke="${c || line}" stroke-width="${w || 1.6}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    const shade = (d, a) => `<path d="${d}" fill="${hex}"/><path d="${d}" fill="rgba(0,0,0,${a})" stroke="${out}" stroke-width="1.4"/>`;
    let body = '';

    if (id === 'tee') {
      if (side === 'front') {
        const neckIn = 'M186 46 C212 30 288 30 314 46 C294 84 206 84 186 46 Z';
        body = shade(neckIn, 0.34) + fillShape('M186 46 C206 84 294 84 314 46 ' + TEE_BODY_TAIL) +
          stroke('M186 46 C206 84 294 84 314 46', 9, 'rgba(0,0,0,.10)') + stroke('M190 52 C210 86 290 86 310 52', 1.4) +
          stroke('M102 76 Q120 132 106 186') + stroke('M398 76 Q380 132 394 186') +
          stroke('M29 160 L93 199', 1.4, null, '5 4') + stroke('M471 160 L407 199', 1.4, null, '5 4') +
          stroke('M106 510 Q250 522 394 510', 1.4, null, '5 4') +
          stroke('M118 215 Q140 240 132 270', 1.4) + stroke('M382 215 Q360 240 368 270', 1.4);
      } else {
        body = fillShape('M186 46 C212 58 288 58 314 46 ' + TEE_BODY_TAIL) +
          stroke('M186 46 C212 58 288 58 314 46', 7, 'rgba(0,0,0,.10)') + stroke('M190 52 C214 63 286 63 310 52', 1.4) +
          stroke('M102 76 Q120 132 106 186') + stroke('M398 76 Q380 132 394 186') +
          stroke('M29 160 L93 199', 1.4, null, '5 4') + stroke('M471 160 L407 199', 1.4, null, '5 4') +
          stroke('M106 510 Q250 522 394 510', 1.4, null, '5 4');
      }
    } else if (id === 'polo') {
      if (side === 'front') {
        const btn = dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)';
        body = shade('M192 48 C214 32 286 32 308 48 L300 58 C280 46 220 46 200 58 Z', 0.3) +
          fillShape('M192 48 L250 70 L308 48 ' + POLO_BODY_TAIL) +
          stroke('M238 80 L238 196 L262 196 L262 80') +
          `<circle cx="250" cy="110" r="4.5" fill="${btn}"/><circle cx="250" cy="140" r="4.5" fill="${btn}"/><circle cx="250" cy="170" r="4.5" fill="${btn}"/>` +
          fillShape('M194 46 Q218 58 250 80 L232 118 Q204 98 178 66 Z') + fillShape('M306 46 Q282 58 250 80 L268 118 Q296 98 322 66 Z') +
          stroke('M104 78 Q120 128 108 176') + stroke('M396 78 Q380 128 392 176') +
          stroke('M38 152 L98 188', 2) + stroke('M462 152 L402 188', 2) +
          stroke('M108 510 Q250 522 392 510', 1.4, null, '5 4');
      } else {
        body = fillShape('M192 48 C214 56 286 56 308 48 ' + POLO_BODY_TAIL) +
          fillShape('M192 48 C214 56 286 56 308 48 L304 32 C282 42 218 42 196 32 Z') +
          stroke('M104 78 Q120 128 108 176') + stroke('M396 78 Q380 128 392 176') +
          stroke('M38 152 L98 188', 2) + stroke('M462 152 L402 188', 2) +
          stroke('M108 510 Q250 522 392 510', 1.4, null, '5 4');
      }
    } else if (id === 'hoodie') {
      const common = stroke('M98 98 Q118 190 102 292') + stroke('M402 98 Q382 190 398 292') +
        stroke('M30 446 L80 458', 2.2) + stroke('M470 446 L420 458', 2.2) + stroke('M100 500 Q250 512 400 500', 2.2);
      if (side === 'front') {
        const str = dark ? '#E8E8E8' : 'rgba(0,0,0,.35)';
        body = fillShape(HOODIE_BODY) + common +
          stroke('M150 362 L350 362 L376 474 L124 474 Z', 1.8) + stroke('M156 372 Q140 420 134 466', 1.2) + stroke('M344 372 Q360 420 366 466', 1.2) +
          fillShape('M160 96 C146 30 200 4 250 4 C300 4 354 30 340 96 C330 124 300 142 250 144 C200 142 170 124 160 96 Z') +
          shade('M190 90 C186 46 218 26 250 26 C282 26 314 46 310 90 C302 116 280 128 250 130 C220 128 198 116 190 90 Z', 0.38) +
          stroke('M228 134 C226 162 224 192 222 224', 4, str) + stroke('M272 134 C274 162 276 192 278 224', 4, str) +
          `<rect x="218.5" y="222" width="7" height="15" rx="2" fill="${str}"/><rect x="274.5" y="222" width="7" height="15" rx="2" fill="${str}"/>`;
      } else {
        body = fillShape(HOODIE_BODY) + common +
          fillShape('M164 100 C150 24 350 24 336 100 C326 150 296 176 250 178 C204 176 174 150 164 100 Z') + stroke('M250 30 L250 176');
      }
    } else if (id === 'cap') {
      body = fillShape('M108 334 C108 196 176 128 250 128 C324 128 392 196 392 334 Z') +
        stroke('M250 132 C204 150 178 228 176 334') + stroke('M250 132 C296 150 322 228 324 334') +
        stroke('M240 140 C200 160 186 240 186 330', 1.2, null, '4 4') + stroke('M260 140 C300 160 314 240 314 330', 1.2, null, '4 4') +
        `<circle cx="148" cy="236" r="5" fill="rgba(0,0,0,.35)"/><circle cx="352" cy="236" r="5" fill="rgba(0,0,0,.35)"/>` +
        fillShape('M240 130 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z') +
        stroke('M108 334 C180 324 320 324 392 334', 2.2) +
        shade('M84 336 C120 322 380 322 416 336 C436 360 406 400 250 404 C94 400 64 360 84 336 Z', 0.12) +
        stroke('M100 346 C150 336 350 336 400 346', 1.3, null, '5 4') + stroke('M96 360 C150 352 350 352 404 360', 1.3, null, '5 4');
    } else if (id === 'tote') {
      body = `<path d="M196 214 C196 126 304 126 304 214" fill="none" stroke="${out}" stroke-width="22"/><path d="M196 214 C196 126 304 126 304 214" fill="none" stroke="${hex}" stroke-width="18"/><path d="M196 214 C196 126 304 126 304 214" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="18"/>` +
        `<path d="M178 214 C178 104 322 104 322 214" fill="none" stroke="${out}" stroke-width="24"/><path d="M178 214 C178 104 322 104 322 214" fill="none" stroke="${hex}" stroke-width="20"/>` +
        fillShape('M108 206 L392 206 L406 524 L94 524 Z') + stroke('M110 232 L390 232', 1.4, null, '5 4') +
        stroke('M168 210 L168 246 L188 246 L188 210', 1.3) + stroke('M312 210 L312 246 L332 246 L332 210', 1.3);
    }

    const defs = `<defs><linearGradient id="${k}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient><linearGradient id="${k}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
    const area = opts.showArea && JB.GARMENTS[id].sides[side] ? (() => { const a = JB.GARMENTS[id].sides[side].area; return `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="none" stroke="${dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.35)'}" stroke-width="1.4" stroke-dasharray="6 5" rx="4"/>`; })() : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${opts.width || W}" height="${opts.height || H}"${opts.cls ? ` class="${opts.cls}"` : ''} aria-hidden="true">${defs}${body}${area}</svg>`;
  };

  JB.svgToImage = function (svg) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  };
})();
