/* ConvertLab - Image decode/encode, SVG tracing, GIF encoder, ICO decoder, image converter engine */
'use strict';

/* ================= image engine ================= */
async function decodeSvg(text, scale) {
  const d = new DOMParser().parseFromString(text, 'image/svg+xml'); const svg = d.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || d.querySelector('parsererror')) throw new Error('Invalid SVG file');
  const num = v => { const m = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(v || ''); return m ? parseFloat(m[1]) : 0; };
  let w = num(svg.getAttribute('width')), hh = num(svg.getAttribute('height'));
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if ((!w || !hh) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { if (w) hh = w * vb[3] / vb[2]; else if (hh) w = hh * vb[2] / vb[3]; else { w = vb[2]; hh = vb[3]; } }
  if (!w || !hh) { w = 512; hh = 512; }
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
  svg.setAttribute('width', Math.round(w * scale)); svg.setAttribute('height', Math.round(hh * scale));
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try { const img = await loadImgEl(url); return { src: img, w: Math.round(w * scale), h: Math.round(hh * scale) }; } finally { URL.revokeObjectURL(url); }
}
async function decodeImage(it, o) {
  let blob = it.file; const e = nx(it.ext);
  if (e === 'ico') { try { const buf = await it.file.arrayBuffer(), ents = parseIco(buf); if (ents && ents.length) { let bi = 0; ents.forEach((x, i) => { if (x.w * x.h > ents[bi].w * ents[bi].h) bi = i; }); const c = await icoEntryCanvas(buf, ents[o.__icoIndex != null ? o.__icoIndex : bi]); return { src: c, w: c.width, h: c.height }; } } catch (err) { /* fall back to browser decoder */ } }
  if (e === 'svg') return decodeSvg(await it.file.text(), +o.svgScale || 1);
  if (e === 'heic' || e === 'heif') { await ensure('heic'); try { const r = await window.heic2any({ blob: it.file, toType: 'image/png' }); blob = Array.isArray(r) ? r[0] : r; } catch (err) { throw new Error('Could not decode this HEIC/HEIF file'); } }
  let src;
  try { src = await createImageBitmap(blob); } catch (err) { const u = URL.createObjectURL(blob); try { src = await loadImgEl(u); } finally { URL.revokeObjectURL(u); } }
  return { src, w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
}
function processToCanvas(dec, o, flatten) {
  const mw = +o.maxW || 0, mh = +o.maxH || 0; let s = 1;
  if (mw && dec.w > mw) s = Math.min(s, mw / dec.w); if (mh && dec.h > mh) s = Math.min(s, mh / dec.h);
  const tw = Math.max(1, Math.round(dec.w * s)), th = Math.max(1, Math.round(dec.h * s));
  const rot = (+o.rotate || 0) % 360, swap = rot === 90 || rot === 270;
  const cw = swap ? th : tw, ch = swap ? tw : th;
  if (cw * ch > 2.5e8) throw new Error('Image is too large to process in the browser');
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (flatten) { x.fillStyle = o.bg || '#fff'; x.fillRect(0, 0, cw, ch); }
  x.imageSmoothingQuality = 'high'; x.translate(cw / 2, ch / 2); x.rotate(rot * Math.PI / 180); x.scale(o.flip === 'h' ? -1 : 1, o.flip === 'v' ? -1 : 1);
  x.drawImage(dec.src, -tw / 2, -th / 2, tw, th); x.setTransform(1, 0, 0, 1, 0, 0);
  if (o.gray) { const d = x.getImageData(0, 0, cw, ch), p = d.data; for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) | 0; x.putImageData(d, 0, 0); }
  return c;
}
function bmpFromCanvas(c) {
  const w = c.width, hh = c.height, d = c.getContext('2d').getImageData(0, 0, w, hh).data, rs = (w * 3 + 3) & ~3, size = 54 + rs * hh;
  const buf = new ArrayBuffer(size), dv = new DataView(buf), u = new Uint8Array(buf);
  u[0] = 66; u[1] = 77; dv.setUint32(2, size, true); dv.setUint32(10, 54, true); dv.setUint32(14, 40, true); dv.setInt32(18, w, true); dv.setInt32(22, hh, true); dv.setUint16(26, 1, true); dv.setUint16(28, 24, true); dv.setUint32(34, rs * hh, true); dv.setUint32(38, 2835, true); dv.setUint32(42, 2835, true);
  for (let y = 0; y < hh; y++) { let p = 54 + (hh - 1 - y) * rs; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; u[p++] = d[i + 2]; u[p++] = d[i + 1]; u[p++] = d[i]; } }
  return new Blob([buf], { type: 'image/bmp' });
}
async function icoFromDec(dec, o) {
  const list = o.icoSize === 'all' ? [16, 32, 48, 64, 128, 256] : [+o.icoSize || 256], pngs = [];
  for (const s of list) { const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; const k = Math.min(s / dec.w, s / dec.h), w = dec.w * k, hh = dec.h * k; x.drawImage(dec.src, (s - w) / 2, (s - hh) / 2, w, hh); pngs.push(new Uint8Array(await (await canvasBlob(c, 'image/png')).arrayBuffer())); }
  const n = list.length; let off = 6 + 16 * n; const out = new Uint8Array(off + pngs.reduce((a, b) => a + b.length, 0)), dv = new DataView(out.buffer);
  dv.setUint16(2, 1, true); dv.setUint16(4, n, true);
  pngs.forEach((p, i) => { const s = list[i], e = 6 + 16 * i; out[e] = s >= 256 ? 0 : s; out[e + 1] = s >= 256 ? 0 : s; dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true); dv.setUint32(e + 8, p.length, true); dv.setUint32(e + 12, off, true); out.set(p, off); off += p.length; });
  return new Blob([out], { type: 'image/x-icon' });
}
/* color quantization (median cut on 15-bit histogram) */
function medianCut(hist, maxColors) {
  const keys = []; for (let k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
  if (!keys.length) return [[0, 0, 0]];
  const ch = (k, c) => c === 0 ? (k >> 10) & 31 : c === 1 ? (k >> 5) & 31 : k & 31;
  const stats = b => { const mn = [31, 31, 31], mx = [0, 0, 0]; let pop = 0; for (const k of b.k) { for (let c = 0; c < 3; c++) { const v = ch(k, c); if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; } pop += hist[k]; } let best = -1, bc = 0; for (let c = 0; c < 3; c++) { const r = mx[c] - mn[c]; if (r > best) { best = r; bc = c; } } b.pop = pop; b.range = best; b.ch = bc; return b; };
  const boxes = [stats({ k: keys })];
  while (boxes.length < maxColors) {
    let bi = -1, bs = 0; for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (b.k.length < 2) continue; const s = (b.range + 1) * Math.log2(1 + b.pop); if (s > bs) { bs = s; bi = i; } }
    if (bi < 0) break; const b = boxes[bi], c = b.ch; b.k.sort((p, q) => ch(p, c) - ch(q, c));
    let acc = 0, cut = 1; for (let i = 0; i < b.k.length - 1; i++) { acc += hist[b.k[i]]; cut = i + 1; if (acc >= b.pop / 2) break; }
    boxes.splice(bi, 1, stats({ k: b.k.slice(0, cut) }), stats({ k: b.k.slice(cut) }));
  }
  return boxes.map(b => { let r = 0, g = 0, bl = 0, n = 0; for (const k of b.k) { const w = hist[k]; r += ((k >> 10) & 31) * w; g += ((k >> 5) & 31) * w; bl += (k & 31) * w; n += w; } return [r / n, g / n, bl / n].map(v => Math.min(255, Math.round(v * 8 + 4))); });
}
function makeIndexer(pal) {
  const lut = new Int16Array(32768).fill(-1);
  return (r, g, b) => { const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); let v = lut[k]; if (v >= 0) return v; let best = 0, bd = 1e9; const rr = (r >> 3) * 8 + 4, gg = (g >> 3) * 8 + 4, bb = (b >> 3) * 8 + 4; for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - rr) ** 2 + (p[1] - gg) ** 2 + (p[2] - bb) ** 2; if (d < bd) { bd = d; best = i; } } return lut[k] = best; };
}
function traceSvg(c, o) {
  const S = clamp(+o.svgSize || 320, 32, 1024), ow = c.width, oh = c.height, sc = Math.min(1, S / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * sc)), hh = Math.max(1, Math.round(oh * sc));
  const t = document.createElement('canvas'); t.width = w; t.height = hh; const x = t.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, hh);
  const d = x.getImageData(0, 0, w, hh).data, hist = new Uint32Array(32768);
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; hist[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]++; }
  const pal = medianCut(hist, clamp(+o.svgColors || 16, 2, 64)), idx = makeIndexer(pal), rects = pal.map(() => []);
  let prev = new Map();
  for (let y = 0; y < hh; y++) {
    const cur = new Map(); let xx = 0;
    while (xx < w) {
      const p = (y * w + xx) * 4; if (d[p + 3] < 128) { xx++; continue; }
      const k = idx(d[p], d[p + 1], d[p + 2]); let e = xx + 1;
      while (e < w) { const q = (y * w + e) * 4; if (d[q + 3] < 128 || idx(d[q], d[q + 1], d[q + 2]) !== k) break; e++; }
      const key = k + ':' + xx + ':' + (e - xx), ex = prev.get(key);
      if (ex) { ex.h++; cur.set(key, ex); } else { const r = { x: xx, y, w: e - xx, h: 1 }; rects[k].push(r); cur.set(key, r); }
      xx = e;
    }
    prev = cur;
  }
  const hx = v => v.toString(16).padStart(2, '0');
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${ow}" height="${oh}" viewBox="0 0 ${w} ${hh}" shape-rendering="crispEdges">`;
  pal.forEach((col, i) => { if (rects[i].length) s += `<path fill="#${hx(col[0])}${hx(col[1])}${hx(col[2])}" d="${rects[i].map(r => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join('')}"/>`; });
  return new Blob([s + '</svg>'], { type: 'image/svg+xml' });
}
/* ================= GIF encoder ================= */
function lzw(ix, minCode) {
  const clear = 1 << minCode, eoi = clear + 1, table = new Int32Array(1 << 20), stamp = new Uint32Array(1 << 20); let gen = 1;
  let size = minCode + 1, next = eoi + 1, cur = 0, bits = 0; const out = [];
  const emit = c => { cur |= c << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; } };
  emit(clear); let prefix = ix[0];
  for (let i = 1; i < ix.length; i++) {
    const k = ix[i], key = (prefix << 8) | k;
    if (stamp[key] === gen) { prefix = table[key]; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); gen++; next = eoi + 1; size = minCode + 1; }
    else { if (next >= (1 << size)) size++; stamp[key] = gen; table[key] = next++; }
    prefix = k;
  }
  emit(prefix); emit(eoi); if (bits > 0) out.push(cur & 255);
  return Uint8Array.from(out);
}
async function encodeGIF(frames, w, hh, opt, io, p0 = 0, pw = 1) {
  const hist = new Uint32Array(32768); let alpha = false; const step = Math.max(1, Math.floor(frames.length / 10));
  frames.forEach((f, fi) => { const d = f.data, sample = fi % step === 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) { alpha = true; continue; } if (sample) hist[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]++; } });
  const pal = medianCut(hist, alpha ? 255 : 256), idx = makeIndexer(pal), gct = new Uint8Array(768);
  pal.forEach((c, i) => gct.set(c, i * 3));
  const parts = [], u8 = (...a) => parts.push(Uint8Array.from(a));
  parts.push(new TextEncoder().encode('GIF89a')); u8(w & 255, w >> 8, hh & 255, hh >> 8, 0xF7, 0, 0); parts.push(gct);
  if (opt.loop !== -1) { u8(0x21, 0xFF, 0x0B); parts.push(new TextEncoder().encode('NETSCAPE2.0')); u8(3, 1, 0, 0, 0); }
  for (let fi = 0; fi < frames.length; fi++) {
    io.check(); io.progress(p0 + pw * fi / frames.length, 'Encoding GIF'); await tick();
    const dl = frames[fi].delay || opt.delay || 10, d = frames[fi].data;
    u8(0x21, 0xF9, 4, (alpha ? 2 << 2 : 1 << 2) | (alpha ? 1 : 0), dl & 255, dl >> 8, alpha ? 255 : 0, 0);
    u8(0x2C, 0, 0, 0, 0, w & 255, w >> 8, hh & 255, hh >> 8, 0);
    const ix = new Uint8Array(w * hh); for (let p = 0, i = 0; p < ix.length; p++, i += 4) ix[p] = d[i + 3] < 128 ? 255 : idx(d[i], d[i + 1], d[i + 2]);
    u8(8); const bytes = lzw(ix, 8);
    for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); u8(n); parts.push(bytes.subarray(i, i + n)); }
    u8(0);
  }
  u8(0x3B); return new Blob(parts, { type: 'image/gif' });
}
async function eImg2gif(job, o, io) {
  const items = job.items, frames = []; let W = 0, H = 0;
  for (let i = 0; i < items.length; i++) {
    io.check(); io.progress(.6 * i / items.length, `Reading ${i + 1}/${items.length}`);
    const dec = await decodeImage(items[i], o), c = processToCanvas(dec, o, false); if (dec.src.close) dec.src.close();
    if (!W) { W = c.width; H = c.height; } let cc = c;
    if (c.width !== W || c.height !== H) { cc = document.createElement('canvas'); cc.width = W; cc.height = H; const k = Math.min(W / c.width, H / c.height); cc.getContext('2d', { willReadFrequently: true }).drawImage(c, (W - c.width * k) / 2, (H - c.height * k) / 2, c.width * k, c.height * k); }
    frames.push({ data: cc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data });
  }
  const blob = await encodeGIF(frames, W, H, { loop: o.loop === '-1' ? -1 : 0, delay: Math.max(2, Math.round((+o.delay || 500) / 10)) }, io, .6, .4);
  return [{ name: items.length > 1 ? 'animation.gif' : outName(items[0], 'gif'), blob }];
}
async function eVid2gifNative(job, o, io) {
  const it = job.items[0], url = URL.createObjectURL(it.file), v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  try {
    v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('This browser cannot decode the video')); setTimeout(() => rej(new Error('Timed out reading the video')), 20000); });
    const dur = v.duration; if (!isFinite(dur) || dur <= 0) throw new Error('Unknown duration');
    const start = clamp(parseTime(o.start), 0, dur); let len = parseTime(o.dur); if (!(len > 0) || start + len > dur) len = dur - start;
    const fps = +o.gifFps || 10; let n = Math.max(1, Math.floor(len * fps)); const MAX = 400; if (n > MAX) n = MAX; const stepT = len / n;
    const tw = Math.min(+o.gifWidth || v.videoWidth, v.videoWidth, 1280), th = Math.round(tw * v.videoHeight / v.videoWidth);
    const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d', { willReadFrequently: true }), frames = [];
    const seek = t => new Promise((res, rej) => { if (Math.abs(v.currentTime - t) < 1e-3) return res(); const to = setTimeout(() => rej(new Error('Seek timed out')), 8000); v.onseeked = () => { clearTimeout(to); res(); }; v.currentTime = t; });
    for (let i = 0; i < n; i++) { io.check(); io.progress(.55 * i / n, `Capturing frame ${i + 1}/${n}`); await seek(Math.min(dur - .01, start + i * stepT)); x.drawImage(v, 0, 0, tw, th); frames.push({ data: x.getImageData(0, 0, tw, th).data }); }
    const blob = await encodeGIF(frames, tw, th, { loop: o.loop === '-1' ? -1 : 0, delay: Math.max(2, Math.round(stepT * 100)) }, io, .55, .45);
    return [{ name: outName(it, 'gif'), blob }];
  } finally { URL.revokeObjectURL(url); }
}

