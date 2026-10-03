/* Coach Chat Rework — plugin Figma lokal, tanpa akses jaringan.
   Membangun SATU layar: chat desktop baru (rail observabilitas 20px dihapus).
   Token diturunkan dari team/client/src/index.css (@theme Tailwind v4).
   Catatan: team/client TIDAK punya tailwind.config.js — Tailwind v4 memakai @theme. */

// ---------- 1. Font (load SEBELUM createText) ----------
var FONTS = null;
var FALLBACK = {
  regular: [['Inter', 'Regular'], ['Roboto', 'Regular'], ['Helvetica Neue', 'Regular']],
  medium: [['Inter', 'Medium'], ['Roboto', 'Medium'], ['Inter', 'Regular']],
  semibold: [['Inter', 'Semi Bold'], ['Inter', 'SemiBold'], ['Roboto', 'Medium'], ['Inter', 'Medium']],
  bold: [['Inter', 'Bold'], ['Roboto', 'Bold'], ['Helvetica Neue', 'Bold'], ['Inter', 'Regular']]
};

async function loadFonts() {
  FONTS = {};
  var keys = ['regular', 'medium', 'semibold', 'bold'];
  for (var i = 0; i < keys.length; i++) {
    var cands = FALLBACK[keys[i]];
    FONTS[keys[i]] = null;
    for (var j = 0; j < cands.length; j++) {
      try {
        await figma.loadFontAsync({ family: cands[j][0], style: cands[j][1] });
        FONTS[keys[i]] = { family: cands[j][0], style: cands[j][1] };
        break;
      } catch (e) { /* kandidat berikutnya */ }
    }
    if (!FONTS[keys[i]]) throw new Error('Font "' + keys[i] + '" tidak tersedia');
  }
}

// ---------- 2. Token (sumber: index.css @theme + pemakaian di CoachPage.jsx) ----------
var T = {
  p50: '#eff6ff', p100: '#dbeafe', p200: '#bfdbfe', p300: '#2563eb',
  p400: '#1d4ed8', p500: '#1e40af', p600: '#1e3a8a', p700: '#1d4ed8',
  p800: '#1e40af', p900: '#1e3a8a',
  a50: '#ecfeff', a200: '#a5f3fc', a700: '#0e7490',
  w50: '#fffbeb', w200: '#fde68a', w700: '#b45309',
  // palet default Tailwind (tidak di-override @theme) — dipakai kartu di CoachPage.jsx
  red50: '#fef2f2', red200: '#fecaca', red700: '#b91c1c',
  amber50: '#fffbeb', amber700: '#b45309',
  green100: '#dcfce7', green700: '#15803d',
  white: '#ffffff'
};
var R = { lg: 8, xl: 12, xxl: 16, full: 999 };          // rounded-lg / xl / 2xl / full
var FS = { title: 24, base: 16, body: 14, small: 12, micro: 11, nano: 10 }; // text-2xl/base/sm/xs/[11px]/[10px]
var SOFT = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.07 }, offset: { x: 0, y: 2 }, radius: 15, spread: -3, visible: true, blendMode: 'NORMAL' },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 10 }, radius: 20, spread: -2, visible: true, blendMode: 'NORMAL' }
];

// ---------- 3. Helper dasar ----------
function hex(h) {
  var s = String(h).replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  var n = parseInt(s, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function solid(c, o) {
  var p = { type: 'SOLID', color: hex(c) };
  if (o != null) p.opacity = o;
  return p;
}

function txt(str, o) {
  o = o || {};
  var t = figma.createText();
  t.fontName = FONTS[o.weight || 'regular'];
  t.characters = String(str);
  t.fontSize = o.size || FS.body;
  t.fills = [solid(o.color || T.p900)];
  t.lineHeight = o.lh ? { value: o.lh, unit: 'PERCENT' } : { unit: 'AUTO' };
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.w) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height); }
  else { t.textAutoResize = 'WIDTH_AND_HEIGHT'; }
  return t;
}

function autoFrame(name, dir, o) {
  o = o || {};
  var f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  var p = o.pad || [0, 0, 0, 0];
  f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
  f.itemSpacing = o.gap || 0;
  f.fills = o.fill ? [solid(o.fill, o.opacity)] : [];
  if (o.stroke) { f.strokes = [solid(o.stroke)]; f.strokeWeight = o.sw || 1; }
  if (o.r) f.cornerRadius = o.r;
  if (o.rBL != null) f.bottomLeftRadius = o.rBL;
  if (o.rBR != null) f.bottomRightRadius = o.rBR;
  if (o.rTL != null) f.topLeftRadius = o.rTL;
  if (o.rTR != null) f.topRightRadius = o.rTR;
  if (o.clip != null) f.clipsContent = o.clip;
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  if (o.soft) f.effects = SOFT;
  // sumbu: yang diminta dipatok FIXED, sisanya dipaksa HUG (AUTO) agar tinggi mengikuti isi
  var vert = dir === 'VERTICAL';
  var wAxis = vert ? 'counterAxisSizingMode' : 'primaryAxisSizingMode';
  var hAxis = vert ? 'primaryAxisSizingMode' : 'counterAxisSizingMode';
  f[wAxis] = 'AUTO'; f[hAxis] = 'AUTO';
  if (o.w != null) f[wAxis] = 'FIXED';
  if (o.h != null) f[hAxis] = 'FIXED';
  if (o.w != null || o.h != null) f.resize(o.w != null ? o.w : f.width, o.h != null ? o.h : f.height);
  if (o.w == null) f[wAxis] = 'AUTO';
  if (o.h == null) f[hAxis] = 'AUTO';
  return f;
}

function add(parent, child, fill) {
  parent.appendChild(child);
  if (fill) {
    try { child.layoutSizingHorizontal = 'FILL'; }
    catch (e) { child.layoutAlign = 'STRETCH'; }
  }
  return child;
}

function card(name, o) {
  var base = { fill: T.white, r: R.xxl, stroke: T.p100, soft: true, clip: true };
  var keys = Object.keys(o || {});
  for (var i = 0; i < keys.length; i++) base[keys[i]] = o[keys[i]];
  return autoFrame(name, base.dir || 'VERTICAL', base);
}

