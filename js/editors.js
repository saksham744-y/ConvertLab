/* ConvertLab - Utility tools: Color Flipper, Image Resizer, Transparent Background, Image Cropper */
'use strict';

/* ================= shared editor helpers ================= */
const EXPORT_FMTS = [['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WEBP'], ['bmp', 'BMP'], ['ico', 'ICO'], ['gif', 'GIF'], ['svg', 'SVG'], ['pdf', 'PDF']];
const noIo = { check() {}, progress() {} };
const flatten = (c, bg) => { const n = newCanvas(c.width, c.height), x = n.getContext('2d'); x.fillStyle = bg || '#fff'; x.fillRect(0, 0, n.width, n.height); x.drawImage(c, 0, 0); return n; };
async function fileToCanvas(file, maxSide = 8192) {
  const ext = extOf(file.name) || (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const dec = await decodeImage({ file, name: file.name, ext }, { svgScale: 2 }), s = Math.min(1, maxSide / Math.max(dec.w, dec.h)), c = newCanvas(dec.w * s, dec.h * s);
  c.getContext('2d').drawImage(dec.src, 0, 0, c.width, c.height); if (dec.src.close) dec.src.close(); return c;
}
async function exportCanvas(c, fmt, o = {}) {
  const q = clamp((+o.quality || 92) / 100, .01, 1);
  if (fmt === 'png') return canvasBlob(c, 'image/png');
  if (fmt === 'jpg') return canvasBlob(flatten(c, o.bg), 'image/jpeg', q);
  if (fmt === 'bmp') return bmpFromCanvas(flatten(c, o.bg));
  if (fmt === 'webp') { const b = await canvasBlob(c, 'image/webp', q); if (b.type !== 'image/webp') throw new Error('This browser cannot encode WebP'); return b; }
  if (fmt === 'ico') return icoFromDec({ src: c, w: c.width, h: c.height }, { icoSize: o.ico || '256' });
  if (fmt === 'gif') return encodeGIF([{ data: c.getContext('2d').getImageData(0, 0, c.width, c.height).data }], c.width, c.height, { loop: -1, delay: 10 }, noIo);
  if (fmt === 'svg') return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}"><image width="${c.width}" height="${c.height}" href="${c.toDataURL('image/png')}"/></svg>`], { type: 'image/svg+xml' });
  if (fmt === 'pdf') { await ensure('jspdf'); const { jsPDF } = window.jspdf, pw = c.width * .75, ph = c.height * .75, pdf = new jsPDF({ orientation: pw > ph ? 'l' : 'p', unit: 'pt', format: [pw, ph], compress: true }); pdf.addImage(flatten(c, o.bg).toDataURL('image/jpeg', q), 'JPEG', 0, 0, pw, ph); return pdf.output('blob'); }
  throw new Error('Unknown format');
}
function exportPanel(getCanvas, defName) {
  const st = { fmt: 'png', quality: 92, bg: '#ffffff', ico: '256', name: defName || 'image' }, box = h('div');
  const draw = () => box.replaceChildren(...[
    h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Save as'), h('select', { onchange: e => { st.fmt = e.target.value; draw(); } }, EXPORT_FMTS.map(([v, l]) => h('option', { value: v, selected: v === st.fmt }, l)))),
    ['jpg', 'webp', 'pdf'].includes(st.fmt) ? (() => { const out = h('output', null, st.quality + '%'); return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Quality', out), h('input', { type: 'range', min: 1, max: 100, value: st.quality, oninput: e => { st.quality = +e.target.value; out.textContent = st.quality + '%'; } })); })() : null,
    ['jpg', 'bmp', 'pdf'].includes(st.fmt) ? h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Background (no transparency in this format)'), h('input', { type: 'color', value: st.bg, oninput: e => { st.bg = e.target.value; } })) : null,
    st.fmt === 'ico' ? h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Icon size'), h('select', { onchange: e => { st.ico = e.target.value; } }, ['16', '32', '48', '64', '128', '256', 'all'].map(v => h('option', { value: v, selected: v === st.ico }, v === 'all' ? 'All sizes (16-256)' : v + ' px')))) : null,
    h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'File name'), h('input', { type: 'text', value: st.name, oninput: e => { st.name = e.target.value; } }))].filter(Boolean));
  draw();
  const download = async () => { let c; try { c = await getCanvas(); } catch (e) { return toast(e.message || String(e)); } if (!c) return toast('Open an image first'); try { const b = await exportCanvas(c, st.fmt, st); downloadBlob(b, safe(st.name || 'image') + '.' + st.fmt); toast(`Saved ${st.fmt.toUpperCase()} - ${c.width}x${c.height} - ${fmtBytes(b.size)}`); } catch (e) { toast(e.message || String(e)); } };
  const copy = async () => { const c = await getCanvas(); if (!c) return toast('Open an image first'); try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await canvasBlob(c, 'image/png') })]); toast('Copied to clipboard'); } catch (e) { toast('Clipboard not available here'); } };
  return { box, st, download, copy, refresh: draw };
}
function setupLoader(onFile, title) {
  const inp = h('input', { type: 'file', accept: rawImg.map(e => '.' + e).join(','), hidden: true, onchange: e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; } });
  const drop = h('label', { class: 'drop', id: 'drop', tabindex: 0, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } } }, inp, h('b', null, title || 'Drop an image here or click to browse'), h('small', null, 'JPG, PNG, WEBP, GIF, BMP, SVG, ICO, HEIC... or paste from the clipboard'));
  const pick = e => [...(e.dataTransfer ? e.dataTransfer.files : e.clipboardData ? e.clipboardData.files : [])].find(x => /^image\//.test(x.type) || kindOf(nx(extOf(x.name))) === 'img');
  dropHook = e => { const f = pick(e); if (f) onFile(f); }; const ph = e => { const f = pick(e); if (f) onFile(f); }; document.addEventListener('paste', ph);
  const prev = cleanup; cleanup = () => { document.removeEventListener('paste', ph); if (prev) prev(); };
  return { drop, inp };
}
function Fields(o, changed) {
  return {
    range: (l, k, min, max, fmt = v => v) => { const out = h('output', null, fmt(o[k])); return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l, out), h('input', { type: 'range', min, max, value: o[k], oninput: e => { o[k] = +e.target.value; out.textContent = fmt(o[k]); changed(); } })); },
    select: (l, k, opts) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l), h('select', { onchange: e => { o[k] = e.target.value; changed(); } }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(o[k]) }, t)))),
    check: (l, k) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!o[k], onchange: e => { o[k] = e.target.checked; changed(); } }), l),
    color: (l, k) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l), h('input', { type: 'color', value: o[k], oninput: e => { o[k] = e.target.value; changed(); } }))
  };
}
const hex2rgb = s => { const m = /^#?([0-9a-f]{6})$/i.exec(s || ''); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
function downscaleTo(c, max) { const s = Math.min(1, max / Math.max(c.width, c.height)); if (s >= 1) return c; const n = newCanvas(c.width * s, c.height * s), x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); return n; }
function renderEditor(tool, cfg) {
  state.tool = null; let src = null, small = null, ctrlBuilt = false; const o = cfg.defaults(), cat = CATS.find(c => c.id === tool.cat);
  const pv = h('canvas', { class: 'pv' }), stage = h('div', { class: 'stage checker', hidden: true }, pv), info = h('div', { class: 'note' }), ctrl = h('div'), ex = exportPanel(() => src ? cfg.apply(src, o, true) : null, 'image');
  const api = { src: () => src, rebuild: () => build(), changed: () => changed(), pv, F: null };
  function changed() {
    if (!small) return; const out = cfg.preview ? cfg.preview(src, small, o) : cfg.apply(small, o, false);
    pv.width = out.width; pv.height = out.height; const x = pv.getContext('2d'); x.clearRect(0, 0, pv.width, pv.height); x.drawImage(out, 0, 0); info.textContent = cfg.info ? cfg.info(src, o) : `${src.width} x ${src.height}px`;
  }
  function build() { api.F = Fields(o, changed); ctrl.replaceChildren(cfg.controls(o, api)); }
  const load = async f => {
    try { src = await fileToCanvas(f); small = downscaleTo(src, 900); ex.st.name = stem(f.name) + (cfg.suffix || '-edited'); ex.refresh(); stage.hidden = false; side.hidden = false; bar.hidden = false; drop.style.display = 'none'; if (cfg.onLoad) cfg.onLoad(src, o, api); build(); changed(); }
    catch (e) { toast('Could not open that image: ' + (e.message || e)); }
  };
  const { drop } = setupLoader(load);
  if (cfg.pick) { pv.style.cursor = 'crosshair'; pv.addEventListener('click', e => { if (!src) return; const r = pv.getBoundingClientRect(); cfg.pick(src, o, Math.floor((e.clientX - r.left) / r.width * src.width), Math.floor((e.clientY - r.top) / r.height * src.height), api); }); }
  const side = h('aside', { class: 'card side', hidden: true }, ctrl, h('hr', { style: 'border:0;border-top:1px solid var(--line);margin:14px 0' }), ex.box, h('div', { class: 'note' }, cfg.note || 'Runs entirely in your browser.'));
  const bar = h('div', { class: 'actions', hidden: true }, h('button', { class: 'btn pri', onclick: ex.download }, 'Download'), h('button', { class: 'btn', onclick: ex.copy }, 'Copy to clipboard'), h('button', { class: 'btn', onclick: () => { Object.assign(o, cfg.defaults()); if (cfg.onLoad && src) cfg.onLoad(src, o, api); build(); changed(); } }, 'Reset'), h('button', { class: 'btn', onclick: () => { src = small = null; stage.hidden = true; side.hidden = true; bar.hidden = true; drop.style.display = ''; } }, 'New image'));
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / ', cat.name), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), h('div', { class: 'ws' }, h('div', null, drop, stage, info, bar), side));
}

