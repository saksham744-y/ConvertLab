/* ConvertLab - Formats, tool catalogue, routing rules and option definitions */
'use strict';

/* ================= formats & tools ================= */
const VID = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpg', 'mpeg', '3gp', 'ogv', 'ts'];
const AUD = ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac', 'wma', 'aiff', 'amr', 'weba', 'mka'];
const IMGS = ['jpg', 'png', 'webp', 'gif', 'bmp', 'avif', 'ico', 'svg', 'heic', 'heif'];
const DOCS = ['docx', 'txt', 'md', 'html', 'rtf', 'epub'];
const ARCS = ['zip', 'tar', 'tgz', 'gz'];
const kindOf = e => VID.includes(e) ? 'vid' : AUD.includes(e) ? 'aud' : IMGS.includes(e) ? 'img' : e === 'pdf' ? 'pdf' : DOCS.includes(e) ? 'doc' : ARCS.includes(e) ? 'arc' : e === 'apng' ? 'anim' : '';
const CATS = [{ id: 'media', name: 'Video & Audio', icon: 'video' }, { id: 'image', name: 'Image', icon: 'image' }, { id: 'docs', name: 'PDF & Documents', icon: 'doc' }, { id: 'gif', name: 'GIF', icon: 'gif' }, { id: 'other', name: 'Others', icon: 'more' }, { id: 'util', name: 'Utility', icon: 'tools' }];
const rawVid = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpg', 'mpeg', 'm4v', '3gp', 'ogv', 'ts'];
const rawAud = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'wma', 'aiff', 'aif', 'amr', 'weba', 'mka'];
const rawImg = ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'avif', 'ico', 'svg', 'heic', 'heif'];
const aOut = ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac', 'aiff', 'wma'];
const aOut2 = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];
const vOut = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'wmv', 'gif', 'mp3', 'wav', 'ogg', 'm4a', 'flac'];
const iOut = ['png', 'jpg', 'webp', 'bmp', 'ico', 'svg', 'gif', 'pdf'];
const T = (id, cat, name, desc, o) => ({ id, cat, name, desc, ...o });
const TOOLS = [
  T('video-converter', 'media', 'Video Converter', 'Convert between MP4, MOV, AVI, MKV, WEBM and more, or extract the audio.', { ins: rawVid, outs: vOut, def: 'mp4' }),
  T('audio-converter', 'media', 'Audio Converter', 'Convert MP3, WAV, OGG, M4A, FLAC, AAC, OPUS and more.', { ins: rawAud, outs: aOut, def: 'mp3' }),
  T('mp3-converter', 'media', 'MP3 Converter', 'Turn any audio or video into MP3, or convert MP3 to other formats.', { ins: [...rawAud, ...rawVid], outs: ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac'], def: 'mp3' }),
  T('mp4-to-mp3', 'media', 'MP4 to MP3', 'Extract the audio track from MP4 videos.', { ins: ['mp4', 'm4v'], outs: aOut2, def: 'mp3' }),
  T('video-to-mp3', 'media', 'Video to MP3', 'Extract audio from any video file.', { ins: rawVid, outs: aOut2, def: 'mp3' }),
  T('mp4-converter', 'media', 'MP4 Converter', 'Convert any video to MP4 (H.264/AAC), or MP4 to other formats.', { ins: rawVid, outs: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'gif', 'mp3'], def: 'mp4' }),
  T('mov-to-mp4', 'media', 'MOV to MP4', 'Convert QuickTime MOV videos to widely compatible MP4.', { ins: ['mov'], outs: ['mp4', 'webm', 'gif', 'mp3'], def: 'mp4' }),
  T('mp3-to-ogg', 'media', 'MP3 to OGG', 'Convert MP3 audio to OGG Vorbis.', { ins: ['mp3'], outs: ['ogg', 'opus', 'wav', 'flac', 'm4a', 'aac'], def: 'ogg' }),
  T('image-converter', 'image', 'Image Converter', 'Convert JPG, PNG, WEBP, HEIC, SVG, BMP, ICO, GIF and more. Resize, rotate and more.', { ins: rawImg, outs: iOut, def: 'png' }),
  T('webp-to-png', 'image', 'WEBP to PNG', 'Convert WEBP images to lossless PNG.', { ins: ['webp'], outs: ['png', 'jpg', 'bmp', 'gif', 'pdf'], def: 'png' }),
  T('jfif-to-png', 'image', 'JFIF to PNG', 'Convert JFIF/JPEG images to PNG.', { ins: ['jfif', 'jpg', 'jpeg'], outs: ['png', 'webp', 'bmp', 'pdf'], def: 'png' }),
  T('png-to-svg', 'image', 'PNG to SVG', 'Wrap or vectorize raster images as SVG (best for logos and icons).', { ins: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'], outs: ['svg'], def: 'svg' }),
  T('heic-to-jpg', 'image', 'HEIC to JPG', 'Convert iPhone HEIC/HEIF photos to JPG.', { ins: ['heic', 'heif'], outs: ['jpg', 'png', 'webp', 'pdf'], def: 'jpg' }),
  T('heic-to-png', 'image', 'HEIC to PNG', 'Convert iPhone HEIC/HEIF photos to PNG.', { ins: ['heic', 'heif'], outs: ['png', 'jpg', 'webp', 'pdf'], def: 'png' }),
  T('webp-to-jpg', 'image', 'WEBP to JPG', 'Convert WEBP images to JPG.', { ins: ['webp'], outs: ['jpg', 'png', 'bmp', 'pdf'], def: 'jpg' }),
  T('svg-converter', 'image', 'SVG Converter', 'Rasterize SVG to PNG, JPG, WEBP, ICO or PDF at any scale.', { ins: ['svg'], outs: ['png', 'jpg', 'webp', 'bmp', 'ico', 'gif', 'pdf'], def: 'png' }),
  T('pdf-converter', 'docs', 'PDF Converter', 'Convert PDFs to Word, text, HTML, EPUB or images, and documents or images to PDF.', { ins: ['pdf', 'docx', 'txt', 'md', 'html', 'rtf', 'epub', ...rawImg.filter(e => e !== 'svg')], outs: ['pdf', 'docx', 'txt', 'html', 'epub', 'jpg', 'png', 'webp'], def: 'pdf' }),
  T('document-converter', 'docs', 'Document Converter', 'Convert DOCX, TXT, Markdown, HTML, RTF, EPUB and PDF between each other.', { ins: ['docx', 'txt', 'md', 'html', 'rtf', 'epub', 'pdf'], outs: ['pdf', 'docx', 'txt', 'html', 'md', 'epub'], def: 'pdf' }),
  T('ebook-converter', 'docs', 'Ebook Converter', 'Convert to and from EPUB. (MOBI/AZW3 are not supported in-browser.)', { ins: ['epub', 'txt', 'html', 'md', 'docx', 'pdf', 'rtf'], outs: ['epub', 'pdf', 'txt', 'html', 'docx'], def: 'epub' }),
  T('pdf-to-word', 'docs', 'PDF to Word', 'Turn PDF text into an editable DOCX (or keep pages as images).', { ins: ['pdf'], outs: ['docx', 'txt', 'html'], def: 'docx' }),
  T('pdf-to-jpg', 'docs', 'PDF to JPG', 'Render PDF pages as JPG, PNG or WEBP images.', { ins: ['pdf'], outs: ['jpg', 'png', 'webp'], def: 'jpg' }),
  T('pdf-to-epub', 'docs', 'PDF to EPUB', 'Convert PDF text into a reflowable EPUB ebook.', { ins: ['pdf'], outs: ['epub'], def: 'epub' }),
  T('epub-to-pdf', 'docs', 'EPUB to PDF', 'Convert EPUB ebooks to PDF.', { ins: ['epub'], outs: ['pdf'], def: 'pdf' }),
  T('heic-to-pdf', 'docs', 'HEIC to PDF', 'Convert HEIC photos into a PDF.', { ins: ['heic', 'heif'], outs: ['pdf'], def: 'pdf' }),
  T('docx-to-pdf', 'docs', 'DOCX to PDF', 'Convert Word documents to PDF.', { ins: ['docx'], outs: ['pdf'], def: 'pdf' }),
  T('jpg-to-pdf', 'docs', 'JPG to PDF', 'Combine JPG, PNG or WEBP images into a PDF.', { ins: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'heic', 'bmp'], outs: ['pdf'], def: 'pdf' }),
  T('video-to-gif', 'gif', 'Video to GIF', 'Make animated GIFs from any video.', { ins: rawVid, outs: ['gif'], def: 'gif' }),
  T('mp4-to-gif', 'gif', 'MP4 to GIF', 'Convert MP4 videos to animated GIF.', { ins: ['mp4', 'm4v'], outs: ['gif'], def: 'gif' }),
  T('webm-to-gif', 'gif', 'WEBM to GIF', 'Convert WEBM videos to animated GIF.', { ins: ['webm'], outs: ['gif'], def: 'gif' }),
  T('apng-to-gif', 'gif', 'APNG to GIF', 'Convert animated PNG to GIF.', { ins: ['apng', 'png'], outs: ['gif'], def: 'gif', anim: true }),
  T('gif-to-mp4', 'gif', 'GIF to MP4', 'Convert GIFs to small MP4/WEBM videos.', { ins: ['gif'], outs: ['mp4', 'webm'], def: 'mp4', anim: true }),
  T('gif-to-apng', 'gif', 'GIF to APNG', 'Convert GIF to animated PNG.', { ins: ['gif'], outs: ['apng'], def: 'apng', anim: true }),
  T('image-to-gif', 'gif', 'Image to GIF', 'Turn one or many images into a GIF slideshow.', { ins: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'heic', 'svg'], outs: ['gif'], def: 'gif' }),
  T('mov-to-gif', 'gif', 'MOV to GIF', 'Convert MOV videos to animated GIF.', { ins: ['mov'], outs: ['gif'], def: 'gif' }),
  T('avi-to-gif', 'gif', 'AVI to GIF', 'Convert AVI videos to animated GIF.', { ins: ['avi'], outs: ['gif'], def: 'gif' }),
  T('unit-converter', 'other', 'Unit Converter', 'Length, mass, temperature, volume, area, speed, data, energy and more.', { view: 'unit' }),
  T('time-converter', 'other', 'Time Converter', 'Time zones, Unix timestamps and durations.', { view: 'time' }),
  T('ico-converter', 'image', 'ICO Converter', 'Convert ICO icons to PNG, JPG, WEBP, BMP and more, or turn any image into an ICO (16-256 px, multi-size).', { ins: ['ico', 'jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg', 'heic', 'heif'], outs: ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'pdf', 'ico'], def: 'png' }),
  T('png-to-ico', 'image', 'PNG to ICO', 'Make Windows/web favicons (.ico) from PNG, JPG, WEBP and other images.', { ins: ['png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif', 'bmp', 'avif', 'svg', 'heic', 'heif'], outs: ['ico'], def: 'ico' }),
  T('ico-to-png', 'image', 'ICO to PNG', 'Extract PNG, JPG or WEBP images from ICO icon files (largest size or every size).', { ins: ['ico'], outs: ['png', 'jpg', 'webp', 'bmp'], def: 'png' }),
  T('zip-converter', 'other', 'ZIP Converter', 'Pick a folder or many files (PDF, images, text...) and compress them into one ZIP.', { view: 'zip' }),
  T('color-flipper', 'util', 'Color Flipper', 'Invert, swap channels, shift hue, replace colors, flip and rotate images.', { view: 'flip' }),
  T('image-cropper', 'util', 'Image Cropper', 'Crop with a drag box, aspect ratios, circle crop and exact pixel values.', { view: 'crop' }),
  T('image-resizer', 'util', 'Image Resizer', 'Resize by pixels, percent or longest side with high quality scaling.', { view: 'resize' }),
  T('bg-remover', 'util', 'Transparent Background', 'Remove a background color and save a transparent PNG, WEBP, GIF or ICO.', { view: 'bgrm' }),
  T('paint-studio', 'util', 'Paint Studio', 'Draw on a transparent canvas: freehand, shapes, fill, text, selections, import images and export to PNG, JPG, ICO and more.', { view: 'paint' }),
  T('archive-converter', 'other', 'Archive Converter', 'Convert between ZIP, TAR and TAR.GZ.', { ins: ['zip', 'tar', 'tgz', 'gz'], outs: ['zip', 'tar', 'tgz'], def: 'zip' })
];
function route(i, o, anim) {
  i = nx(i); o = nx(o);
  const ik = anim ? 'anim' : kindOf(i), ok = kindOf(o);
  if (ik === 'arc') return ['zip', 'tar', 'tgz'].includes(o) && i !== o ? 'archive' : null;
  if (ik === 'anim') return ['mp4', 'webm', 'gif', 'apng'].includes(o) && o !== i ? 'anim' : null;
  if (ik === 'img') {
    if (o === 'pdf') return 'img2pdf';
    if (o === 'gif') return i === 'gif' ? null : 'img2gif';
    return ['png', 'jpg', 'webp', 'bmp', 'ico', 'svg'].includes(o) ? 'image' : null;
  }
  if (ik === 'vid') return o === 'gif' ? 'vid2gif' : ok === 'vid' ? 'video' : ok === 'aud' ? 'audio' : null;
  if (ik === 'aud') return ok === 'aud' ? 'audio' : null;
  if (ik === 'pdf') return ['jpg', 'png', 'webp'].includes(o) ? 'pdf2img' : ['docx', 'txt', 'html', 'epub', 'md'].includes(o) ? 'document' : null;
  if (ik === 'doc') return ['pdf', 'docx', 'txt', 'html', 'epub', 'md'].includes(o) && i !== o ? 'document' : null;
  return null;
}