function line() { return autoFrame('Pemisah', 'HORIZONTAL', { h: 1, fill: T.p100 }); }

// gaya chip: status selalu dibawa oleh TEKS label, warna hanya pendukung
var KIND = {
  info: { bg: T.p50, fg: T.p700, stroke: T.p100 },
  muted: { bg: T.white, fg: T.p500, stroke: T.p200 },
  warn: { bg: T.w50, fg: T.w700, stroke: T.w200 },
  accent: { bg: T.a50, fg: T.a700, stroke: T.a200 }
};

function chip(label, kind) {
  var k = KIND[kind] || KIND.muted;
  var f = autoFrame('Chip status: ' + label, 'HORIZONTAL', {
    pad: [3, 9, 3, 9], gap: 6, r: R.full, fill: k.bg, stroke: k.stroke, align: 'CENTER'
  });
  f.appendChild(txt(label, { size: FS.micro, weight: 'medium', color: k.fg }));
  return f;
}

// ---------- 4. Komponen layar ----------
function buildHeader() {
  var row = autoFrame('Header halaman', 'HORIZONTAL', { gap: 16, align: 'CENTER', justify: 'SPACE_BETWEEN' });
  var left = autoFrame('Judul', 'VERTICAL', { gap: 4 });
  left.appendChild(txt('AI Learning Coach', { size: FS.title, weight: 'bold', color: T.p900 }));
  left.appendChild(txt('Tanya apa saja tentang rencana belajarmu.', { size: FS.body, color: T.p400 }));
  add(row, left);

  var right = autoFrame('Aksi', 'HORIZONTAL', { gap: 8, align: 'CENTER' });
  var diag = autoFrame('Tombol [⌗ Diagnostik]', 'HORIZONTAL', {
    pad: [10, 14, 10, 14], gap: 8, r: R.xl, fill: T.white, stroke: T.p200, align: 'CENTER'
  });
  diag.appendChild(txt('\u2317 Diagnostik', { size: 13, weight: 'medium', color: T.p700 }));
  diag.appendChild(txt('Ctrl+Shift+O', { size: FS.nano, color: T.p400 }));
  add(right, diag);

  var prim = autoFrame('Tombol Buat Rencana Belajar', 'HORIZONTAL', {
    pad: [10, 20, 10, 20], r: R.xl, fill: T.p900, align: 'CENTER'
  });
  prim.appendChild(txt('Buat Rencana Belajar', { size: FS.body, weight: 'semibold', color: T.white }));
  add(right, prim);

  add(row, right);
  return row;
}

function systemRow(label) {
  var row = autoFrame('Baris sistem', 'HORIZONTAL', { justify: 'CENTER' });
  var pill = autoFrame('Pesan sistem', 'HORIZONTAL', {
    pad: [4, 12, 4, 12], r: R.full, fill: T.p50, align: 'CENTER'
  });
  pill.appendChild(txt(label, { size: FS.micro, color: T.p400 }));
  add(row, pill);
  return row;
}

function userRow(text, w) {
  var row = autoFrame('Pesan kamu', 'HORIZONTAL', { justify: 'MAX' });
  var b = autoFrame('Bubble user', 'VERTICAL', {
    pad: [12, 16, 12, 16], fill: T.p900, r: R.xxl, rBR: 4, w: w
  });
  b.appendChild(txt(text, { size: FS.body, color: T.white, lh: 150, w: w - 32 }));
  add(row, b);
  return row;
}

function expanderClosed() {
  var f = autoFrame('Mengapa jawaban ini? (tertutup)', 'HORIZONTAL', {
    pad: [8, 10, 8, 10], gap: 6, r: R.lg, fill: T.p50, align: 'CENTER'
  });
  f.appendChild(txt('\u25B8', { size: FS.nano, weight: 'bold', color: T.p500 }));
  f.appendChild(txt('Mengapa jawaban ini?', { size: FS.micro, weight: 'semibold', color: T.p600 }));
  return f;
}

