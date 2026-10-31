/* ConvertLab - Unit Converter and Time Converter pages */
'use strict';

/* ================= unit converter ================= */
const U = (s, n, f) => ({ s, n, f });
const UNITS = {
  Length: [U('m', 'Metre', 1), U('km', 'Kilometre', 1000), U('cm', 'Centimetre', .01), U('mm', 'Millimetre', .001), U('\u00b5m', 'Micrometre', 1e-6), U('nm', 'Nanometre', 1e-9), U('mi', 'Mile', 1609.344), U('yd', 'Yard', .9144), U('ft', 'Foot', .3048), U('in', 'Inch', .0254), U('nmi', 'Nautical mile', 1852), U('ly', 'Light year', 9.4607304725808e15)],
  Mass: [U('kg', 'Kilogram', 1), U('g', 'Gram', .001), U('mg', 'Milligram', 1e-6), U('t', 'Tonne', 1000), U('lb', 'Pound', .45359237), U('oz', 'Ounce', .028349523125), U('st', 'Stone', 6.35029318), U('ct', 'Carat', .0002), U('quintal', 'Quintal', 100)],
  Temperature: [{ s: '\u00b0C', n: 'Celsius', to: v => v, from: v => v }, { s: '\u00b0F', n: 'Fahrenheit', to: v => (v - 32) * 5 / 9, from: v => v * 9 / 5 + 32 }, { s: 'K', n: 'Kelvin', to: v => v - 273.15, from: v => v + 273.15 }, { s: '\u00b0R', n: 'Rankine', to: v => (v - 491.67) * 5 / 9, from: v => v * 9 / 5 + 491.67 }],
  Volume: [U('L', 'Litre', 1), U('mL', 'Millilitre', .001), U('m\u00b3', 'Cubic metre', 1000), U('cm\u00b3', 'Cubic centimetre', .001), U('gal (US)', 'US gallon', 3.785411784), U('gal (UK)', 'Imperial gallon', 4.54609), U('qt', 'US quart', .946352946), U('pt', 'US pint', .473176473), U('cup', 'US cup', .2365882365), U('fl oz', 'US fluid ounce', .0295735295625), U('tbsp', 'US tablespoon', .01478676478125), U('tsp', 'US teaspoon', .00492892159375), U('ft\u00b3', 'Cubic foot', 28.316846592), U('in\u00b3', 'Cubic inch', .016387064)],
  Area: [U('m\u00b2', 'Square metre', 1), U('km\u00b2', 'Square kilometre', 1e6), U('cm\u00b2', 'Square centimetre', 1e-4), U('mm\u00b2', 'Square millimetre', 1e-6), U('ha', 'Hectare', 1e4), U('acre', 'Acre', 4046.8564224), U('ft\u00b2', 'Square foot', .09290304), U('in\u00b2', 'Square inch', .00064516), U('yd\u00b2', 'Square yard', .83612736), U('mi\u00b2', 'Square mile', 2589988.110336)],
  Speed: [U('m/s', 'Metre/second', 1), U('km/h', 'Kilometre/hour', 1 / 3.6), U('mph', 'Mile/hour', .44704), U('kn', 'Knot', 1852 / 3600), U('ft/s', 'Foot/second', .3048), U('Mach', 'Mach (sea level)', 340.29)],
  Time: [U('s', 'Second', 1), U('ms', 'Millisecond', .001), U('\u00b5s', 'Microsecond', 1e-6), U('min', 'Minute', 60), U('h', 'Hour', 3600), U('day', 'Day', 86400), U('week', 'Week', 604800), U('month', 'Month (avg)', 2629746), U('year', 'Year (avg)', 31556952)],
  Data: [U('B', 'Byte', 1), U('bit', 'Bit', .125), U('KB', 'Kilobyte', 1e3), U('MB', 'Megabyte', 1e6), U('GB', 'Gigabyte', 1e9), U('TB', 'Terabyte', 1e12), U('PB', 'Petabyte', 1e15), U('KiB', 'Kibibyte', 1024), U('MiB', 'Mebibyte', 1048576), U('GiB', 'Gibibyte', 1073741824), U('TiB', 'Tebibyte', 1099511627776)],
  Energy: [U('J', 'Joule', 1), U('kJ', 'Kilojoule', 1e3), U('cal', 'Calorie', 4.184), U('kcal', 'Kilocalorie', 4184), U('Wh', 'Watt-hour', 3600), U('kWh', 'Kilowatt-hour', 3.6e6), U('BTU', 'BTU', 1055.05585), U('eV', 'Electronvolt', 1.602176634e-19), U('ft\u00b7lbf', 'Foot-pound', 1.3558179483)],
  Power: [U('W', 'Watt', 1), U('kW', 'Kilowatt', 1e3), U('MW', 'Megawatt', 1e6), U('hp', 'Horsepower (mech.)', 745.69987158), U('PS', 'Metric horsepower', 735.49875), U('BTU/h', 'BTU per hour', .29307107)],
  Pressure: [U('Pa', 'Pascal', 1), U('kPa', 'Kilopascal', 1e3), U('bar', 'Bar', 1e5), U('atm', 'Atmosphere', 101325), U('psi', 'PSI', 6894.757293168), U('mmHg', 'mmHg', 133.322387415), U('torr', 'Torr', 133.3223684)],
  Angle: [U('deg', 'Degree', 1), U('rad', 'Radian', 180 / Math.PI), U('grad', 'Gradian', .9), U('turn', 'Turn', 360), U('arcmin', 'Arcminute', 1 / 60), U('arcsec', 'Arcsecond', 1 / 3600)],
  Frequency: [U('Hz', 'Hertz', 1), U('kHz', 'Kilohertz', 1e3), U('MHz', 'Megahertz', 1e6), U('GHz', 'Gigahertz', 1e9), U('rpm', 'Rev/minute', 1 / 60)],
  'Fuel economy': [U('km/L', 'Kilometre/litre', 1), U('mpg (US)', 'Miles/gallon (US)', .425143707), U('mpg (UK)', 'Miles/gallon (UK)', .354006189), { s: 'L/100km', n: 'Litres/100 km', to: v => v ? 100 / v : Infinity, from: v => v ? 100 / v : Infinity }]
};
const fmtNum = x => { if (!isFinite(x)) return '-'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e15 || a < 1e-6) return x.toExponential(6).replace(/\.?0+e/, 'e'); return x.toLocaleString(undefined, { maximumSignificantDigits: 12 }); };
function renderUnit(tool) {
  state.tool = null; let cat = 'Length', from = 0, to = 1; const body = h('div'), chips = h('div', { class: 'chips' });
  const conv = (v, a, b) => b.from ? b.from(a.to ? a.to(v) : v * a.f) : (a.to ? a.to(v) : v * a.f) / b.f;
  const draw = () => {
    const us = UNITS[cat]; if (from >= us.length) from = 0; if (to >= us.length) to = Math.min(1, us.length - 1);
    chips.replaceChildren(...Object.keys(UNITS).map(k => h('button', { class: 'chip' + (k === cat ? ' on' : ''), onclick: () => { cat = k; from = 0; to = 1; draw(); } }, k)));
    const inp = h('input', { type: 'text', class: 'big', inputmode: 'decimal', value: '1', 'aria-label': 'Value' }), outv = h('input', { type: 'text', class: 'big', readonly: true, 'aria-label': 'Result' });
    const mk = (cur, set) => h('select', { onchange: e => { set(+e.target.value); upd(); } }, us.map((u, i) => h('option', { value: i, selected: i === cur }, `${u.n} (${u.s})`)));
    const sf = mk(from, v => { from = v; }), st = mk(to, v => { to = v; }), tbl = h('tbody');
    const upd = () => { const v = parseFloat(inp.value.replace(/,/g, '')); outv.value = isNaN(v) ? '' : fmtNum(conv(v, us[from], us[to])); tbl.replaceChildren(...us.map(u => h('tr', null, h('td', null, u.n), h('td', null, u.s), h('td', null, isNaN(v) ? '-' : fmtNum(conv(v, us[from], u)))))); };
    inp.addEventListener('input', upd);
    body.replaceChildren(h('div', { class: 'card pad' }, h('div', { class: 'row2' }, h('div', null, h('div', { class: 'lbl' }, 'From'), inp, h('div', { style: 'height:8px' }), sf), h('div', null, h('div', { class: 'lbl' }, 'To'), outv, h('div', { style: 'height:8px' }), st)),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { [from, to] = [to, from]; draw(); } }, '\u21c5 Swap'), h('button', { class: 'btn', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(outv.value).then(() => toast('Copied')); } }, 'Copy result'))),
      h('div', { class: 'card pad', style: 'margin-top:14px;overflow:auto' }, h('b', null, 'All ' + cat.toLowerCase() + ' units'), h('table', { class: 't' }, tbl))); upd();
  };
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / Others'), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), chips, h('div', { style: 'height:14px' }), body); draw();
}

