/* ConvertLab - Audio (WebAudio + MP3) and ffmpeg.wasm video/audio engines */
'use strict';

/* ================= audio ================= */
function wavBlob(ab) {
  const ch = ab.numberOfChannels, n = ab.length, sr = ab.sampleRate, dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const W = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  W(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); W(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); W(36, 'data'); dv.setUint32(40, n * ch * 2, true);
  const chs = [...Array(ch)].map((_, i) => ab.getChannelData(i)); let p = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = clamp(chs[c][i], -1, 1); dv.setInt16(p, s < 0 ? s * 32768 : s * 32767, true); p += 2; }
  return new Blob([dv], { type: 'audio/wav' });
}
async function audioNative(job, o, io) {
  const it = job.items[0], out = job.out; if (it.file.size > 400 * 1024 * 1024) throw new Error('file too large for native decoding');
  io.progress(.05, 'Decoding audio'); const ab = await it.file.arrayBuffer(); const ac = new (window.AudioContext || window.webkitAudioContext)(); let buf;
  try { buf = await ac.decodeAudioData(ab); } finally { if (ac.close) ac.close(); }
  io.check();
  const start = clamp(parseTime(o.start), 0, buf.duration); let len = parseTime(o.dur); if (!(len > 0) || start + len > buf.duration) len = buf.duration - start;
  let rate = +o.rate || buf.sampleRate; if (out === 'mp3' && ![8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000].includes(rate)) rate = 44100;
  const ch = o.channels === '1' ? 1 : o.channels === '2' ? 2 : Math.min(2, buf.numberOfChannels);
  const oc = new OfflineAudioContext(ch, Math.max(1, Math.round(len * rate)), rate), src = oc.createBufferSource(), g = oc.createGain();
  src.buffer = buf; g.gain.value = (+o.volume || 100) / 100; src.connect(g); g.connect(oc.destination); src.start(0, start, len);
  io.progress(.2, 'Processing'); const r = await oc.startRendering(); io.check();
  if (out === 'wav') return [{ name: outName(it, 'wav'), blob: wavBlob(r) }];
  await ensure('lamejs');
  const to16 = a => { const x = new Int16Array(a.length); for (let i = 0; i < a.length; i++) { const s = clamp(a[i], -1, 1); x[i] = s < 0 ? s * 32768 : s * 32767; } return x; };
  const enc = new window.lamejs.Mp3Encoder(ch, rate, +o.bitrate || 192), L = to16(r.getChannelData(0)), R = ch > 1 ? to16(r.getChannelData(1)) : null, parts = [], BS = 1152 * 8;
  for (let i = 0; i < L.length; i += BS) {
    const b = ch > 1 ? enc.encodeBuffer(L.subarray(i, i + BS), R.subarray(i, i + BS)) : enc.encodeBuffer(L.subarray(i, i + BS)); if (b.length) parts.push(new Uint8Array(b));
    if ((i / BS) % 40 === 0) { io.progress(.3 + .7 * i / L.length, 'Encoding MP3'); io.check(); await tick(); }
  }
  const f = enc.flush(); if (f.length) parts.push(new Uint8Array(f));
  return [{ name: outName(it, 'mp3'), blob: new Blob(parts, { type: 'audio/mpeg' }) }];
}
async function eAudio(job, o, io) {
  if (job.out === 'wav' || job.out === 'mp3') { try { return await audioNative(job, o, io); } catch (e) { if (e.cancel || e.engine) throw e; } }
  return eFF(job, o, io);
}

