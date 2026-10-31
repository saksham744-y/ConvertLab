/* ConvertLab - App state, header/menu, router, converter page, queue and results */
'use strict';

/* ================= app state & UI ================= */
const state = { tool: null, items: [], opts: {}, outFmt: '', running: false, cancel: false, sig: '' };
let cleanup = null, pendingFiles = null, uid = 0;
const app = $('#app');
const validOuts = it => state.tool.outs.filter(o => route(it.ext, o, it.anim));
const pickOut = it => { const v = validOuts(it); return v.includes(state.outFmt) ? state.outFmt : v[0] || ''; };
const toolsOf = c => TOOLS.filter(t => t.cat === c);
function megaColumns(box, active) { box.replaceChildren(...CATS.map(c => h('div', { class: 'mcol' + (c.id === active ? ' on' : '') }, h('div', { class: 'mhead' }, ic(c.icon, 18), c.name), toolsOf(c.id).map(t => h('a', { class: 'tl', href: '#/' + t.id }, t.name))))); }
function setupHeader() {
  const cats = $('#cats'), mega = $('#mega'); let open = null;
  const close = () => { mega.hidden = true; open = null; cats.querySelectorAll('.cat').forEach(b => b.classList.remove('on')); };
  const show = id => { megaColumns($('#megaIn'), id); mega.hidden = false; open = id; cats.querySelectorAll('.cat').forEach(b => b.classList.toggle('on', b.dataset.id === id)); };
  CATS.forEach(c => cats.append(h('button', { class: 'cat', 'data-id': c.id, onclick: () => open === c.id ? close() : show(c.id), onmouseenter: () => { if (matchMedia('(hover:hover)').matches) show(c.id); } }, ic(c.icon, 18), h('span', { class: 't' }, c.name))));
  $('#top').addEventListener('mouseleave', () => { if (matchMedia('(hover:hover)').matches) close(); });
  document.addEventListener('click', e => { if (!e.target.closest('#top')) close(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); sug.hidden = true; } });
  window.addEventListener('hashchange', close);
  const q = $('#q'), sug = $('#sug');
  q.addEventListener('input', () => { const s = q.value.trim().toLowerCase(); if (!s) { sug.hidden = true; return; } const m = TOOLS.filter(t => (t.name + ' ' + t.desc + ' ' + (t.ins || []).join(' ') + ' ' + (t.outs || []).join(' ')).toLowerCase().includes(s)).slice(0, 8); sug.replaceChildren(...(m.length ? m.map(t => h('a', { href: '#/' + t.id, onclick: () => { sug.hidden = true; q.value = ''; } }, t.name)) : [h('div', { class: 'note', style: 'padding:8px' }, 'No match')])); sug.hidden = false; });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = sug.querySelector('a'); if (a) { location.hash = a.getAttribute('href'); sug.hidden = true; q.value = ''; } } });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
  const th = $('#theme'); try { const s = localStorage.getItem('oc-theme'); if (s) document.documentElement.dataset.theme = s; else if (matchMedia('(prefers-color-scheme:dark)').matches) document.documentElement.dataset.theme = 'dark'; } catch (e) { /* ignore */ }
  th.onclick = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('oc-theme', n); } catch (e) { /* ignore */ } };
}
function router() {
  if (cleanup) { cleanup(); cleanup = null; } dropHook = null; app.style.maxWidth = ''; clearQueue();
  const id = (location.hash.match(/^#\/?([\w-]+)/) || [])[1], t = TOOLS.find(x => x.id === id);
  window.scrollTo(0, 0);
  if (!t) return renderHome(); document.title = t.name + ' - ConvertLab';
  const V = { unit: renderUnit, time: renderTime, zip: renderZip, flip: x => renderEditor(x, COLOR_CFG), resize: x => renderEditor(x, RESIZE_CFG), bgrm: x => renderEditor(x, BG_CFG), crop: renderCropper, paint: renderPaint };
  if (t.view) return V[t.view](t); renderTool(t);
}
function renderHome() {
  document.title = 'ConvertLab - private file converter'; state.tool = null;
  const inp = h('input', { type: 'file', multiple: true, hidden: true, onchange: e => smartDrop([...e.target.files]) });
  const drop = h('label', { class: 'drop', tabindex: 0, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } } }, inp, h('b', null, 'Drop any file here'), h('small', null, "We'll pick the right converter for you"));
  const grid = h('div', { class: 'mgrid' }); megaColumns(grid);
  app.replaceChildren(h('section', { class: 'hero' }, h('h1', null, 'Convert anything. ', h('span', null, 'Privately.')), h('p', null, 'Video, audio, images, PDFs, documents, GIFs, archives, units and time zones. Everything runs in your browser; your files are never uploaded.'), drop),
    h('div', { class: 'card pad' }, grid),
    h('div', { class: 'feat' }, [['100% private', 'No uploads. Conversion happens on your device.'], ['Batch & ZIP', 'Queue many files and download everything as one ZIP.'], ['Advanced options', 'Trim, resize, bitrate, DPI, page ranges, vectorize and more.'], ['Free, no limits', 'No signup, no watermark, no file-size cap beyond your RAM.']].map(([a, b]) => h('div', { class: 'card' }, h('b', null, a), b))));
}
function smartDrop(files) {
  if (!files.length) return; const e = extOf(files[0].name), k = kindOf(nx(e));
  const id = { vid: 'video-converter', aud: 'audio-converter', img: e === 'gif' ? 'image-converter' : e === 'svg' ? 'svg-converter' : e === 'heic' || e === 'heif' ? 'heic-to-jpg' : 'image-converter', pdf: 'pdf-converter', doc: e === 'epub' ? 'ebook-converter' : 'document-converter', arc: 'archive-converter' }[k];
  if (!id) return toast('No converter found for .' + (e || 'unknown') + ' files'); pendingFiles = files; location.hash = '#/' + id;
}
function defaultOpts() { const o = {}; OPTS.forEach(s => { o[s.k] = s.def; }); return o; }
function optCtx() {
  const t = state.tool, items = state.items, outs = new Set(items.length ? items.map(i => i.out).filter(Boolean) : [state.outFmt]), exts = new Set(items.map(i => i.ext));
  const kinds = new Set((items.length ? items.map(i => i.kind) : t.ins.map(e => t.anim ? 'anim' : kindOf(nx(e)))).filter(Boolean)), ko = [...outs].map(kindOf);
  return { tool: t, o: state.opts, outs, exts, kinds, n: items.length, vidOut: ko.includes('vid') || (outs.has('gif') && false) || outs.has('mp4') || outs.has('webm'), audOut: ko.includes('aud'), gifOut: outs.has('gif'), rasterSvg: outs.has('svg') && (exts.size === 0 || [...exts].some(e => e !== 'svg')) };
}
function renderOptions(force) {
  const box = $('#opts'); if (!box) return; const c = optCtx(), vis = OPTS.filter(s => s.show(c)), sig = vis.map(s => s.k).join(',');
  if (!force && sig === state.sig) return; state.sig = sig;
  box.replaceChildren(...vis.map(s => {
    const v = state.opts[s.k], set = x => { state.opts[s.k] = x; if (s.k === 'pageSize' || s.k === 'svgMode') renderOptions(); };
    if (s.t === 'range') { const out = h('output', null, s.fmt ? s.fmt(v) : v); return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, s.l, out), h('input', { type: 'range', min: s.min, max: s.max, value: v, oninput: e => { set(+e.target.value); out.textContent = s.fmt ? s.fmt(+e.target.value) : e.target.value; } })); }
    if (s.t === 'select') return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, s.l), h('select', { onchange: e => set(e.target.value) }, s.o.map(([val, lab]) => h('option', { value: val, selected: String(val) === String(v) }, lab))));
    if (s.t === 'check') return h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!v, onchange: e => set(e.target.checked) }), s.l);
    if (s.t === 'color') return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, s.l), h('input', { type: 'color', value: v, oninput: e => set(e.target.value) }));
    return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, s.l), h('input', { type: s.t === 'number' ? 'number' : 'text', placeholder: s.ph || '', value: v, oninput: e => set(e.target.value) }));
  }));
}
function renderTool(tool) {
  state.tool = tool; state.opts = defaultOpts(); state.outFmt = tool.def; state.sig = ''; const cat = CATS.find(c => c.id === tool.cat);
  const inp = h('input', { type: 'file', multiple: true, hidden: true, accept: tool.ins.map(e => '.' + e).join(','), onchange: e => { addFiles([...e.target.files]); e.target.value = ''; } });
  const drop = h('label', { class: 'drop', id: 'drop', tabindex: 0, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } } }, inp, h('b', null, 'Drop files here or click to browse'), h('small', null, 'Accepted: ' + tool.ins.join(', ') + '  -  you can also paste from the clipboard'));
  const outSel = h('select', { id: 'outSel', onchange: e => { state.outFmt = e.target.value; state.items.forEach(it => { if (it.status !== 'working' && !it.userOut) { const n = pickOut(it); if (n !== it.out) { it.out = n; resetItem(it); } } }); renderOptions(); refreshUI(); } }, tool.outs.map(o => h('option', { value: o, selected: o === tool.def }, o.toUpperCase())));
  const side = h('aside', { class: 'card side' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Convert to'), outSel), h('div', { id: 'opts' }),
    h('div', { class: 'note' }, 'Runs entirely in your browser. Video/audio use a WebAssembly engine (about 30 MB, downloaded once). Libraries load from a CDN on first use.'),
    h('div', { class: 'chips' }, toolsOf(tool.cat).filter(t => t.id !== tool.id).slice(0, 8).map(t => h('a', { class: 'chip', href: '#/' + t.id }, t.name))));
  const bar = h('div', { class: 'actions' }, h('button', { class: 'btn pri', id: 'goBtn', onclick: runAll }, 'Convert'), h('button', { class: 'btn', id: 'stopBtn', hidden: true, onclick: stopAll }, 'Cancel'), h('button', { class: 'btn', id: 'zipBtn', onclick: downloadAll }, 'Download all'), h('button', { class: 'btn', id: 'clrBtn', onclick: () => { clearQueue(); refreshUI(); } }, 'Clear'), h('span', { class: 'note', id: 'summ' }));
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / ', cat.name), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), h('div', { class: 'ws' }, h('div', null, drop, h('div', { id: 'queue', style: 'margin-top:14px' }), h('div', { id: 'results' }), bar), side));
  renderOptions(true); refreshUI(); if (pendingFiles) { const f = pendingFiles; pendingFiles = null; addFiles(f); }
}
function addFiles(files) {
  const t = state.tool; if (!t || !t.ins) return;
  for (const f of files) {
    let ext = extOf(f.name); if (!ext && f.type) ext = (f.type.split('/')[1] || '').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    if (!t.ins.includes(ext)) { toast(`Skipped ${f.name}: .${ext || '?'} is not supported by ${t.name}`); continue; }
    if (state.items.some(i => i.file.name === f.name && i.file.size === f.size && i.file.lastModified === f.lastModified)) continue;
    const it = { id: ++uid, file: f, name: f.name, ext, anim: !!t.anim, kind: t.anim ? 'anim' : kindOf(nx(ext)), status: 'queued', progress: 0, results: [], userOut: false };
    it.out = pickOut(it); if (!it.out) { it.status = 'error'; it.error = 'No conversion available for .' + ext; }
    state.items.push(it); buildItemEl(it); $('#queue').append(it.el);
  }
  renderOptions(); refreshUI();
}
function extBadge(e) { return h('span', null, e); }
function buildItemEl(it) {
  const thumb = h('div', { class: 'thumb' }); if (it.kind === 'img' && !['heic', 'heif', 'ico'].includes(it.ext)) { const im = h('img', { alt: '' }); it.thumb = URL.createObjectURL(it.file); im.src = it.thumb; im.onerror = () => thumb.replaceChildren(extBadge(it.ext)); thumb.append(im); } else thumb.append(extBadge(it.ext));
  const r = it.refs = { name: h('div', { class: 'nm', title: it.name }, it.name), st: h('span', { class: 'st' }), fill: h('i'), bar: h('div', { class: 'pbar', hidden: true }), res: h('div', { class: 'res' }), out: h('select', { onchange: e => { it.out = e.target.value; it.userOut = true; resetItem(it); renderOptions(); refreshUI(); } }) };
  r.bar.append(r.fill);
  it.el = h('div', { class: 'card item' }, thumb, h('div', { style: 'min-width:0' }, r.name, h('div', { class: 'meta' }, fmtBytes(it.file.size), h('span', null, '->'), r.out, r.st), r.bar), h('div', null, h('button', { class: 'btn sm', title: 'Remove', onclick: () => removeItem(it) }, '\u2715')), r.res);
  updateItem(it);
}
function updateItem(it) {
  const r = it.refs, v = validOuts(it); r.out.replaceChildren(...v.map(o => h('option', { value: o, selected: o === it.out }, o.toUpperCase()))); r.out.disabled = it.status === 'working';
  const txt = { queued: 'Ready', working: it.msg || 'Working...', done: it.note || 'Done', error: it.error || 'Failed', merged: it.note || 'Merged' }[it.status]; r.st.className = 'st ' + it.status; r.st.textContent = txt; r.st.title = txt;
  r.bar.hidden = it.status !== 'working'; r.fill.style.width = Math.round((it.progress || 0) * 100) + '%'; r.res.replaceChildren();
  if (it.status === 'error' && it.out) r.res.append(h('div', null, h('button', { class: 'btn sm', onclick: () => { it.status = 'queued'; it.error = ''; updateItem(it); refreshUI(); } }, 'Retry')));
  if (it.status === 'done') {
    const rs = it.results;
    if (rs.length === 1) { const x = rs[0], t = x.blob.type; if (t.startsWith('image/') && x.blob.size < 25e6) r.res.append(h('img', { class: 'pv', src: x.url, alt: '' })); else if (t.startsWith('audio/')) r.res.append(h('audio', { controls: true, src: x.url })); else if (t.startsWith('video/')) r.res.append(h('video', { controls: true, src: x.url })); }
    r.res.append(h('div', null, h('button', { class: 'btn sm', onclick: () => { resetItem(it); refreshUI(); } }, 'Convert again')));
  }
}
function resetItem(it) { it.results.forEach(x => URL.revokeObjectURL(x.url)); it.results = []; if (it.status !== 'working') { it.status = 'queued'; it.error = ''; } updateItem(it); }
function removeItem(it) { if (it.status === 'working') return; resetItem(it); if (it.thumb) URL.revokeObjectURL(it.thumb); it.el.remove(); state.items = state.items.filter(x => x !== it); renderOptions(); refreshUI(); }
function clearQueue() { if (state.running) return; state.items.forEach(it => { it.results.forEach(x => URL.revokeObjectURL(x.url)); if (it.thumb) URL.revokeObjectURL(it.thumb); }); state.items = []; const q = $('#queue'); if (q) q.replaceChildren(); }
function refreshUI() {
  const g = $('#goBtn'); if (!g) return; renderResults(); const todo = state.items.filter(i => i.status === 'queued' && i.out).length, done = state.items.filter(i => i.status === 'done').length;
  g.disabled = state.running || !todo; g.textContent = todo > 1 ? `Convert ${todo} files` : 'Convert'; $('#stopBtn').hidden = !state.running; $('#zipBtn').disabled = !done || state.running; $('#clrBtn').disabled = !state.items.length || state.running;
  $('#summ').textContent = state.items.length ? `${state.items.length} file${state.items.length > 1 ? 's' : ''} - ${done} done` : '';
}
function setProgress(it, f, msg) { it.progress = clamp(f, 0, 1); it.msg = msg ? msg + (f > .02 && f < 1 ? ' ' + Math.round(f * 100) + '%' : '') : it.msg; const r = it.refs; if (r) { r.fill.style.width = Math.round(it.progress * 100) + '%'; r.st.textContent = it.msg || 'Working...'; r.st.title = it.msg || ''; } }
async function runAll() {
  if (state.running) return; const todo = state.items.filter(i => i.status === 'queued' && i.out); if (!todo.length) return;
  state.running = true; state.cancel = false; const o = { ...state.opts }, jobs = [], merged = {};
  for (const it of todo) { const r = route(it.ext, it.out, it.anim); if (!r) { it.status = 'error'; it.error = `Cannot convert .${it.ext} to .${it.out}`; updateItem(it); continue; } if (o.merge && (r === 'img2pdf' || r === 'img2gif')) { const k = r + it.out; if (!merged[k]) { merged[k] = { route: r, out: it.out, items: [] }; jobs.push(merged[k]); } merged[k].items.push(it); } else jobs.push({ route: r, out: it.out, items: [it] }); }
  refreshUI(); let ok = 0;
  for (const job of jobs) {
    if (state.cancel) break; const p = job.items[0], t0 = performance.now(); job.items.forEach((x, i) => { x.status = i ? 'merged' : 'working'; x.progress = 0; x.note = i ? 'Merged into ' + p.name : ''; updateItem(x); });
    const io = { progress: (f, m) => setProgress(p, f, m), check: () => { if (state.cancel) throw cancelErr(); } };
    try {
      const res = await ENGINES[job.route](job, o, io); res.forEach(r => { r.url = URL.createObjectURL(r.blob); }); p.results = res; p.status = 'done';
      const total = res.reduce((a, r) => a + r.blob.size, 0), inSz = job.items.reduce((a, x) => a + x.file.size, 0);
      p.note = `Done in ${((performance.now() - t0) / 1000).toFixed(1)}s - ${fmtBytes(total)}` + (res.length === 1 && inSz ? ` (${total <= inSz ? '-' : '+'}${Math.abs(Math.round((total / inSz - 1) * 100))}%)` : ` - ${res.length} files`) + (res[0].note ? ' - ' + res[0].note : ''); ok++;
    } catch (e) { job.items.forEach(x => { x.status = 'error'; x.error = e.cancel ? 'Cancelled' : (e.message || String(e)); }); if (!e.cancel) console.error(e); }
    job.items.forEach(updateItem);
  }
  state.items.filter(i => i.status === 'queued' || i.status === 'working').forEach(i => { if (i.status === 'working') { i.status = 'error'; i.error = 'Cancelled'; } updateItem(i); });
  state.running = false; refreshUI(); if (ok) toast(`Converted ${ok} job${ok > 1 ? 's' : ''}`);
}
function stopAll() { state.cancel = true; if (FF.inst) { try { FF.inst.terminate(); } catch (e) { /* ignore */ } FF.inst = null; } }
async function zipDownload(rs, name) { await ensure('jszip'); const z = new window.JSZip(), seen = new Set(); rs.forEach(r => { let n = r.name, k = 1; while (seen.has(n)) n = r.name.replace(/(\.[^.]*)?$/, ` (${++k})$1`); seen.add(n); z.file(n, r.blob); }); downloadBlob(await z.generateAsync({ type: 'blob', compression: 'STORE' }), name); }
async function downloadAll() { const rs = state.items.flatMap(i => i.status === 'done' ? i.results : []); if (!rs.length) return; if (rs.length === 1) return downloadBlob(rs[0].blob, rs[0].name); try { await zipDownload(rs, 'convertlab-' + new Date().toISOString().slice(0, 10) + '.zip'); } catch (e) { toast(e.message); } }