/* ================= time converter ================= */
const dtfC = {};
const zparts = (ts, tz) => { const f = dtfC[tz] || (dtfC[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })); const p = {}; for (const x of f.formatToParts(ts)) p[x.type] = +x.value; return p; };
const tzOff = (ts, tz) => { const p = zparts(ts, tz); return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ts / 1000) * 1000; };
const zonedToUtc = (y, mo, d, hh, mi, s, tz) => { const g = Date.UTC(y, mo - 1, d, hh, mi, s), off = tzOff(g, tz); let ts = g - off; const off2 = tzOff(ts, tz); if (off2 !== off) ts = g - off2; return ts; };
const offStr = ms => { const m = Math.round(ms / 60000), a = Math.abs(m); return 'GMT' + (m < 0 ? '-' : '+') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); };
const wallStr = (ts, tz) => { const p = zparts(ts, tz), z = n => String(n).padStart(2, '0'); return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour % 24)}:${z(p.minute)}:${z(p.second)}`; };
function renderTime(tool) {
  state.tool = null; const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []).slice(); if (!zones.includes('UTC')) zones.unshift('UTC');
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; let tab = 'zones', targets = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'], src = local, when = wallStr(Date.now(), local), timer = null;
  const tabs = h('div', { class: 'chips' }), body = h('div', { style: 'margin-top:14px' }), dl = h('datalist', { id: 'tzl' }, zones.map(z => h('option', { value: z })));
  const draw = () => { if (timer) { clearInterval(timer); timer = null; } tabs.replaceChildren(...[['zones', 'Time zones'], ['stamp', 'Unix timestamp'], ['dur', 'Duration']].map(([k, l]) => h('button', { class: 'chip' + (k === tab ? ' on' : ''), onclick: () => { tab = k; draw(); } }, l))); (tab === 'zones' ? zonesView : tab === 'stamp' ? stampView : durView)(); };
  const zonesView = () => {
    const res = h('tbody'), err = h('div', { class: 'note', style: 'color:var(--err)' }), wi = h('input', { type: 'datetime-local', step: 1, value: when, oninput: e => { when = e.target.value; upd(); } }), si = h('input', { type: 'text', list: 'tzl', value: src, onchange: e => { src = e.target.value.trim(); upd(); } }), ai = h('input', { type: 'text', list: 'tzl', placeholder: 'Add a time zone, e.g. Europe/Paris' });
    const upd = () => {
      err.textContent = ''; res.replaceChildren(); const m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)(?::(\d+))?/.exec(when || ''); if (!m) { err.textContent = 'Pick a date and time'; return; }
      try {
        const ts = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), src), sp = zparts(ts, src), sd = Date.UTC(sp.year, sp.month - 1, sp.day);
        targets.forEach(tz => { const p = zparts(ts, tz), dd = Math.round((Date.UTC(p.year, p.month - 1, p.day) - sd) / 864e5), f = k => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...k }).format(ts);
          res.append(h('tr', null, h('td', null, h('b', null, tz.split('/').pop().replace(/_/g, ' ')), h('div', { class: 'note', style: 'margin:0' }, tz)), h('td', null, f({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), dd ? h('span', { class: 'note' }, ` (${dd > 0 ? '+' : ''}${dd} day)`) : ''), h('td', null, h('b', null, f({ hour: '2-digit', minute: '2-digit', second: '2-digit' }))), h('td', null, offStr(tzOff(ts, tz))), h('td', null, h('button', { class: 'btn sm', onclick: () => { targets = targets.filter(x => x !== tz); upd(); } }, '\u2715')))); });
      } catch (e) { err.textContent = 'Unknown time zone: ' + src; }
    };
    body.replaceChildren(h('div', { class: 'card pad' }, h('div', { class: 'row2' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Date & time'), wi), h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'In time zone'), si)), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { try { when = wallStr(Date.now(), src); wi.value = when; upd(); } catch (e) { /* ignore */ } } }, 'Now'), h('div', { style: 'flex:1;min-width:200px' }, ai), h('button', { class: 'btn', onclick: () => { const z = ai.value.trim(); if (!z) return; try { zparts(0, z); if (!targets.includes(z)) targets.push(z); ai.value = ''; upd(); } catch (e) { toast('Unknown time zone'); } } }, 'Add')), err), h('div', { class: 'card pad', style: 'margin-top:14px;overflow:auto' }, h('table', { class: 't' }, res)), dl); upd();
  };
  const stampView = () => {
    const out = h('tbody'), now = h('b'), inp = h('input', { type: 'text', placeholder: '1730300000, 1730300000000 or 2026-10-30T20:27:00Z', oninput: () => upd() }), note = h('div', { class: 'note' });
    const rel = ms => { const d = (ms - Date.now()) / 1000, a = Math.abs(d), r = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }); const u = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [2592000, 'day', 86400], [31536000, 'month', 2592000], [Infinity, 'year', 31536000]].find(x => a < x[0]); return r.format(Math.round(d / u[2]), u[1]); };
    const upd = () => { out.replaceChildren(); note.textContent = ''; const s = inp.value.trim(); if (!s) return; let ms; if (/^-?\d+(\.\d+)?$/.test(s)) { const n = +s; ms = Math.abs(n) > 1e11 ? n : n * 1000; note.textContent = 'Interpreted as ' + (Math.abs(n) > 1e11 ? 'milliseconds' : 'seconds'); } else ms = Date.parse(s); if (isNaN(ms)) { note.textContent = 'Could not parse that value'; return; } const d = new Date(ms);
      [['Unix (seconds)', Math.floor(ms / 1000)], ['Unix (milliseconds)', ms], ['ISO 8601 (UTC)', d.toISOString()], ['UTC', d.toUTCString()], ['Local (' + local + ')', d.toLocaleString()], ['Relative', rel(ms)]].forEach(([k, v]) => out.append(h('tr', null, h('td', null, k), h('td', null, String(v)), h('td', null, h('button', { class: 'btn sm', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(String(v)).then(() => toast('Copied')); } }, 'Copy'))))); };
    const tickNow = () => { now.textContent = Math.floor(Date.now() / 1000); }; tickNow(); timer = setInterval(tickNow, 1000);
    body.replaceChildren(h('div', { class: 'card pad' }, h('div', { class: 'lbl' }, 'Current Unix time: ', now), h('div', { class: 'actions' }, h('div', { style: 'flex:1;min-width:240px' }, inp), h('button', { class: 'btn', onclick: () => { inp.value = String(Math.floor(Date.now() / 1000)); upd(); } }, 'Use now')), note), h('div', { class: 'card pad', style: 'margin-top:14px;overflow:auto' }, h('table', { class: 't' }, out)));
  };
  const durView = () => {
    const out = h('tbody'), inp = h('input', { type: 'text', value: '1d 2h 30m', oninput: () => upd() }), note = h('div', { class: 'note' });
    const upd = () => { out.replaceChildren(); const s = inp.value.trim().toLowerCase(); let sec = 0, ok = false; if (/^[\d.]+$/.test(s)) { sec = +s; ok = true; note.textContent = 'Plain numbers are read as seconds'; } else if (/^\d+(:\d+){1,2}$/.test(s)) { sec = parseTime(s); ok = true; note.textContent = ''; } else { const U2 = { y: 31556952, mo: 2629746, w: 604800, d: 86400, h: 3600, m: 60, s: 1, ms: .001 }; const re = /([\d.]+)\s*(ms|mo|y|w|d|h|m|s)/g; let m; while ((m = re.exec(s))) { sec += +m[1] * U2[m[2]]; ok = true; } note.textContent = 'Units: y, mo, w, d, h, m, s, ms'; } if (!ok) return;
      const z = n => String(Math.floor(n)).padStart(2, '0'), hh = Math.floor(sec / 3600);
      [['HH:MM:SS', `${hh}:${z(sec % 3600 / 60)}:${z(sec % 60)}`], ['Milliseconds', fmtNum(sec * 1000)], ['Seconds', fmtNum(sec)], ['Minutes', fmtNum(sec / 60)], ['Hours', fmtNum(sec / 3600)], ['Days', fmtNum(sec / 86400)], ['Weeks', fmtNum(sec / 604800)], ['Years (avg)', fmtNum(sec / 31556952)]].forEach(([k, v]) => out.append(h('tr', null, h('td', null, k), h('td', null, v)))); };
    body.replaceChildren(h('div', { class: 'card pad' }, h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Duration (e.g. 1d 2h 30m, 3725, 01:02:05)'), inp), note), h('div', { class: 'card pad', style: 'margin-top:14px' }, h('table', { class: 't' }, out))); upd();
  };
  cleanup = () => { if (timer) clearInterval(timer); };
  app.replaceChildren(h('div', { class: 'crumb' }, h('a', { href: '#/' }, 'Home'), ' / Others'), h('h1', { class: 'tt' }, tool.name), h('p', { class: 'sub' }, tool.desc), tabs, body); draw();
}
