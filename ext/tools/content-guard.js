#!/usr/bin/env node
/**
 * content-guard.js — حارس محتوى موقع مستشفى الأنهار التخصصي
 * ------------------------------------------------------------------
 * يقرأ الصفحات الحالية ويقارنها بـ:
 *   1) ext/content-inventory.json   (جرد المحتوى المعتمد)
 *   2) أرقام تقرير الفحص الأول       (مثبّتة أدناه في FIRST_AUDIT)
 *   3) أقدم لقطة في ext/snapshots/   (أساس مقارنة الكلمات كلمة بكلمة)
 *
 * لا يعدّل أي ملف أصلي إطلاقًا. الملفات الوحيدة التي يكتبها:
 *   ext/snapshots/<timestamp>.json   (فقط عند تمرير --snapshot أو أول تشغيل)
 *
 * الاستخدام:
 *   node ext/tools/content-guard.js              # فحص فقط
 *   node ext/tools/content-guard.js --snapshot   # فحص + حفظ لقطة أساس جديدة
 *   node ext/tools/content-guard.js --verbose     # تفاصيل كل نقص
 *
 * رموز الخروج: 0 = لا تراجع، 1 = وُجد تراجع في المحتوى
 * Node 18+ — بدون أي مكتبة خارجية.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXT = path.join(ROOT, 'ext');
const SNAP_DIR = path.join(EXT, 'snapshots');
const INVENTORY = path.join(EXT, 'content-inventory.json');

const ARGS = process.argv.slice(2);
const DO_SNAPSHOT = ARGS.includes('--snapshot');
const VERBOSE = ARGS.includes('--verbose');

/* أرقام تقرير الفحص الأول (المهمة 1) — مرجع ثابت لا يُعدّل */
const FIRST_AUDIT = {
  'index.html':     { words: 3616, lines: 2266, links: 71, images: 15, sections: 12, items: 75 },
  'offers.html':    { words:  915, lines:  925, links: 49, images:  8, sections:  7, items: 12 },
  'pr.html':        { words:  705, lines: 2569, links: 35, images:  3, sections:  8, items: 14 },
  'ancillary.html': { words:  549, lines:  814, links: 16, images:  2, sections:  6, items: 20 },
  'doctors.html':   { words:  437, lines: 1574, links: 22, images: 10, sections:  1, items: 65 },
  'units.html':     { words:  210, lines:  204, links: 16, images:  2, sections:  1, items: 31 },
  'clinics.html':   { words:  193, lines:  146, links: 14, images:  2, sections:  1, items:  7 },
  'news.html':      { words:  149, lines:  114, links: 14, images:  2, sections:  1, items:  0 },
  '404.html':       { words:   16, lines:   24, links:  2, images:  0, sections:  0, items:  0 },
};

const PAGES = Object.keys(FIRST_AUDIT);

/* ------------------------------ أدوات نصية ------------------------------ */

const ENTITIES = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&lt;': '<', '&gt;': '>', '&times;': '×', '&mdash;': '—', '&ndash;': '–',
  '&hellip;': '…', '&rlm;': '', '&lrm;': '', '&zwj;': '',
};

