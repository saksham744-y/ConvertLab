/* ConvertLab - Inline SVG icon set used by the menu */
'use strict';

const IC = {
  video: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  gif: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8.5 10.5H7v3h1.5v-1.2M11.5 10v4M14.5 14v-4h2"/>',
  tools: '<path d="M14.5 6.5l3 3L7 20H4v-3z"/><path d="M13 8l3 3M17 3l4 4-2 2-4-4z"/>',
  more: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>'
};
const ic = (n, s = 20) => { const e = document.createElement('span'); e.className = 'ic'; e.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`; return e; };