/* ----- Color Flipper ----- */
const COLOR_DEF = () => ({ swap: 'rgb', bri: 100, con: 100, sat: 100, hue: 0, gray: 0, sepia: 0, inv: 0, post: 0, thr: 0, rot: 0, flipH: false, flipV: false, replaceOn: false, from: '#ff0000', to: '#0000ff', tol: 40 });
function colorFlipApply(c, o) {
  const w = c.width, hh = c.height; let out = newCanvas(w, hh); const x = out.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
  const si = { rgb: [0, 1, 2], rbg: [0, 2, 1], grb: [1, 0, 2], gbr: [1, 2, 0], brg: [2, 0, 1], bgr: [2, 1, 0] }[o.swap] || [0, 1, 2], sw = o.swap !== 'rgb', bri = o.bri / 100, con = o.con / 100, sat = o.sat / 100, hue = +o.hue, gray = o.gray / 100, sepia = o.sepia / 100, inv = o.inv / 100, post = +o.post, thr = +o.thr, rep = o.replaceOn, F = hex2rgb(o.from), Tt = hex2rgb(o.to), tol = o.tol * 3;
  if (sw || bri !== 1 || con !== 1 || sat !== 1 || hue || gray || sepia || inv || post || thr || rep) {
    const img = x.getImageData(0, 0, w, hh), d = img.data, hr = hue * Math.PI / 180, cs = Math.cos(hr), sn = Math.sin(hr);
    const m = [.213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928, .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .140, .072 - cs * .072 - sn * .283, .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072];
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue; let r = d[i], g = d[i + 1], b = d[i + 2];
      if (rep && Math.abs(r - F[0]) + Math.abs(g - F[1]) + Math.abs(b - F[2]) <= tol) { r = Tt[0]; g = Tt[1]; b = Tt[2]; }
      if (sw) { const v = [r, g, b]; r = v[si[0]]; g = v[si[1]]; b = v[si[2]]; }
      if (bri !== 1 || con !== 1) { r = (r * bri - 128) * con + 128; g = (g * bri - 128) * con + 128; b = (b * bri - 128) * con + 128; }
      if (sat !== 1) { const l = .299 * r + .587 * g + .114 * b; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
      if (hue) { const nr = m[0] * r + m[1] * g + m[2] * b, ng = m[3] * r + m[4] * g + m[5] * b, nb = m[6] * r + m[7] * g + m[8] * b; r = nr; g = ng; b = nb; }
      if (gray) { const l = .299 * r + .587 * g + .114 * b; r += (l - r) * gray; g += (l - g) * gray; b += (l - b) * gray; }
      if (sepia) { const a1 = .393 * r + .769 * g + .189 * b, a2 = .349 * r + .686 * g + .168 * b, a3 = .272 * r + .534 * g + .131 * b; r += (a1 - r) * sepia; g += (a2 - g) * sepia; b += (a3 - b) * sepia; }
      if (inv) { r += (255 - 2 * r) * inv; g += (255 - 2 * g) * inv; b += (255 - 2 * b) * inv; }
      if (post >= 2) { const k = post - 1; r = Math.round(clamp(r, 0, 255) / 255 * k) * 255 / k; g = Math.round(clamp(g, 0, 255) / 255 * k) * 255 / k; b = Math.round(clamp(b, 0, 255) / 255 * k) * 255 / k; }
      if (thr) { const v = (.299 * r + .587 * g + .114 * b) >= thr ? 255 : 0; r = g = b = v; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    x.putImageData(img, 0, 0);
  }
  const rot = (+o.rot || 0) % 360;
  if (rot || o.flipH || o.flipV) { const swp = rot === 90 || rot === 270, t = newCanvas(swp ? hh : w, swp ? w : hh), tx = t.getContext('2d'); tx.translate(t.width / 2, t.height / 2); tx.rotate(rot * Math.PI / 180); tx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1); tx.drawImage(out, -w / 2, -hh / 2); out = t; }
  return out;
}
const COLOR_CFG = {
  defaults: COLOR_DEF, suffix: '-colors', apply: (c, o) => colorFlipApply(c, o),
  controls: (o, api) => {
    const F = api.F, presets = { Invert: { inv: 100 }, Grayscale: { gray: 100 }, Sepia: { sepia: 100 }, Vintage: { sepia: 60, con: 90, bri: 105, sat: 80 }, Cool: { hue: 190, sat: 110 }, Warm: { hue: 340, sat: 115, bri: 105 }, 'B&W': { thr: 128 }, Posterize: { post: 4 }, 'Swap R/B': { swap: 'bgr' }, Negative: { inv: 100, hue: 180 } };
    return h('div', null, h('div', { class: 'lbl' }, 'Quick effects'), h('div', { class: 'chips', style: 'margin:0 0 12px' }, Object.entries(presets).map(([n, p]) => h('button', { class: 'chip', onclick: () => { Object.assign(o, COLOR_DEF(), p); api.rebuild(); api.changed(); } }, n))),
      F.range('Invert amount', 'inv', 0, 100, v => v + '%'), F.range('Hue rotate', 'hue', 0, 360, v => v + '°'), F.range('Saturation', 'sat', 0, 300, v => v + '%'), F.range('Brightness', 'bri', 0, 250, v => v + '%'), F.range('Contrast', 'con', 0, 250, v => v + '%'), F.range('Grayscale', 'gray', 0, 100, v => v + '%'), F.range('Sepia', 'sepia', 0, 100, v => v + '%'), F.range('Posterize levels (0 = off)', 'post', 0, 16), F.range('Black/white threshold (0 = off)', 'thr', 0, 255),
      F.select('Swap color channels', 'swap', [['rgb', 'Normal (RGB)'], ['rbg', 'R B G'], ['grb', 'G R B'], ['gbr', 'G B R'], ['brg', 'B R G'], ['bgr', 'B G R']]),
      F.check('Replace a color', 'replaceOn'), F.color('Replace this color', 'from'), F.color('With this color', 'to'), F.range('Replace tolerance', 'tol', 0, 255),
      F.select('Rotate', 'rot', [[0, 'None'], [90, '90° clockwise'], [180, '180°'], [270, '90° counter-clockwise']]), F.check('Flip horizontally', 'flipH'), F.check('Flip vertically', 'flipV'));
  }
};

/* ----- Resizer ----- */
function scaleCanvas(c, tw, th, mode) {
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th)); if (tw * th > 1.6e8) throw new Error('Target size is too large for the browser');
  if (mode === 'pixel') { const o = newCanvas(tw, th), x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, tw, th); return o; }
  let cur = c; while (cur.width / 2 >= tw && cur.height / 2 >= th) { const t = newCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2)), x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
  const o = newCanvas(tw, th), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, tw, th); return o;
}
function resizeApply(c, o) {
  const W = Math.max(1, Math.round(o.w)), H = Math.max(1, Math.round(o.h));
  if (o.mode === 'stretch') return scaleCanvas(c, W, H, o.res);
  const k = o.mode === 'cover' ? Math.max(W / c.width, H / c.height) : Math.min(W / c.width, H / c.height), sc = scaleCanvas(c, c.width * k, c.height * k, o.res), out = newCanvas(W, H), x = out.getContext('2d');
  if (o.pad !== 'transparent' && o.mode === 'contain') { x.fillStyle = o.pad; x.fillRect(0, 0, W, H); } x.drawImage(sc, (W - sc.width) / 2, (H - sc.height) / 2); return out;
}
const RESIZE_CFG = {
  defaults: () => ({ w: 0, h: 0, lock: true, mode: 'stretch', pad: 'transparent', res: 'smooth' }), suffix: '-resized',
  onLoad: (src, o) => { o.w = src.width; o.h = src.height; },
  apply: (c, o, full) => full ? resizeApply(c, o) : c,
  preview: (src, small, o) => (o.w * o.h <= 3e6 ? resizeApply(src, o) : small),
  info: (src, o) => `${src.width} x ${src.height}px  ->  ${Math.round(o.w)} x ${Math.round(o.h)}px  (${Math.round(o.w / src.width * 100)}%)`,
  controls: (o, api) => {
    const F = api.F, src = api.src(), ratio = src.width / src.height, wi = h('input', { type: 'number', min: 1, value: Math.round(o.w), oninput: e => { o.w = +e.target.value || 1; if (o.lock) { o.h = Math.max(1, Math.round(o.w / ratio)); hi.value = o.h; } api.changed(); } }), hi = h('input', { type: 'number', min: 1, value: Math.round(o.h), oninput: e => { o.h = +e.target.value || 1; if (o.lock) { o.w = Math.max(1, Math.round(o.h * ratio)); wi.value = o.w; } api.changed(); } });
    const setS = (w, hh) => { o.w = w; o.h = hh; wi.value = Math.round(w); hi.value = Math.round(hh); api.changed(); }, mx = Math.max(src.width, src.height);
    return h('div', null, h('div', { class: 'row2' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Width (px)'), wi), h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Height (px)'), hi)),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: o.lock, onchange: e => { o.lock = e.target.checked; } }), 'Lock aspect ratio'),
      h('div', { class: 'lbl' }, 'Scale'), h('div', { class: 'chips', style: 'margin:0 0 12px' }, [10, 25, 50, 75, 100, 150, 200, 300].map(p => h('button', { class: 'chip', onclick: () => setS(src.width * p / 100, src.height * p / 100) }, p + '%'))),
      h('div', { class: 'lbl' }, 'Longest side'), h('div', { class: 'chips', style: 'margin:0 0 12px' }, [16, 32, 64, 128, 256, 512, 1024, 1920, 3840].map(p => h('button', { class: 'chip', onclick: () => setS(src.width * p / mx, src.height * p / mx) }, p))),
      F.select('When both sizes are set', 'mode', [['stretch', 'Stretch to exact size'], ['contain', 'Fit inside (add padding)'], ['cover', 'Fill and crop']]), F.select('Resampling', 'res', [['smooth', 'Smooth (best quality)'], ['pixel', 'Sharp pixels (pixel art)']]),
      h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Padding color (fit inside)'), h('select', { onchange: e => { o.pad = e.target.value === 'transparent' ? 'transparent' : e.target.value; api.changed(); } }, [['transparent', 'Transparent'], ['#ffffff', 'White'], ['#000000', 'Black']].map(([v, t]) => h('option', { value: v }, t)))));
  }
};

