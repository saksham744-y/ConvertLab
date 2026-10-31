/* ConvertLab - Paint Studio */
'use strict';

/* ================= Paint Studio ================= */
function modal(title, body, buttons) {
  const m = h('div', { class: 'modal' }, h('div', { class: 'mbox card' }, h('h3', { style: 'margin:0 0 12px' }, title), body, h('div', { class: 'actions', style: 'justify-content:flex-end;margin-bottom:0' }, buttons.map(([l, fn, pri]) => h('button', { class: 'btn' + (pri ? ' pri' : ''), onclick: () => { if (!fn || fn() !== false) m.remove(); } }, l)))));
  m.addEventListener('pointerdown', e => { if (e.target === m) m.remove(); }); document.body.append(m); return m;
}
const PAL = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'];
const P_BRUSH = ['pen', 'marker', 'pencil', 'brush', 'spray', 'eraser'], P_SHAPE = ['line', 'arrow', 'rect', 'round', 'ellipse', 'triangle', 'rtri', 'diamond', 'polygon', 'star', 'heart', 'cross', 'blockarrow'];
const P_TOOLS = [['Draw', [['pen', 'Pen'], ['pencil', 'Pencil'], ['brush', 'Soft brush'], ['marker', 'Marker'], ['spray', 'Spray'], ['eraser', 'Eraser']]],
  ['Shapes', [['line', 'Line'], ['arrow', 'Arrow'], ['rect', 'Rectangle'], ['round', 'Rounded'], ['ellipse', 'Ellipse'], ['triangle', 'Triangle'], ['rtri', 'Right tri.'], ['diamond', 'Diamond'], ['polygon', 'Polygon'], ['star', 'Star'], ['heart', 'Heart'], ['cross', 'Cross'], ['blockarrow', 'Block arrow']]],
  ['Tools', [['fill', 'Fill bucket'], ['gradient', 'Gradient'], ['pick', 'Eyedropper'], ['text', 'Text'], ['select', 'Select'], ['magic', 'Magic erase'], ['hand', 'Hand / pan']]]];