function coachRow(text, w, opts) {
  opts = opts || {};
  var row = autoFrame('Pesan coach', 'HORIZONTAL', { justify: 'MIN' });
  var b = autoFrame(opts.ring ? 'Bubble coach (terpilih \u2014 disorot dock)' : 'Bubble coach', 'VERTICAL', {
    pad: [12, 16, 12, 16], gap: 10, fill: T.white, stroke: T.p100,
    r: R.xxl, rBL: 4, w: w, soft: true
  });
  if (opts.ring) { b.strokes = [solid(T.p300)]; b.strokeWeight = 2; }
  b.appendChild(txt(text, { size: FS.body, color: T.p800, lh: 150, w: w - 32 }));
  if (opts.chips) {
    var cr = autoFrame('Baris chip status', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
    for (var i = 0; i < opts.chips.length; i++) cr.appendChild(chip(opts.chips[i].t, opts.chips[i].k));
    b.appendChild(cr);
  }
  if (opts.expander) b.appendChild(expanderClosed());
  add(row, b);
  return row;
}

function buildComposer() {
  var row = autoFrame('Composer', 'HORIZONTAL', { pad: [16, 16, 16, 16], gap: 8, align: 'CENTER' });
  var input = autoFrame('Input pesan', 'HORIZONTAL', {
    pad: [0, 16, 0, 16], h: 44, r: R.xl, fill: T.white, stroke: T.p200, align: 'CENTER'
  });
  input.appendChild(txt('Tulis pesan untuk coach...', { size: FS.body, color: T.p400 }));
  add(row, input, true);
  var send = autoFrame('Tombol Kirim', 'HORIZONTAL', {
    pad: [0, 18, 0, 18], h: 44, r: R.xl, fill: T.p900, align: 'CENTER', justify: 'CENTER'
  });
  send.appendChild(txt('Kirim', { size: FS.body, weight: 'semibold', color: T.white }));
  add(row, send);
  return row;
}

function buildScreen() {
  var root = autoFrame('01 \u00B7 Chat desktop \u2014 rail 20px dihapus', 'VERTICAL', {
    w: 1280, h: 900, pad: [40, 64, 40, 64], gap: 20, fill: T.p50, align: 'CENTER'
  });
  var wrap = autoFrame('Container (max-w-6xl)', 'VERTICAL', { w: 1152, gap: 20 });
  add(root, wrap);
  add(wrap, buildHeader(), true);

  var chat = card('Kartu chat', { h: 700 });
  add(wrap, chat, true);

  var thread = autoFrame('Thread', 'VERTICAL', {
    pad: [20, 20, 20, 20], gap: 12, fill: T.white, clip: true
  });
  add(chat, thread, true);
  thread.layoutGrow = 1;

  add(thread, systemRow('Check-in pagi dicatat'), true);
  add(thread, userRow('Kenapa jadwalku selalu padat di hari Selasa?', 430), true);
  add(thread, coachRow(
    'Selasa kamu punya dua tugas 90 menit di slot pagi, sementara target mingguanmu 5 jam. ' +
    'Satu tugas bisa dipindah ke Kamis tanpa melewati tenggat.',
    640,
    {
      chips: [{ t: 'Topik: Manajemen waktu', k: 'info' }, { t: '2 sumber', k: 'muted' }],
      expander: true
    }
  ), true);
  add(thread, userRow('Kalau aku pindahkan, apakah tenggatnya masih aman?', 470), true);
  add(thread, coachRow(
    'Aman. Tenggat goal kamu 30 hari lagi, dan sisa beban setelah pemindahan tetap di bawah target mingguan.',
    640
  ), true);

  add(chat, line(), true);
  add(chat, buildComposer(), true);
  return root;
}

// ---------- 6. Permukaan trust (a) — satu frame terpisah per state ----------
function trustHead() {
  var f = autoFrame('Mengapa jawaban ini? (terbuka)', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
  f.appendChild(txt('\u25BE', { size: FS.nano, weight: 'bold', color: T.p500 }));
  f.appendChild(txt('Mengapa jawaban ini?', { size: FS.micro, weight: 'semibold', color: T.p600 }));
  return f;
}

function kvRow(w, label, value) {
  var r = autoFrame('Baris ' + label, 'HORIZONTAL', { gap: 8, w: w });
  r.appendChild(txt(label, { size: FS.micro, color: T.p400, w: 76, lh: 150 }));
  r.appendChild(txt(value, { size: FS.micro, color: T.p800, w: w - 84, lh: 150 }));
  return r;
}

function srcItem(w, label, link) {
  var r = autoFrame('Sumber', 'HORIZONTAL', { gap: 6, w: w, align: 'CENTER' });
  r.appendChild(txt('\u2022 ' + label, { size: FS.micro, color: T.p700, w: link ? w - 68 : w, lh: 150 }));
  if (link) {
    var b = autoFrame('Penanda tautan', 'HORIZONTAL', { pad: [2, 7, 2, 7], r: R.full, fill: T.white, stroke: T.p200, align: 'CENTER' });
    b.appendChild(txt('\u2197 tautan', { size: FS.nano, weight: 'medium', color: T.p600 }));
    r.appendChild(b);
  }
  return r;
}

function noteStrip(w, text) {
  var f = autoFrame('Catatan status', 'HORIZONTAL', { pad: [7, 10, 7, 10], r: R.lg, fill: T.white, stroke: T.p100, w: w });
  f.appendChild(txt(text, { size: FS.micro, weight: 'semibold', color: T.p700, lh: 140, w: w - 20 }));
  return f;
}

function expanderOpen(rows) {
  var w = 584;
  var box = autoFrame('Mengapa jawaban ini? (terbuka)', 'VERTICAL', {
    pad: [12, 12, 12, 12], gap: 8, r: R.lg, fill: T.p50, w: 608
  });
  box.appendChild(trustHead());
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.l) box.appendChild(kvRow(w, r.l, r.v));
    else if (r.src) {
      box.appendChild(txt('Sumber', { size: FS.micro, color: T.p400 }));
      for (var j = 0; j < r.src.length; j++) box.appendChild(srcItem(w, r.src[j].t, !!r.src[j].link));
    } else if (r.note) box.appendChild(noteStrip(w, r.note));
    else if (r.text) box.appendChild(txt(r.text, { size: FS.micro, color: T.p500, lh: 150, w: w }));
  }
  return box;
}

function candidateBtn(label) {
  var b = autoFrame('Kandidat: ' + label, 'HORIZONTAL', {
    pad: [6, 12, 6, 12], r: R.xl, fill: T.white, stroke: T.p200, align: 'CENTER'
  });
  b.appendChild(txt(label, { size: FS.small, weight: 'medium', color: T.p700 }));
  return b;
}

