/* ConvertLab - PDF, DOCX, EPUB, TXT, MD, HTML conversion; TAR/ZIP archives; engine registry */
'use strict';

/* ================= PDF / documents ================= */
const SKIP = new Set(['script', 'style', 'head', 'meta', 'link', 'title', 'noscript']);
const BLOCK = new Set('h1 h2 h3 h4 h5 h6 p div ul ol li pre blockquote hr table section article header footer nav aside figure figcaption main dl dt dd address'.split(' '));
const parsePages = (spec, n) => {
  spec = (spec || '').trim(); if (!spec) return [...Array(n)].map((_, i) => i + 1);
  const set = new Set();
  for (const part of spec.split(',')) { const m = /^\s*(\d*)\s*(?:-\s*(\d*))?\s*$/.exec(part); if (!m || (!m[1] && !m[2])) continue; const a = m[1] ? +m[1] : 1, b = part.includes('-') ? (m[2] ? +m[2] : n) : a; for (let p = Math.max(1, a); p <= Math.min(n, b); p++) set.add(p); }
  const r = [...set].sort((x, y) => x - y); if (!r.length) throw new Error(`No pages match "${spec}" (document has ${n} pages)`); return r;
};
async function openPdf(it) {
  await ensure('pdfjs'); const data = new Uint8Array(await it.file.arrayBuffer());
  try { return await window.pdfjsLib.getDocument({ data, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true }).promise; }
  catch (e) { if (e && e.name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password first.'); throw new Error('Could not read this PDF (' + (e.message || e) + ')'); }
}
async function renderPage(page, dpi, mime, q, flatten) {
  let scale = dpi / 72; const v0 = page.getViewport({ scale: 1 }); if (v0.width * v0.height * scale * scale > 32e6) scale = Math.sqrt(32e6 / (v0.width * v0.height));
  const vp = page.getViewport({ scale }), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const x = c.getContext('2d'); if (flatten) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
  await page.render({ canvasContext: x, viewport: vp }).promise; return canvasBlob(c, mime, q);
}
async function ePdf2img(job, o, io) {
  const it = job.items[0], out = job.out, pdf = await openPdf(it), pages = parsePages(o.pages, pdf.numPages), res = [], pad = String(pdf.numPages).length;
  for (let i = 0; i < pages.length; i++) {
    io.check(); io.progress(i / pages.length, `Page ${pages[i]} of ${pdf.numPages}`);
    const page = await pdf.getPage(pages[i]), blob = await renderPage(page, +o.dpi || 150, MIME[out], clamp((+o.quality || 90) / 100, .1, 1), out === 'jpg');
    res.push({ name: safe(stem(it.name)) + '-page-' + String(pages[i]).padStart(pad, '0') + '.' + out, blob }); page.cleanup();
  }
  pdf.destroy(); return res;
}
/* --- input -> DOM --- */
function cleanDom(d, title) {
  d.querySelectorAll('script,style,link,meta,iframe,object,embed,noscript,base,form,input,button,textarea,select').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name); }));
  return { body: d.body, title: d.title || title, doc: d };
}
const parseHtml = (html, title) => cleanDom(new DOMParser().parseFromString(html, 'text/html'), title);
const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const textToDom = (t, title) => parseHtml(t.replace(/\r\n?/g, '\n').split(/\n{2,}/).filter(p => p.trim()).map(p => '<p>' + escH(p).replace(/\n/g, '<br>') + '</p>').join(''), title);
function mdToHtml(src) {
  const inl = s => { s = escH(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '<strong>$1$2</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/~~([^~]+)~~/g, '<del>$1</del>'); return s; };
  const L = src.replace(/\r\n?/g, '\n').split('\n'), out = [], LI = /^\s*([-*+]|\d+[.)])\s+/; let i = 0;
  while (i < L.length) {
    const ln = L[i]; let m;
    if (/^```/.test(ln)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; out.push('<pre><code>' + escH(b.join('\n')) + '</code></pre>'); continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) { out.push(`<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    if (/^>/.test(ln)) { const b = []; while (i < L.length && /^>/.test(L[i])) b.push(L[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + inl(b.join(' ')) + '</blockquote>'); continue; }
    if (LI.test(ln)) { const ord = /^\s*\d/.test(ln), b = []; while (i < L.length && LI.test(L[i])) b.push('<li>' + inl(L[i++].replace(LI, '')) + '</li>'); out.push((ord ? '<ol>' : '<ul>') + b.join('') + (ord ? '</ol>' : '</ul>')); continue; }
    if (/^\|.*\|\s*$/.test(ln) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim()); let t = '<table><tr>' + cells(ln).map(c => '<th>' + inl(c) + '</th>').join('') + '</tr>'; i += 2;
      while (i < L.length && L[i].includes('|')) t += '<tr>' + cells(L[i++]).map(c => '<td>' + inl(c) + '</td>').join('') + '</tr>'; out.push(t + '</table>'); continue;
    }
    if (!ln.trim()) { i++; continue; }
    const b = [L[i++]]; while (i < L.length && L[i].trim() && !/^(#{1,6}\s|```|>)/.test(L[i]) && !LI.test(L[i])) b.push(L[i++]); out.push('<p>' + inl(b.join(' ')) + '</p>');
  }
  return out.join('\n');
}
function rtfToText(s) {
  return s.replace(/\\par[d]?/g, '\n').replace(/\\line/g, '\n').replace(/\\tab/g, '\t').replace(/\\'([0-9a-f]{2})/gi, (m, x) => String.fromCharCode(parseInt(x, 16))).replace(/\\u(-?\d+)\??/g, (m, n) => String.fromCharCode(n < 0 ? +n + 65536 : +n))
    .replace(/\{\\\*[^{}]*\}/g, '').replace(/\{\\(fonttbl|colortbl|stylesheet|info)(\{[^{}]*\}|[^{}])*\}/g, '').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
}
async function epubToDom(it, io) {
  await ensure('jszip'); const zip = await window.JSZip.loadAsync(it.file), rd = async p => { const f = zip.file(p); return f ? f.async('string') : ''; };
  const cont = await rd('META-INF/container.xml'), m = /full-path="([^"]+)"/.exec(cont); if (!m) throw new Error('Not a valid EPUB file');
  const px = new DOMParser(), od = px.parseFromString(await rd(m[1]), 'application/xml'), dir = m[1].includes('/') ? m[1].replace(/[^/]*$/, '') : '', man = {};
  od.querySelectorAll('manifest > item').forEach(n => { man[n.getAttribute('id')] = n.getAttribute('href'); });
  const spine = [...od.querySelectorAll('spine > itemref')].map(n => man[n.getAttribute('idref')]).filter(Boolean);
  const doc = document.implementation.createHTMLDocument(''), t = od.getElementsByTagName('dc:title')[0];
  const resolve = (base, rel) => decodeURIComponent(new URL(rel, 'http://z/' + base).pathname.slice(1));
  for (let i = 0; i < spine.length; i++) {
    io.progress(.05 + .35 * i / spine.length, `Chapter ${i + 1}/${spine.length}`);
    const path = resolve(dir, spine[i]), d = px.parseFromString(await rd(path), 'text/html'); d.querySelectorAll('script,style').forEach(n => n.remove());
    for (const im of d.querySelectorAll('img')) { const src = im.getAttribute('src') || ''; const f = zip.file(resolve(path.replace(/[^/]*$/, ''), src)); if (f && !/^data:/.test(src)) { const ext = extOf(src) || 'png'; im.setAttribute('src', `data:${MIME[nx(ext)] || 'image/' + ext};base64,` + await f.async('base64')); } }
    const sec = doc.createElement('section'); sec.setAttribute('data-chapter', ''); for (const ch of [...d.body.childNodes]) sec.append(doc.importNode(ch, true)); doc.body.append(sec);
  }
  return { body: doc.body, title: t ? t.textContent : stem(it.name), doc };
}
async function pdfToDom(it, o, io, out) {
  const pdf = await openPdf(it), pages = parsePages(o.pages, pdf.numPages), doc = document.implementation.createHTMLDocument(stem(it.name)), body = doc.body; let total = 0;
  for (let pi = 0; pi < pages.length; pi++) {
    io.check(); io.progress(.4 * pi / pages.length, `Reading page ${pages[pi]}/${pdf.numPages}`);
    const page = await pdf.getPage(pages[pi]), sec = doc.createElement('section'); sec.setAttribute('data-page', pages[pi]);
    if (out === 'docx' && o.docxMode === 'pages') { const b = await renderPage(page, 110, 'image/jpeg', .85, true), im = doc.createElement('img'); im.setAttribute('src', await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); })); sec.append(im); body.append(sec); total += 99; continue; }
    const tc = await page.getTextContent(), lines = []; let cur = null;
    for (const t of tc.items) {
      if (!('str' in t)) continue; const sz = Math.hypot(t.transform[2], t.transform[3]) || t.height || 10, y = t.transform[5], x = t.transform[4];
      if (cur && Math.abs(cur.y - y) < Math.max(2, sz * .4)) { const gap = x - cur.endX; cur.text += (gap > sz * .2 && !/\s$/.test(cur.text) && !/^\s/.test(t.str) ? ' ' : '') + t.str; cur.endX = x + t.width; cur.size = Math.max(cur.size, sz); }
      else { cur = { y, text: t.str, size: sz, endX: x + t.width }; lines.push(cur); }
    }
    const sizes = lines.map(l => l.size).sort((a, b) => a - b), med = sizes.length ? sizes[sizes.length >> 1] : 10; let para = null, prev = null;
    const flush = () => { if (para && para.text.trim()) { const e = doc.createElement(para.h ? (para.size > med * 1.6 ? 'h1' : 'h2') : 'p'); e.textContent = para.text.trim(); sec.append(e); total += para.text.length; } para = null; };
    for (const l of lines) {
      const txt = l.text.replace(/\s+/g, ' ').trim(); if (!txt) continue;
      const head = l.size > med * 1.2 && txt.length < 120, bullet = /^([•·▪‣◦\-–*]|\d+[.)])\s/.test(txt);
      if (!para || head || para.h || bullet || (prev && prev.y - l.y > prev.size * 1.65) || Math.abs(l.size - para.size) > med * .2) { flush(); para = { text: txt, h: head, size: l.size }; }
      else para.text = /[a-z]-$/.test(para.text) && /^[a-z]/.test(txt) ? para.text.slice(0, -1) + txt : para.text + ' ' + txt;
      prev = l;
    }
    flush(); body.append(sec); page.cleanup();
  }
  pdf.destroy();
  if (total < 10) throw new Error('No selectable text found (scanned PDF?). Use the "Page images" mode for Word, or convert to JPG.');
  return { body, title: stem(it.name), doc };
}
async function loadAsDom(it, o, io, out) {
  const e = nx(it.ext), title = stem(it.name);
  if (e === 'docx') { await ensure('mammoth'); return parseHtml((await window.mammoth.convertToHtml({ arrayBuffer: await it.file.arrayBuffer() })).value, title); }
  if (e === 'txt') return textToDom(await it.file.text(), title);
  if (e === 'md') return parseHtml(mdToHtml(await it.file.text()), title);
  if (e === 'html') return parseHtml(await it.file.text(), title);
  if (e === 'rtf') return textToDom(rtfToText(await it.file.text()), title);
  if (e === 'epub') return epubToDom(it, io);
  return pdfToDom(it, o, io, out);
}
/* --- DOM -> text / markdown --- */
function domToText(root) {
  let out = ''; const nl = k => { out = out.replace(/[ \t]+$/, ''); const m = /\n*$/.exec(out)[0].length; if (out.length && m < k) out += '\n'.repeat(k - m); };
  const walk = (n, ctx) => {
    if (n.nodeType === 3) { out += n.textContent.replace(/\s+/g, ' '); return; } if (n.nodeType !== 1) return;
    const t = n.tagName.toLowerCase(); if (SKIP.has(t)) return;
    if (t === 'br') { out += '\n'; return; } if (t === 'img') { out += n.getAttribute('alt') ? '[' + n.getAttribute('alt') + ']' : ''; return; }
    if (t === 'pre') { nl(2); out += n.textContent; nl(2); return; }
    if (t === 'hr') { nl(1); out += '----------'; nl(1); return; }
    if (t === 'li') { nl(1); out += ctx.ol ? (ctx.i++) + '. ' : '- '; n.childNodes.forEach(c => walk(c, { ol: false, i: 1 })); return; }
    if (t === 'ul' || t === 'ol') { nl(1); const c = { ol: t === 'ol', i: 1 }; n.childNodes.forEach(ch => walk(ch, c)); nl(1); return; }
    if (t === 'tr') { nl(1); [...n.children].forEach((c, i) => { if (i) out += '\t'; c.childNodes.forEach(x => walk(x, ctx)); }); nl(1); return; }
    const blk = BLOCK.has(t); if (blk) nl(/^(h\d|p|blockquote|table)$/.test(t) ? 2 : 1); n.childNodes.forEach(c => walk(c, ctx)); if (blk) nl(/^(h\d|p|blockquote|table)$/.test(t) ? 2 : 1);
  };
  walk(root, { ol: false, i: 1 }); return out.replace(/ {2,}/g, ' ').replace(/\n[ ]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function domToMd(root) {
  const inl = n => { if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' '); if (n.nodeType !== 1) return ''; const t = n.tagName.toLowerCase(); if (SKIP.has(t)) return ''; const k = [...n.childNodes].map(inl).join('');
    if (t === 'strong' || t === 'b') return '**' + k.trim() + '**'; if (t === 'em' || t === 'i') return '*' + k.trim() + '*'; if (t === 'code') return '`' + k + '`'; if (t === 'br') return '  \n'; if (t === 'a') return n.getAttribute('href') ? `[${k}](${n.getAttribute('href')})` : k;
    if (t === 'img') { const s = n.getAttribute('src') || ''; return /^data:/.test(s) ? '*[image]*' : `![${n.getAttribute('alt') || ''}](${s})`; } return k; };
  const blk = (n, d) => { let o = ''; for (const c of n.childNodes) { if (c.nodeType === 3) { if (c.textContent.trim()) o += c.textContent.replace(/\s+/g, ' ') + '\n\n'; continue; } if (c.nodeType !== 1) continue; const t = c.tagName.toLowerCase(); if (SKIP.has(t)) continue;
    if (/^h[1-6]$/.test(t)) o += '#'.repeat(+t[1]) + ' ' + inl(c).trim() + '\n\n'; else if (t === 'p') o += inl(c).trim() + '\n\n'; else if (t === 'pre') o += '```\n' + c.textContent + '\n```\n\n'; else if (t === 'hr') o += '---\n\n'; else if (t === 'blockquote') o += inl(c).trim().split('\n').map(x => '> ' + x).join('\n') + '\n\n';
    else if (t === 'ul' || t === 'ol') { let i = 1; for (const li of c.children) { const nested = [...li.children].filter(x => /^(ul|ol)$/i.test(x.tagName)); const txt = [...li.childNodes].filter(x => !nested.includes(x)).map(inl).join('').trim(); o += '  '.repeat(d) + (t === 'ol' ? (i++) + '. ' : '- ') + txt + '\n'; nested.forEach(x => { o += blk({ childNodes: [x] }, d + 1); }); } o += '\n'; }
    else if (t === 'table') { const rows = [...c.querySelectorAll('tr')].map(r => [...r.children].map(x => inl(x).trim().replace(/\|/g, '\\|'))); if (rows.length) { o += '| ' + rows[0].join(' | ') + ' |\n| ' + rows[0].map(() => '---').join(' | ') + ' |\n'; rows.slice(1).forEach(r => { o += '| ' + r.join(' | ') + ' |\n'; }); o += '\n'; } }
    else if (BLOCK.has(t)) o += blk(c, d); else { const s = inl(c).trim(); if (s) o += s + '\n\n'; } } return o; };
  return blk(root, 0).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
/* --- images in documents --- */
const imgInfo = new WeakMap();
async function prepImages(root) {
  for (const im of [...root.querySelectorAll('img')]) {
    const src = im.getAttribute('src') || ''; if (!/^data:image\//i.test(src)) continue;
    try {
      const el = await loadImgEl(src); let url = src, fmt = /^data:image\/png/i.test(src) ? 'PNG' : /^data:image\/jpe?g/i.test(src) ? 'JPEG' : null;
      if (!fmt) { const c = document.createElement('canvas'); c.width = el.naturalWidth || 300; c.height = el.naturalHeight || 150; c.getContext('2d').drawImage(el, 0, 0, c.width, c.height); url = c.toDataURL('image/png'); fmt = 'PNG'; }
      imgInfo.set(im, { url, fmt, w: el.naturalWidth || 300, h: el.naturalHeight || 150 });
    } catch (e) { /* skip image */ }
  }
}
/* --- DOM -> PDF (own layout engine on jsPDF) --- */
async function htmlToPdf(dom, o) {
  await ensure('jspdf'); await prepImages(dom.body);
  const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: 'pt', format: o.paper === 'letter' ? 'letter' : 'a4', compress: true });
  const PW = pdf.internal.pageSize.getWidth(), PH = pdf.internal.pageSize.getHeight(), M = (+o.dMargin || 18) * 2.835, fam = o.font || 'helvetica', base = +o.fontSize || 11, L0 = M, W0 = PW - 2 * M, BOT = PH - M - 10;
  let y = M, pageNo = 1; pdf.setProperties({ title: o.docTitle || dom.title || '', author: o.docAuthor || '', creator: 'ConvertLab' });
  const NATIVE = /^[\u0020-\u007e\u00a0-\u00ff]*$/;
  const norm = s => s.replace(/[\u2018\u2019\u201a]/g, "'").replace(/[\u201c\u201d\u201e]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[\u2022\u25cf\u25aa]/g, '\u00b7');
  const newPage = () => { pdf.addPage(); pageNo++; y = M; }, need = hh => { if (y + hh > BOT && y > M + 1) newPage(); };
  const rc = new Map();
  const raster = (t, sz, b, i, mono, col) => { const key = [t, sz, b, i, mono, col].join('|'); if (rc.has(key)) return rc.get(key); const sc = 3, c = document.createElement('canvas'), x = c.getContext('2d'), f = `${i ? 'italic ' : ''}${b ? 'bold ' : ''}${sz * sc}px ${mono ? 'monospace' : 'system-ui,"Noto Sans","Segoe UI",sans-serif'}`; x.font = f; const w = x.measureText(t).width; c.width = Math.ceil(w) + 2; c.height = Math.ceil(sz * sc * 1.4); x.font = f; x.fillStyle = col; x.fillText(t, 1, sz * sc * 1.05); const r = { url: c.toDataURL('image/png'), w: w / sc, h: c.height / sc }; rc.set(key, r); return r; };
  const fstyle = r => r.b && r.i ? 'bolditalic' : r.b ? 'bold' : r.i ? 'italic' : 'normal';
  const tw = (t, r, sz) => { if (NATIVE.test(t)) { pdf.setFont(r.mono ? 'courier' : fam, fstyle(r)); pdf.setFontSize(sz); return pdf.getTextWidth(t); } return raster(t, sz, r.b, r.i, r.mono, '#000').w; };
  function flow(runs, op, draw) {
    const x0 = op.x ?? L0, w = op.w ?? W0, size = op.size ?? base, lines = []; let cur = [], cw = 0;
    const push = () => { while (cur.length && cur[cur.length - 1].sp) cw -= cur.pop().w; lines.push({ it: cur, w: cw }); cur = []; cw = 0; };
    for (const r of runs) {
      if (r.br) { push(); continue; } const sz = r.sz || size;
      for (const p of norm(r.t).split(/(\s+)/)) {
        if (p === '') continue; if (/^\s+$/.test(p)) { if (cur.length) { const wd = tw(' ', r, sz); cur.push({ t: ' ', r, sz, w: wd, sp: true }); cw += wd; } continue; }
        let wd = tw(p, r, sz); if (cw + wd > w && cur.length) push();
        if (wd > w) { const n = Math.max(1, Math.floor(p.length * w / wd)); for (let k = 0; k < p.length; k += n) { const piece = p.slice(k, k + n), pw = tw(piece, r, sz); if (cw + pw > w && cur.length) push(); cur.push({ t: piece, r, sz, w: pw }); cw += pw; } continue; }
        cur.push({ t: p, r, sz, w: wd }); cw += wd;
      }
    }
    if (cur.length) push(); let total = 0;
    for (const ln of lines) {
      const lh = Math.max(size, ...ln.it.map(i => i.sz)) * 1.35; total += lh; if (!draw) continue;
      if (!op.nobreak) need(lh); const base0 = y + lh * .78; let x = x0 + (op.align === 'center' ? (w - ln.w) / 2 : 0);
      for (const t of ln.it) {
        if (!t.sp) {
          const col = t.r.href ? [20, 70, 200] : [0, 0, 0];
          if (NATIVE.test(t.t)) { pdf.setFont(t.r.mono ? 'courier' : fam, fstyle(t.r)); pdf.setFontSize(t.sz); pdf.setTextColor(...col); pdf.text(t.t, x, base0); }
          else { const rr = raster(t.t, t.sz, t.r.b, t.r.i, t.r.mono, t.r.href ? '#1446c8' : '#000'); pdf.addImage(rr.url, 'PNG', x - .3, base0 - t.sz * 1.05, rr.w, rr.h); }
          if (t.r.href) { pdf.setDrawColor(20, 70, 200); pdf.line(x, base0 + 1.5, x + t.w, base0 + 1.5); try { pdf.link(x, base0 - t.sz, t.w, t.sz * 1.2, { url: t.r.href }); } catch (e) { /* ignore */ } }
        }
        x += t.w;
      }
      y += lh;
    }
    pdf.setTextColor(0, 0, 0); return total;
  }
  const inlineRuns = (n, st) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/[\s\u00a0]+/g, ' '); return t ? [{ ...st, t }] : []; } if (n.nodeType !== 1) return [];
    const tag = n.tagName.toLowerCase(); if (SKIP.has(tag)) return []; if (tag === 'br') return [{ br: true }]; if (tag === 'img') return [{ img: n }];
    const s = { ...st }; if (tag === 'b' || tag === 'strong' || /^h[1-6]$/.test(tag)) s.b = true; if (tag === 'i' || tag === 'em') s.i = true; if (['code', 'kbd', 'tt', 'samp'].includes(tag)) s.mono = true; if (tag === 'a' && /^(https?:|mailto:)/i.test(n.getAttribute('href') || '')) s.href = n.getAttribute('href');
    return [...n.childNodes].flatMap(c => inlineRuns(c, s));
  };
  const trim = rs => { rs = rs.slice(); while (rs.length && rs[0].t !== undefined && !rs[0].t.trim()) rs.shift(); while (rs.length && rs[rs.length - 1].t !== undefined && !rs[rs.length - 1].t.trim()) rs.pop(); if (rs.length && rs[0].t) rs[0] = { ...rs[0], t: rs[0].t.replace(/^\s+/, '') }; const l = rs.length - 1; if (l >= 0 && rs[l].t) rs[l] = { ...rs[l], t: rs[l].t.replace(/\s+$/, '') }; return rs; };
  function drawImg(n, c) {
    const inf = imgInfo.get(n); if (!inf) { const alt = n.getAttribute('alt'); if (alt) { flow([{ t: '[' + alt + ']', i: true }], c, true); y += 4; } return; }
    let w = Math.min(inf.w * .75, c.w), hh = inf.h * w / inf.w; const mh = PH - 2 * M - 10; if (hh > mh) { w = w * mh / hh; hh = mh; }
    need(hh); pdf.addImage(inf.url, inf.fmt, c.x + (c.w - w) / 2, y, w, hh, undefined, 'FAST'); y += hh + base * .6;
  }
  function para(runs, c, op = {}) {
    let buf = []; const size = op.size || base;
    const out = () => { const t = trim(buf); buf = []; if (!t.length) return; flow(t, { ...c, size }, true); y += op.after ?? size * .5; };
    for (const r of runs) { if (r.img) { out(); drawImg(r.img, c); } else buf.push(op.b ? { ...r, b: true } : r); } out();
  }
  function list(n, tag, c) {
    let idx = +n.getAttribute('start') || 1;
    for (const li of n.children) {
      if (li.tagName.toLowerCase() !== 'li') continue; const c2 = { x: c.x + 18, w: c.w - 18 }; need(base * 1.5); const top = y, nested = [], runs = [];
      for (const ch of li.childNodes) { if (ch.nodeType === 1 && /^(ul|ol)$/i.test(ch.tagName)) nested.push(ch); else runs.push(...inlineRuns(ch, {})); }
      if (tag === 'ol') { pdf.setFont(fam, 'normal'); pdf.setFontSize(base); pdf.text(String(idx++) + '.', c.x + 14, top + base * 1.05, { align: 'right' }); } else { pdf.setFillColor(0, 0, 0); pdf.circle(c.x + 9, top + base * .7, 1.6, 'F'); }
      para(runs, c2, { after: base * .25 }); nested.forEach(nl => list(nl, nl.tagName.toLowerCase(), c2));
    }
    y += base * .4;
  }
  function table(n, c) {
    const rows = [...n.querySelectorAll('tr')].filter(r => r.closest('table') === n); if (!rows.length) return;
    const ncol = Math.max(...rows.map(r => [...r.children].reduce((a, x) => a + (+x.getAttribute('colspan') || 1), 0))), cw = c.w / ncol, pad = 4;
    for (const r of rows) {
      const cells = [...r.children].map(td => { const sp = +td.getAttribute('colspan') || 1; return { td, w: cw * sp, runs: trim(inlineRuns(td, td.tagName.toLowerCase() === 'th' ? { b: true } : {})).filter(x => !x.img) }; });
      const rh = Math.max(base * 1.35, ...cells.map(k => flow(k.runs, { x: 0, w: k.w - 2 * pad, size: base }, false))) + 2 * pad; need(rh); let x = c.x; const top = y;
      for (const k of cells) { pdf.setDrawColor(170, 170, 170); pdf.rect(x, top, k.w, rh); y = top + pad; flow(k.runs, { x: x + pad, w: k.w - 2 * pad, size: base, nobreak: true }, true); x += k.w; } y = top + rh;
    }
    y += base * .7;
  }
  function block(n, tag, c) {
    if (/^h[1-6]$/.test(tag)) { const sz = base * [2, 1.6, 1.35, 1.15, 1.05, 1][+tag[1] - 1]; y += sz * .3; need(sz * 2.5); para(inlineRuns(n, { b: true }), c, { size: sz, after: sz * .45 }); }
    else if (tag === 'p' || tag === 'figcaption' || tag === 'dt' || tag === 'dd') para(inlineRuns(n, {}), c, { after: base * .6 });
    else if (tag === 'ul' || tag === 'ol') list(n, tag, c);
    else if (tag === 'pre') { const ls = n.textContent.replace(/\t/g, '    ').split('\n'); for (const ln of ls) { const lh = base * 1.25; need(lh); pdf.setFillColor(244, 244, 246); pdf.rect(c.x, y, c.w, lh, 'F'); if (NATIVE.test(ln)) { pdf.setFont('courier', 'normal'); pdf.setFontSize(base * .9); pdf.text(pdf.splitTextToSize(ln, c.w - 8)[0] || '', c.x + 4, y + base * .95); } else { const rr = raster(ln, base * .9, 0, 0, true, '#000'); pdf.addImage(rr.url, 'PNG', c.x + 4, y, Math.min(rr.w, c.w - 8), rr.h); } y += lh; } y += base * .6; }
    else if (tag === 'blockquote') { const pn = pageNo, y0 = y; renderChildren(n, { x: c.x + 16, w: c.w - 16 }); if (pn === pageNo) { pdf.setDrawColor(190, 190, 190); pdf.setLineWidth(2); pdf.line(c.x + 5, y0, c.x + 5, y - base * .4); pdf.setLineWidth(.6); } }
    else if (tag === 'hr') { need(12); y += base * .4; pdf.setDrawColor(180, 180, 180); pdf.line(c.x, y, c.x + c.w, y); y += base * .8; }
    else if (tag === 'table') table(n, c);
    else if (tag === 'section' && (n.hasAttribute('data-page') || n.hasAttribute('data-chapter'))) { if (y > M + 1) newPage(); renderChildren(n, c); }
    else renderChildren(n, c);
  }
  function renderChildren(parent, c) {
    let inl = []; const flush = () => { const r = trim(inl); inl = []; if (r.length) para(r, c); };
    for (const n of parent.childNodes) {
      if (n.nodeType === 3) { inl.push({ t: n.textContent.replace(/\s+/g, ' ') }); continue; } if (n.nodeType !== 1) continue; const tag = n.tagName.toLowerCase(); if (SKIP.has(tag)) continue;
      if (BLOCK.has(tag)) { flush(); block(n, tag, c); } else if (tag === 'img') { flush(); drawImg(n, c); } else inl.push(...inlineRuns(n, {}));
    }
    flush();
  }
  renderChildren(dom.body, { x: L0, w: W0 });
  if (o.pageNums !== false) { const N = pdf.getNumberOfPages(); for (let i = 1; i <= N; i++) { pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(130, 130, 130); pdf.text(`${i} / ${N}`, PW / 2, PH - M / 2 + 4, { align: 'center' }); } }
  return pdf.output('blob');
}
async function buildDocx(dom, o) {
  await ensure('docx'); await prepImages(dom.body);
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, PageBreak } = window.docx;
  const HL = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6], kids = []; let firstSec = true;
  const imgRun = el => { const inf = imgInfo.get(el); if (!inf) return null; const bytes = Uint8Array.from(atob(inf.url.split(',')[1]), c => c.charCodeAt(0)); let w = inf.w, hh = inf.h; if (w > 600) { hh = hh * 600 / w; w = 600; } return new ImageRun({ data: bytes, transformation: { width: Math.round(w), height: Math.round(hh) }, type: inf.fmt === 'PNG' ? 'png' : 'jpg' }); };
  const runs = (n, st = {}) => {
    const out = []; for (const c of n.childNodes) {
      if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, ' '); if (t) out.push(new TextRun({ text: t, bold: st.b, italics: st.i, underline: st.u ? {} : undefined, strike: st.s, font: st.mono ? 'Courier New' : undefined })); continue; }
      if (c.nodeType !== 1) continue; const t = c.tagName.toLowerCase(); if (SKIP.has(t)) continue;
      if (t === 'br') out.push(new TextRun({ break: 1 })); else if (t === 'img') { const r = imgRun(c); if (r) out.push(r); }
      else { const s = { ...st }; if (t === 'b' || t === 'strong') s.b = true; if (t === 'i' || t === 'em') s.i = true; if (t === 'u') s.u = true; if (t === 's' || t === 'del') s.s = true; if (['code', 'kbd', 'tt'].includes(t)) s.mono = true; out.push(...runs(c, s)); }
    } return out;
  };
  const walk = (parent, lvl) => {
    let buf = []; const flush = () => { if (buf.length) kids.push(new Paragraph({ children: buf, spacing: { after: 120 } })); buf = []; };
    for (const n of parent.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim()) buf.push(new TextRun(t)); continue; } if (n.nodeType !== 1) continue; const t = n.tagName.toLowerCase(); if (SKIP.has(t)) continue;
      if (!BLOCK.has(t)) { buf.push(...runs({ childNodes: [n] })); continue; } flush();
      if (/^h[1-6]$/.test(t)) kids.push(new Paragraph({ heading: HL[+t[1] - 1], children: runs(n), spacing: { before: 240, after: 120 } }));
      else if (t === 'p') kids.push(new Paragraph({ children: runs(n), spacing: { after: 120 } }));
      else if (t === 'ul' || t === 'ol') { let i = 1; for (const li of n.children) { const nested = [...li.children].filter(x => /^(ul|ol)$/i.test(x.tagName)); const rs = runs({ childNodes: [...li.childNodes].filter(x => !nested.includes(x)) }); if (t === 'ol') kids.push(new Paragraph({ children: [new TextRun((i++) + '. '), ...rs], indent: { left: 360 * (lvl + 1) } })); else kids.push(new Paragraph({ children: rs, bullet: { level: Math.min(lvl, 8) } })); nested.forEach(x => walk({ childNodes: [x] }, lvl + 1)); } }
      else if (t === 'pre') kids.push(new Paragraph({ children: n.textContent.split('\n').map((l, k) => new TextRun({ text: l, font: 'Courier New', break: k ? 1 : 0 })) }));
      else if (t === 'blockquote') kids.push(new Paragraph({ children: runs(n, { i: true }), indent: { left: 720 } }));
      else if (t === 'hr') kids.push(new Paragraph({ children: [new TextRun('\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014')] }));
      else if (t === 'table') { const rows = [...n.querySelectorAll('tr')].filter(r => r.closest('table') === n).map(r => new TableRow({ children: [...r.children].map(td => new TableCell({ children: [new Paragraph({ children: runs(td, td.tagName.toLowerCase() === 'th' ? { b: true } : {}) })], columnSpan: +td.getAttribute('colspan') || 1 })) })).filter(r => r); if (rows.length) { kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })); kids.push(new Paragraph('')); } }
      else if (t === 'section' && (n.hasAttribute('data-page') || n.hasAttribute('data-chapter'))) { if (!firstSec) kids.push(new Paragraph({ children: [new PageBreak()] })); firstSec = false; walk(n, lvl); }
      else walk(n, lvl);
    } flush();
  };
  walk(dom.body, 0); if (!kids.length) kids.push(new Paragraph(''));
  const letter = o.paper === 'letter', mm = Math.round((+o.dMargin || 18) * 56.7);
  return window.docx.Packer.toBlob(new Document({ creator: o.docAuthor || 'ConvertLab', title: o.docTitle || dom.title || '', sections: [{ properties: { page: { size: { width: letter ? 12240 : 11906, height: letter ? 15840 : 16838 }, margin: { top: mm, bottom: mm, left: mm, right: mm } } }, children: kids }] }));
}
async function buildEpub(dom, o) {
  await ensure('jszip'); const zip = new window.JSZip(), X = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const id = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : Date.now()), title = o.docTitle || dom.title || 'Untitled', author = o.docAuthor || 'Unknown', body = dom.body.cloneNode(true), images = []; let n = 0;
  body.querySelectorAll('img').forEach(im => { const m = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,(.+)$/i.exec(im.getAttribute('src') || ''); if (!m) { im.replaceWith(im.ownerDocument.createTextNode(im.getAttribute('alt') || '')); return; } const ext = m[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg'); const name = `images/img${++n}.${ext}`; images.push({ name, data: m[2], ext }); im.setAttribute('src', name); });
  let chapters = []; const secs = [...body.children].filter(e => e.hasAttribute('data-chapter'));
  const ser = e => new XMLSerializer().serializeToString(e);
  if (secs.length) chapters = secs.map(s => [...s.childNodes]);
  else { const hs = body.querySelectorAll(':scope > h1').length >= 2 ? 'h1' : body.querySelectorAll(':scope > h2').length >= 2 ? 'h2' : null; let flat = []; body.querySelectorAll(':scope > section[data-page]').forEach(s => flat.push(...s.childNodes)); if (!flat.length) flat = [...body.childNodes]; if (hs) { let cur = []; for (const e of flat) { if (e.nodeType === 1 && e.tagName.toLowerCase() === hs && cur.length) { chapters.push(cur); cur = []; } cur.push(e); } if (cur.length) chapters.push(cur); } else chapters = [flat]; }
  const xhtml = (t, inner) => `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><meta charset="utf-8"/><title>${X(t)}</title><style>body{font-family:serif;line-height:1.5}img{max-width:100%}</style></head><body>${inner}</body></html>`;
  const meta = []; chapters.forEach((nodes, i) => { const inner = nodes.map(e => e.nodeType === 1 ? ser(e) : e.nodeType === 3 && e.textContent.trim() ? '<p>' + X(e.textContent) + '</p>' : '').join(''); const hd = nodes.find(e => e.nodeType === 1 && /^h[1-6]$/i.test(e.tagName)); const t = hd ? hd.textContent.trim().slice(0, 80) : 'Part ' + (i + 1); zip.file(`OEBPS/c${i + 1}.xhtml`, xhtml(t, inner)); meta.push({ f: `c${i + 1}.xhtml`, t }); });
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  images.forEach(im => zip.file('OEBPS/' + im.name, im.data, { base64: true }));
  zip.file('OEBPS/nav.xhtml', xhtml('Contents', `<nav epub:type="toc"><ol>${meta.map(m => `<li><a href="${m.f}">${X(m.t)}</a></li>`).join('')}</ol></nav>`));
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${id}"/></head><docTitle><text>${X(title)}</text></docTitle><navMap>${meta.map((m, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${X(m.t)}</text></navLabel><content src="${m.f}"/></navPoint>`).join('')}</navMap></ncx>`);
  const mt = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bid">${id}</dc:identifier><dc:title>${X(title)}</dc:title><dc:creator>${X(author)}</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${meta.map((m, i) => `<item id="c${i + 1}" href="${m.f}" media-type="application/xhtml+xml"/>`).join('')}${images.map((im, i) => `<item id="i${i + 1}" href="${im.name}" media-type="${mt[im.ext]}"/>`).join('')}</manifest><spine toc="ncx">${meta.map((m, i) => `<itemref idref="c${i + 1}"/>`).join('')}</spine></package>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
}
async function eDocument(job, o, io) {
  const it = job.items[0], out = job.out; io.progress(.03, 'Reading'); const dom = await loadAsDom(it, o, io, out); io.check(); io.progress(.5, 'Building ' + out.toUpperCase());
  let blob;
  if (out === 'pdf') blob = await htmlToPdf(dom, o);
  else if (out === 'docx') blob = await buildDocx(dom, o);
  else if (out === 'epub') blob = await buildEpub(dom, o);
  else if (out === 'txt') blob = new Blob([domToText(dom.body)], { type: 'text/plain;charset=utf-8' });
  else if (out === 'md') blob = new Blob([domToMd(dom.body)], { type: 'text/markdown;charset=utf-8' });
  else blob = new Blob([`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escH(dom.title || '')}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}pre{background:#f4f4f4;padding:12px;overflow:auto}</style></head><body>\n${dom.body.innerHTML}\n</body></html>`], { type: 'text/html;charset=utf-8' });
  return [{ name: outName(it, out), blob }];
}
async function eImg2pdf(job, o, io) {
  await ensure('jspdf'); const { jsPDF } = window.jspdf, items = job.items; let pdf = null; const fit = o.pageSize === 'fit', mg = (+o.margin || 0) * 2.835;
  for (let i = 0; i < items.length; i++) {
    io.check(); io.progress(.9 * i / items.length, `Page ${i + 1}/${items.length}`);
    const dec = await decodeImage(items[i], o), oo = { ...o }; if (!oo.maxW && !oo.maxH) { oo.maxW = 4096; oo.maxH = 4096; }
    const c = processToCanvas(dec, oo, true); if (dec.src.close) dec.src.close(); const url = c.toDataURL('image/jpeg', clamp((+o.quality || 90) / 100, .1, 1)), iw = c.width, ih = c.height; let pw, ph;
    if (fit) { pw = iw * .75 + 2 * mg; ph = ih * .75 + 2 * mg; } else { const b = o.pageSize === 'letter' ? [612, 792] : [595.28, 841.89], land = o.orient === 'landscape' || (o.orient !== 'portrait' && iw > ih); pw = land ? b[1] : b[0]; ph = land ? b[0] : b[1]; }
    const ori = pw > ph ? 'l' : 'p'; if (!pdf) pdf = new jsPDF({ orientation: ori, unit: 'pt', format: [pw, ph], compress: true }); else pdf.addPage([pw, ph], ori);
    const k = Math.min((pw - 2 * mg) / iw, (ph - 2 * mg) / ih), dw = iw * k, dh = ih * k; pdf.addImage(url, 'JPEG', (pw - dw) / 2, (ph - dh) / 2, dw, dh, undefined, 'FAST');
  }
  return [{ name: items.length > 1 ? 'merged-images.pdf' : outName(items[0], 'pdf'), blob: pdf.output('blob') }];
}

/* ================= archives ================= */
const gunzip = async buf => new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
const gzip = async blob => new Blob([await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()], { type: 'application/gzip' });
function parseTar(buf) {
  const u = new Uint8Array(buf), dec = new TextDecoder(), ents = []; let p = 0, longName = null, pax = null;
  const str = (o, l) => { let e = o; while (e < o + l && u[e] !== 0) e++; return dec.decode(u.subarray(o, e)); };
  while (p + 512 <= u.length) {
    if (u.subarray(p, p + 512).every(v => v === 0)) break;
    let name = str(p, 100); const size = parseInt(str(p + 124, 12).trim() || '0', 8) || 0, type = String.fromCharCode(u[p + 156] || 48), prefix = str(p + 345, 155);
    if (prefix && str(p + 257, 5) === 'ustar') name = prefix + '/' + name; p += 512; const data = u.subarray(p, p + size); p += Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = dec.decode(data).replace(/\0+$/, ''); continue; } if (type === 'x') { const m = /\d+ path=([^\n]*)\n/.exec(dec.decode(data)); if (m) pax = m[1]; continue; } if (type === 'g') continue;
    if (longName) { name = longName; longName = null; } if (pax) { name = pax; pax = null; }
    if (type === '5') ents.push({ path: name.replace(/\/?$/, '/'), dir: true }); else if (type === '0' || type === '7') ents.push({ path: name, dir: false, get: async () => data });
  }
  return ents;
}
const oct = (n, l) => n.toString(8).padStart(l - 1, '0') + '\0';
function tarBlock(name, size, type, mtime) {
  const b = new Uint8Array(512), e = new TextEncoder(), put = (s, o) => b.set(e.encode(s), o);
  b.set(e.encode(name).subarray(0, 100), 0); put(oct(type === '5' ? 0o755 : 0o644, 8), 100); put(oct(0, 8), 108); put(oct(0, 8), 116); put(oct(size, 12), 124); put(oct(mtime, 12), 136); b.fill(32, 148, 156); b[156] = type.charCodeAt(0); put('ustar\0', 257); put('00', 263);
  let sum = 0; for (let i = 0; i < 512; i++) sum += b[i]; put(sum.toString(8).padStart(6, '0') + '\0 ', 148); return b;
}
async function eArchive(job, o, io) {
  const it = job.items[0], out = job.out, e = nx(it.ext); io.progress(.05, 'Reading archive'); const buf = await it.file.arrayBuffer(); let ents;
  if (e === 'zip') { await ensure('jszip'); const z = await window.JSZip.loadAsync(buf); ents = []; z.forEach((p, f) => ents.push(f.dir ? { path: p, dir: true } : { path: p, dir: false, get: () => f.async('uint8array') })); }
  else { const raw = e === 'tar' ? buf : await gunzip(buf); const isTar = new TextDecoder().decode(new Uint8Array(raw, 257, 5)) === 'ustar'; ents = isTar ? parseTar(raw) : [{ path: stem(it.name), dir: false, get: async () => new Uint8Array(raw) }]; }
  if (!ents.length) throw new Error('The archive is empty or unreadable');
  let blob; const base = safe(stem(it.name));
  if (out === 'zip') { await ensure('jszip'); const z = new window.JSZip(); for (let i = 0; i < ents.length; i++) { io.check(); io.progress(.1 + .8 * i / ents.length, `Packing ${i + 1}/${ents.length}`); const x = ents[i]; if (x.dir) z.folder(x.path); else z.file(x.path, await x.get(), { binary: true, createFolders: true }); } blob = await z.generateAsync({ type: 'blob', compression: +o.level ? 'DEFLATE' : 'STORE', compressionOptions: { level: +o.level || 6 } }); }
  else {
    const parts = [], enc = new TextEncoder(), mt = Math.floor(Date.now() / 1000);
    for (let i = 0; i < ents.length; i++) {
      io.check(); io.progress(.1 + .8 * i / ents.length, `Packing ${i + 1}/${ents.length}`); const x = ents[i], data = x.dir ? new Uint8Array(0) : await x.get(), nb = enc.encode(x.path);
      if (nb.length > 100) { const ld = new Uint8Array(Math.ceil((nb.length + 1) / 512) * 512); ld.set(nb); parts.push(tarBlock('././@LongLink', nb.length + 1, 'L', 0), ld); }
      parts.push(tarBlock(x.path, data.length, x.dir ? '5' : '0', mt)); if (data.length) { parts.push(data); const pad = (512 - data.length % 512) % 512; if (pad) parts.push(new Uint8Array(pad)); }
    }
    parts.push(new Uint8Array(1024)); blob = new Blob(parts, { type: 'application/x-tar' }); if (out === 'tgz') { io.progress(.92, 'Compressing'); blob = await gzip(blob); }
  }
  return [{ name: out === 'tgz' ? base + '.tar.gz' : base + '.' + out, blob, note: ents.filter(x => !x.dir).length + ' files' }];
}
const ENGINES = {
  image: eImage, img2gif: eImg2gif, img2pdf: eImg2pdf, audio: eAudio, video: eFF, anim: eFF, pdf2img: ePdf2img, document: eDocument, archive: eArchive,
  vid2gif: async (j, o, io) => { try { return await eVid2gifNative(j, o, io); } catch (e) { if (e.cancel) throw e; io.progress(.05, 'Using media engine...'); return eFF(j, o, io); } }
};
