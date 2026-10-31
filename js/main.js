/* ConvertLab - Startup: drag and drop, paste, header and router init */
'use strict';

/* ================= init ================= */
document.addEventListener('dragover', e => { e.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); });
document.addEventListener('dragleave', e => { if (!e.relatedTarget) { const d = $('#drop'); if (d) d.classList.remove('over'); } });
document.addEventListener('drop', e => { e.preventDefault(); const d = $('#drop'); if (d) d.classList.remove('over'); if (dropHook) { dropHook(e); return; } const f = [...(e.dataTransfer ? e.dataTransfer.files : [])]; if (!f.length) return; if (state.tool) addFiles(f); else if (!location.hash.match(/unit|time/)) smartDrop(f); });
document.addEventListener('paste', e => { const f = [...(e.clipboardData ? e.clipboardData.files : [])]; if (f.length && state.tool) addFiles(f); });
setupHeader(); window.addEventListener('hashchange', router); router();
