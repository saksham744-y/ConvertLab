/* ConvertLab - Lazy CDN library loader (JSZip, jsPDF, pdf.js, mammoth, docx, lamejs, heic2any, ffmpeg.wasm) */
'use strict';

/* ================= lazy libs ================= */
const LIBS = {
  jszip: { u: ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'], t: () => window.JSZip },
  jspdf: { u: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'], t: () => window.jspdf && window.jspdf.jsPDF },
  pdfjs: { u: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'], t: () => window.pdfjsLib, after: u => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = u.replace('pdf.min.js', 'pdf.worker.min.js'); } },
  mammoth: { u: ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'], t: () => window.mammoth },
  docx: { u: ['https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js', 'https://unpkg.com/docx@8.5.0/build/index.js'], t: () => window.docx },
  lamejs: { u: ['https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js', 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js'], t: () => window.lamejs },
  heic: { u: ['https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js', 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js'], t: () => window.heic2any },
  ffmpeg: { u: ['https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js', 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js'], t: () => window.FFmpegWASM && window.FFmpegWASM.FFmpeg }
};
const libState = {};
const loadScript = (url, ms = 30000) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.async = true; const to = setTimeout(() => { s.remove(); rej(new Error('timeout')); }, ms); s.onload = () => { clearTimeout(to); res(); }; s.onerror = () => { clearTimeout(to); s.remove(); rej(new Error('load')); }; document.head.appendChild(s); });
async function ensure(name) {
  const L = LIBS[name]; if (L.t()) return libState[name] || '';
  if (!libState['p_' + name]) libState['p_' + name] = (async () => {
    for (const u of L.u) { try { await loadScript(u); if (L.t()) { libState[name] = u; L.after && L.after(u); return u; } } catch (e) { /* next */ } }
    throw Object.assign(new Error(`Couldn't load the "${name}" component. It is downloaded once from a CDN, so check your internet connection and try again.`), { engine: true });
  })().catch(e => { delete libState['p_' + name]; throw e; });
  return libState['p_' + name];
}
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not encode the image (too large?)')), type, q));
const loadImgEl = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not decode image')); i.src = src; });