function pathShape(g, k, x, y, w, hh, n, rad) {
  g.beginPath(); const cx = x + w / 2, cy = y + hh / 2;
  switch (k) {
    case 'rect': g.rect(x, y, w, hh); break;
    case 'round': { const r = Math.min(rad, w / 2, hh / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); break; }
    case 'ellipse': g.ellipse(cx, cy, w / 2, hh / 2, 0, 0, Math.PI * 2); break;
    case 'triangle': g.moveTo(cx, y); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath(); break;
    case 'rtri': g.moveTo(x, y); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath(); break;
    case 'diamond': g.moveTo(cx, y); g.lineTo(x + w, cy); g.lineTo(cx, y + hh); g.lineTo(x, cy); g.closePath(); break;
    case 'polygon': for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n, px = cx + Math.cos(a) * w / 2, py = cy + Math.sin(a) * hh / 2; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); break;
    case 'star': for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? .42 : 1, px = cx + Math.cos(a) * w / 2 * r, py = cy + Math.sin(a) * hh / 2 * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); break;
    case 'heart': g.moveTo(cx, y + hh * .28); g.bezierCurveTo(cx, y, x, y, x, y + hh * .32); g.bezierCurveTo(x, y + hh * .62, cx - w * .05, y + hh * .8, cx, y + hh); g.bezierCurveTo(cx + w * .05, y + hh * .8, x + w, y + hh * .62, x + w, y + hh * .32); g.bezierCurveTo(x + w, y, cx, y, cx, y + hh * .28); g.closePath(); break;
    case 'cross': { const a = w / 3, b = hh / 3; [[x + a, y], [x + 2 * a, y], [x + 2 * a, y + b], [x + w, y + b], [x + w, y + 2 * b], [x + 2 * a, y + 2 * b], [x + 2 * a, y + hh], [x + a, y + hh], [x + a, y + 2 * b], [x, y + 2 * b], [x, y + b], [x + a, y + b]].forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); break; }
    case 'blockarrow': { const t = hh * .28; [[x, cy - t], [x + w * .6, cy - t], [x + w * .6, y], [x + w, cy], [x + w * .6, y + hh], [x + w * .6, cy + t], [x, cy + t]].forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); break; }
  }
}
function renderPaint(tool) {
  state.tool = null; app.style.maxWidth = '1560px';
  const P = { w: 800, h: 600, zoom: 1, tool: 'pen', ci: 0, cols: [{ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }], size: 8, opacity: 100, hardness: 70, smooth: 25, sym: 'none', shape: 'outline', dash: 'solid', sides: 5, radius: 18, tol: 32, contig: true, gradType: 'linear', gradEnd: 'bg', font: 'Arial, Helvetica, sans-serif', fsize: 36, bold: false, italic: false, pressure: true, grid: false, trim: false, dirty: false, recent: [], space: false };
  const rgba = (c, a = 1) => `rgba(${c.r},${c.g},${c.b},${+(c.a * a).toFixed(3)})`, rgb = c => `rgb(${c.r},${c.g},${c.b})`, hexOf = c => rgb2hex(c.r, c.g, c.b);
  const cv = h('canvas', { id: 'pmain' }), ov = h('canvas', { id: 'pov' }), ctx = cv.getContext('2d', { willReadFrequently: true }), octx = ov.getContext('2d');
  const stroke = newCanvas(1, 1), sctx = stroke.getContext('2d');
  const cw = h('div', { class: 'cw checker' }, cv, ov), vp = h('div', { class: 'vp' }, cw), status = h('div', { class: 'note', style: 'margin:6px 0 0' });
  let st = null, shp = null, ls = null, grd = null, sel = null, selDrag = null, fl = null, txt = null, cursor = null, pan = null, gest = null, clip = null, rq = false;
  const pts = new Map(), hist = { u: [], r: [] };
  /* ---- canvas / zoom ---- */
  function setStatus(extra) { status.textContent = `${P.w} x ${P.h}px  -  ${Math.round(P.zoom * 100)}%` + (cursor ? `  -  (${Math.round(cursor.x)}, ${Math.round(cursor.y)})` : '') + (sel ? `  -  selection ${sel.w}x${sel.h}` : '') + (extra ? '  -  ' + extra : ''); }
  function applyZoom() { cw.style.width = P.w * P.zoom + 'px'; cw.style.height = P.h * P.zoom + 'px'; cv.style.imageRendering = ov.style.imageRendering = P.zoom >= 3 ? 'pixelated' : 'auto'; setStatus(); render(); }
  function setSize(w, hh, keep) { const tmp = keep ? cloneCanvas(cv) : null; cv.width = ov.width = stroke.width = w; cv.height = ov.height = stroke.height = hh; P.w = w; P.h = hh; if (tmp) ctx.drawImage(tmp, 0, 0); applyZoom(); }
  function setZoom(z, cx, cy) {
    z = clamp(z, .05, 64); const r = cw.getBoundingClientRect(), px = cx == null ? P.w / 2 : (cx - r.left) / P.zoom, py = cy == null ? P.h / 2 : (cy - r.top) / P.zoom, vr = vp.getBoundingClientRect(), ax = cx == null ? vr.left + vr.width / 2 : cx, ay = cy == null ? vr.top + vr.height / 2 : cy;
    P.zoom = z; applyZoom(); const r2 = cw.getBoundingClientRect(); vp.scrollLeft += r2.left + px * z - ax; vp.scrollTop += r2.top + py * z - ay;
  }
  const fit = () => { const z = Math.min((vp.clientWidth - 50) / P.w, (vp.clientHeight - 50) / P.h); P.zoom = clamp(z, .05, 8); applyZoom(); vp.scrollLeft = vp.scrollTop = 0; };
  /* ---- history ---- */
  const grab = () => ({ w: P.w, h: P.h, d: ctx.getImageData(0, 0, P.w, P.h) });
  const restore = s => { if (s.w !== P.w || s.h !== P.h) setSize(s.w, s.h, false); ctx.putImageData(s.d, 0, 0); };
  function snap() { hist.u.push(grab()); hist.r.length = 0; const mx = clamp(Math.floor(256e6 / (P.w * P.h * 4)), 4, 60); while (hist.u.length > mx) hist.u.shift(); P.dirty = true; }
  function undo() { commitFloat(); if (!hist.u.length) return; hist.r.push(grab()); restore(hist.u.pop()); sel = null; render(); }
  function redo() { commitFloat(); if (!hist.r.length) return; hist.u.push(grab()); restore(hist.r.pop()); sel = null; render(); }
  /* ---- colors ---- */
  const swatch = [h('button', { class: 'sw on', title: 'Primary color (left click)', onclick: () => { P.ci = 0; syncColor(); } }), h('button', { class: 'sw', title: 'Secondary color (right click / fill)', onclick: () => { P.ci = 1; syncColor(); } })];
  const swIn = h('span'), hexIn = h('input', { type: 'text', maxlength: 7, onchange: e => { const c = unhex(e.target.value); if (c) { setColor(c.r, c.g, c.b); } else syncColor(); } }), colIn = h('input', { type: 'color', oninput: e => { const c = unhex(e.target.value); setColor(c.r, c.g, c.b, true); }, onchange: () => remember() }), alphaOut = h('output'), alphaIn = h('input', { type: 'range', min: 0, max: 100, oninput: e => { P.cols[P.ci].a = e.target.value / 100; syncColor(true); } });
  function unhex(s) { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((s || '').trim()); if (!m) return null; let t = m[1]; if (t.length === 3) t = [...t].map(x => x + x).join(''); return { r: parseInt(t.slice(0, 2), 16), g: parseInt(t.slice(2, 4), 16), b: parseInt(t.slice(4, 6), 16) }; }
  function setColor(r, g, b, quiet) { const c = P.cols[P.ci]; c.r = r; c.g = g; c.b = b; syncColor(quiet); if (!quiet) remember(); }
  function remember() { const k = hexOf(P.cols[P.ci]); P.recent = [k, ...P.recent.filter(x => x !== k)].slice(0, 10); drawRecent(); }
  const recentBox = h('div', { class: 'pal' });
  function drawRecent() { recentBox.replaceChildren(...P.recent.map(k => h('button', { style: `background:${k}`, title: k, onclick: () => { const c = unhex(k); setColor(c.r, c.g, c.b, true); }, oncontextmenu: e => { e.preventDefault(); const c = unhex(k); P.cols[1] = { ...c, a: P.cols[1].a }; syncColor(); } }))); }
  function syncColor(quiet) {
    P.cols.forEach((c, i) => { swatch[i].style.background = `linear-gradient(${rgba(c)},${rgba(c)}),conic-gradient(#bbb 25%,#fff 0 50%,#bbb 0 75%,#fff 0) 0 0/10px 10px`; swatch[i].classList.toggle('on', i === P.ci); });
    const c = P.cols[P.ci]; if (!quiet || document.activeElement !== hexIn) hexIn.value = hexOf(c); colIn.value = hexOf(c); alphaIn.value = Math.round(c.a * 100); alphaOut.textContent = Math.round(c.a * 100) + '%'; render();
  }
  const palBox = h('div', { class: 'pal' }, PAL.map(k => h('button', { style: `background:${k}`, title: k, onclick: () => { const c = unhex(k); setColor(c.r, c.g, c.b, true); P.cols[P.ci].a = 1; syncColor(); }, oncontextmenu: e => { e.preventDefault(); const c = unhex(k); P.cols[1] = { ...c, a: 1 }; syncColor(); } })), h('button', { class: 'checker', title: 'Transparent', style: 'background-size:8px 8px', onclick: () => { P.cols[P.ci].a = 0; syncColor(); } }));
  /* ---- history-aware drawing helpers ---- */
  const mirror = p => {
    const o = [p], sy = P.sym; if (sy === 'h' || sy === 'hv') o.push({ x: P.w - p.x, y: p.y }); if (sy === 'v' || sy === 'hv') o.push({ x: p.x, y: P.h - p.y }); if (sy === 'hv') o.push({ x: P.w - p.x, y: P.h - p.y });
    if (sy[0] === 'r') { const n = +sy.slice(1), cx = P.w / 2, cy = P.h / 2; for (let i = 1; i < n; i++) { const a = 2 * Math.PI * i / n, dx = p.x - cx, dy = p.y - cy; o.push({ x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) }); } } return o;
  };
  function makeDab(c) { const r = Math.max(1, P.size / 2), d = Math.ceil(r * 2) + 2, k = newCanvas(d, d), x = k.getContext('2d'), g = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, r), hd = P.hardness / 100; g.addColorStop(0, rgb(c)); g.addColorStop(Math.min(.999, hd), rgb(c)); g.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`); x.fillStyle = g; x.fillRect(0, 0, d, d); return k; }
  const alphaOf = () => st.t === 'eraser' ? P.opacity / 100 : st.c.a * P.opacity / 100 * (st.t === 'marker' ? .55 : 1);
  function stamp(q, pr) { const dd = st.dab.width * pr; sctx.globalAlpha = P.hardness >= 95 ? 1 : .35; sctx.drawImage(st.dab, q.x - dd / 2, q.y - dd / 2, dd, dd); sctx.globalAlpha = 1; }
  function pxLine(x0, y0, x1, y1, s) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0; const o = Math.floor(s / 2); for (;;) { sctx.fillRect(x0 - o, y0 - o, s, s); if ((x0 === x1 && y0 === y1) || n++ > 20000) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
  function spray(p, pr) { sctx.fillStyle = rgb(st.c); mirror(p).forEach(q => { const n = Math.round(P.size * 1.2); for (let i = 0; i < n; i++) { const r = Math.sqrt(Math.random()) * P.size / 2 * pr, a = Math.random() * 6.2832; sctx.fillRect(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r, 1.4, 1.4); } }); }
  function strokeStart(p, c, pr) {
    const t = P.tool; st = { t, c, f: { ...p }, pr, timer: 0 }; sctx.clearRect(0, 0, P.w, P.h); sctx.lineCap = 'round'; sctx.lineJoin = 'round'; sctx.fillStyle = rgb(c); sctx.strokeStyle = rgb(c);
    if (t === 'eraser') { snap(); st.base = cloneCanvas(cv); } if (t === 'brush') st.dab = makeDab(c);
    const cp = mirror(p); st.pv = cp.map(q => ({ a: q, b: q })); st.last = cp.map(q => ({ ...q })); const sz = Math.max(1, P.size * pr);
    cp.forEach(q => { if (t === 'pen' || t === 'marker' || t === 'eraser') { sctx.beginPath(); sctx.arc(q.x, q.y, sz / 2, 0, 6.2832); sctx.fill(); } else if (t === 'pencil') { const o = Math.floor(P.size / 2); sctx.fillRect(Math.round(q.x) - o, Math.round(q.y) - o, P.size, P.size); } else if (t === 'brush') stamp(q, pr); });
    if (t === 'spray') { spray(p, pr); st.timer = setInterval(() => { spray(st.f, st.pr); render(); }, 35); } render();
  }
  function strokeMove(raw, pr) {
    const t = st.t; st.pr = pr; const s = (t === 'pencil' || t === 'spray') ? 0 : P.smooth / 100 * .92; st.f = { x: st.f.x + (raw.x - st.f.x) * (1 - s), y: st.f.y + (raw.y - st.f.y) * (1 - s) };
    const cps = mirror(st.f), sz = Math.max(1, P.size * pr);
    if (t === 'spray') { spray(st.f, pr); }
    else cps.forEach((q, k) => {
      if (t === 'pen' || t === 'marker' || t === 'eraser') { const v = st.pv[k], m0 = { x: (v.a.x + v.b.x) / 2, y: (v.a.y + v.b.y) / 2 }, m1 = { x: (v.b.x + q.x) / 2, y: (v.b.y + q.y) / 2 }; sctx.lineWidth = sz; sctx.beginPath(); sctx.moveTo(m0.x, m0.y); sctx.quadraticCurveTo(v.b.x, v.b.y, m1.x, m1.y); sctx.stroke(); v.a = v.b; v.b = q; }
      else if (t === 'pencil') { const l = st.last[k]; pxLine(l.x, l.y, q.x, q.y, Math.max(1, Math.round(P.size))); st.last[k] = q; }
      else if (t === 'brush') { const l = st.last[k], dist = Math.hypot(q.x - l.x, q.y - l.y), step = Math.max(1, sz * .1), n = Math.ceil(dist / step); for (let i = 1; i <= n; i++) stamp({ x: l.x + (q.x - l.x) * i / n, y: l.y + (q.y - l.y) * i / n }, pr); st.last[k] = q; }
    }); render();
  }
  function applyEraser() { ctx.save(); ctx.clearRect(0, 0, P.w, P.h); ctx.drawImage(st.base, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = alphaOf(); ctx.drawImage(stroke, 0, 0); ctx.restore(); }
  function strokeEnd() {
    if (!st) return; clearInterval(st.timer); const t = st.t;
    if (t === 'pen' || t === 'marker' || t === 'eraser') st.pv.forEach(v => { sctx.lineWidth = Math.max(1, P.size * st.pr); sctx.beginPath(); sctx.moveTo((v.a.x + v.b.x) / 2, (v.a.y + v.b.y) / 2); sctx.lineTo(v.b.x, v.b.y); sctx.stroke(); });
    if (t === 'eraser') applyEraser(); else { snap(); ctx.save(); ctx.globalAlpha = alphaOf(); ctx.drawImage(stroke, 0, 0); ctx.restore(); }
    sctx.clearRect(0, 0, P.w, P.h); st = null; render();
  }
  /* ---- shapes & gradient ---- */
  const isLine = k => k === 'line' || k === 'arrow';
  function shapeStyle(g, c, c2) { g.globalAlpha = P.opacity / 100; g.lineWidth = Math.max(1, P.size); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = rgba(c); g.fillStyle = rgba(P.shape === 'both' ? c2 : c); if (P.dash === 'dashed') g.setLineDash([g.lineWidth * 3, g.lineWidth * 2]); else if (P.dash === 'dotted') g.setLineDash([.01, g.lineWidth * 2]); }
  function strokeLine(g, k, x0, y0, x1, y1, c) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (k === 'arrow') { const ang = Math.atan2(y1 - y0, x1 - x0), L = Math.max(12, g.lineWidth * 4); g.setLineDash([]); g.fillStyle = rgba(c); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - L * Math.cos(ang - .45), y1 - L * Math.sin(ang - .45)); g.lineTo(x1 - L * Math.cos(ang + .45), y1 - L * Math.sin(ang + .45)); g.closePath(); g.fill(); g.stroke(); }
  }
  function shapeBox(s) {
    const a = s.a; let dx = s.b.x - a.x, dy = s.b.y - a.y;
    if (isLine(s.k)) { if (s.shift) { const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy); dx = Math.cos(ang) * len; dy = Math.sin(ang) * len; } }
    else if (s.shift) { const m = Math.max(Math.abs(dx), Math.abs(dy)); dx = (dx < 0 ? -1 : 1) * m; dy = (dy < 0 ? -1 : 1) * m; }
    return { x0: s.alt ? a.x - dx : a.x, y0: s.alt ? a.y - dy : a.y, x1: a.x + dx, y1: a.y + dy };
  }
  function drawShape(g, s) {
    const q = shapeBox(s); g.save(); shapeStyle(g, s.c, s.c2);
    if (isLine(s.k)) strokeLine(g, s.k, q.x0, q.y0, q.x1, q.y1, s.c);
    else { const w = Math.abs(q.x1 - q.x0), hh = Math.abs(q.y1 - q.y0); if (w >= 1 || hh >= 1) { pathShape(g, s.k, Math.min(q.x0, q.x1), Math.min(q.y0, q.y1), w, hh, Math.max(3, P.sides | 0), P.radius); if (P.shape !== 'outline') g.fill(); if (P.shape !== 'fill') g.stroke(); } }
    g.restore();
  }
  /* ---- live (editable) shape: move / scale / rotate until applied ---- */
  function drawLive(g, o) {
    const c = P.cols[o.ci], c2 = P.cols[1 - o.ci]; g.save(); shapeStyle(g, c, c2);
    if (isLine(o.k)) strokeLine(g, o.k, o.a.x, o.a.y, o.b.x, o.b.y, c);
    else { g.translate(o.cx, o.cy); g.rotate(o.rot); pathShape(g, o.k, -o.w / 2, -o.h / 2, o.w, o.h, Math.max(3, P.sides | 0), P.radius); if (P.shape !== 'outline') g.fill(); if (P.shape !== 'fill') g.stroke(); }
    g.restore();
  }
  function makeLive(s) {
    const q = shapeBox(s), ci = s.ci || 0;
    if (isLine(s.k)) { if (Math.hypot(q.x1 - q.x0, q.y1 - q.y0) < 3) return; ls = { k: s.k, a: { x: q.x0, y: q.y0 }, b: { x: q.x1, y: q.y1 }, ci }; return; }
    let w = Math.abs(q.x1 - q.x0), hh = Math.abs(q.y1 - q.y0); if (w < 3 && hh < 3) return; w = Math.max(w, 2); hh = Math.max(hh, 2);
    ls = { k: s.k, cx: (q.x0 + q.x1) / 2, cy: (q.y0 + q.y1) / 2, w, h: hh, rot: 0, ci };
  }
  function commitShape() { if (!ls) return; const o = ls; ls = null; snap(); drawLive(ctx, o); render(); }
  const HND = [['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1], ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0]];
  const lp = (o, x, y) => { const cs = Math.cos(o.rot), sn = Math.sin(o.rot); return { x: o.cx + x * cs - y * sn, y: o.cy + x * sn + y * cs }; };
  const rotOff = () => 28 / P.zoom;
  function liveHandles(g, o, lw) {
    g.save(); g.lineWidth = lw; g.fillStyle = '#fff'; g.strokeStyle = '#3b5bff'; const s = 9 * lw;
    if (isLine(o.k)) { [o.a, o.b].forEach(q => { g.beginPath(); g.arc(q.x, q.y, 6 * lw, 0, 6.2832); g.fill(); g.stroke(); }); g.restore(); return; }
    const hw = o.w / 2, hh = o.h / 2; g.setLineDash([5 * lw, 4 * lw]); g.beginPath(); [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([x, y], i) => { const q = lp(o, x, y); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.closePath(); g.stroke(); g.setLineDash([]);
    const t = lp(o, 0, -hh), r = lp(o, 0, -hh - rotOff()); g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(r.x, r.y); g.stroke(); g.beginPath(); g.arc(r.x, r.y, 6 * lw, 0, 6.2832); g.fill(); g.stroke();
    HND.forEach(([n, ux, uy]) => { const q = lp(o, ux * hw, uy * hh); g.save(); g.translate(q.x, q.y); g.rotate(o.rot); g.fillRect(-s / 2, -s / 2, s, s); g.strokeRect(-s / 2, -s / 2, s, s); g.restore(); });
    g.restore();
  }
  function hitLive(p) {
    const o = ls, r = 12 / P.zoom;
    if (isLine(o.k)) { if (Math.hypot(p.x - o.a.x, p.y - o.a.y) < r) return 'a'; if (Math.hypot(p.x - o.b.x, p.y - o.b.y) < r) return 'b'; const dx = o.b.x - o.a.x, dy = o.b.y - o.a.y, L2 = dx * dx + dy * dy || 1, t = clamp(((p.x - o.a.x) * dx + (p.y - o.a.y) * dy) / L2, 0, 1); return Math.hypot(p.x - (o.a.x + t * dx), p.y - (o.a.y + t * dy)) < Math.max(r, P.size / 2 + 4 / P.zoom) ? 'move' : null; }
    const cs = Math.cos(o.rot), sn = Math.sin(o.rot), dx = p.x - o.cx, dy = p.y - o.cy, lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs, hw = o.w / 2, hh = o.h / 2;
    if (Math.hypot(lx, ly + hh + rotOff()) < r) return 'rot';
    for (const n of ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']) { const [, ux, uy] = HND.find(x => x[0] === n); if (Math.hypot(lx - ux * hw, ly - uy * hh) < r) return n; }
    const m = 4 / P.zoom; return Math.abs(lx) <= hw + m && Math.abs(ly) <= hh + m ? 'move' : null;
  }
  function liveCursor(p) {
    const m = ls.drag ? ls.drag.mode : hitLive(p); if (!m) return 'crosshair';
    return m === 'rot' ? (ls.drag ? 'grabbing' : 'grab') : m === 'move' ? 'move' : (m === 'a' || m === 'b') ? 'crosshair' : (m === 'n' || m === 's') ? 'ns-resize' : (m === 'e' || m === 'w') ? 'ew-resize' : (m === 'nw' || m === 'se') ? 'nwse-resize' : 'nesw-resize';
  }
  function dragLive(p, e) {
    const d = ls.drag, s0 = d.snap, m = d.mode;
    if (m === 'move') { const dx = p.x - d.p0.x, dy = p.y - d.p0.y; if (isLine(ls.k)) { ls.a = { x: s0.a.x + dx, y: s0.a.y + dy }; ls.b = { x: s0.b.x + dx, y: s0.b.y + dy }; } else { ls.cx = s0.cx + dx; ls.cy = s0.cy + dy; } return; }
    if (isLine(ls.k)) { let q = { x: p.x, y: p.y }; if (e.shiftKey) { const o2 = m === 'a' ? ls.b : ls.a, ang = Math.round(Math.atan2(p.y - o2.y, p.x - o2.x) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(p.x - o2.x, p.y - o2.y); q = { x: o2.x + Math.cos(ang) * len, y: o2.y + Math.sin(ang) * len }; } ls[m] = q; return; }
    if (m === 'rot') { let r = s0.rot + (Math.atan2(p.y - s0.cy, p.x - s0.cx) - d.ang0); if (e.shiftKey) r = Math.round(r / (Math.PI / 12)) * (Math.PI / 12); ls.rot = r; return; }
    const cs = Math.cos(s0.rot), sn = Math.sin(s0.rot), dx = p.x - s0.cx, dy = p.y - s0.cy, lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
    let x0 = -s0.w / 2, x1 = s0.w / 2, y0 = -s0.h / 2, y1 = s0.h / 2;
    if (m.includes('e')) x1 = lx; if (m.includes('w')) x0 = lx; if (m.includes('s')) y1 = ly; if (m.includes('n')) y0 = ly;
    if (e.altKey) { if (m.includes('e') || m.includes('w')) { x0 = -Math.abs(lx); x1 = Math.abs(lx); } if (m.includes('n') || m.includes('s')) { y0 = -Math.abs(ly); y1 = Math.abs(ly); } }
    if (e.shiftKey && m.length === 2) {
      const ar = s0.w / s0.h; let w = Math.abs(x1 - x0), hh = Math.abs(y1 - y0); if (w / (hh || 1) > ar) hh = w / ar; else w = hh * ar;
      if (e.altKey) { x0 = -w / 2; x1 = w / 2; y0 = -hh / 2; y1 = hh / 2; } else { const ax = m.includes('e') ? x0 : x1, ay = m.includes('s') ? y0 : y1; x0 = m.includes('e') ? ax : ax - w; x1 = m.includes('e') ? ax + w : ax; y0 = m.includes('s') ? ay : ay - hh; y1 = m.includes('s') ? ay + hh : ay; }
    }
    const nx0 = Math.min(x0, x1), nx1 = Math.max(x0, x1), ny0 = Math.min(y0, y1), ny1 = Math.max(y0, y1), mx = (nx0 + nx1) / 2, my = (ny0 + ny1) / 2;
    ls.w = Math.max(2, nx1 - nx0); ls.h = Math.max(2, ny1 - ny0); ls.cx = s0.cx + mx * cs - my * sn; ls.cy = s0.cy + mx * sn + my * cs;
  }
  function drawGrad(g, s) {
    const len = Math.max(1, Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)), gr = P.gradType === 'radial' ? g.createRadialGradient(s.a.x, s.a.y, 0, s.a.x, s.a.y, len) : g.createLinearGradient(s.a.x, s.a.y, s.b.x, s.b.y);
    gr.addColorStop(0, rgba(s.c1)); gr.addColorStop(1, P.gradEnd === 'transparent' ? `rgba(${s.c1.r},${s.c1.g},${s.c1.b},0)` : rgba(s.c2)); g.save(); g.globalAlpha = P.opacity / 100; if (sel) { g.beginPath(); g.rect(sel.x, sel.y, sel.w, sel.h); g.clip(); } g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h); g.restore();
  }
  /* ---- flood fill / magic erase ---- */
  function floodFill(sx, sy, color, tol, contig, clear) {
    sx |= 0; sy |= 0; const W = P.w, H = P.h; if (sx < 0 || sy < 0 || sx >= W || sy >= H) return; snap(); const img = ctx.getImageData(0, 0, W, H), d = img.data, i0 = (sy * W + sx) * 4, T = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const match = p => Math.abs(d[p] - T[0]) <= tol && Math.abs(d[p + 1] - T[1]) <= tol && Math.abs(d[p + 2] - T[2]) <= tol && Math.abs(d[p + 3] - T[3]) <= tol, A = color ? color.a : 1;
    const paint = p => { if (clear) { d[p + 3] = 0; return; } if (A >= 1) { d[p] = color.r; d[p + 1] = color.g; d[p + 2] = color.b; d[p + 3] = 255; } else { const da = d[p + 3] / 255, oa = A + da * (1 - A); d[p] = (color.r * A + d[p] * da * (1 - A)) / oa; d[p + 1] = (color.g * A + d[p + 1] * da * (1 - A)) / oa; d[p + 2] = (color.b * A + d[p + 2] * da * (1 - A)) / oa; d[p + 3] = oa * 255; } };
    if (!contig) { const m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (match(i * 4)) m[i] = 1; for (let i = 0; i < W * H; i++) if (m[i]) paint(i * 4); }
    else {
      const vis = new Uint8Array(W * H), stack = [sy * W + sx];
      while (stack.length) {
        const i = stack.pop(), x = i % W, y = (i / W) | 0, row = y * W; if (vis[row + x] || !match((row + x) * 4)) continue; let l = x, r = x;
        while (l > 0 && !vis[row + l - 1] && match((row + l - 1) * 4)) l--; while (r < W - 1 && !vis[row + r + 1] && match((row + r + 1) * 4)) r++;
        for (let k = l; k <= r; k++) { vis[row + k] = 1; paint((row + k) * 4); }
        for (const yy of [y - 1, y + 1]) if (yy >= 0 && yy < H) { const rr = yy * W; let run = false; for (let k = l; k <= r; k++) { const ok = !vis[rr + k] && match((rr + k) * 4); if (ok && !run) { stack.push(rr + k); run = true; } else if (!ok) run = false; } }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  function pixelOp(fn) { commitFloat(); snap(); const img = ctx.getImageData(0, 0, P.w, P.h), d = img.data; fn(d, img); ctx.putImageData(img, 0, 0); render(); }
  /* ---- selection & floating objects ---- */
  const inSel = p => sel && p.x >= sel.x && p.y >= sel.y && p.x <= sel.x + sel.w && p.y <= sel.y + sel.h;
  function liftSel() { snap(); const c = newCanvas(sel.w, sel.h); c.getContext('2d').drawImage(cv, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h); ctx.clearRect(sel.x, sel.y, sel.w, sel.h); fl = { c, x: sel.x, y: sel.y, w: sel.w, h: sel.h, lifted: true }; }
  function commitFloat() { commitShape(); if (!fl) return; if (!fl.lifted) snap(); ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(fl.c, fl.x, fl.y, fl.w, fl.h); ctx.restore(); sel = { x: Math.round(fl.x), y: Math.round(fl.y), w: Math.round(fl.w), h: Math.round(fl.h) }; fl = null; render(); }
  function cancelFloat() { if (!fl) return; if (fl.lifted && hist.u.length) { restore(hist.u.pop()); hist.r.length = 0; } fl = null; render(); }
  function hitFloat(p) { const r = 10 / P.zoom, cs = { nw: [fl.x, fl.y], ne: [fl.x + fl.w, fl.y], sw: [fl.x, fl.y + fl.h], se: [fl.x + fl.w, fl.y + fl.h] }; for (const k in cs) if (Math.abs(p.x - cs[k][0]) < r && Math.abs(p.y - cs[k][1]) < r) return k; return p.x >= fl.x && p.y >= fl.y && p.x <= fl.x + fl.w && p.y <= fl.y + fl.h ? 'move' : null; }
  function placeCanvas(c) {
    if (!P.dirty && !hist.u.length) { snap(); setSize(c.width, c.height, false); ctx.drawImage(c, 0, 0); fit(); return; }
    commitFloat(); let w = c.width, hh = c.height; const k = Math.min(1, P.w / w, P.h / hh); w *= k; hh *= k; fl = { c, x: (P.w - w) / 2, y: (P.h - hh) / 2, w, h: hh, lifted: false }; P.tool = 'select'; syncTools(); render();
  }
  const copySel = () => { if (!sel) return; const c = newCanvas(sel.w, sel.h); c.getContext('2d').drawImage(cv, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h); clip = c; canvasBlob(c, 'image/png').then(b => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])).catch(() => {}); };
  const delSel = () => { if (!sel) return; commitFloat(); snap(); ctx.clearRect(sel.x, sel.y, sel.w, sel.h); render(); };
  const pasteClip = () => { if (clip) placeCanvas(cloneCanvas(clip)); else toast('Nothing copied yet'); };
  function cropToSel() { if (!sel) return toast('Make a selection first'); commitFloat(); snap(); const c = newCanvas(sel.w, sel.h); c.getContext('2d').drawImage(cv, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h); setSize(sel.w, sel.h, false); ctx.drawImage(c, 0, 0); sel = null; fit(); }
  /* ---- text ---- */
  function textAt(p) {
    commitText(); const inp = h('input', { class: 'ptext', type: 'text', placeholder: 'Type, press Enter' }), fz = P.fsize * P.zoom;
    Object.assign(inp.style, { left: p.x * P.zoom + 'px', top: p.y * P.zoom + 'px', font: `${P.italic ? 'italic ' : ''}${P.bold ? 'bold ' : ''}${fz}px ${P.font}`, color: rgba(P.cols[0]) });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') commitText(); if (e.key === 'Escape') { txt = null; inp.remove(); } }); inp.addEventListener('blur', () => setTimeout(commitText, 0)); cw.append(inp); txt = { inp, p }; setTimeout(() => inp.focus(), 40);
  }
  function commitText() { if (!txt) return; const { inp, p } = txt; txt = null; const s = inp.value; inp.remove(); if (!s) return; snap(); ctx.save(); ctx.font = `${P.italic ? 'italic ' : ''}${P.bold ? 'bold ' : ''}${P.fsize}px ${P.font}`; ctx.textBaseline = 'top'; ctx.globalAlpha = P.opacity / 100; ctx.fillStyle = rgba(P.cols[0]); ctx.fillText(s, p.x, p.y); ctx.restore(); render(); }
  /* ---- overlay rendering ---- */
  function render() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; draw(); setStatus(ls ? 'Shape: drag to move, handles to scale, round handle to rotate (Shift snaps), Enter to apply' : ''); }); }
  function draw() {
    const z = P.zoom, lw = 1 / z; octx.clearRect(0, 0, P.w, P.h);
    if (st) { if (st.t === 'eraser') applyEraser(); else { octx.globalAlpha = alphaOf(); octx.drawImage(stroke, 0, 0); octx.globalAlpha = 1; } }
    if (grd) drawGrad(octx, grd); if (shp) drawShape(octx, shp); if (ls) { drawLive(octx, ls); liveHandles(octx, ls, lw); }
    if (fl) { octx.save(); octx.imageSmoothingQuality = 'high'; octx.drawImage(fl.c, fl.x, fl.y, fl.w, fl.h); octx.lineWidth = lw; octx.setLineDash([6 * lw, 4 * lw]); octx.strokeStyle = '#fff'; octx.strokeRect(fl.x, fl.y, fl.w, fl.h); octx.lineDashOffset = 6 * lw; octx.strokeStyle = '#000'; octx.strokeRect(fl.x, fl.y, fl.w, fl.h); octx.setLineDash([]); octx.fillStyle = '#fff'; octx.strokeStyle = '#000'; [[fl.x, fl.y], [fl.x + fl.w, fl.y], [fl.x, fl.y + fl.h], [fl.x + fl.w, fl.y + fl.h]].forEach(([x, y]) => { const s = 8 * lw; octx.fillRect(x - s / 2, y - s / 2, s, s); octx.strokeRect(x - s / 2, y - s / 2, s, s); }); octx.restore(); }
    else if (sel) { octx.save(); octx.lineWidth = lw; octx.setLineDash([6 * lw, 4 * lw]); octx.strokeStyle = '#fff'; octx.strokeRect(sel.x, sel.y, sel.w, sel.h); octx.lineDashOffset = 6 * lw; octx.strokeStyle = '#000'; octx.strokeRect(sel.x, sel.y, sel.w, sel.h); octx.restore(); }
    if (P.grid) { const step = z >= 8 ? 1 : Math.ceil(16 / z / 8) * 8; octx.save(); octx.lineWidth = lw; octx.strokeStyle = 'rgba(128,128,128,.45)'; octx.beginPath(); for (let x = step; x < P.w; x += step) { octx.moveTo(x, 0); octx.lineTo(x, P.h); } for (let y = step; y < P.h; y += step) { octx.moveTo(0, y); octx.lineTo(P.w, y); } octx.stroke(); octx.restore(); }
    if (cursor && P_BRUSH.includes(P.tool) && !pan && !gest) { { const r = Math.max(.5, P.size / 2); octx.save(); octx.lineWidth = lw; octx.strokeStyle = '#fff'; octx.beginPath(); octx.arc(cursor.x, cursor.y, r + lw, 0, 6.2832); octx.stroke(); octx.strokeStyle = '#000'; octx.beginPath(); octx.arc(cursor.x, cursor.y, r, 0, 6.2832); octx.stroke(); octx.restore(); } }
  }
  /* ---- pointer handling ---- */
  const pos = e => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) * P.w / r.width, y: (e.clientY - r.top) * P.h / r.height }; };
  const prOf = e => P.pressure && e.pointerType === 'pen' ? clamp(e.pressure * 1.6, .1, 1.5) : 1;
  function gestureStart() {
    if (st) { clearInterval(st.timer); if (st.t === 'eraser' && hist.u.length) restore(hist.u.pop()); sctx.clearRect(0, 0, P.w, P.h); st = null; } shp = grd = null; selDrag = null; if (fl) fl.drag = null; if (ls) ls.drag = null;
    const [a, b] = [...pts.values()], r = vp.getBoundingClientRect(); gest = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: P.zoom, l: vp.scrollLeft, t: vp.scrollTop, px: (vp.scrollLeft + (a.x + b.x) / 2 - r.left - cw.offsetLeft) / P.zoom, py: (vp.scrollTop + (a.y + b.y) / 2 - r.top - cw.offsetTop) / P.zoom }; render();
  }
  ov.addEventListener('pointerdown', e => {
    ov.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) return gestureStart(); if (pts.size > 2) return;
    if (e.button === 1 || P.space || P.tool === 'hand') { pan = { sx: e.clientX, sy: e.clientY, l: vp.scrollLeft, t: vp.scrollTop }; return; }
    const p = pos(e), second = e.button === 2, c1 = P.cols[second ? 1 : 0], c2 = P.cols[second ? 0 : 1], pr = prOf(e); cursor = p;
    if (fl) { const hit = hitFloat(p); if (hit) { fl.drag = { mode: hit, sx: p.x, sy: p.y, x: fl.x, y: fl.y, w: fl.w, h: fl.h }; return; } commitFloat(); }
    if (ls) { const hit = hitLive(p); if (hit) { ls.drag = { mode: hit, p0: p, ang0: isLine(ls.k) ? 0 : Math.atan2(p.y - ls.cy, p.x - ls.cx), snap: { cx: ls.cx, cy: ls.cy, w: ls.w, h: ls.h, rot: ls.rot, a: ls.a && { ...ls.a }, b: ls.b && { ...ls.b } } }; render(); return; } commitShape(); }
    const t = P.tool;
    if (P_BRUSH.includes(t)) strokeStart(p, c1, pr);
    else if (P_SHAPE.includes(t)) shp = { k: t, a: p, b: p, c: c1, c2, ci: second ? 1 : 0, shift: e.shiftKey, alt: e.altKey };
    else if (t === 'gradient') grd = { a: p, b: p, c1, c2 };
    else if (t === 'fill') { floodFill(p.x, p.y, c1, P.tol, P.contig, false); render(); }
    else if (t === 'magic') { floodFill(p.x, p.y, null, P.tol, P.contig, true); render(); }
    else if (t === 'pick') { pickAt(p, second); }
    else if (t === 'text') { txt && commitText(); st = null; P.tp = p; }
    else if (t === 'select') { if (inSel(p)) { liftSel(); fl.drag = { mode: 'move', sx: p.x, sy: p.y, x: fl.x, y: fl.y, w: fl.w, h: fl.h }; } else { sel = null; selDrag = { a: p }; } }
    render();
  });
  ov.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gest && pts.size >= 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; P.zoom = clamp(gest.z * d / gest.d, .05, 64); applyZoom(); const r = vp.getBoundingClientRect(); vp.scrollLeft = gest.px * P.zoom + cw.offsetLeft - (cx - r.left); vp.scrollTop = gest.py * P.zoom + cw.offsetTop - (cy - r.top); return; }
    if (pan) { vp.scrollLeft = pan.l - (e.clientX - pan.sx); vp.scrollTop = pan.t - (e.clientY - pan.sy); return; }
    const p = pos(e); cursor = p;
    if (st) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => strokeMove(pos(ev), prOf(ev))); return; }
    if (shp) { shp.b = p; shp.shift = e.shiftKey; shp.alt = e.altKey; }
    else if (grd) grd.b = p;
    else if (ls && ls.drag) dragLive(p, e);
    else if (selDrag) { const x0 = clamp(Math.min(selDrag.a.x, p.x), 0, P.w), y0 = clamp(Math.min(selDrag.a.y, p.y), 0, P.h), x1 = clamp(Math.max(selDrag.a.x, p.x), 0, P.w), y1 = clamp(Math.max(selDrag.a.y, p.y), 0, P.h); sel = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }; }
    else if (fl && fl.drag) {
      const d = fl.drag, dx = p.x - d.sx, dy = p.y - d.sy; if (d.mode === 'move') { fl.x = d.x + dx; fl.y = d.y + dy; }
      else { let x0 = d.x, y0 = d.y, x1 = d.x + d.w, y1 = d.y + d.h; if (d.mode.includes('w')) x0 += dx; else x1 += dx; if (d.mode.includes('n')) y0 += dy; else y1 += dy; let w = Math.max(4, Math.abs(x1 - x0)), hh = Math.max(4, Math.abs(y1 - y0)); if (!e.shiftKey) { const ar = d.w / d.h; if (w / hh > ar) hh = w / ar; else w = hh * ar; } fl.w = w; fl.h = hh; fl.x = d.mode.includes('w') ? d.x + d.w - w : d.x; fl.y = d.mode.includes('n') ? d.y + d.h - hh : d.y; }
    }
    ov.style.cursor = ls ? liveCursor(p) : fl ? (hitFloat(p) === 'move' ? 'move' : hitFloat(p) ? 'nwse-resize' : 'default') : P.tool === 'hand' ? 'grab' : (P_BRUSH.includes(P.tool) ? 'none' : 'crosshair'); render();
  });
  function pointerEnd(e) {
    const had = pts.delete(e.pointerId); if (!had) return; if (gest) { if (pts.size < 2) { gest = null; } return; }
    if (pan) { pan = null; return; }
    if (st) strokeEnd();
    else if (shp) { const s = shp; shp = null; makeLive(s); }
    else if (ls && ls.drag) ls.drag = null;
    else if (grd) { const s = grd; grd = null; snap(); drawGrad(ctx, s); }
    else if (selDrag) { selDrag = null; if (sel && (sel.w < 2 || sel.h < 2)) sel = null; }
    else if (fl && fl.drag) fl.drag = null;
    else if (P.tool === 'text' && P.tp) { const p = P.tp; P.tp = null; textAt(p); }
    render();
  }
  ov.addEventListener('pointerup', pointerEnd); ov.addEventListener('pointercancel', pointerEnd); ov.addEventListener('pointerleave', () => { if (!pts.size) { cursor = null; render(); } }); ov.addEventListener('contextmenu', e => e.preventDefault());
  ov.addEventListener('dblclick', () => { commitShape(); if (fl) commitFloat(); });
  vp.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(P.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); } }, { passive: false });
  function pickAt(p, second) { const x = clamp(Math.floor(p.x), 0, P.w - 1), y = clamp(Math.floor(p.y), 0, P.h - 1), d = ctx.getImageData(x, y, 1, 1).data; const i = second ? 1 : P.ci; P.cols[i] = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; syncColor(); remember(); }
  /* ---- image operations ---- */
  function xformCanvas(kind) {
    commitFloat(); snap(); const t = cloneCanvas(cv), w = P.w, hh = P.h, sw = kind === 'cw' || kind === 'ccw'; if (sw) setSize(hh, w, false); ctx.save(); ctx.clearRect(0, 0, P.w, P.h); ctx.translate(P.w / 2, P.h / 2);
    if (kind === 'cw') ctx.rotate(Math.PI / 2); if (kind === 'ccw') ctx.rotate(-Math.PI / 2); if (kind === '180') ctx.rotate(Math.PI); if (kind === 'fh') ctx.scale(-1, 1); if (kind === 'fv') ctx.scale(1, -1); ctx.drawImage(t, -w / 2, -hh / 2); ctx.restore(); sel = null; if (sw) fit(); render();
  }
  function sizeDialog(mode) {
    const o = { w: P.w, h: P.h, lock: true, ax: .5, ay: .5 }, ratio = P.w / P.h, wi = h('input', { type: 'number', min: 1, value: P.w, oninput: e => { o.w = +e.target.value || 1; if (o.lock) { o.h = Math.max(1, Math.round(o.w / ratio)); hi.value = o.h; } } }), hi = h('input', { type: 'number', min: 1, value: P.h, oninput: e => { o.h = +e.target.value || 1; if (o.lock) { o.w = Math.max(1, Math.round(o.h * ratio)); wi.value = o.w; } } });
    const body = h('div', null, h('div', { class: 'row2' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Width'), wi), h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Height'), hi)), h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: e => { o.lock = e.target.checked; } }), 'Lock aspect ratio'),
      mode === 'canvas' ? h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Anchor'), h('select', { onchange: e => { const [ax, ay] = e.target.value.split(',').map(Number); o.ax = ax; o.ay = ay; } }, [['0,0', 'Top left'], ['.5,0', 'Top'], ['1,0', 'Top right'], ['0,.5', 'Left'], ['.5,.5', 'Center'], ['1,.5', 'Right'], ['0,1', 'Bottom left'], ['.5,1', 'Bottom'], ['1,1', 'Bottom right']].map(([v, t]) => h('option', { value: v, selected: v === '.5,.5' }, t)))) : null);
    modal(mode === 'canvas' ? 'Canvas size (crop or extend)' : 'Resize image (scale)', body, [['Cancel'], ['Apply', () => { commitFloat(); snap(); const t = cloneCanvas(cv), ow = P.w, oh = P.h; if (mode === 'canvas') { setSize(o.w, o.h, false); ctx.drawImage(t, Math.round((o.w - ow) * o.ax), Math.round((o.h - oh) * o.ay)); } else { const s = scaleCanvas(t, o.w, o.h, 'smooth'); setSize(s.width, s.height, false); ctx.drawImage(s, 0, 0); } sel = null; fit(); }, true]]);
  }
  function newDialog() {
    const o = { w: 800, h: 600, bg: 'transparent' }, wi = h('input', { type: 'number', min: 1, max: 8000, value: o.w, oninput: e => { o.w = +e.target.value || 1; } }), hi = h('input', { type: 'number', min: 1, max: 8000, value: o.h, oninput: e => { o.h = +e.target.value || 1; } }), set = (w, hh) => { o.w = w; o.h = hh; wi.value = w; hi.value = hh; };
    modal('New canvas', h('div', null, h('div', { class: 'row2' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Width'), wi), h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Height'), hi)),
      h('div', { class: 'chips', style: 'margin:0 0 12px' }, [[16, 16], [32, 32], [64, 64], [128, 128], [256, 256], [512, 512], [800, 600], [1280, 720], [1920, 1080]].map(([a, b]) => h('button', { class: 'chip', onclick: () => set(a, b) }, `${a}x${b}`))),
      h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Background'), h('select', { onchange: e => { o.bg = e.target.value; } }, [['transparent', 'Transparent'], ['white', 'White'], ['primary', 'Primary color'], ['secondary', 'Secondary color']].map(([v, t]) => h('option', { value: v }, t))))),
      [['Cancel'], ['Create', () => { if (o.w * o.h > 64e6) { toast('That size is too large'); return false; } commitFloat(); snap(); setSize(o.w, o.h, false); const f = o.bg === 'white' ? '#fff' : o.bg === 'primary' ? rgba(P.cols[0]) : o.bg === 'secondary' ? rgba(P.cols[1]) : null; if (f) { ctx.fillStyle = f; ctx.fillRect(0, 0, P.w, P.h); } sel = null; P.dirty = false; fit(); }, true]]);
  }
  function trimCanvas(c) { const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1; for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3]) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 < 0) return c; const o = newCanvas(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o; }
  const keyColor = () => { const k = P.cols[0], tol = P.tol * 3; pixelOp(d => { for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - k.r) + Math.abs(d[i + 1] - k.g) + Math.abs(d[i + 2] - k.b) <= tol) d[i + 3] = 0; }); };
  const filters = {
    Invert: () => pixelOp(d => { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } }),
    Grayscale: () => pixelOp(d => { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; }),
    Sepia: () => pixelOp(d => { for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; d[i] = .393 * r + .769 * g + .189 * b; d[i + 1] = .349 * r + .686 * g + .168 * b; d[i + 2] = .272 * r + .534 * g + .131 * b; } }),
    'Brighter': () => pixelOp(d => { for (let i = 0; i < d.length; i += 4) { d[i] += 20; d[i + 1] += 20; d[i + 2] += 20; } }),
    'Darker': () => pixelOp(d => { for (let i = 0; i < d.length; i += 4) { d[i] -= 20; d[i + 1] -= 20; d[i + 2] -= 20; } }),
    Blur: () => { commitFloat(); snap(); const t = cloneCanvas(cv); ctx.save(); ctx.clearRect(0, 0, P.w, P.h); ctx.filter = 'blur(3px)'; ctx.drawImage(t, 0, 0); ctx.restore(); render(); },
    Pixelate: () => { commitFloat(); snap(); const t = cloneCanvas(cv), b = 8, s = newCanvas(Math.max(1, Math.ceil(P.w / b)), Math.max(1, Math.ceil(P.h / b))); s.getContext('2d').drawImage(t, 0, 0, s.width, s.height); ctx.save(); ctx.clearRect(0, 0, P.w, P.h); ctx.imageSmoothingEnabled = false; ctx.drawImage(s, 0, 0, s.width * b, s.height * b); ctx.restore(); render(); },
    'Fg color -> transparent': keyColor,
    'Fill transparent with secondary': () => { commitFloat(); snap(); ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = rgba(P.cols[1]); ctx.fillRect(0, 0, P.w, P.h); ctx.restore(); render(); },
    'Trim transparent edges': () => { commitFloat(); snap(); const t = trimCanvas(cv); setSize(t.width, t.height, false); ctx.drawImage(t, 0, 0); fit(); },
    'Clear canvas': () => { commitFloat(); snap(); ctx.clearRect(0, 0, P.w, P.h); render(); }
  };
  /* ---- UI ---- */
  const toolBtns = {}; function syncTools() { for (const k in toolBtns) toolBtns[k].classList.toggle('on', k === P.tool); showGroups(); if (P.tool !== 'text') commitText(); ov.style.cursor = P.tool === 'hand' ? 'grab' : P_BRUSH.includes(P.tool) ? 'none' : 'crosshair'; render(); }
  function setTool(t) { commitShape(); if (fl && t !== 'select') commitFloat(); P.tool = t; syncTools(); }
  const toolPanel = h('aside', { class: 'card ptools' }, P_TOOLS.map(([name, list]) => h('div', null, h('div', { class: 'lbl' }, name), h('div', { class: 'tg' }, list.map(([id, label]) => toolBtns[id] = h('button', { class: 'tb', title: label, onclick: () => setTool(id) }, label))))));
  const G = {}, grp = (name, ...kids) => G[name] = h('div', null, ...kids);
  const rng = (l, k, min, max, fmt = v => v, after) => { const out = h('output', null, fmt(P[k])); return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l, out), h('input', { type: 'range', min, max, value: P[k], oninput: e => { P[k] = +e.target.value; out.textContent = fmt(P[k]); if (after) after(); render(); } })); };
  const sel2 = (l, k, opts, after) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, l), h('select', { onchange: e => { P[k] = e.target.value; if (after) after(); render(); } }, opts.map(([v, t]) => h('option', { value: v, selected: v === P[k] }, t))));
  const chk = (l, k, after) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!P[k], onchange: e => { P[k] = e.target.checked; if (after) after(); render(); } }), l);
  grp('size', rng('Size / stroke width', 'size', 1, 300, v => v + 'px'));
  grp('opacity', rng('Opacity', 'opacity', 1, 100, v => v + '%'));
  grp('hardness', rng('Brush hardness', 'hardness', 0, 100, v => v + '%'));
  grp('smooth', rng('Smoothing', 'smooth', 0, 95, v => v + '%'));
  grp('sym', sel2('Symmetry (mirror drawing)', 'sym', [['none', 'Off'], ['h', 'Horizontal'], ['v', 'Vertical'], ['hv', 'Both axes'], ['r3', 'Radial x3'], ['r4', 'Radial x4'], ['r6', 'Radial x6'], ['r8', 'Radial x8']]), chk('Pen pressure (stylus)', 'pressure'));
  grp('shape', sel2('Shape style', 'shape', [['outline', 'Outline (primary)'], ['fill', 'Filled (primary)'], ['both', 'Outline primary + fill secondary']]));
  grp('dash', sel2('Line style', 'dash', [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']]));
  grp('sides', rng('Sides / points', 'sides', 3, 16));
  grp('radius', rng('Corner radius', 'radius', 0, 200, v => v + 'px'));
  grp('tol', rng('Tolerance', 'tol', 0, 255), chk('Contiguous area only', 'contig'));
  grp('grad', sel2('Gradient type', 'gradType', [['linear', 'Linear'], ['radial', 'Radial']]), sel2('Gradient ends at', 'gradEnd', [['bg', 'Secondary color'], ['transparent', 'Transparent']]));
  grp('text', sel2('Font', 'font', [['Arial, Helvetica, sans-serif', 'Sans-serif'], ['Georgia, "Times New Roman", serif', 'Serif'], ['"Courier New", monospace', 'Monospace'], ['"Comic Sans MS", cursive', 'Casual'], ['Impact, sans-serif', 'Impact']]), rng('Font size', 'fsize', 8, 300, v => v + 'px'), chk('Bold', 'bold'), chk('Italic', 'italic'));
  const SHOW = { size: [...P_BRUSH, ...P_SHAPE], opacity: [...P_BRUSH, ...P_SHAPE, 'gradient', 'text'], hardness: ['brush'], smooth: ['pen', 'marker', 'eraser', 'brush'], sym: P_BRUSH, shape: P_SHAPE.filter(k => k !== 'line' && k !== 'arrow'), dash: P_SHAPE, sides: ['polygon', 'star'], radius: ['round'], tol: ['fill', 'magic'], grad: ['gradient'], text: ['text'] };
  function showGroups() { for (const k in G) G[k].hidden = !(SHOW[k] || []).includes(P.tool); }
  const ex = exportPanel(() => { commitFloat(); return P.trim ? trimCanvas(cv) : cv; }, 'drawing');
  const btn = (l, fn, cls = '') => h('button', { class: 'chip ' + cls, onclick: fn }, l), sect = (t, ...k) => h('details', { open: true, class: 'psec' }, h('summary', null, t), ...k);
  const props = h('aside', { class: 'card pprops' },
    sect('Colors', h('div', { class: 'swrow' }, swatch[0], swatch[1], h('button', { class: 'chip', onclick: () => { P.cols.reverse(); syncColor(); } }, '⇄ Swap'), window.EyeDropper ? h('button', { class: 'chip', title: 'Pick any color on screen', onclick: async () => { try { const r = await new window.EyeDropper().open(), c = unhex(r.sRGBHex); setColor(c.r, c.g, c.b); P.cols[P.ci].a = 1; syncColor(); } catch (e) { /* cancelled */ } } }, 'Screen picker') : null),
      h('div', { class: 'row2', style: 'margin:8px 0' }, h('label', { class: 'fld', style: 'margin:0' }, h('span', { class: 'lbl' }, 'Pick'), colIn), h('label', { class: 'fld', style: 'margin:0' }, h('span', { class: 'lbl' }, 'Hex'), hexIn)),
      h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Color opacity (0% = transparent)', alphaOut), alphaIn), palBox, h('div', { class: 'note', style: 'margin:4px 0 8px' }, 'Right-click a swatch to set the secondary color.'), h('div', { class: 'lbl' }, 'Recent'), recentBox),
    sect('Tool options', G.size, G.opacity, G.hardness, G.smooth, G.sym, G.shape, G.dash, G.sides, G.radius, G.tol, G.grad, G.text),
    sect('Selection', h('div', { class: 'chips', style: 'margin:0' }, btn('Select all', () => { commitFloat(); sel = { x: 0, y: 0, w: P.w, h: P.h }; setTool('select'); render(); }), btn('Deselect', () => { commitFloat(); sel = null; render(); }), btn('Copy', copySel), btn('Cut', () => { copySel(); delSel(); }), btn('Paste', pasteClip), btn('Delete', delSel), btn('Crop to selection', cropToSel), btn('Apply shape / float', () => commitFloat()))),
    sect('Image', h('div', { class: 'chips', style: 'margin:0 0 8px' }, btn('Rotate ↶', () => xformCanvas('ccw')), btn('Rotate ↷', () => xformCanvas('cw')), btn('180°', () => xformCanvas('180')), btn('Flip H', () => xformCanvas('fh')), btn('Flip V', () => xformCanvas('fv')), btn('Resize image...', () => sizeDialog('scale')), btn('Canvas size...', () => sizeDialog('canvas'))),
      h('div', { class: 'chips', style: 'margin:0' }, Object.entries(filters).map(([n, f]) => btn(n, f)))),
    sect('Export', ex.box, chk('Trim transparent edges', 'trim'), h('div', { class: 'actions', style: 'margin-bottom:0' }, h('button', { class: 'btn pri', onclick: ex.download }, 'Download'), h('button', { class: 'btn', onclick: ex.copy }, 'Copy PNG'))));
  const openInp = h('input', { type: 'file', accept: rawImg.map(e => '.' + e).join(','), hidden: true }), placeInp = h('input', { type: 'file', accept: rawImg.map(e => '.' + e).join(','), hidden: true });
  const openFile = async (f, asNew) => { try { const c = await fileToCanvas(f, 8192); if (asNew) { commitFloat(); snap(); setSize(c.width, c.height, false); ctx.drawImage(c, 0, 0); sel = null; P.dirty = true; fit(); } else placeCanvas(c); } catch (e) { toast('Could not open that image: ' + (e.message || e)); } };
  openInp.onchange = e => { if (e.target.files[0]) openFile(e.target.files[0], true); e.target.value = ''; }; placeInp.onchange = e => { if (e.target.files[0]) openFile(e.target.files[0], false); e.target.value = ''; };
  const gridBtn = h('button', { class: 'btn sm', onclick: () => { P.grid = !P.grid; gridBtn.classList.toggle('pri', P.grid); render(); } }, 'Grid');
  const toolbar = h('div', { class: 'actions ptb' }, openInp, placeInp, h('button', { class: 'btn sm', onclick: newDialog }, 'New'), h('button', { class: 'btn sm', title: 'Open an image as the canvas', onclick: () => openInp.click() }, 'Open image'), h('button', { class: 'btn sm', title: 'Import an image onto the canvas (move & resize before applying)', onclick: () => placeInp.click() }, 'Import onto canvas'),
    h('span', { class: 'sepv' }), h('button', { class: 'btn sm', onclick: undo }, 'Undo'), h('button', { class: 'btn sm', onclick: redo }, 'Redo'), h('span', { class: 'sepv' }), h('button', { class: 'btn sm', onclick: () => setZoom(P.zoom / 1.25) }, '−'), h('button', { class: 'btn sm', onclick: () => setZoom(P.zoom * 1.25) }, '+'), h('button', { class: 'btn sm', onclick: fit }, 'Fit'), h('button', { class: 'btn sm', onclick: () => setZoom(1) }, '100%'), gridBtn,
    h('select', { class: 'sm', title: 'Workspace background', onchange: e => { vp.dataset.bg = e.target.value; } }, [['', 'Grey'], ['white', 'White'], ['black', 'Black'], ['dark', 'Dark']].map(([v, t]) => h('option', { value: v }, t))),
    h('label', { class: 'chk', style: 'margin:0' }, h('input', { type: 'checkbox', checked: true, onchange: e => { cw.classList.toggle('checker', e.target.checked); cw.style.background = e.target.checked ? '' : '#fff'; } }), 'Show transparency'), h('button', { class: 'btn sm pri', onclick: ex.download }, 'Download'));
  /* keyboard */
  const keyDown = e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.querySelector('.modal')) return; const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (k === ' ') { P.space = true; e.preventDefault(); return; }
    if (mod) { if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (k === 'y') { e.preventDefault(); redo(); } else if (k === 'c') { copySel(); } else if (k === 'x') { copySel(); delSel(); } else if (k === 'a') { e.preventDefault(); sel = { x: 0, y: 0, w: P.w, h: P.h }; setTool('select'); } else if (k === 'v' && clip) { e.preventDefault(); pasteClip(); } return; }
    if (ls && k.startsWith('arrow')) { e.preventDefault(); const st2 = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -st2 : k === 'arrowright' ? st2 : 0, dy = k === 'arrowup' ? -st2 : k === 'arrowdown' ? st2 : 0; if (isLine(ls.k)) { ls.a.x += dx; ls.a.y += dy; ls.b.x += dx; ls.b.y += dy; } else { ls.cx += dx; ls.cy += dy; } render(); return; }
    if (k === 'enter') return commitFloat(); if (k === 'escape') { if (ls) { commitShape(); return; } if (fl) cancelFloat(); else { sel = null; render(); } return; } if (k === 'delete' || k === 'backspace') { if (ls) { ls = null; render(); return; } delSel(); return; }
    if (k === '[') { P.size = clamp(P.size - Math.max(1, P.size * .15) | 0, 1, 300); redrawProps(); } else if (k === ']') { P.size = clamp(P.size + Math.max(1, P.size * .15) | 0, 1, 300); redrawProps(); } else if (k === 'x') { P.cols.reverse(); syncColor(); } else if (k === '0') fit(); else if (k === '+' || k === '=') setZoom(P.zoom * 1.25); else if (k === '-') setZoom(P.zoom / 1.25);
    else { const m = { b: 'pen', p: 'pencil', e: 'eraser', g: 'fill', i: 'pick', t: 'text', l: 'line', r: 'rect', o: 'ellipse', m: 'select', h: 'hand', w: 'magic', a: 'arrow', s: 'star' }[k]; if (m) setTool(m); }
  };
  const keyUp = e => { if (e.key === ' ') P.space = false; };
  function redrawProps() { const v = G.size.querySelector('input'); v.value = P.size; G.size.querySelector('output').textContent = P.size + 'px'; render(); }
  const pasteH = e => { const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); openFile(f, false); } else if (clip && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) pasteClip(); };
  document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp); document.addEventListener('paste', pasteH); const onRs = () => render(); window.addEventListener('resize', onRs);
  dropHook = e => { const f = [...(e.dataTransfer ? e.dataTransfer.files : [])].find(x => /^image\//.test(x.type) || kindOf(nx(extOf(x.name))) === 'img'); if (f) openFile(f, false); };
  cleanup = () => { document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); document.removeEventListener('paste', pasteH); window.removeEventListener('resize', onRs); clearInterval(st && st.timer); app.style.maxWidth = ''; };
  const centre = h('div', { class: 'pvp' }, toolbar, vp, status);
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / Utility'), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), h('div', { class: 'paint' }, toolPanel, centre, props));
  setSize(P.w, P.h, false); syncColor(); drawRecent(); syncTools(); setTimeout(fit, 30);
}