/* ----- Background remover ----- */
function bgRemove(c, o) {
  const W = c.width, H = c.height, out = cloneCanvas(c), x = out.getContext('2d', { willReadFrequently: true }), img = x.getImageData(0, 0, W, H), d = img.data, K = hex2rgb(o.key), tol = +o.tol, t0 = tol * (1 - o.soft / 100);
  const dist = p => Math.max(Math.abs(d[p] - K[0]), Math.abs(d[p + 1] - K[1]), Math.abs(d[p + 2] - K[2])), apply = p => { const dd = dist(p); if (dd <= t0) d[p + 3] = 0; else if (dd < tol) d[p + 3] = Math.round(d[p + 3] * (dd - t0) / (tol - t0)); };
  if (o.mode === 'global') { for (let p = 0; p < d.length; p += 4) if (d[p + 3]) apply(p); }
  else {
    const vis = new Uint8Array(W * H), st = []; const seed = (xx, yy) => { const i = yy * W + xx; if (!vis[i] && dist(i * 4) < tol) { vis[i] = 1; st.push(i); } };
    for (let i = 0; i < W; i++) { seed(i, 0); seed(i, H - 1); } for (let j = 0; j < H; j++) { seed(0, j); seed(W - 1, j); }
    while (st.length) { const i = st.pop(), xx = i % W, yy = (i / W) | 0; apply(i * 4); if (xx > 0) seed(xx - 1, yy); if (xx < W - 1) seed(xx + 1, yy); if (yy > 0) seed(xx, yy - 1); if (yy < H - 1) seed(xx, yy + 1); }
  }
  x.putImageData(img, 0, 0); return out;
}
const BG_CFG = {
  defaults: () => ({ key: '#ffffff', tol: 40, soft: 30, mode: 'edges' }), suffix: '-transparent', note: 'Tip: click the image to pick the color to remove. Save as PNG, WEBP, GIF or ICO to keep transparency.',
  onLoad: (src, o) => { const p = src.getContext('2d').getImageData(0, 0, 1, 1).data; o.key = rgb2hex(p[0], p[1], p[2]); },
  apply: (c, o) => bgRemove(c, o), pick: (src, o, x, y, api) => { const p = src.getContext('2d').getImageData(clamp(x, 0, src.width - 1), clamp(y, 0, src.height - 1), 1, 1).data; o.key = rgb2hex(p[0], p[1], p[2]); api.rebuild(); api.changed(); },
  controls: (o, api) => { const F = api.F; return h('div', null, F.color('Color to remove (or click the image)', 'key'), F.range('Tolerance', 'tol', 0, 255), F.range('Edge softness', 'soft', 0, 100, v => v + '%'), F.select('Remove', 'mode', [['edges', 'Background only (connected to the edges)'], ['global', 'This color everywhere']])); }
};

