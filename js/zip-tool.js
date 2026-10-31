/* ConvertLab - ZIP Converter (folders and many files) and the download panel */
'use strict';

/* ================= ZIP tool (folders & many files) ================= */
let dropHook = null;
async function readDirEntries(dir) { const r = dir.createReader(), all = []; for (;;) { const b = await new Promise((res, rej) => r.readEntries(res, rej)); if (!b.length) break; all.push(...b); } return all; }
async function walkEntry(en, path, out) {
  if (en.isFile) { const f = await new Promise((res, rej) => en.file(res, rej)); out.push({ file: f, path: path + en.name }); }
  else if (en.isDirectory) { const kids = await readDirEntries(en); if (!kids.length) out.push({ dir: true, path: path + en.name + '/' }); for (const k of kids) await walkEntry(k, path + en.name + '/', out); }
}
function renderZip(tool) {
  state.tool = null; let entries = [], busy = false, result = null; const o = { level: '6', keep: true, junk: true, name: 'archive' }; let nameTouched = false;
  const list = h('div', { class: 'ziplist' }), sum = h('div', { class: 'note' }), res = h('div', { id: 'results' }), prog = h('div', { class: 'pbar', hidden: true }), fill = h('i'); prog.append(fill);
  const JUNK = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX)(\/|$)/i;
  const visible = () => entries.filter(e => !(o.junk && JUNK.test(e.path)));
  function autoName() { if (nameTouched) return; const roots = new Set(entries.map(e => e.path.split('/')[0])); const hasDir = entries.some(e => e.path.includes('/')); o.name = hasDir && roots.size === 1 ? [...roots][0] : 'archive'; nameInp.value = o.name; }
  function draw() {
    const v = visible(), files = v.filter(e => !e.dir), tot = files.reduce((a, e) => a + e.file.size, 0);
    sum.textContent = v.length ? `${files.length} file${files.length === 1 ? '' : 's'} - ${fmtBytes(tot)}` : 'Nothing added yet';
    list.replaceChildren(...v.slice(0, 400).map(e => h('div', { class: 'rr' }, h('span', { title: e.path }, (e.dir ? '[folder] ' : '') + e.path + (e.dir ? '' : '  -  ' + fmtBytes(e.file.size))), h('button', { class: 'btn sm', onclick: () => { entries = entries.filter(x => x !== e); result = null; draw(); } }, '✕'))), ...(v.length > 400 ? [h('div', { class: 'note' }, `...and ${v.length - 400} more (all included)`)] : []));
    goBtn.disabled = busy || !files.length; clr.disabled = busy || !entries.length; showResult();
  }
  function showResult() {
    res.replaceChildren(); if (!result) return;
    res.append(h('div', { class: 'card pad rpanel' }, h('div', { class: 'lbl' }, h('span', null, 'Ready to download')), h('div', { class: 'rlist' }, h('div', { class: 'rr' }, h('span', null, `${result.name} - ${fmtBytes(result.blob.size)}${result.ratio}`), h('button', { class: 'btn sm pri', onclick: () => downloadBlob(result.blob, result.name) }, 'Download')))));
  }
  function add(items) { const seen = new Set(entries.map(e => e.path + (e.file ? e.file.size : ''))); for (const it of items) { const k = it.path + (it.file ? it.file.size : ''); if (!seen.has(k)) { seen.add(k); entries.push(it); } } result = null; autoName(); draw(); }
  const addFilesList = (fs, rel) => add([...fs].map(f => ({ file: f, path: rel && f.webkitRelativePath ? f.webkitRelativePath : f.name })));
  const folderInp = h('input', { type: 'file', webkitdirectory: true, multiple: true, hidden: true, onchange: e => { addFilesList(e.target.files, true); e.target.value = ''; } });
  const filesInp = h('input', { type: 'file', multiple: true, hidden: true, onchange: e => { addFilesList(e.target.files, false); e.target.value = ''; } });
  dropHook = async e => {
    const its = [...(e.dataTransfer ? e.dataTransfer.items : [])], ents = its.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean), fl = [...(e.dataTransfer ? e.dataTransfer.files : [])];
    if (!ents.length) return addFilesList(fl, false);
    try { const out = []; for (const en of ents) await walkEntry(en, '', out); add(out); } catch (err) { toast('Could not read the dropped folder: ' + err.message); }
  };
  const nameInp = h('input', { type: 'text', value: o.name, oninput: e => { o.name = e.target.value; nameTouched = true; } });
  const goBtn = h('button', { class: 'btn pri', onclick: async () => {
    const v = visible().filter(e => !e.dir || true); if (!v.some(e => !e.dir)) return; busy = true; result = null; draw(); prog.hidden = false; fill.style.width = '0%';
    try {
      await ensure('jszip'); const z = new window.JSZip(), used = new Set(); let totalIn = 0;
      for (const e of v) {
        let p = o.keep ? e.path : e.path.split('/').pop(); if (e.dir) { if (o.keep) z.folder(p); continue; }
        if (used.has(p)) { let k = 1; const m = /^(.*?)(\.[^./]*)?$/.exec(p); while (used.has(`${m[1]} (${k})${m[2] || ''}`)) k++; p = `${m[1]} (${k})${m[2] || ''}`; } used.add(p);
        z.file(p, e.file, { binary: true, date: new Date(e.file.lastModified || Date.now()) }); totalIn += e.file.size;
      }
      const lv = +o.level, blob = await z.generateAsync({ type: 'blob', compression: lv ? 'DEFLATE' : 'STORE', compressionOptions: { level: lv || 6 }, streamFiles: true }, m => { fill.style.width = Math.round(m.percent) + '%'; });
      const nm = safe(o.name.trim() || 'archive').replace(/\.zip$/i, '') + '.zip';
      result = { name: nm, blob, ratio: totalIn ? ` (${blob.size <= totalIn ? '-' : '+'}${Math.abs(Math.round((blob.size / totalIn - 1) * 100))}% vs original)` : '' }; toast('ZIP created');
    } catch (err) { toast(err.message || String(err)); }
    busy = false; prog.hidden = true; draw();
  } }, 'Create ZIP');
  const clr = h('button', { class: 'btn', onclick: () => { entries = []; result = null; draw(); } }, 'Clear');
  const drop = h('div', { class: 'drop', id: 'drop' }, folderInp, filesInp, h('b', null, 'Drop a folder or many files here'), h('small', null, 'PDF, images, text, anything. Sub-folders are kept.'), h('div', { class: 'actions', style: 'justify-content:center' }, h('button', { class: 'btn pri', onclick: () => folderInp.click() }, 'Choose folder'), h('button', { class: 'btn', onclick: () => filesInp.click() }, 'Choose files')));
  const side = h('aside', { class: 'card side' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'ZIP file name'), nameInp),
    h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Compression'), h('select', { onchange: e => { o.level = e.target.value; } }, [['0', 'Store only (fastest)'], ['1', 'Fast'], ['6', 'Normal'], ['9', 'Maximum']].map(([v, t]) => h('option', { value: v, selected: v === o.level }, t)))),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: e => { o.keep = e.target.checked; } }), 'Keep folder structure'),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: e => { o.junk = e.target.checked; draw(); } }), 'Skip junk files (.DS_Store, Thumbs.db)'),
    h('div', { class: 'note' }, 'Everything stays on your device. Large folders need enough free RAM.'));
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / Others'), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), h('div', { class: 'ws' }, h('div', null, drop, h('div', { class: 'card pad', style: 'margin-top:14px' }, sum, list), prog, res, h('div', { class: 'actions' }, goBtn, clr)), side));
  draw();
}

/* ================= download panel (converters) ================= */
function renderResults() {
  const box = $('#results'); if (!box) return;
  const done = state.items.filter(i => i.status === 'done' && i.results.length), rows = done.flatMap(it => it.results);
  if (!rows.length) { box.replaceChildren(); return; }
  box.replaceChildren(h('div', { class: 'card pad rpanel' }, h('div', { class: 'lbl' }, h('span', null, 'Ready to download'), h('span', { class: 'note', style: 'margin:0' }, rows.length + ' file' + (rows.length > 1 ? 's' : ''))),
    h('div', { class: 'rlist' }, rows.slice(0, 300).map(x => h('div', { class: 'rr' }, h('span', { title: x.name }, x.name + '  -  ' + fmtBytes(x.blob.size)), h('button', { class: 'btn sm pri', onclick: () => downloadBlob(x.blob, x.name) }, 'Download'))))));
}