/* ================= ICO decode ================= */
function newCanvas(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); return c; }
function cloneCanvas(c) { const n = newCanvas(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; }
function parseIco(buf) {
  if (buf.byteLength < 22) return null; const dv = new DataView(buf);
  if (dv.getUint16(0, true) !== 0 || dv.getUint16(2, true) !== 1) return null;
  const n = dv.getUint16(4, true), ents = [];
  for (let i = 0; i < n; i++) { const o = 6 + i * 16; if (o + 16 > buf.byteLength) break; ents.push({ w: dv.getUint8(o) || 256, h: dv.getUint8(o + 1) || 256, size: dv.getUint32(o + 8, true), off: dv.getUint32(o + 12, true) }); }
  return ents.filter(e => e.off + e.size <= buf.byteLength && e.size > 8);
}
async function icoEntryCanvas(buf, e) {
  const u = new Uint8Array(buf, e.off, e.size);
  if (u[0] === 0x89 && u[1] === 0x50) { const bm = await createImageBitmap(new Blob([u], { type: 'image/png' })); const c = newCanvas(bm.width, bm.height); c.getContext('2d').drawImage(bm, 0, 0); return c; }
  const dv = new DataView(buf, e.off, e.size), hs = dv.getUint32(0, true), w = dv.getInt32(4, true), hh = Math.abs(dv.getInt32(8, true)) / 2, bpp = dv.getUint16(14, true);
  let cu = dv.getUint32(32, true); if (bpp <= 8 && !cu) cu = 1 << bpp;
  const pal = []; for (let i = 0; i < (bpp <= 8 ? cu : 0); i++) { const o = hs + i * 4; pal.push([u[o + 2], u[o + 1], u[o]]); }
  const xorOff = hs + (bpp <= 8 ? cu * 4 : 0), rs = ((w * bpp + 31) >> 5) * 4, andOff = xorOff + rs * hh, rs1 = ((w + 31) >> 5) * 4;
  const c = newCanvas(w, hh), x = c.getContext('2d'), img = x.createImageData(w, hh), d = img.data; let anyA = false;
  for (let y = 0; y < hh; y++) {
    const row = xorOff + (hh - 1 - y) * rs;
    for (let xx = 0; xx < w; xx++) {
      const o = (y * w + xx) * 4; let r, g, b, a = 255;
      if (bpp === 32) { const p = row + xx * 4; b = u[p]; g = u[p + 1]; r = u[p + 2]; a = u[p + 3]; if (a) anyA = true; }
      else if (bpp === 24) { const p = row + xx * 3; b = u[p]; g = u[p + 1]; r = u[p + 2]; }
      else if (bpp === 8) { [r, g, b] = pal[u[row + xx]] || [0, 0, 0]; }
      else if (bpp === 4) { const v = u[row + (xx >> 1)]; [r, g, b] = pal[xx & 1 ? v & 15 : v >> 4] || [0, 0, 0]; }
      else if (bpp === 1) { const v = (u[row + (xx >> 3)] >> (7 - (xx & 7))) & 1; [r, g, b] = pal[v] || [0, 0, 0]; }
      else throw new Error('Unsupported ICO bit depth');
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
    }
  }
  if ((bpp !== 32 || !anyA) && andOff + rs1 * hh <= u.length) for (let y = 0; y < hh; y++) { const row = andOff + (hh - 1 - y) * rs1; for (let xx = 0; xx < w; xx++) d[(y * w + xx) * 4 + 3] = (u[row + (xx >> 3)] >> (7 - (xx & 7))) & 1 ? 0 : 255; }
  else if (bpp !== 32 || !anyA) for (let i = 3; i < d.length; i += 4) d[i] = 255;
  x.putImageData(img, 0, 0); return c;
}
async function encodeDec(dec, out, o) {
  if (out === 'ico') return icoFromDec(dec, o);
  if (out === 'svg') { const c = processToCanvas(dec, o, false); return o.svgMode === 'embed' ? new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}"><image width="${c.width}" height="${c.height}" href="${c.toDataURL('image/png')}"/></svg>`], { type: 'image/svg+xml' }) : traceSvg(c, o); }
  const c = processToCanvas(dec, o, out === 'jpg' || out === 'bmp'), q = clamp((+o.quality || 90) / 100, .01, 1);
  if (out === 'png') return canvasBlob(c, 'image/png');
  if (out === 'jpg') return canvasBlob(c, 'image/jpeg', q);
  if (out === 'webp') { const b = await canvasBlob(c, 'image/webp', q); if (b.type !== 'image/webp') throw new Error('This browser cannot encode WebP. Try Chrome, Edge or Firefox.'); return b; }
  return bmpFromCanvas(c);
}
async function eImage(job, o, io) {
  const it = job.items[0], out = job.out, e = nx(it.ext);
  io.progress(.1, 'Decoding image');
  if (e === 'ico' && o.icoExtract === 'all') {
    const ents = parseIco(await it.file.arrayBuffer());
    if (ents && ents.length > 1) {
      const res = [], seen = {};
      for (let i = 0; i < ents.length; i++) {
        io.check(); io.progress(.1 + .8 * i / ents.length, `Size ${i + 1}/${ents.length}`);
        const dec = await decodeImage(it, { ...o, __icoIndex: i }); let nm = `${safe(stem(it.name))}-${dec.w}x${dec.h}`; seen[nm] = (seen[nm] || 0) + 1; if (seen[nm] > 1) nm += '-' + seen[nm];
        res.push({ name: nm + '.' + out, blob: await encodeDec(dec, out, o) });
      }
      return res;
    }
  }
  const dec = await decodeImage(it, o); io.check(); io.progress(.5, 'Encoding'); const blob = await encodeDec(dec, out, o); if (dec.src.close) dec.src.close();
  return [{ name: outName(it, out), blob }];
}