function trustFrame(name, caption, o) {
  var f = autoFrame(name, 'VERTICAL', { w: 720, pad: [32, 32, 32, 32], gap: 12, fill: T.p50 });
  f.appendChild(txt(o.title, { size: FS.base, weight: 'semibold', color: T.p900 }));
  f.appendChild(txt(caption, { size: FS.micro, color: T.p400, lh: 150, w: 656 }));
  var row = autoFrame('Baris pesan coach', 'HORIZONTAL', { w: 656 });
  var b = autoFrame('Bubble coach', 'VERTICAL', {
    pad: [12, 16, 12, 16], gap: 10, fill: T.white, stroke: T.p100,
    r: R.xxl, rBL: 4, w: 640, soft: true
  });
  b.appendChild(txt(o.body, { size: FS.body, color: T.p800, lh: 150, w: 608 }));
  if (o.chips) {
    var cr = autoFrame('Baris chip status', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
    for (var i = 0; i < o.chips.length; i++) cr.appendChild(chip(o.chips[i].t, o.chips[i].k));
    b.appendChild(cr);
  }
  if (o.candidates) {
    var kr = autoFrame('Kandidat topik', 'HORIZONTAL', { gap: 8, align: 'CENTER' });
    kr.appendChild(txt('Kandidat topik:', { size: FS.micro, color: T.p500 }));
    for (var j = 0; j < o.candidates.length; j++) kr.appendChild(candidateBtn(o.candidates[j]));
    b.appendChild(kr);
  }
  b.appendChild(expanderOpen(o.rows));
  add(row, b);
  add(f, row);
  return f;
}

function buildTrustFrames() {
  return [
    trustFrame('02 \u00B7 Trust \u2014 resolved (expander terbuka)',
      'Topik sudah pasti: jalur, topik, dan sumber tampil. Sumber personal berupa label teks biasa, sumber domain membawa penanda tautan.',
      {
        title: 'State: topik pasti (resolved)',
        body: 'Selasa kamu punya dua tugas 90 menit di slot pagi. Satu tugas bisa dipindah ke Kamis tanpa melewati tenggat.',
        chips: [{ t: 'Topik: Manajemen waktu', k: 'info' }, { t: '2 sumber', k: 'muted' }],
        rows: [
          { l: 'Jalur', v: 'Fakta personal dari goal ini' },
          { l: 'Topik', v: 'Manajemen waktu \u2014 sudah pasti dari pertanyaanmu sebelumnya' },
          { src: [
            { t: 'Kartu fakta: "3 jam belajar per malam" (pesan 12 Mar)' },
            { t: 'Panduan belajar efektif', link: true }
          ] },
          { note: 'Pengetahuan diambil? Ya \u2014 topik sudah pasti.' }
        ]
      }),
    trustFrame('03 \u00B7 Trust \u2014 ambiguous (klarifikasi)',
      'Topik belum pasti: chip menyatakan perlu klarifikasi, bubble menawarkan dua kandidat topik, dan penjelasan mengatakan pertanyaan asli diputar ulang.',
      {
        title: 'State: ambiguous / menunggu klarifikasi',
        body: 'Aku ingin memastikan maksudmu supaya salah satu topik yang benar-benar pakai. Yang mana yang kamu maksud?',
        chips: [{ t: 'Perlu klarifikasi', k: 'warn' }],
        candidates: ['Manajemen waktu', 'Manajemen proyek'],
        rows: [
          { l: 'Jalur', v: 'Menunggu kepastian topik' },
          { l: 'Topik', v: 'Belum pasti \u2014 kandidatnya ada di bubble ini' },
          { src: [{ t: 'Belum ada sumber yang dipakai.' }] },
          { note: 'Pengetahuan diambil? Belum \u2014 pertanyaan asli kamu akan diputar ulang setelah topik pasti.' }
        ]
      }),
    trustFrame('04 \u00B7 Trust \u2014 out of scope',
      'Topik di luar korpus yang tersedia: status ditulis sebagai teks, dan expander menegaskan tidak ada pengambilan pengetahuan.',
      {
        title: 'State: out of scope (di luar cakupan)',
        body: 'Ini di luar pengetahuan yang tersedia untuk goal kamu, dan aku tidak akan mengarang jawabannya. Kita bisa bahas topik lain yang memang kamu punya datanya.',
        chips: [{ t: 'Di luar cakupan pengetahuan', k: 'muted' }],
        rows: [
          { l: 'Jalur', v: 'Di luar korpus yang tersedia' },
          { l: 'Topik', v: 'Tidak cocok dengan topik mana pun' },
          { src: [{ t: 'Tidak ada sumber yang dipakai.' }] },
          { note: 'Pengetahuan diambil? Tidak \u2014 tidak ada pengambilan pengetahuan untuk pesan ini.' }
        ]
      }),
    trustFrame('05 \u00B7 Trust \u2014 sumber belum siap',
      'Topik sudah ketahuan tetapi sumbernya belum lolos tinjauan: disebut sebagai degradasi, bukan jawaban yang mengklaim landasan.',
      {
        title: 'State: corpus missing (sumber belum siap)',
        body: 'Topiknya sudah ketahuan, tapi sumbernya belum siap ditampilkan. Jawaban berikut masih umum dan belum berpijak pada dokumen mana pun.',
        chips: [{ t: 'Sumber belum siap', k: 'warn' }],
        rows: [
          { l: 'Jalur', v: 'Topik dikenal, sumber belum siap' },
          { l: 'Topik', v: 'Manajemen waktu' },
          { src: [{ t: 'Belum ada sumber yang lolos tinjauan.' }] },
          { note: 'Pengetahuan diambil? Tidak \u2014 degradasi ditampilkan, bukan klaim tanpa dukungan.' }
        ]
      }),
    trustFrame('06 \u00B7 Trust \u2014 proposal (setuju manusia)',
      'Tipe proposal: status menunggu persetujuan dan rencana tidak berubah sampai kamu menyetujui lewat panel persetujuan. Tidak ada tombol setujui/tolak di dalam bubble.',
      {
        title: 'State: proposal (butuh persetujuan manusia)',
        body: 'Aku menyiapkan usulan: satu tugas dipindah ke Kamis. Rencana kamu tetap sama sampai kamu menyetujui usulan ini lewat panel persetujuan.',
        chips: [{ t: 'Proposal rencana \u2014 menunggu persetujuanmu', k: 'accent' }],
        rows: [
          { l: 'Jalur', v: 'Usulan perubahan rencana (butuh persetujuanmu)' },
          { l: 'Topik', v: 'Manajemen waktu' },
          { src: [{ t: 'Disusun dari fakta personal goal kamu.' }] },
          { note: 'Belum ada yang berubah \u2014 persetujuanmu diminta terpisah dari bubble ini.' }
        ]
      }),
    trustFrame('07 \u00B7 Trust \u2014 tanpa meta (riwayat lama)',
      'Pesan lama tidak punya data meta: chip disembunyikan sama sekali, dan expander menampilkan empty-state jujur alih-alih menebak dari isi percakapan.',
      {
        title: 'State: tanpa meta (pesan riwayat lama)',
        body: 'Rencana minggu kamu tetap sama seperti kemarin.',
        rows: [
          { note: 'Rincian tidak tersedia untuk pesan ini.' },
          { text: 'Pesan dari riwayat lama tidak menyimpan jalur, topik, maupun sumber \u2014 dan tidak ditebak dari isi percakapan.' }
        ]
      })
  ];
}

// ---------- 7. Dock diagnostik (b) desktop — BUKAN modal (tanpa scrim / focus trap) ----------
function sep(w) { return autoFrame('Pemisah seksi', 'HORIZONTAL', { h: 1, w: w || 352, fill: T.p100 }); }

function sec(t, kv, note, extra, w) {
  w = w || 352;
  var s = autoFrame('Seksi ' + t, 'VERTICAL', { gap: 7, w: w });
  s.appendChild(txt(t, { size: FS.micro, weight: 'semibold', color: T.p500 }));
  if (kv) for (var i = 0; i < kv.length; i++) s.appendChild(kvRow(w, kv[i][0], kv[i][1]));
  if (extra) for (var j = 0; j < extra.length; j++) s.appendChild(extra[j]);
  if (note) s.appendChild(txt(note, { size: FS.micro, color: T.p500, lh: 150, w: w }));
  return s;
}

function dockHeader(o) {
  var h = autoFrame('Header dock', 'VERTICAL', { pad: [14, 16, 12, 16], gap: 6, fill: T.p50 });
  var r = autoFrame('Baris turn', 'HORIZONTAL', { w: 352, justify: 'SPACE_BETWEEN', align: 'CENTER' });
  var l = autoFrame('Turn', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
  l.appendChild(txt(o.title, { size: FS.small, weight: 'semibold', color: T.p900 }));
  if (o.meta) l.appendChild(txt(o.meta, { size: FS.nano, color: T.p400 }));
  r.appendChild(l);
  var a = autoFrame('Aksi dock', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
  if (o.copy) {
    var c = autoFrame('Tombol salin request_id', 'HORIZONTAL', { pad: [3, 8, 3, 8], r: R.lg, fill: T.white, stroke: T.p200, align: 'CENTER' });
    c.appendChild(txt('[salin request_id]', { size: FS.nano, weight: 'medium', color: T.p700 })); a.appendChild(c);
  }
  var x = autoFrame('Tombol tutup dock', 'HORIZONTAL', { pad: [3, 8, 3, 8], r: R.lg, fill: T.white, stroke: T.p200, align: 'CENTER' });
  x.appendChild(txt('\u2715 tutup', { size: FS.nano, color: T.p600 })); a.appendChild(x);
  r.appendChild(a);
  h.appendChild(r);
  if (o.bind) h.appendChild(txt(o.bind, { size: FS.micro, color: T.p500, lh: 140, w: 352 }));
  return h;
}

function tabBar(active) {
  var tabs = ['Turn ini', 'Pipeline', 'Audit', 'Metrik'];
  var bar = autoFrame('Tab bar dock', 'HORIZONTAL', { pad: [8, 16, 10, 16], gap: 6, align: 'CENTER' });
  for (var i = 0; i < tabs.length; i++) {
    var on = tabs[i] === active;
    var t = autoFrame('Tab ' + tabs[i] + (on ? ' (aktif)' : ''), 'HORIZONTAL', {
      pad: [5, 9, 5, 9], gap: 5, r: R.lg, align: 'CENTER',
      fill: on ? T.p100 : T.white, stroke: on ? T.p200 : null
    });
    t.appendChild(txt(tabs[i], { size: FS.micro, weight: on ? 'semibold' : 'medium', color: on ? T.p900 : T.p500 }));
    if (on) t.appendChild(txt('\u00B7 aktif', { size: FS.nano, weight: 'medium', color: T.p600 }));
    bar.appendChild(t);
  }
  return bar;
}

function buildDock(active, header, content) {
  var d = autoFrame('Dock diagnostik (w-96 \u00B7 384px)', 'VERTICAL', {
    w: 384, fill: T.white, stroke: T.p200, r: R.xxl, soft: true, clip: true
  });
  d.appendChild(dockHeader(header));
  d.appendChild(tabBar(active));
  add(d, line(), true);
  var body = autoFrame('Isi dock', 'VERTICAL', { pad: [16, 16, 16, 16], gap: 14 });
  for (var i = 0; i < content.length; i++) body.appendChild(content[i]);
  d.appendChild(body);
  return d;
}

function emptyState(title, hint) {
  var e = autoFrame('Empty state', 'VERTICAL', { pad: [22, 16, 22, 16], gap: 8, r: R.lg, fill: T.p50, stroke: T.p100, w: 352, align: 'CENTER' });
  e.appendChild(txt(title, { size: FS.small, weight: 'semibold', color: T.p600, align: 'CENTER', w: 320, lh: 150 }));
  if (hint) e.appendChild(txt(hint, { size: FS.micro, color: T.p500, align: 'CENTER', w: 320, lh: 150 }));
  return e;
}

function dockPanel(name, title, caption, active, header, content) {
  var f = autoFrame(name, 'VERTICAL', { w: 448, pad: [32, 32, 32, 32], gap: 12, fill: T.p50 });
  f.appendChild(txt(title, { size: FS.base, weight: 'semibold', color: T.p900 }));
  f.appendChild(txt(caption, { size: FS.micro, color: T.p400, lh: 150, w: 384 }));
  f.appendChild(buildDock(active, header, content));
  return f;
}

function attemptCard(o) {
  var c = autoFrame('Percobaan ' + o.n, 'VERTICAL', { pad: [10, 12, 10, 12], gap: 6, r: R.lg, fill: T.p50, stroke: T.p100, w: 352 });
  var h = autoFrame('Judul percobaan', 'HORIZONTAL', { w: 328, justify: 'SPACE_BETWEEN', align: 'CENTER' });
  h.appendChild(txt(o.title, { size: FS.micro, weight: 'semibold', color: T.p600 }));
  h.appendChild(txt(o.status, { size: FS.nano, color: T.p500 }));
  c.appendChild(h);
  for (var i = 0; i < o.kv.length; i++) c.appendChild(kvRow(328, o.kv[i][0], o.kv[i][1]));
  return c;
}

function auditEntry(aksi, waktu, ringkas) {
  var e = autoFrame('Aksi ' + aksi, 'VERTICAL', { gap: 3, w: 352, pad: [0, 0, 8, 0] });
  var h = autoFrame('Judul aksi', 'HORIZONTAL', { w: 352, justify: 'SPACE_BETWEEN', align: 'CENTER' });
  h.appendChild(txt(aksi, { size: FS.small, weight: 'semibold', color: T.p700 }));
  h.appendChild(txt(waktu, { size: FS.nano, color: T.p400 }));
  e.appendChild(h);
  e.appendChild(txt(ringkas, { size: FS.micro, color: T.p500, lh: 150, w: 352 }));
  return e;
}

function kpiBox(label, value, note) {
  var k = autoFrame('KPI ' + label, 'VERTICAL', { pad: [10, 12, 10, 12], gap: 3, r: R.lg, fill: T.p50, stroke: T.p100, w: 168 });
  k.appendChild(txt(label, { size: FS.micro, color: T.p500 }));
  k.appendChild(txt(value, { size: FS.title, weight: 'bold', color: T.p900 }));
  k.appendChild(txt(note, { size: FS.nano, color: T.p400, w: 144, lh: 140 }));
  return k;
}

function kpiGrid(items) {
  var g = autoFrame('KPI', 'VERTICAL', { gap: 8, w: 352 });
  for (var i = 0; i < items.length; i += 2) {
    var r = autoFrame('Baris KPI', 'HORIZONTAL', { gap: 16, w: 352 });
    for (var j = i; j < i + 2 && j < items.length; j++) r.appendChild(kpiBox(items[j][0], items[j][1], items[j][2]));
    g.appendChild(r);
  }
  return g;
}

function distRow(label, count, pct) {
  var r = autoFrame('Distribusi ' + label, 'HORIZONTAL', { w: 352, gap: 10, align: 'CENTER' });
  r.appendChild(txt(label, { size: FS.micro, color: T.p700, w: 76 }));
  var track = autoFrame('Batang ' + label, 'HORIZONTAL', { w: 168, h: 6, r: R.full, fill: T.p100 });
  track.appendChild(autoFrame('Isi ' + label, 'HORIZONTAL', { w: Math.round(168 * pct / 100), h: 6, r: R.full, fill: T.p600 }));
  r.appendChild(track);
  r.appendChild(txt(count + ' \u00B7 ' + pct + '%', { size: FS.micro, weight: 'medium', color: T.p600 }));
  return r;
}

function turnHeader() {
  return { title: 'turn #14', meta: '\u00B7 14:32', copy: true, bind: 'Terikat ke pesan coach yang disorot di sebelah kiri.' };
}

function buildDockScreen() {
  var root = autoFrame('08 \u00B7 Dock terbuka \u2014 tab Turn ini (default)', 'VERTICAL', {
    w: 1280, pad: [40, 64, 40, 64], gap: 20, fill: T.p50, align: 'CENTER'
  });
  var wrap = autoFrame('Container (max-w-6xl)', 'VERTICAL', { w: 1152, gap: 20 });
  add(root, wrap);
  add(wrap, buildHeader(), true);
  var body = autoFrame('Chat + dock (tanpa scrim)', 'HORIZONTAL', { w: 1152, gap: 24 });
  add(wrap, body);

  var chat = card('Kartu chat', { w: 744, h: 700 });
  add(body, chat, true);
  var thread = autoFrame('Thread', 'VERTICAL', { pad: [20, 20, 20, 20], gap: 12, fill: T.white, clip: true });
  add(chat, thread, true);
  thread.layoutGrow = 1;
  add(thread, systemRow('Check-in pagi dicatat'), true);
  add(thread, userRow('Kenapa jadwalku selalu padat di hari Selasa?', 380), true);
  add(thread, coachRow(
    'Selasa kamu punya dua tugas 90 menit di slot pagi, sementara target mingguanmu 5 jam. ' +
    'Satu tugas bisa dipindah ke Kamis tanpa melewati tenggat.',
    640,
    { chips: [{ t: 'Topik: Manajemen waktu', k: 'info' }, { t: '2 sumber', k: 'muted' }], expander: true, ring: true }
  ), true);
  add(thread, userRow('Kalau aku pindahkan, apakah tenggatnya masih aman?', 400), true);
  add(chat, line(), true);
  add(chat, buildComposer(), true);

  var dock = buildDock('Turn ini', turnHeader(), turnContent());
  add(body, dock);
  // tinggi kedua kolom disamakan: dock mengikuti isinya (lantai 780 agar tidak kepotong)
  var hgt = Math.max(dock.height, 780);
  dock.primaryAxisSizingMode = 'FIXED';
  dock.resize(dock.width, hgt);
  chat.resize(chat.width, hgt);
  return root;
}

function turnContent() {
  return [
    sec('Kontrak', [
      ['state', 'resolved'], ['type', 'jawaban'], ['domain', 'manajemen waktu'],
      ['path/arm', 'topik-pasti \u00B7 standar'], ['plan_leak', 'tidak ada'],
      ['pii_findings', '0 temuan'], ['sources_dropped', '1 dari 3 kandidat disaring']
    ]),
    sep(),
    sec('Sumber & Retrieval', [
      ['used_sources', '2'], ['retrieval', '2 dari 2 kandidat masuk'],
      ['partisi', 'goal aktif \u00B7 12 dokumen'],
      ['egress host', 'api.knowledge.contoh.test'],
      ['pagu', '80.000 token/hari \u00B7 terpakai 21.400']
    ]),
    sep(),
    sec('Waktu & Biaya', [
      ['assembly', '240 ms'], ['durasi', '1.842 ms'],
      ['token', '1.142 masuk \u00B7 386 keluar'], ['attempts', '1 kali, tanpa ulang']
    ]),
    sep(),
    sec('HITL', [['proposal', 'pr_2f91 \u00B7 menunggu persetujuan']],
      'Tombol setujui/tolak ada di panel persetujuan, bukan di bubble.')
  ];
}

function pipeContent() {
  return [
    sec('Percobaan & pemanggilan model', null,
      'Hanya data terstruktur \u2014 tanpa potongan keluaran model.', [
        attemptCard({ n: 1, title: 'Percobaan 1', status: 'selesai', kv: [
          ['provider', 'openai \u00B7 gpt-4o-mini'], ['status', 'sukses'],
          ['durasi', '1.842 ms'], ['token', '1.142 masuk \u00B7 386 keluar']
        ] }),
        attemptCard({ n: 2, title: 'Percobaan 2', status: 'tidak dijalankan', kv: [
          ['alasan', 'percobaan pertama sudah sukses'], ['durasi', '\u2014'], ['token', '\u2014']
        ] })
      ]),
    sep(),
    sec('Urutan', [['langkah', 'ambil pengetahuan \u2192 susun jawaban \u2192 catat turn'], ['gagal', 'tidak ada']])
  ];
}

function auditContent() {
  return [
    sec('Riwayat aksi turn ini', null,
      'Ringkasan bersifat struktural \u2014 tanpa kutipan isi percakapan.', [
        auditEntry('kirim_pertanyaan', '14:32:04', 'goal_id gl_7c21 \u00B7 412 karakter'),
        auditEntry('ambil_pengetahuan', '14:32:05', '2 sumber masuk \u00B7 1 disaring'),
        auditEntry('susun_jawaban', '14:32:06', 'provider openai \u00B7 386 token keluar'),
        auditEntry('catat_proposal', '14:32:07', 'proposal pr_2f91 \u00B7 menunggu')
      ]),
    sep(),
    sec('Identitas', [['turn_id', 'tr_9f02'], ['request_id', 'req_4c81b0'], ['durasi total', '1.842 ms']])
  ];
}

function metrikContent() {
  return [
    sec('KPI agregat', null,
      'Angka baku dari 128 turn terakhir \u2014 tanpa arah tren, karena tidak ada pembanding periode.', [
        kpiGrid([
          ['Accept Rate', '68%', '87 disetujui dari 128'],
          ['Tugas Disarankan', '128', 'usulan masuk'],
          ['Tugas Ditolak', '29', '23% dari usulan'],
          ['Tugas Tertunda', '12', 'belum diputuskan']
        ])
      ]),
    sep(),
    sec('Distribusi aksi', null, null, [
      distRow('Disetujui', 87, 68), distRow('Ditolak', 29, 23), distRow('Ditunda', 12, 9)
    ])
  ];
}

function buildDockFrames() {
  var f = [buildDockScreen()];
  f.push(dockPanel('09 \u00B7 Dock \u2014 tab Pipeline', 'Dock: tab Pipeline',
    'Jejak percobaan dan pemanggilan model dalam bentuk data terstruktur. Bukan modal: tanpa scrim, jadi chat tetap terbaca di sebelahnya.',
    'Pipeline', turnHeader(), pipeContent()));
  f.push(dockPanel('10 \u00B7 Dock \u2014 tab Audit', 'Dock: tab Audit',
    'Daftar aksi struktural per turn. Ringkasannya memakai kode dan tipe, bukan kutipan isi percakapan. Tanpa focus trap.',
    'Audit', turnHeader(), auditContent()));
  f.push(dockPanel('11 \u00B7 Dock \u2014 tab Metrik', 'Dock: tab Metrik',
    'KPI agregat dan distribusi aksi. Tanpa tren: tidak ada panah naik/turun yang lahir dari satu titik data.',
    'Metrik', turnHeader(), metrikContent()));
  f.push(dockPanel('12 \u00B7 Dock \u2014 pesan tanpa meta', 'Dock: pesan tanpa meta',
    'Pesan tanpa data meta: empty-state jujur, bukan tebakan dari isi percakapan. Panel non-modal.',
    'Turn ini', { title: 'pesan lama', meta: 'bukan turn sesi ini', copy: false, bind: 'Tidak terikat ke turn mana pun.' },
    [emptyState('Trace hanya tersedia untuk turn di sesi ini.',
      'Pesan ini berasal dari riwayat lama dan tidak menyimpan turn_id. Isinya tidak kami tebak.')])); 
  return f;
}

// ---------- 8. Mobile: chat 360px + bottom sheet (modal) ----------
function mBtn(label, name, fill) {
  var b = autoFrame(name, 'HORIZONTAL', { w: 44, h: 44, r: R.xl, fill: fill || T.p50, stroke: T.p200, align: 'CENTER', justify: 'CENTER' });
  b.appendChild(txt(label, { size: FS.body, weight: 'semibold', color: T.p700 }));
  return b;
}

function mobileHeader() {
  var h = autoFrame('Header mobile', 'HORIZONTAL', { w: 360, pad: [12, 16, 12, 16], justify: 'SPACE_BETWEEN', align: 'CENTER', fill: T.white });
  var t = autoFrame('Judul', 'VERTICAL', { gap: 2 });
  t.appendChild(txt('AI Learning Coach', { size: FS.base, weight: 'semibold', color: T.p900 }));
  t.appendChild(txt('Rencana belajarmu', { size: FS.nano, color: T.p400 }));
  h.appendChild(t);
  h.appendChild(mBtn('\u2317', 'Tombol [⌗] Diagnostik (target sentuh 44\u00D744 \u2014 pengganti rail 20px)'));
  return h;
}

function buildMobileChat() {
  var root = autoFrame('13 \u00B7 Mobile \u2014 chat 360px', 'VERTICAL', { w: 360, h: 640, fill: T.p50, clip: true });
  root.appendChild(mobileHeader());
  add(root, line(), true);
  var chat = autoFrame('Area chat', 'VERTICAL', { w: 360, h: 494, fill: T.white, clip: true });
  add(root, chat, true);
  var thread = autoFrame('Thread', 'VERTICAL', { pad: [16, 16, 16, 16], gap: 10, fill: T.white });
  add(chat, thread, true);
  thread.layoutGrow = 1;
  add(thread, systemRow('Check-in pagi dicatat'), true);
  add(thread, userRow('Kenapa jadwalku selalu padat di hari Selasa?', 240), true);
  add(thread, coachRow(
    'Selasa kamu punya dua tugas 90 menit di slot pagi. Satu tugas bisa dipindah ke Kamis tanpa melewati tenggat.',
    280,
    { chips: [{ t: 'Topik: Manajemen waktu', k: 'info' }], expander: true }
  ), true);
  add(thread, userRow('Kalau aku pindahkan, apakah tenggatnya masih aman?', 250), true);
  add(root, line(), true);
  add(root, buildComposer(), true);
  return root;
}

function sheetTop() {
  var t = autoFrame('Pegangan + header sheet', 'VERTICAL', { w: 360 });
  var g = autoFrame('Pegangan', 'HORIZONTAL', { w: 360, pad: [8, 0, 4, 0], justify: 'CENTER' });
  g.appendChild(autoFrame('Batang pegangan', 'HORIZONTAL', { w: 36, h: 4, r: R.full, fill: T.p200 }));
  t.appendChild(g);
  var h = autoFrame('Header sheet', 'HORIZONTAL', { w: 360, pad: [6, 16, 8, 16], justify: 'SPACE_BETWEEN', align: 'CENTER', fill: T.p50 });
  var l = autoFrame('Turn', 'HORIZONTAL', { gap: 6, align: 'CENTER' });
  l.appendChild(txt('turn #14', { size: FS.small, weight: 'semibold', color: T.p900 }));
  l.appendChild(txt('\u00B7 14:32', { size: FS.nano, color: T.p400 }));
  h.appendChild(l);
  h.appendChild(mBtn('\u2715', 'Tombol tutup sheet (target sentuh 44\u00D744)', T.white));
  t.appendChild(h);
  return t;
}

function sheetContent() {
  var w = 328;
  return [
    sec('Kontrak', [
      ['state', 'resolved'], ['type', 'jawaban'], ['domain', 'manajemen waktu'],
      ['plan_leak', 'tidak ada'], ['pii_findings', '0 temuan']
    ], null, null, w),
    sep(w),
    sec('Sumber & Retrieval', [
      ['used_sources', '2'], ['retrieval', '2 dari 2 masuk'], ['partisi', 'goal aktif \u00B7 12 dokumen']
    ], null, null, w),
    sep(w),
    sec('Waktu & Biaya', [['durasi', '1.842 ms'], ['token', '1.142 masuk \u00B7 386 keluar']], null, null, w),
    sep(w),
    sec('HITL', [['proposal', 'pr_2f91 \u00B7 menunggu persetujuan']], null, null, w)
  ];
}

function buildBottomSheet() {
  var f = autoFrame('14 \u00B7 Mobile \u2014 diagnostik bottom sheet', 'VERTICAL', { w: 448, pad: [32, 32, 32, 32], gap: 12, fill: T.p50 });
  f.appendChild(txt('Bottom sheet diagnostik (modal)', { size: FS.base, weight: 'semibold', color: T.p900 }));
  f.appendChild(txt(
    'MODAL \u2014 berbeda dari dock desktop yang non-modal: sheet ini memakai role="dialog", aria-modal="true", ' +
    'dan focus trap, sehingga fokus dikunci di dalam sheet sampai ditutup lalu kembali ke tombol [⌗]. ' +
    'Scrim setengah transparan menutupi chat di belakangnya dan tinggi sheet maksimal 85% dari tinggi layar. ' +
    'Catatan keterjangkauan: seluruh target sentuh di layar mobile ini berukuran minimal 44\u00D744 px \u2014 ' +
    'tombol [⌗], tombol tutup, dan tombol Kirim.',
    { size: FS.micro, color: T.p500, lh: 150, w: 384 }));

  var phone = autoFrame('Layar mobile 360 (sheet terbuka)', 'VERTICAL', { w: 360, fill: T.p50, clip: true });
  var behind = autoFrame('Scrim 55% \u2014 chat di baliknya', 'VERTICAL', { w: 360, h: 96, pad: [14, 16, 14, 16], gap: 8 });
  behind.fills = [solid(T.white), solid(T.p900, 0.55)];
  var ph = txt('AI Learning Coach', { size: FS.small, weight: 'semibold', color: T.p900 });
  ph.opacity = 0.6;
  behind.appendChild(ph);
  var pb = autoFrame('Bubble di balik scrim', 'HORIZONTAL', { w: 190, h: 34, r: R.xxl, fill: T.p50 });
  pb.opacity = 0.5;
  behind.appendChild(pb);
  phone.appendChild(behind);

  var sheet = autoFrame('Bottom sheet (maks 85% tinggi layar)', 'VERTICAL', {
    w: 360, fill: T.white, rTL: 16, rTR: 16, clip: true, soft: true
  });
  sheet.appendChild(sheetTop());
  add(sheet, tabBar('Turn ini'), true);
  add(sheet, line(), true);
  var body = autoFrame('Isi sheet', 'VERTICAL', { w: 360, pad: [14, 16, 16, 16], gap: 12 });
  var items = sheetContent();
  for (var i = 0; i < items.length; i++) body.appendChild(items[i]);
  sheet.appendChild(body);
  phone.appendChild(sheet);
  f.appendChild(phone);
  return f;
}

function buildMobileFrames() { return [buildMobileChat(), buildBottomSheet()]; }

// ---------- 5. Main (idempoten) ----------
async function main() {
  try {
    await loadFonts();
    var PAGE = 'Coach Chat \u2014 Rework';
    var olds = figma.root.children.filter(function (p) { return p.name === PAGE; });
    var page = figma.createPage();
    page.name = PAGE;
    figma.currentPage = page;
    for (var i = 0; i < olds.length; i++) {
      try { olds[i].remove(); } catch (e) { /* page lama gagal dihapus */ }
    }
    var root = buildScreen();
    var trust = buildTrustFrames();
    for (var k = 0; k < trust.length; k++) { trust[k].x = 1360 + k * 752; trust[k].y = 0; }
    var docks = buildDockFrames();
    var dx = 1360, my = 1000;
    for (var m = 0; m < docks.length; m++) {
      docks[m].x = dx; docks[m].y = 1000; dx += docks[m].width + 64;
      my = Math.max(my, 1000 + docks[m].height);
    }
    my += 64;
    var mobs = buildMobileFrames();
    var mx = 1360;
    for (var n = 0; n < mobs.length; n++) { mobs[n].x = mx; mobs[n].y = my; mx += mobs[n].width + 64; }
    var all = [root].concat(trust).concat(docks).concat(mobs);
    figma.viewport.scrollAndZoomIntoView(all);
    figma.notify('Halaman "' + PAGE + '" dibuat ulang: 1 layar chat + ' + trust.length + ' frame trust + ' +
      docks.length + ' frame dock + ' + mobs.length + ' frame mobile.');
  } catch (err) {
    figma.notify('Gagal: ' + (err && err.message ? err.message : String(err)), { error: true });
  }
  figma.closePlugin();
}

main();