/* ================= options ================= */
const Q = c => c.outs.has('jpg') || c.outs.has('webp') || (c.outs.has('pdf') && c.kinds.has('img'));
const sel = (...a) => a.map(x => [x, x]);
const OPTS = [
  { k: 'quality', l: 'Quality', t: 'range', min: 1, max: 100, def: 90, fmt: v => v + '%', show: Q },
  { k: 'maxW', l: 'Max width (px)', t: 'number', ph: 'Original', def: '', show: c => c.kinds.has('img') },
  { k: 'maxH', l: 'Max height (px)', t: 'number', ph: 'Original', def: '', show: c => c.kinds.has('img') },
  { k: 'rotate', l: 'Rotate', t: 'select', def: '0', o: [['0', 'None'], ['90', '90° clockwise'], ['180', '180°'], ['270', '90° counter-clockwise']], show: c => c.kinds.has('img') },
  { k: 'flip', l: 'Flip', t: 'select', def: '', o: [['', 'None'], ['h', 'Horizontal'], ['v', 'Vertical']], show: c => c.kinds.has('img') },
  { k: 'gray', l: 'Grayscale', t: 'check', def: false, show: c => c.kinds.has('img') },
  { k: 'bg', l: 'Background (no-transparency formats)', t: 'color', def: '#ffffff', show: c => c.kinds.has('img') && (c.outs.has('jpg') || c.outs.has('bmp') || c.outs.has('pdf')) },
  { k: 'icoSize', l: 'Icon size', t: 'select', def: '256', o: [['16', '16'], ['32', '32'], ['48', '48'], ['64', '64'], ['128', '128'], ['256', '256'], ['all', 'All sizes']], show: c => c.outs.has('ico') },
  { k: 'svgScale', l: 'SVG render scale', t: 'select', def: '2', o: [['1', '1x'], ['2', '2x'], ['3', '3x'], ['4', '4x']], show: c => c.exts.has('svg') || c.tool.id === 'svg-converter' },
  { k: 'svgMode', l: 'SVG mode', t: 'select', def: 'trace', o: [['trace', 'Vectorize (posterized shapes)'], ['embed', 'Embed raster inside SVG']], show: c => c.rasterSvg },
  { k: 'svgColors', l: 'Colors', t: 'range', min: 2, max: 64, def: 16, show: c => c.rasterSvg && c.o.svgMode !== 'embed' },
  { k: 'svgSize', l: 'Trace resolution (longest side px)', t: 'number', def: '320', show: c => c.rasterSvg && c.o.svgMode !== 'embed' },
  { k: 'merge', l: 'Combine all images into one file', t: 'check', def: true, show: c => c.n > 1 && c.kinds.has('img') && (c.outs.has('pdf') || c.outs.has('gif')) },
  { k: 'pageSize', l: 'Page size', t: 'select', def: 'a4', o: [['a4', 'A4'], ['letter', 'Letter'], ['fit', 'Fit to image']], show: c => c.kinds.has('img') && c.outs.has('pdf') },
  { k: 'orient', l: 'Orientation', t: 'select', def: 'auto', o: [['auto', 'Auto'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], show: c => c.kinds.has('img') && c.outs.has('pdf') && c.o.pageSize !== 'fit' },
  { k: 'margin', l: 'Margin (mm)', t: 'number', def: '10', show: c => c.kinds.has('img') && c.outs.has('pdf') },
  { k: 'delay', l: 'Frame delay (ms)', t: 'number', def: '500', show: c => c.kinds.has('img') && c.outs.has('gif') },
  { k: 'dpi', l: 'Render resolution', t: 'select', def: '150', o: [['72', '72 dpi'], ['96', '96 dpi'], ['150', '150 dpi'], ['200', '200 dpi'], ['300', '300 dpi']], show: c => c.kinds.has('pdf') && (c.outs.has('jpg') || c.outs.has('png') || c.outs.has('webp')) },
  { k: 'pages', l: 'Pages', t: 'text', ph: 'All (e.g. 1-3,5)', def: '', show: c => c.kinds.has('pdf') },
  { k: 'docxMode', l: 'PDF to Word mode', t: 'select', def: 'text', o: [['text', 'Editable text'], ['pages', 'Page images']], show: c => c.kinds.has('pdf') && c.outs.has('docx') },
  { k: 'paper', l: 'Paper size', t: 'select', def: 'a4', o: [['a4', 'A4'], ['letter', 'Letter']], show: c => c.outs.has('pdf') && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'font', l: 'PDF font', t: 'select', def: 'helvetica', o: [['helvetica', 'Sans-serif'], ['times', 'Serif'], ['courier', 'Monospace']], show: c => c.outs.has('pdf') && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'fontSize', l: 'Font size (pt)', t: 'number', def: '11', show: c => c.outs.has('pdf') && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'dMargin', l: 'Margin (mm)', t: 'number', def: '18', show: c => c.outs.has('pdf') && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'docTitle', l: 'Title (optional)', t: 'text', def: '', show: c => (c.outs.has('epub') || c.outs.has('docx') || c.outs.has('pdf')) && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'docAuthor', l: 'Author (optional)', t: 'text', def: '', show: c => (c.outs.has('epub') || c.outs.has('docx') || c.outs.has('pdf')) && (c.kinds.has('doc') || c.kinds.has('pdf')) },
  { k: 'start', l: 'Trim: start (sec or mm:ss)', t: 'text', ph: '0', def: '', show: c => (c.kinds.has('vid') || c.kinds.has('aud')) },
  { k: 'dur', l: 'Trim: length (sec or mm:ss)', t: 'text', ph: 'Full', def: '', show: c => (c.kinds.has('vid') || c.kinds.has('aud')) },
  { k: 'res', l: 'Resolution (max height)', t: 'select', def: '0', o: [['0', 'Original'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p'], ['240', '240p']], show: c => c.vidOut },
  { k: 'vquality', l: 'Video quality', t: 'select', def: 'medium', o: [['high', 'High'], ['medium', 'Medium'], ['low', 'Low (small file)'], ['tiny', 'Tiny']], show: c => c.vidOut },
  { k: 'fps', l: 'Frame rate', t: 'select', def: '0', o: [['0', 'Original'], ['60', '60'], ['30', '30'], ['24', '24'], ['15', '15']], show: c => c.vidOut && c.kinds.has('vid') },
  { k: 'mute', l: 'Remove audio', t: 'check', def: false, show: c => c.vidOut && c.kinds.has('vid') },
  { k: 'bitrate', l: 'Audio bitrate', t: 'select', def: '192', o: [['64', '64 kbps'], ['96', '96 kbps'], ['128', '128 kbps'], ['160', '160 kbps'], ['192', '192 kbps'], ['256', '256 kbps'], ['320', '320 kbps']], show: c => c.audOut || (c.vidOut && c.kinds.has('vid')) },
  { k: 'rate', l: 'Sample rate', t: 'select', def: '0', o: [['0', 'Original'], ['48000', '48 kHz'], ['44100', '44.1 kHz'], ['22050', '22 kHz'], ['16000', '16 kHz']], show: c => c.audOut },
  { k: 'channels', l: 'Channels', t: 'select', def: '0', o: [['0', 'Original'], ['1', 'Mono'], ['2', 'Stereo']], show: c => c.audOut },
  { k: 'volume', l: 'Volume', t: 'range', min: 10, max: 300, def: 100, fmt: v => v + '%', show: c => c.audOut },
  { k: 'gifFps', l: 'GIF frame rate', t: 'select', def: '10', o: sel('5', '8', '10', '12', '15', '20'), show: c => c.gifOut && c.kinds.has('vid') },
  { k: 'gifWidth', l: 'GIF width', t: 'select', def: '480', o: [['0', 'Original'], ['240', '240 px'], ['320', '320 px'], ['480', '480 px'], ['640', '640 px'], ['800', '800 px']], show: c => c.gifOut && c.kinds.has('vid') },
  { k: 'loop', l: 'Looping', t: 'select', def: '0', o: [['0', 'Loop forever'], ['-1', 'Play once']], show: c => c.gifOut },
  { k: 'icoExtract', l: 'ICO input: sizes to extract', t: 'select', def: 'largest', o: [['largest', 'Largest size only'], ['all', 'Every size (as separate files)']], show: c => c.exts.has('ico') || c.tool.id === 'ico-to-png' || c.tool.id === 'ico-converter' },
  { k: 'level', l: 'ZIP compression', t: 'select', def: '6', o: [['0', 'Store only'], ['1', 'Fast'], ['6', 'Normal'], ['9', 'Maximum']], show: c => c.outs.has('zip') }
];