/* ================= ffmpeg.wasm ================= */
const FF = { inst: null, loading: null, logs: [], cb: null, core: null };
const FF_BASES = ['https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd', 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'];
async function fetchBlobURL(url, type, onp) {
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), chunks = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; if (total && onp) onp(Math.min(1, got / total)); }
  return URL.createObjectURL(new Blob(chunks, { type }));
}
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
async function getFF(io) {
  if (FF.inst) return FF.inst; if (FF.loading) return FF.loading;
  FF.loading = (async () => {
    io.progress(.01, 'Loading media engine...');
    const libUrl = await ensure('ffmpeg');
    if (!FF.core) {
      let last;
      for (const b of FF_BASES) {
        try {
          const js = await fetchBlobURL(b + '/ffmpeg-core.js', 'text/javascript');
          const wasm = await fetchBlobURL(b + '/ffmpeg-core.wasm', 'application/wasm', p => io.progress(.01 + .13 * p, `Downloading media engine (first time only) ${Math.round(p * 100)}%`));
          FF.core = { js, wasm }; break;
        } catch (e) { last = e; }
      }
      if (!FF.core) throw Object.assign(new Error('Could not download the media engine (~30 MB). Check your connection. ' + (last ? last.message : '')), { engine: true });
    }
    const mk = () => { const ff = new window.FFmpegWASM.FFmpeg(); ff.on('log', ({ message }) => { FF.logs.push(message); if (FF.logs.length > 80) FF.logs.shift(); }); ff.on('progress', ({ progress }) => { if (FF.cb) FF.cb(progress); }); return ff; };
    let ff = mk();
    try { await withTimeout(ff.load({ coreURL: FF.core.js, wasmURL: FF.core.wasm }), 45000, 'engine start timeout'); }
    catch (e1) {
      try { ff.terminate(); } catch (e) { /* ignore */ }
      ff = mk();
      try { const w = await fetchBlobURL(libUrl.replace(/ffmpeg\.js$/, '814.ffmpeg.js'), 'text/javascript'); await withTimeout(ff.load({ coreURL: FF.core.js, wasmURL: FF.core.wasm, classWorkerURL: w }), 45000, 'engine start timeout'); }
      catch (e2) { throw Object.assign(new Error('The media engine could not start in this browser/context. Try opening the file from a local web server or in Chrome/Edge. (' + e2.message + ')'), { engine: true }); }
    }
    FF.inst = ff; return ff;
  })().finally(() => { FF.loading = null; });
  return FF.loading;
}
const ffError = () => { const l = FF.logs.filter(x => /error|invalid|unknown|no such|not supported|failed|unable|does not/i.test(x)).slice(-2).join(' | '); return l || 'Conversion failed (unsupported codec or corrupt file?)'; };
function ffVideoArgs(inN, outN, out, o) {
  const a = []; if (parseTime(o.start) > 0) a.push('-ss', String(parseTime(o.start))); a.push('-i', inN); if (parseTime(o.dur) > 0) a.push('-t', String(parseTime(o.dur)));
  const vf = [], H = +o.res || 0;
  vf.push(H ? `scale=-2:'min(${H},ih)'` : 'scale=trunc(iw/2)*2:trunc(ih/2)*2'); if (+o.fps) vf.push('fps=' + o.fps);
  a.push('-vf', vf.join(','));
  const q = { high: 0, medium: 1, low: 2, tiny: 3 }[o.vquality] ?? 1, crf = [20, 24, 28, 32][q], vb = ['2500k', '1500k', '800k', '400k'][q], ab = (+o.bitrate || 128) + 'k', an = o.mute ? ['-an'] : null;
  if (['mp4', 'mkv', 'mov'].includes(out)) { a.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', ...(an || ['-c:a', 'aac', '-b:a', ab])); if (out !== 'mkv') a.push('-movflags', '+faststart'); }
  else if (out === 'webm') a.push('-c:v', 'libvpx', '-b:v', vb, '-deadline', 'realtime', '-cpu-used', '5', '-pix_fmt', 'yuv420p', ...(an || ['-c:a', 'libvorbis', '-b:a', ab]));
  else if (out === 'avi') a.push('-c:v', 'mpeg4', '-q:v', String([3, 5, 8, 12][q]), '-pix_fmt', 'yuv420p', ...(an || ['-c:a', 'libmp3lame', '-b:a', ab]));
  else if (out === 'flv') a.push('-c:v', 'flv', '-b:v', vb, '-pix_fmt', 'yuv420p', ...(an || ['-c:a', 'libmp3lame', '-ar', '44100', '-b:a', ab]));
  else if (out === 'wmv') a.push('-c:v', 'wmv2', '-b:v', vb, '-pix_fmt', 'yuv420p', ...(an || ['-c:a', 'wmav2', '-b:a', ab]));
  a.push(outN); return a;
}
function ffAudioArgs(inN, outN, out, o) {
  const a = []; if (parseTime(o.start) > 0) a.push('-ss', String(parseTime(o.start))); a.push('-i', inN); if (parseTime(o.dur) > 0) a.push('-t', String(parseTime(o.dur))); a.push('-vn');
  if ((+o.volume || 100) !== 100) a.push('-af', `volume=${(+o.volume) / 100}`);
  if (+o.rate) a.push('-ar', String(+o.rate)); if (o.channels === '1' || o.channels === '2') a.push('-ac', o.channels);
  const br = (+o.bitrate || 192) + 'k';
  a.push(...({ mp3: ['-c:a', 'libmp3lame', '-b:a', br], ogg: ['-c:a', 'libvorbis', '-b:a', br], opus: ['-c:a', 'libopus', '-b:a', br], m4a: ['-c:a', 'aac', '-b:a', br], aac: ['-c:a', 'aac', '-b:a', br], flac: ['-c:a', 'flac'], wav: ['-c:a', 'pcm_s16le'], aiff: ['-c:a', 'pcm_s16be'], wma: ['-c:a', 'wmav2', '-b:a', br] }[out] || []));
  a.push(outN); return a;
}
function ffGifArgs(inN, outN, o) {
  const a = []; if (parseTime(o.start) > 0) a.push('-ss', String(parseTime(o.start))); a.push('-i', inN); if (parseTime(o.dur) > 0) a.push('-t', String(parseTime(o.dur)));
  const w = +o.gifWidth || 0; a.push('-vf', `fps=${+o.gifFps || 10}${w ? `,scale=${w}:-1:flags=lanczos` : ''},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`, '-loop', o.loop === '-1' ? '-1' : '0', outN); return a;
}
function ffAnimArgs(inN, outN, out, o) {
  const a = ['-i', inN], H = +o.res || 0, sc = H ? `scale=-2:'min(${H},ih)'` : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  if (out === 'mp4') a.push('-an', '-vf', sc, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String([20, 24, 28, 32][{ high: 0, medium: 1, low: 2, tiny: 3 }[o.vquality] ?? 1]), '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  else if (out === 'webm') a.push('-an', '-vf', sc, '-c:v', 'libvpx', '-b:v', '1500k', '-pix_fmt', 'yuv420p');
  else if (out === 'apng') a.push('-plays', '0', '-f', 'apng');
  else a.push('-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '-loop', o.loop === '-1' ? '-1' : '0');
  a.push(outN); return a;
}
async function eFF(job, o, io) {
  const it = job.items[0], out = job.out, r = job.route, inE = /^[a-z0-9]{1,5}$/.test(it.ext) ? it.ext : 'bin';
  const ff = await getFF(io), id = Math.random().toString(36).slice(2, 8), inN = `in_${id}.${inE}`, outN = `out_${id}.${out}`;
  io.progress(.16, 'Reading file'); await ff.writeFile(inN, new Uint8Array(await it.file.arrayBuffer())); io.check();
  const args = r === 'anim' ? ffAnimArgs(inN, outN, out, o) : r === 'audio' ? ffAudioArgs(inN, outN, out, o) : r === 'vid2gif' ? ffGifArgs(inN, outN, o) : ffVideoArgs(inN, outN, out, o);
  FF.logs = []; FF.cb = p => io.progress(.2 + .78 * clamp(p, 0, 1), 'Converting'); let code;
  try { code = await ff.exec(args); } finally { FF.cb = null; }
  if (state.cancel) throw cancelErr();
  if (code !== 0) { try { await ff.deleteFile(inN); } catch (e) { /* ignore */ } throw new Error(ffError()); }
  const data = await ff.readFile(outN); try { await ff.deleteFile(inN); await ff.deleteFile(outN); } catch (e) { /* ignore */ }
  if (!data || !data.length) throw new Error('The converter produced an empty file');
  return [{ name: outName(it, out), blob: new Blob([data], { type: MIME[out] || 'application/octet-stream' }) }];
}