/* ----- Cropper ----- */
function renderCropper(tool) {
  state.tool = null; let src = null; const R = { x: 0, y: 0, w: 0, h: 0 }, o = { ratio: 'free', cw: 16, ch: 9, shape: 'rect' }, cat = CATS.find(c => c.id === tool.cat);
  const cv = h('canvas', { class: 'cc' }), box = h('div', { class: 'cbox' }), stage = h('div', { class: 'cropstage checker', hidden: true }, cv, box), HN = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  HN.forEach(n => box.append(h('i', { class: 'hd h-' + n, 'data-h': n })));
  const ex = exportPanel(() => cropOut(), 'cropped'), fields = h('div'), info = h('div', { class: 'note' });
  const sc = () => cv.clientWidth / src.width;
  function ratioVal() { return o.ratio === 'free' ? 0 : o.ratio === 'orig' ? src.width / src.height : o.ratio === 'custom' ? (o.cw / o.ch) || 0 : (() => { const [a, b] = o.ratio.split(':').map(Number); return a / b; })(); }
  function layout() { if (!src) return; const s = sc(); Object.assign(box.style, { left: R.x * s + 'px', top: R.y * s + 'px', width: R.w * s + 'px', height: R.h * s + 'px' }); box.classList.toggle('round', o.shape === 'ellipse'); info.textContent = `Selection ${Math.round(R.w)} x ${Math.round(R.h)} px at (${Math.round(R.x)}, ${Math.round(R.y)})  -  image ${src.width} x ${src.height}`; syncInputs(); }
  const inputs = {}; function syncInputs() { for (const k of ['x', 'y', 'w', 'h']) if (inputs[k] && document.activeElement !== inputs[k]) inputs[k].value = Math.round(R[k]); }
  function fitRatio() { const r = ratioVal(); if (!r) return; let w = R.w, hh = R.w / r; if (hh > R.h) { hh = R.h; w = hh * r; } const cx = R.x + R.w / 2, cy = R.y + R.h / 2; R.w = w; R.h = hh; R.x = clamp(cx - w / 2, 0, src.width - w); R.y = clamp(cy - hh / 2, 0, src.height - hh); }
  function full() { R.x = 0; R.y = 0; R.w = src.width; R.h = src.height; fitRatio(); layout(); }
  function resizeRect(hd, r, dx, dy, ratio) {
    const W = src.width, H = src.height; let l = r.x, t = r.y, rt = r.x + r.w, b = r.y + r.h;
    if (hd.includes('w')) l += dx; if (hd.includes('e')) rt += dx; if (hd.includes('n')) t += dy; if (hd.includes('s')) b += dy;
    const fixX = hd.includes('w') ? r.x + r.w : hd.includes('e') ? r.x : null, fixY = hd.includes('n') ? r.y + r.h : hd.includes('s') ? r.y : null;
    let x0 = Math.min(l, rt), x1 = Math.max(l, rt), y0 = Math.min(t, b), y1 = Math.max(t, b);
    if (!ratio) { x0 = clamp(x0, 0, W); x1 = clamp(x1, 0, W); y0 = clamp(y0, 0, H); y1 = clamp(y1, 0, H); if (x1 - x0 < 8) { if (fixX !== null && fixX === x0) x1 = Math.min(W, x0 + 8); else x0 = Math.max(0, x1 - 8); } if (y1 - y0 < 8) { if (fixY !== null && fixY === y0) y1 = Math.min(H, y0 + 8); else y0 = Math.max(0, y1 - 8); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
    let w = Math.max(8, x1 - x0), hh = Math.max(8, y1 - y0); const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (fixX !== null && fixY !== null) { if (w / ratio > hh) hh = w / ratio; else w = hh * ratio; } else if (fixX !== null) hh = w / ratio; else w = hh * ratio;
    const mvX = hd.includes('e') ? rt : l, mvY = hd.includes('s') ? b : t, sx = fixX !== null ? ((mvX - fixX) >= 0 ? 1 : -1) : 0, sy = fixY !== null ? ((mvY - fixY) >= 0 ? 1 : -1) : 0;
    let s = 1; if (fixX !== null) s = Math.min(s, (sx > 0 ? W - fixX : fixX) / w); else s = Math.min(s, W / w, 2 * Math.min(cx, W - cx) / w); if (fixY !== null) s = Math.min(s, (sy > 0 ? H - fixY : fixY) / hh); else s = Math.min(s, H / hh, 2 * Math.min(cy, H - cy) / hh);
    w *= s; hh *= s; const nx0 = fixX !== null ? (sx > 0 ? fixX : fixX - w) : cx - w / 2, ny0 = fixY !== null ? (sy > 0 ? fixY : fixY - hh) : cy - hh / 2;
    return { x: clamp(nx0, 0, W - w), y: clamp(ny0, 0, H - hh), w, h: hh };
  }
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (!src) return; const hd = e.target.dataset && e.target.dataset.h, inBox = e.target === box, rect = cv.getBoundingClientRect(), s = sc(); stage.setPointerCapture(e.pointerId);
    if (hd) drag = { hd, r: { ...R }, sx: e.clientX, sy: e.clientY }; else if (inBox) drag = { hd: 'move', r: { ...R }, sx: e.clientX, sy: e.clientY };
    else { const px = clamp((e.clientX - rect.left) / s, 0, src.width), py = clamp((e.clientY - rect.top) / s, 0, src.height); Object.assign(R, { x: px, y: py, w: 0, h: 0 }); drag = { hd: 'se', r: { x: px, y: py, w: 0, h: 0 }, sx: e.clientX, sy: e.clientY }; }
    e.preventDefault();
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return; const s = sc(), dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
    if (drag.hd === 'move') { R.x = clamp(drag.r.x + dx, 0, src.width - R.w); R.y = clamp(drag.r.y + dy, 0, src.height - R.h); } else Object.assign(R, resizeRect(drag.hd, drag.r, dx, dy, ratioVal())); layout();
  });
  const endDrag = () => { if (drag && (R.w < 8 || R.h < 8)) full(); drag = null; }; stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  function cropOut() {
    if (!src) return null; const w = Math.max(1, Math.round(R.w)), hh = Math.max(1, Math.round(R.h)), c = newCanvas(w, hh), x = c.getContext('2d');
    if (o.shape === 'ellipse') { x.beginPath(); x.ellipse(w / 2, hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); x.clip(); } x.drawImage(src, Math.round(R.x), Math.round(R.y), w, hh, 0, 0, w, hh); return c;
  }
  function setSrc(c) { src = c; cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); requestAnimationFrame(full); }
  function xform(kind) { const w = src.width, hh = src.height, sw = kind === 'cw' || kind === 'ccw', t = newCanvas(sw ? hh : w, sw ? w : hh), x = t.getContext('2d'); x.translate(t.width / 2, t.height / 2); if (kind === 'cw') x.rotate(Math.PI / 2); if (kind === 'ccw') x.rotate(-Math.PI / 2); if (kind === 'fh') x.scale(-1, 1); if (kind === 'fv') x.scale(1, -1); x.drawImage(src, -w / 2, -hh / 2); setSrc(t); }
  const load = async f => { try { const c = await fileToCanvas(f); ex.st.name = stem(f.name) + '-cropped'; ex.refresh(); stage.hidden = false; side.hidden = false; bar.hidden = false; drop.style.display = 'none'; setSrc(c); } catch (e) { toast('Could not open that image: ' + (e.message || e)); } };
  const { drop } = setupLoader(load, 'Drop an image to crop or click to browse');
  const num = (k, l) => { const i = inputs[k] = h('input', { type: 'number', min: 0, value: 0, oninput: e => { const v = +e.target.value || 0; if (k === 'w') { R.w = clamp(v, 8, src.width); if (ratioVal()) R.h = R.w / ratioVal(); } else if (k === 'h') { R.h = clamp(v, 8, src.height); if (ratioVal()) R.w = R.h * ratioVal(); } else R[k] = v; R.w = Math.min(R.w, src.width); R.h = Math.min(R.h, src.height); R.x = clamp(R.x, 0, src.width - R.w); R.y = clamp(R.y, 0, src.height - R.h); layout(); } }); return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l), i); };
  const ratios = [['free', 'Free'], ['orig', 'Original'], ['1:1', '1:1 Square'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9'], ['21:9', '21:9'], ['3:4', '3:4'], ['2:3', '2:3'], ['9:16', '9:16 Story'], ['custom', 'Custom...']];
  const cust = h('div', { class: 'row2', hidden: true }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Ratio W'), h('input', { type: 'number', min: 1, value: o.cw, oninput: e => { o.cw = +e.target.value || 1; fitRatio(); layout(); } })), h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Ratio H'), h('input', { type: 'number', min: 1, value: o.ch, oninput: e => { o.ch = +e.target.value || 1; fitRatio(); layout(); } })));
  const side = h('aside', { class: 'card side', hidden: true },
    h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Aspect ratio'), h('select', { onchange: e => { o.ratio = e.target.value; cust.hidden = o.ratio !== 'custom'; fitRatio(); layout(); } }, ratios.map(([v, t]) => h('option', { value: v }, t)))), cust,
    h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Crop shape'), h('select', { onchange: e => { o.shape = e.target.value; layout(); } }, [['rect', 'Rectangle'], ['ellipse', 'Ellipse / circle (transparent corners)']].map(([v, t]) => h('option', { value: v }, t)))),
    h('div', { class: 'row2' }, num('x', 'X'), num('y', 'Y'), num('w', 'Width'), num('h', 'Height')),
    h('div', { class: 'chips', style: 'margin:0 0 12px' }, h('button', { class: 'chip', onclick: full }, 'Select all'), h('button', { class: 'chip', onclick: () => xform('ccw') }, 'Rotate ↶'), h('button', { class: 'chip', onclick: () => xform('cw') }, 'Rotate ↷'), h('button', { class: 'chip', onclick: () => xform('fh') }, 'Flip H'), h('button', { class: 'chip', onclick: () => xform('fv') }, 'Flip V')),
    h('hr', { style: 'border:0;border-top:1px solid var(--line);margin:14px 0' }), ex.box, h('div', { class: 'note' }, 'Drag on the image to draw a new crop, drag the box to move it, drag the handles to resize.'));
  const bar = h('div', { class: 'actions', hidden: true }, h('button', { class: 'btn pri', onclick: ex.download }, 'Download cropped image'), h('button', { class: 'btn', onclick: ex.copy }, 'Copy to clipboard'), h('button', { class: 'btn', onclick: () => { src = null; stage.hidden = true; side.hidden = true; bar.hidden = true; drop.style.display = ''; } }, 'New image'));
  const onResize = () => layout(); window.addEventListener('resize', onResize); const pc = cleanup; cleanup = () => { window.removeEventListener('resize', onResize); if (pc) pc(); };
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / ', cat.name), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), h('div', { class: 'ws' }, h('div', null, drop, stage, info, bar), side));
}
