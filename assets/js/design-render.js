/* Turns a saved studio design (Fabric JSON on the 1000 x 1120 board) into images:
   - mockup(): the garment with the design on it (JPEG, for previews and WhatsApp)
   - printFile(): just the artwork, cropped to the print area, transparent PNG at print resolution
   Needs fabric.js and garments.js loaded first. */
(function () {
  const JB = (window.JB = window.JB || {});
  JB.SCALE = 2;                         // board logical units = garment board x 2
  JB.LOGICAL = { w: 1000, h: 1120 };
  JB.CUSTOM_PROPS = ['jbKind', 'jbSrc', 'jbUpload', 'jbArtId'];

  JB.areaLogical = function (garmentId, side) {
    const a = JB.GARMENTS[garmentId].sides[side].area;
    return { x: a.x * JB.SCALE, y: a.y * JB.SCALE, w: a.w * JB.SCALE, h: a.h * JB.SCALE };
  };

  JB.ensureFonts = async function (json) {
    const fams = new Set();
    (json && json.objects || []).forEach(function walk(o) { if (o.fontFamily) fams.add(o.fontFamily); (o.objects || []).forEach(walk); });
    if (!document.fonts || !fams.size) return;
    await Promise.all([...fams].map((f) => document.fonts.load(`40px "${f}"`).catch(() => null)));
  };

  function loadInto(canvas, json) {
    return new Promise((resolve) => canvas.loadFromJSON({ objects: (json && json.objects) || [] }, () => { canvas.renderAll(); resolve(canvas); }));
  }

  JB.hasDesign = (json) => !!(json && json.objects && json.objects.length);

  JB.mockup = async function (json, garmentId, side, hex, width) {
    width = width || 480;
    const height = Math.round(width * JB.LOGICAL.h / JB.LOGICAL.w);
    const out = document.createElement('canvas'); out.width = width; out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#EEF0F3'; ctx.fillRect(0, 0, width, height);
    const img = await JB.svgToImage(JB.garmentSVG(garmentId, side, hex));
    ctx.drawImage(img, 0, 0, width, height);
    if (JB.hasDesign(json)) {
      await JB.ensureFonts(json);
      const a = JB.areaLogical(garmentId, side);
      const sc = new fabric.StaticCanvas(null, { width: JB.LOGICAL.w, height: JB.LOGICAL.h, enableRetinaScaling: false, renderOnAddRemove: false });
      sc.clipPath = new fabric.Rect({ left: a.x, top: a.y, width: a.w, height: a.h, absolutePositioned: true });
      await loadInto(sc, json);
      const el = sc.toCanvasElement(width / JB.LOGICAL.w);
      ctx.drawImage(el, 0, 0, width, height);
      sc.dispose();
    }
    return out.toDataURL('image/jpeg', 0.86);
  };

  JB.printFile = async function (json, garmentId, side, dpi) {
    dpi = dpi || 150;
    await JB.ensureFonts(json);
    const a = JB.areaLogical(garmentId, side);
    const inch = JB.GARMENTS[garmentId].sides[side].inch;
    const pxW = Math.round(inch.w * dpi);
    const sc = new fabric.StaticCanvas(null, { width: a.w, height: a.h, enableRetinaScaling: false, renderOnAddRemove: false });
    await loadInto(sc, json);
    sc.setViewportTransform([1, 0, 0, 1, -a.x, -a.y]);
    sc.renderAll();
    const url = sc.toDataURL({ format: 'png', multiplier: pxW / a.w });
    sc.dispose();
    return url;
  };

  JB.download = function (dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  };
})();