function decode(s) {
  return s.replace(/&[a-zA-Z#0-9]+;/g, (m) => (ENTITIES[m] !== undefined ? ENTITIES[m] : m));
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ');
}

function stripCode(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

function textOf(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function wordsOf(text) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
}

const HIDDEN_EXCLUDE = /(sr-only|visually-hidden|screen-reader-text|visuallyhidden)/i;

/** يستخرج النص المخفي بـ CSS: عناصر تحمل أصناف الإخفاء أو aria-hidden="true" */
function hiddenTextOf(html) {
  const blocks = [];
  const re = /<(section|div|span|p|aside)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[2] || '';
    const isHidden = HIDDEN_EXCLUDE.test(attrs) || /aria-hidden\s*=\s*["']true["']/i.test(attrs);
    if (isHidden) blocks.push(textOf(stripCode(m[3])));
  }
  return blocks.join(' ');
}

/** يحذف كتل المحتوى المخفي من HTML قبل عدّ الكلمات الظاهرة */
function removeHidden(html) {
  return html.replace(
    /<(section|div|span|p|aside)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag, attrs) => {
      const isHidden = HIDDEN_EXCLUDE.test(attrs || '') || /aria-hidden\s*=\s*["']true["']/i.test(attrs || '');
      return isHidden ? ' ' : full;
    }
  );
}

/* ------------------------------ تحليل صفحة ------------------------------ */

function analyze(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const html = stripComments(raw);
  const body = stripCode(html);

  const hiddenText = hiddenTextOf(body);
  const visibleText = textOf(removeHidden(body));

  const links = [...body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const imgTags = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const images = imgTags.map((t) => {
    const src = /src\s*=\s*["']([^"']*)["']/i.exec(t);
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(t);
    const loading = /loading\s*=\s*["']([^"']*)["']/i.exec(t);
    return {
      src: src ? src[1].trim() : '',
      alt: alt ? alt[1] : null,
      loading: loading ? loading[1] : null,
    };
  });

  const ids = [...body.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const sections = (body.match(/<section\b/gi) || []).length;
  const items = (body.match(/class="[^"]*(?:card|item|chip|tab-btn)[^"]*"/gi) || []).length;
  const headings = [...body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ tag: 'h' + m[1], text: textOf(m[2]) }))
    .filter((h) => h.text);

  const scriptSrcs = [...raw.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const styleSrcs = [...raw.matchAll(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);

  return {
    words: wordsOf(visibleText).length,
    hiddenWords: wordsOf(hiddenText).length,
    visibleText,
    hiddenText,
    lines: raw.split('\n').length,
    bytes: Buffer.byteLength(raw),
    links,
    linkCount: (body.match(/<a\b/gi) || []).length,
    images,
    ids,
    sections,
    items,
    headings,
    scriptSrcs,
    styleSrcs,
    hasJsonLd: /application\/ld\+json/i.test(raw),
    hasCanonical: /rel\s*=\s*["']canonical["']/i.test(raw),
  };
}

/* ------------------------------ اللقطات ------------------------------ */

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function listSnapshots() {
  if (!fs.existsSync(SNAP_DIR)) return [];
  return fs
    .readdirSync(SNAP_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function buildSnapshot(current) {
  const snap = { created: new Date().toISOString(), pages: {} };
  for (const page of PAGES) {
    const a = current[page];
    snap.pages[page] = {
      words: a.words,
      hiddenWords: a.hiddenWords,
      lines: a.lines,
      links: a.linkCount,
      images: a.images.map((i) => i.src),
      sections: a.sections,
      items: a.items,
      wordList: wordsOf(a.visibleText),
      headings: a.headings.map((h) => h.text),
    };
  }
  return snap;
}

function saveSnapshot(snap) {
  ensureDir(SNAP_DIR);
  const file = path.join(SNAP_DIR, `${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(snap, null, 1), 'utf8');
  return path.relative(ROOT, file);
}

/* ------------------------------ مقارنات ------------------------------ */

function multiset(list) {
  const m = new Map();
  for (const w of list) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

function missingWords(baseList, curList) {
  const b = multiset(baseList);
  const c = multiset(curList);
  const out = [];
  for (const [w, n] of b) {
    const have = c.get(w) || 0;
    if (have < n) out.push({ word: w, before: n, after: have });
  }
  return out;
}

function pad(s, n) {
  s = String(s);
  const len = [...s].length;
  return len >= n ? s : ' '.repeat(n - len) + s;
}

function flag(cur, base) {
  if (base === 0) return cur === 0 ? '✅' : '✅+';
  if (cur < base) return '❌';
  if (cur > base) return '✅+';
  return '✅';
}

/* ------------------------------ التنفيذ ------------------------------ */

function main() {
  if (!fs.existsSync(INVENTORY)) {
    console.error('❌ لم أجد ext/content-inventory.json — شغّل المهمة 1 أولاً.');
    process.exit(2);
  }
  const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

  const current = {};
  for (const page of PAGES) {
    const p = path.join(ROOT, page);
    if (!fs.existsSync(p)) {
      console.error(`❌ الصفحة مفقودة: ${page}`);
      current[page] = null;
      continue;
    }
    current[page] = analyze(p);
  }

  /* أساس الكلمات: أقدم لقطة */
  let snaps = listSnapshots();
  let baseSnap = null;
  let note = '';
  if (snaps.length === 0) {
    const snap = buildSnapshot(current);
    const saved = saveSnapshot(snap);
    baseSnap = snap;
    note = `أُنشئت لقطة أساس جديدة: ${saved}`;
    snaps = [path.basename(saved)];
  } else {
    baseSnap = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, snaps[0]), 'utf8'));
    note = `أساس المقارنة: ${snaps[0]}`;
  }

  const regressions = [];

  /* ---------- الجدول ---------- */
  const H = ['page', 'words', 'hidden', 'lines', 'links', 'imgs', 'sect', 'items', 'status'];
  console.log('');
  console.log('  content-guard — حارس محتوى مستشفى الأنهار التخصصي');
  console.log('  (الأساس = أقدم لقطة في ext/snapshots | ❌ = نقص عن الأساس)');
  console.log('');
  console.log('  ' + H.map((h, i) => pad(h, [16, 8, 8, 7, 7, 6, 6, 7, 8][i])).join(' | '));
  console.log('  ' + '-'.repeat(84));

  let tot = { w: 0, h: 0, l: 0, li: 0, im: 0, s: 0, it: 0 };
  let totBase = { w: 0, h: 0, l: 0, li: 0, im: 0, s: 0, it: 0 };

  for (const page of PAGES) {
    const a = current[page];
    const snap = baseSnap.pages[page];
    const audit = FIRST_AUDIT[page];
    const inv = inventory.pages[page] || {};
    /* الأساس: اللقطة، ثم الفحص الأول، ثم الجرد — الأقل دائمًا هو الحد الأدنى المسموح */
    const base = {
      words: snap ? snap.words : audit.words,
      hidden: snap ? snap.hiddenWords : 0,
      lines: snap ? snap.lines : audit.lines,
      links: snap ? snap.links : audit.links,
      images: snap ? snap.images.length : audit.images,
      sections: snap ? snap.sections : audit.sections,
      items: snap ? snap.items : audit.items,
    };
    if (inv.links_count !== undefined) base.links = Math.min(base.links, inv.links_count);
    if (inv.sections !== undefined) base.sections = Math.min(base.sections, inv.sections);
    if (!a) {
      console.log(pad(page, 16) + '  ❌ الصفحة مفقودة');
      regressions.push(`${page}: الملف غير موجود`);
      continue;
    }
    const mW = flag(a.words, base.words);
    const mH = a.hiddenWords >= base.hidden ? 'OK' : '❌';
    const mL = flag(a.lines, base.lines);
    const mLi = flag(a.linkCount, base.links);
    const mIm = flag(a.images.length, base.images);
    const mS = flag(a.sections, base.sections);
    const mIt = flag(a.items, base.items);
    const marks = [mW, mH, mL, mLi, mIm, mS, mIt];
    const bad = marks.slice(0, 5).includes('❌');
    if (bad) regressions.push(`${page}: نقص في أحد العدّادات`);

    console.log(
      '  ' + [
        pad(page, 16), pad(`${a.words}${mW}`, 8), pad(`${a.hiddenWords}${mH === 'OK' ? '' : mH}`, 8),
        pad(`${a.lines}${mL}`, 7), pad(`${a.linkCount}${mLi}`, 7), pad(`${a.images.length}${mIm}`, 6),
        pad(`${a.sections}${mS}`, 6), pad(`${a.items}${mIt}`, 7), pad(mW === '❌' ? 'FAIL' : 'PASS', 8),
      ].join(' | ')
    );

    tot.w += a.words; tot.h += a.hiddenWords; tot.l += a.lines;
    tot.li += a.linkCount; tot.im += a.images.length; tot.s += a.sections; tot.it += a.items;
    totBase.w += base.words; totBase.l += base.lines; totBase.li += base.links;
    totBase.im += base.images; totBase.s += base.sections; totBase.it += base.items;
  }

  console.log('  ' + '-'.repeat(84));
  const line = (label, w, h, l, li, im, s2, it, st) =>
    '  ' + [pad(label, 16), pad(`${w}`, 8), pad(`${h}`, 8), pad(`${l}`, 7), pad(`${li}`, 7),
      pad(`${im}`, 6), pad(`${s2}`, 6), pad(`${it}`, 7), pad(st, 8)].join(' | ');
  console.log(line('TOTAL/الإجمالي', tot.w, tot.h, tot.l, tot.li, tot.im, tot.s, tot.it,
    tot.w < totBase.w ? 'FAIL' : 'PASS'));
  console.log(line('BASELINE/الأساس', totBase.w, '—', totBase.l, totBase.li, totBase.im, totBase.s, totBase.it, ''));
  console.log(`\n${note}`);
  console.log(`كلمات ظاهرة: ${tot.w}  |  كلمات مخفية بـ CSS: ${tot.h}  (النسبة: ${((tot.h / (tot.w + tot.h)) * 100).toFixed(1)}%)\n`);

  /* ---------- الكلمات المفقودة ---------- */
  const lostWords = [];
  for (const page of PAGES) {
    if (!current[page] || !baseSnap.pages[page]) continue;
    const miss = missingWords(baseSnap.pages[page].wordList || [], wordsOf(current[page].visibleText));
    if (miss.length) lostWords.push({ page, miss });
  }
  console.log('── الكلمات المفقودة ' + '─'.repeat(60));
  if (!lostWords.length) console.log('  ✅ لا توجد كلمة واحدة مفقودة');
  else {
    for (const { page, miss } of lostWords) {
      regressions.push(`${page}: ${miss.length} كلمة مفقودة`);
      const show = VERBOSE ? miss : miss.slice(0, 8);
      console.log(`  ❌ ${page}: ${miss.length} كلمة`);
      console.log('     ' + show.map((m) => `«${m.word}» (${m.before}→${m.after})`).join('  '));
      if (!VERBOSE && miss.length > 8) console.log(`     … و${miss.length - 8} أخرى (استخدم --verbose)`);
    }
  }

  /* ---------- الخدمات المفقودة ---------- */
  const allText = {};
  for (const page of PAGES) allText[page] = current[page] ? current[page].visibleText : '';
  const corpus = Object.values(allText).join(' ');
  console.log('\n── الخدمات والكيانات المفقودة ' + '─'.repeat(50));
  let svcMissing = 0;
  for (const [group, list] of Object.entries(inventory.entities || {})) {
    for (const name of list) {
      if (!corpus.includes(name)) {
        console.log(`  ❌ [${group}] «${name}»`);
        regressions.push(`خدمة/كيان مفقود: ${name} (${group})`);
        svcMissing++;
      }
    }
  }
  /* العناوين (الأقسام) لكل صفحة */
  for (const page of PAGES) {
    if (!current[page] || !inventory.pages[page]) continue;
    for (const h of inventory.pages[page].headings || []) {
      if (!(current[page].visibleText + ' ' + current[page].hiddenText).includes(h.text)) {
        console.log(`  ❌ [${page}] عنوان مفقود: «${h.text.slice(0, 60)}»`);
        regressions.push(`${page}: عنوان مفقود «${h.text.slice(0, 40)}»`);
        svcMissing++;
      }
    }
  }
  if (!svcMissing) console.log('  ✅ كل الخدمات والعناوين موجودة');

  /* ---------- الأقسام الناقصة ---------- */
  console.log('\n── الأقسام (<section>) ' + '─'.repeat(58));
  let secMissing = 0;
  for (const page of PAGES) {
    if (!current[page]) continue;
    const b = FIRST_AUDIT[page].sections;
    if (current[page].sections < b) {
      console.log(`  ❌ ${page}: ${b} → ${current[page].sections}`);
      secMissing++;
    }
  }
  if (!secMissing) console.log('  ✅ لا يوجد قسم ناقص');

  /* ---------- الروابط الداخلية المكسورة ---------- */
  console.log('\n── الروابط الداخلية المكسورة ' + '─'.repeat(50));
  const idsCache = {};
  const getIds = (file) => {
    if (!idsCache[file]) {
      const p = path.join(ROOT, file);
      idsCache[file] = fs.existsSync(p) ? analyze(p).ids : null;
    }
    return idsCache[file];
  };
  let broken = 0;
  for (const page of PAGES) {
    if (!current[page]) continue;
    for (const href of current[page].links) {
      if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
      const [filePart, hash] = href.split('#');
      if (!filePart && hash) {
        if (!current[page].ids.includes(hash)) {
          console.log(`  ❌ ${page}: #${hash} (لا يوجد عنصر بهذا المعرّف)`);
          regressions.push(`${page}: مرساة مكسورة #${hash}`);
          broken++;
        }
        continue;
      }
      const target = filePart || page;
      /* Cloudflare Pages يحوّل /services/dental → /services/dental.html */
      const candidates = [target, target.replace(/\/+$/, '') + '.html', target.replace(/\/+$/, '') + '/index.html'];
      const exists = candidates.some((c) => c && fs.existsSync(path.join(ROOT, c)));
      if (!exists) {
        console.log(`  ❌ ${page}: ${target} (الملف غير موجود)`);
        regressions.push(`${page}: رابط مكسور ${target}`);
        broken++;
        continue;
      }
      if (hash) {
        const resolved = candidates.find((c) => c && fs.existsSync(path.join(ROOT, c))) || target;
        const ids = getIds(resolved);
        if (ids && !ids.includes(hash)) {
          console.log(`  ❌ ${page}: ${target}#${hash} (لا يوجد معرّف مطابق)`);
          regressions.push(`${page}: مرساة مكسورة ${target}#${hash}`);
          broken++;
        }
      }
    }
  }
  if (!broken) console.log('  ✅ لا يوجد رابط داخلي مكسور');

  /* ---------- الصور المفقودة ---------- */
  console.log('\n── الصور المفقودة ' + '─'.repeat(60));
  let imgMissing = 0;
  const seen = new Set();
  for (const page of PAGES) {
    if (!current[page]) continue;
    for (const img of current[page].images) {
      if (!img.src || /^(https?:|data:)/i.test(img.src)) continue;
      const clean = img.src.split('?')[0];
      if (seen.has(clean)) continue;
      seen.add(clean);
      if (!fs.existsSync(path.join(ROOT, clean))) {
        console.log(`  ❌ ${page}: ${clean} (غير موجود على القرص)`);
        regressions.push(`صورة مفقودة: ${clean}`);
        imgMissing++;
      }
    }
  }
  /* صور كانت في الأساس ولم تعد مستخدمة */
  for (const page of PAGES) {
    const baseImgs = (baseSnap.pages[page] && baseSnap.pages[page].images) || [];
    const curImgs = current[page] ? current[page].images.map((i) => i.src.split('?')[0]) : [];
    for (const src of baseImgs) {
      const c = src.split('?')[0];
      if (c && !curImgs.includes(c)) {
        console.log(`  ⚠ ${page}: الصورة ${c} كانت مستخدمة ولم تعد`);
        imgMissing++;
      }
    }
  }
  if (!imgMissing) console.log(`  ✅ كل الصور موجودة (${seen.size} صورة مستخدمة)`);

  /* ---------- ملحق HEAD ---------- */
  console.log('\n── وسوم <head> (معلوماتي) ' + '─'.repeat(54));
  for (const page of PAGES) {
    if (!current[page]) continue;
    const a = current[page];
    console.log(
      `  ${pad(page, 16)} canonical:${a.hasCanonical ? '✅' : '—'}  JSON-LD:${a.hasJsonLd ? '✅' : '—'}  ` +
        `ALT ناقص: ${a.images.filter((i) => i.alt === null).length}  lazy: ${a.images.filter((i) => i.loading === 'lazy').length}/${a.images.length}`
    );
  }

  /* ---------- الحفظ ---------- */
  if (DO_SNAPSHOT) {
    const saved = saveSnapshot(buildSnapshot(current));
    console.log(`\n📸 حُفظت لقطة جديدة: ${saved}`);
  }

  /* ---------- الخلاصة ---------- */
  console.log('\n' + '═'.repeat(88));
  if (regressions.length === 0) {
    console.log('✅ content-guard: لا تراجع — المحتوى سليم بالكامل.');
    process.exit(0);
  } else {
    console.log(`❌ content-guard: ${regressions.length} مخالفة — يجب التراجع فورًا:`);
    regressions.forEach((r) => console.log('   • ' + r));
    process.exit(1);
  }
}

main();
