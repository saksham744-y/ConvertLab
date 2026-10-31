/* ConvertLab - Helpers: DOM builder (h), formatting, download, toast */
'use strict';

/* ================= utils ================= */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (['value', 'checked', 'disabled', 'selected', 'hidden'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tick = () => new Promise(r => setTimeout(r, 0));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtBytes = n => { const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 2 : 1) : n) + ' ' + u[i]; };
const extOf = n => { n = n.toLowerCase(); if (n.endsWith('.tar.gz')) return 'tgz'; const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1) : ''; };
const stem = n => { n = n.replace(/\.tar\.gz$/i, ''); const i = n.lastIndexOf('.'); return i > 0 ? n.slice(0, i) : n; };
const safe = s => s.replace(/[\\/:*?"<>|]+/g, '_');
const nx = e => ({ jpeg: 'jpg', jpe: 'jpg', jfif: 'jpg', aif: 'aiff', htm: 'html', markdown: 'md', oga: 'ogg', qt: 'mov' })[e] || e;
const parseTime = s => { if (s == null || s === '') return 0; s = String(s).trim(); if (!s) return 0; const p = s.split(':').map(Number); if (p.some(isNaN)) return 0; return p.reduce((a, b) => a * 60 + b, 0); };
const outName = (it, ext, suf = '') => safe(stem(it.name)) + suf + '.' + ext;
const cancelErr = () => Object.assign(new Error('Cancelled'), { cancel: true });
function downloadBlob(b, name) { const a = h('a', { href: URL.createObjectURL(b), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function toast(msg) { const t = h('div', { class: 'toast' }, msg); $('#toasts').append(t); setTimeout(() => t.remove(), 5000); }
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp', gif: 'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain', md: 'text/markdown', html: 'text/html', epub: 'application/epub+zip', mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', avi: 'video/x-msvideo', flv: 'video/x-flv', wmv: 'video/x-ms-wmv', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', aiff: 'audio/aiff', wma: 'audio/x-ms-wma', apng: 'image/apng', zip: 'application/zip', tar: 'application/x-tar', tgz: 'application/gzip' };
