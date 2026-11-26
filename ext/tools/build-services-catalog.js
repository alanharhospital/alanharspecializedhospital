#!/usr/bin/env node
/**
 * build-services-catalog.js — مولّد كتالوج الخدمات الطبية
 * ------------------------------------------------------------------
 * يقرأ المحتوى الموجود فعلًا في صفحات الموقع (النصوص المخفية بـ CSS
 * + الأقسام الظاهرة) ويُنتج ملفين ثابتين:
 *
 *   ext/data/services-catalog.json    كتالوج الخدمات
 *   ext/data/aliases-suggested.json   مرادفات مقترحة (approved:false)
 *
 * لا يعدّل أي ملف أصلي. Node 18+ بدون أي مكتبة خارجية.
 * كل الأسماء تُنسخ كما وردت في المصدر بلا ترجمة ولا تصحيح طبي.
 *
 * التشغيل: node ext/tools/build-services-catalog.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const decisionEngine = require('./catalog-decisions');
const decisions = decisionEngine.load();

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'ext', 'data');

/* ----------------------------- أدوات نصية ----------------------------- */

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** يقسّم نصًا عربيًا على الفاصلة «،» مع احترام الأقواس: (صغرى، وسطى، كبرى) تبقى عنصرًا واحدًا */
function splitItems(text) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if ((ch === '،' || ch === '؛') && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out
    .map((s) => s.replace(/\s+/g, ' ').trim().replace(/[.،؛]+$/g, '').trim())
    .filter((s) => s.length >= 3);
}

/** مفتاح إزالة التكرار فقط — لا يُخزَّن ولا يُعرض */
function normKey(name) {
  return name
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل وتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/* ------------------- قراءة الكتلة المخفية وتقسيمها ------------------- */

function extractHiddenSection(html) {
  const start = html.indexOf('<section class="sr-only-seo"');
  if (start === -1) return null;
  const end = html.indexOf('</section>', start);
  return html.slice(start, end + '</section>'.length);
}

/** يعيد قائمة بنود مرقّمة: [{ liIndex, heading, text }] بالترتيب نفسه في الصفحة */
function parseEntries(hiddenHtml) {
  const entries = [];
  const headings = [];
  const re = /(<h[23][^>]*>[\s\S]*?<\/h[23]>)|(<li[^>]*>([\s\S]*?)<\/li>)/gi;
  let heading = '(بداية القسم)';
  let liIndex = 0;
  let m;
  while ((m = re.exec(hiddenHtml)) !== null) {
    if (m[1]) {
      heading = textOf(m[1]);
      headings.push(heading);
    } else {
      entries.push({ liIndex: liIndex++, heading, text: textOf(m[3]) });
    }
  }
  return { entries, headings };
}

/* ------------------------- تصنيف المجموعات ------------------------- */
/* الفئة مأخوذة من تجميع المصدر نفسه (كل <li> = بند في سجل الأسعار) */

const CATEGORY_BY_LI = [
  'تجهيزات وأسرة وأجهزة', // 0  ICU/PICU/NICU/رقود/أجهزة
  'تجهيزات وأسرة وأجهزة', // 1
  'تجهيزات وأسرة وأجهزة', // 2
  'تجهيزات وأسرة وأجهزة', // 3
  'تجهيزات وأسرة وأجهزة', // 4
  'تجهيزات وأسرة وأجهزة', // 5
  'تجهيزات وأسرة وأجهزة', // 6
  'تجهيزات وأسرة وأجهزة', // 7
  'عمليات جراحية',        // 8  المخ والأعصاب
  'عمليات جراحية',        // 9  العظام والمفاصل
  'عمليات جراحية',        // 10 الجراحة العامة والأوعية
  'عمليات جراحية',        // 11 الكلى والمسالك
  'مختبر',                // 12 المختبر وبنك الدم
  'أشعة',                 // 13 مركز الأشعة التشخيصية
  'تخدير',                // 14 أجور التخدير
  'أسنان',                // 15 قلع
  'أسنان',                // 16 لثة وتبييض
  'أسنان',                // 17 سحب عصب
  'أسنان',                // 18 حشوات
  'أسنان',                // 19 تركيبات
  'أسنان',                // 20 أطقم
  'أسنان',                // 21 جراحة فم وتقويم وزراعة
  'إجراءات وعمليات صغرى', // 22
  'علاج طبيعي',           // 23
  'قلب',                  // 24
  'أنف وأذن وحنجرة',      // 25
  'عظام ومفاصل',          // 26
  'نساء وولادة',          // 27
  'خدمات إدارية وتقارير', // 28
  'رقود وخدمات تمريضية',  // 29
  'طوارئ وإسعاف',         // 30
];

/* بنود غير واضحة التصنيف → للمراجعة (بلا تخمين) */
const REVIEW_KEYS = new Set(
  [
    'حشوة الأذن',
    'تنظيف تشخيصي',
    'تنظيف يدوي بدون تخدير',
    'دفتر تخسيس',
    'مسند تغذية مريئية',
    'خيمة ملاية',
    'تدفئة شريحة جاهزة',
    'تخريم الأذن',
    'إشعاعية كبيرة',
    'أخذ عينة صغيرة',
    'خدمات لولادة خاصة لطبيبة النساء بالقسم الولادة',
    'خدمات لولادة خاصة لطبيبة النساء والولادة',
  ].map(normKey)
);

const isReview = (name) => REVIEW_KEYS.has(normKey(name));
const isConsultation = (name) => /^(معاينة|استشارة)(\s|$)/.test(name);

/* ------------------------------ التجميع ------------------------------ */

const items = [];
const notServices = [];
const seen = new Map();
let duplicates = 0;
let rawCount = 0;

function add(name, category, sourcePage, group, liText) {
  name = name.replace(/\s+/g, ' ').trim();
  if (name.length < 3) return;
  rawCount++;

  const sourceCategory = category;
  if (isReview(name)) category = 'للمراجعة';
  else if (isConsultation(name) && category !== 'للمراجعة') category = 'عيادات ومعاينات';

  const key = normKey(name);
  if (seen.has(key)) {
    duplicates++;
    return;
  }
  const rec = {
    id: 'SVC-' + String(items.length + 1).padStart(4, '0'),
    name,
    category,
    sourcePage,
    aliases: [],
  };
  rec._sourceCategory = sourceCategory;
  rec._liText = liText || '';
  seen.set(key, rec);
  items.push(rec);
  if (category === 'للمراجعة') notServicesReview.push(rec);
  if (group) rec._group = group;
}

const notServicesReview = [];

/* 1) النصوص المخفية في الصفحة الرئيسية */
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const hidden = extractHiddenSection(indexHtml);
const parsed = hidden ? parseEntries(hidden) : { entries: [], headings: [] };

for (const e of parsed.entries) {
  const cat = CATEGORY_BY_LI[e.liIndex] || 'للمراجعة';
  const colon = e.text.indexOf(':');
  /* بنود مثل «جراحة المخ والأعصاب ... مع الدكتور ...: انزلاقات، ...»
     عنوان القسم قبل النقطتين يُحفظ كما هو، وما بعده خدمات مستقلة */
  if (colon > 0 && colon < 90 && e.liIndex >= 8 && e.liIndex <= 13) {
    const header = e.text.slice(0, colon).trim();
    const headerCat = e.liIndex <= 11 ? 'تخصصات جراحية' : cat;
    add(header, headerCat, 'index.html', e.liIndex, e.text);
    for (const piece of splitItems(e.text.slice(colon + 1))) add(piece, cat, 'index.html', e.liIndex, e.text);
  } else {
    for (const piece of splitItems(e.text)) add(piece, cat, 'index.html', e.liIndex, e.text);
  }
}
/* عناوين الكتلة المخفية ليست خدمات → قسم منفصل */
for (const h of parsed.headings) {
  notServices.push({ text: h, kind: 'hidden-heading', sourcePage: 'index.html' });
}

/* 2) مصادر ظاهرة في صفحات أخرى */
const push = (file, list, category, kind) => {
  for (const name of list) {
    add(name, category, file);
    if (kind) notServices.push({ text: name, kind, sourcePage: file });
  }
};

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const clinicsHtml = read('clinics.html');
push('clinics.html', [...clinicsHtml.matchAll(/<h[23][^>]*>(عيادة[^<]+)<\/h[23]>/g)].map((m) => textOf(m[1])), 'عيادات ومعاينات');

const unitsHtml = read('units.html');
push('units.html', [...unitsHtml.matchAll(/<button[^>]*tab-btn[^>]*>([\s\S]*?)<\/button>/g)].map((m) => textOf(m[1])), 'وحدات وأقسام');

const ancillaryHtml = read('ancillary.html');
push(
  'ancillary.html',
  [
    ...[...ancillaryHtml.matchAll(/<h3 class="unit-title">([^<]+)<\/h3>/g)].map((m) => textOf(m[1])),
    ...[...ancillaryHtml.matchAll(/<div class="simple-name">([^<]+)<\/div>/g)].map((m) => textOf(m[1])),
  ],
  'إدارات مساندة'
);

const offersHtml = read('offers.html');
push('offers.html', [...offersHtml.matchAll(/<h3[^>]*>((?:باقة|عرض)[^<]+)<\/h3>/g)].map((m) => textOf(m[1])), 'عروض وباقات');

/* 3) نصوص مخفية/إتاحة ليست خدمات (القاعدة 6) */
const hiddenNotServices = [
  { text: 'قاعدة البيانات الشاملة للخدمات الطبية والتجهيزات والفحوصات والأشعة والعمليات', kind: 'hidden-heading-h2', sourcePage: 'index.html' },
];
for (const page of ['index.html', 'clinics.html', 'units.html', 'doctors.html', 'offers.html', 'pr.html', 'ancillary.html', 'news.html']) {
  const html = read(page);
  for (const m of html.matchAll(/aria-label="([^"]{3,80})"/g)) {
    hiddenNotServices.push({ text: textOf(m[1]), kind: 'aria-label', sourcePage: page });
  }
}

/* ------------------------------ المرادفات ------------------------------ */

const suggestions = [];
let sid = 0;

/* أ) اختصارات لاتينية موجودة داخل اسم الخدمة نفسها */
for (const rec of items) {
  const rawTokens = rec.name.match(/[A-Za-z][A-Za-z0-9./-]*(?:\s+[A-Z][A-Za-z0-9./-]*)*/g) || [];
  const STOP = new Set(['patient', 'monitors', 'scan', 'shock', 'of', 'and', 'the', 'true', 'class', 'section']);
  const WHITELIST = new Set(['prolactin', 'testosterone', 'troponin', 'cannula', 'vita']);
  const uniq = [...new Set(rawTokens.map((t) => t.replace(/[.]+$/, '').trim()))].filter((t) => {
    if (t.length < 2) return false;
    const low = t.toLowerCase();
    if (STOP.has(low)) return false;
    const isMulti = /\s/.test(t);
    const isCaps = /^[A-Z][A-Z0-9./-]+$/.test(t);
    const hasDigit = /[0-9]/.test(t);
    return isMulti ? /[A-Z]{2,}/.test(t) : isCaps || hasDigit || WHITELIST.has(low);
  });
  /* اختصارات متلاصقة مثل «TSH FT3 FT4 FSH LH» تُفكَّك إلى مرادفات منفصلة */
  const expanded = [];
  const keepPart = (x) =>
    x.length >= 2 &&
    !STOP.has(x.toLowerCase()) &&
    (/^[A-Z0-9][A-Z0-9./-]+$/.test(x) || WHITELIST.has(x.toLowerCase()));
  for (const t of uniq) {
    const parts = t.split(/\s+/);
    if (parts.length > 1 && parts.every(keepPart)) expanded.push(...parts.filter(keepPart));
    else expanded.push(t);
  }
  for (const t of [...new Set(expanded)]) {
    suggestions.push({
      id: 'ALS-' + String(++sid).padStart(4, '0'),
      serviceId: rec.id,
      name: rec.name,
      alias: t,
      type: 'abbreviation',
      reason: `الاختصار «${t}» ورد داخل نص الخدمة نفسه`,
      approved: false,
    });
  }
}

/* ب) أزواج متشابهة (مرشّحة للدمج) — تشابه عالٍ في الكلمات */
const tokenize = (s) => new Set(normKey(s).split(' ').filter(Boolean));
const jaccard = (a, b) => {
  const A = tokenize(a);
  const B = tokenize(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
};
let pairs = 0;
for (let i = 0; i < items.length && pairs < 25; i++) {
  for (let j = i + 1; j < items.length && pairs < 25; j++) {
    const a = items[i].name;
    const b = items[j].name;
    if (Math.abs(a.length - b.length) > 12) continue;
    const sim = jaccard(a, b);
    if (sim >= 0.72) {
      suggestions.push({
        id: 'ALS-' + String(++sid).padStart(4, '0'),
        serviceId: items[i].id,
        name: a,
        alias: b,
        type: 'near-duplicate',
        reason: `تشابه ${(sim * 100).toFixed(0)}% — يُحتمل أن الاثنين خدمة واحدة`,
        approved: false,
      });
      pairs++;
    }
  }
}


/* ==================================================================
   مراجعة الكتالوج (المهمة 5-أ2):
   تكرار بعد التطبيع القوي + حقول النشر + سياق عناصر المراجعة
   ================================================================== */

/** تطبيع قوي: تشكيل + همزات + ة/ه + ى/ي + ترقيم + محتوى الأقواس */
function normStrong(name) {
  return name
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const dupMap = new Map();
for (const rec of items) {
  const k = normStrong(rec.name);
  if (!dupMap.has(k)) dupMap.set(k, []);
  dupMap.get(k).push(rec);
}

const duplicateGroups = [];
for (const [key, group] of dupMap) {
  if (group.length < 2) continue;
  /* الأساس = العنصر بلا أقواس (الاسم العام) وإلا الأول */
  const canonical = group.find((r) => !/[()]/.test(r.name)) || group[0];
  const others = group.filter((r) => r !== canonical);
  for (const r of others) {
    r.duplicateOf = canonical.id;
    r.duplicateNote =
      'بعد إزالة الأقواس يتطابق الاسم مع ' + canonical.name + ' — راجع قبل الدمج: الأقواس قد تميّز قسمًا مختلفًا';
  }
  duplicateGroups.push({
    normalizedName: key,
    canonical: { id: canonical.id, name: canonical.name, category: canonical.category },
    members: group.map((r) => ({ id: r.id, name: r.name, category: r.category, page: r.sourcePage })),
  });
}

/* --- سياق عناصر المراجعة: 10 كلمات قبل و10 بعد في المصدر --- */
const SUGGESTED = {
  'أخذ عينة صغيرة': 'أسنان',
  'إشعاعية كبيرة': 'أسنان',
  'دفتر تخسيس': 'علاج طبيعي',
  'مسند تغذية مريئية': 'رقود وخدمات تمريضية',
  'حشوة الأذن': 'أنف وأذن وحنجرة',
  'تنظيف يدوي بدون تخدير': 'نساء وولادة',
  'تنظيف تشخيصي': 'نساء وولادة',
  'خدمات لولادة خاصة لطبيبة النساء بالقسم الولادة': 'نساء وولادة',
  'خدمات لولادة خاصة لطبيبة النساء والولادة': 'نساء وولادة',
  'تدفئة شريحة جاهزة': 'رقود وخدمات تمريضية',
  'خيمة ملاية': 'رقود وخدمات تمريضية',
  'تخريم الأذن': 'أنف وأذن وحنجرة',
};

function contextOf(rec) {
  const li = (rec._liText || '').replace(/\s+/g, ' ');
  const pos = li.indexOf(rec.name);
  if (pos < 0) return { before: '', after: '' };
  const before = li.slice(0, pos).split(/\s+/).filter(Boolean).slice(-10).join(' ');
  const after = li.slice(pos + rec.name.length).split(/\s+/).filter(Boolean).slice(0, 10).join(' ');
  return { before, after };
}

/* --- مجموعة الردود لمحرك البحث (المهمة 5-ب) --- */
const RADIOLOGY_IN_CARDIOLOGY = /(إيكو|ايكو|ECHO|موجات\s+فوق\s+ال?صوتي)/i;
function responseGroupOf(rec) {
  if (rec.category === 'مختبر') return 'lab';
  if (rec.category === 'عمليات جراحية' || rec.category === 'تخصصات جراحية') return 'surgery';
  if (rec.category === 'أسنان' || rec.name === 'معاينة عيادة الأسنان') return 'dental';
  if (rec.category === 'أشعة') return 'radiology';
  if (rec.category === 'قلب' && RADIOLOGY_IN_CARDIOLOGY.test(rec.name)) return 'radiology';
  return 'general';
}

for (const rec of items) {
  rec.responseGroup = responseGroupOf(rec);
  rec.status = rec.category === 'للمراجعة' ? 'review' : 'active';
  rec.linkOnly = rec.category === 'عروض وباقات';
  if (rec.status === 'review') {
    const ctx = contextOf(rec);
    rec.reviewContext = {
      page: rec.sourcePage,
      sourceCategory: rec._sourceCategory || '',
      before: ctx.before,
      after: ctx.after,
    };
    rec.suggestedCategory = SUGGESTED[rec.name] || '';
  }
  rec.publish = !(rec.status === 'review' || rec.duplicateOf);
}

/* تطبق القرارات بعد الاستخراج، ويُوقف البناء عند تغيّر هوية عنصر. */
decisionEngine.apply(items, decisions);

/* --- أسماء تحتوي رقمًا/نسبة/سعرًا (للعرض فقط، بلا تغيير) --- */
const moneyOrDigits = items
  .filter((r) => /[0-9٠-٩]|%/.test(r.name))
  .map((r) => {
    const hasPhone = /[0-9٠-٩]{7,}/.test(r.name.replace(/\s/g, ''));
    const hasPercent = /%/.test(r.name);
    const hasPrice = /(سعر|أجور|خصم|رسوم|تكلفة)/.test(r.name);
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      kind: hasPhone ? 'رقم هاتف' : hasPercent ? 'نسبة مئوية' : hasPrice ? 'سعر/أجرة' : 'رقم عددي',
    };
  });

/* ------------------------------ الحفظ ------------------------------ */

const byCategory = {};
for (const rec of items) byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;

const catalog = {
  meta: {
    generatedBy: 'ext/tools/build-services-catalog.js',
    generatedAt: decisions.generatedAt,
    site: 'https://alanharhospital.com',
    note: 'الأسماء منقولة حرفيًا من محتوى الموقع. لا ترجمة ولا تصحيح طبي. المرادفات المعتمدة من ملف قرارات المالك فقط.',
    sources: ['index.html (sr-only-seo)', 'clinics.html', 'units.html', 'ancillary.html', 'offers.html'],
    counts: {
      rawExtracted: rawCount,
      unique: items.length,
      duplicatesExcluded: duplicates,
      forReview: items.filter((i) => i.category === 'للمراجعة').length,
      duplicateGroups: duplicateGroups.length,
      duplicateItems: items.filter((i) => i.duplicateOf).length,
      publishFalse: items.filter((i) => i.publish === false).length,
      linkOnly: items.filter((i) => i.linkOnly).length,
      excluded: items.filter((i) => i.excluded).length,
      internalOnly: items.filter((i) => i.internalOnly).length,
      hasNumber: items.filter((i) => i.hasNumber).length,
      responseGroups: items.reduce((a, i) => ((a[i.responseGroup] = (a[i.responseGroup] || 0) + 1), a), {}),
      categories: Object.keys(byCategory).length,
    },
    categories: byCategory,
  },
  items: items.map((r) => {
    const { _group, _sourceCategory, _liText, ...clean } = r;
    return clean;
  }),
  categories: Object.keys(byCategory).map((c) => ({
    name: c,
    count: byCategory[c],
    examples: items.filter((i) => i.category === c).slice(0, 8).map((i) => i.name),
  })),
  forReview: items
    .filter((i) => i.status === 'review')
    .map((i) => ({
      id: i.id,
      name: i.name,
      sourcePage: i.sourcePage,
      sourceCategory: i._sourceCategory,
      suggestedCategory: i.suggestedCategory,
      status: 'review',
      publish: false,
      reviewContext: i.reviewContext,
    })),
  duplicateGroups: duplicateGroups.map(g => {
    const remaining = g.members.filter(m => items.find(i => i.id === m.id).duplicateOf);
    return remaining.length ? g : { normalizedName: g.normalizedName, members: g.members, decision: 'الأسماء مختلفة حرفيًا؛ ليست مكررات منشورة محذوفة.' };
  }),
  digitsOrPrices: moneyOrDigits,
  notServices: hiddenNotServices,
};

const aliasesFile = {
  meta: {
    generatedBy: 'ext/tools/build-services-catalog.js',
    generatedAt: decisions.generatedAt,
    warning: 'كل الاقتراحات approved:false — لا تُفعَّل قبل موافقة المالك.',
    counts: {
      total: suggestions.length,
      abbreviation: suggestions.filter((s) => s.type === 'abbreviation').length,
      nearDuplicate: suggestions.filter((s) => s.type === 'near-duplicate').length,
    },
  },
  suggestions,
};

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'services-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'aliases-suggested.json'), JSON.stringify(aliasesFile, null, 2), 'utf8');

/* -------------------- ملف المراجعة المقروء -------------------- */
const md = [];
md.push('# مراجعة الكتالوج — مستشفى الأنهار التخصصي');
md.push('');
md.push('> مولّد آليًا بواسطة `ext/tools/build-services-catalog.js` — لا تعدّل يدويًا.');
md.push('> لا حذف ولا تصحيح لأي اسم. الحقول المضافة: `status` `publish` `linkOnly` `duplicateOf` `suggestedCategory`.');
md.push('');
md.push('## 1) التكرار بعد التطبيع (تشكيل + همزات + ة/ه + ى/ي + ترقيم + محتوى الأقواس)');
md.push('');
if (duplicateGroups.length === 0) {
  md.push('لا توجد مجموعات مكررة.');
} else {
  md.push('| # | الاسم بعد التطبيع | العناصر (ID | الاسم | الفئة | الصفحة) | الأساس |');
  md.push('|---|---|---|---|');
  duplicateGroups.forEach((g, i) => {
    const members = g.members.map((m) => `${m.id} | ${m.name} | ${m.category} | ${m.page}`).join('<br>');
    const hasDuplicate = g.members.some(m => items.find(item => item.id === m.id).duplicateOf);
    const result = hasDuplicate ? `${g.canonical.id} — ${g.canonical.name}` : 'الأسماء مختلفة حرفيًا؛ ليست مكررات معتمدة';
    md.push(`| ${i + 1} | ${g.normalizedName} | ${members} | ${result} |`);
  });
}
md.push('');
md.push('## 2) عناصر «للمراجعة» — السياق في المصدر (10 كلمات قبل/بعد)');
md.push('');
md.push('| # | الاسم (كما ورد) | الصفحة | الفئة المصدرية | قبل | بعد | الفئة المقترحة |');
md.push('|---|---|---|---|---|---|---|');
catalog.forReview.forEach((r, i) => {
  md.push(
    `| ${i + 1} | ${r.name} | ${r.sourcePage} | ${r.sourceCategory} | …${r.reviewContext.before} | ${r.reviewContext.after}… | ${r.suggestedCategory} |`
  );
});
md.push('');
md.push('## 3) المرادفات المقترحة (غير مفعّلة — approved:false)');
md.push('');
md.push('| # | الاقتراح | النوع | الخدمة |');
md.push('|---|---|---|---|');
suggestions.forEach((sg, i) => {
  md.push(`| ${i + 1} | ${sg.alias} | ${sg.type === 'abbreviation' ? 'اختصار' : 'دمج'} | ${sg.name} |`);
});
md.push('');
md.push('## 4) أسماء تحتوي أرقامًا أو نسبًا أو أسعارًا (بلا تغيير)');
md.push('');
md.push('| # | الاسم | الفئة | النوع |');
md.push('|---|---|---|---|');
moneyOrDigits.forEach((r, i) => md.push(`| ${i + 1} | ${r.name} | ${r.category} | ${r.kind} |`));
md.push('');
fs.writeFileSync(path.join(OUT_DIR, 'catalog-review.md'), md.join('\n'), 'utf8');

/* ------------------------------ التقرير ------------------------------ */

console.log('\n  كتالوج الخدمات — مستشفى الأنهار التخصصي');
console.log('  ' + '-'.repeat(74));
console.log('  عدد المصطلحات المستخرجة خام       : ' + rawCount);
console.log('  عدد المصطلحات الفريدة (الكتالوج)   : ' + items.length);
console.log('  عدد المكرر المستبعد (تطابق تام)    : ' + duplicates);
console.log('  مجموعات تكرار بعد التطبيع القوي    : ' + duplicateGroups.length);
console.log('  عناصر duplicateOf                 : ' + catalog.meta.counts.duplicateItems);
console.log('  publish=false                     : ' + catalog.meta.counts.publishFalse);
console.log('  عدد بنود سجل الأسعار (li)          : ' + parsed.entries.length);
console.log('  عناصر "للمراجعة"                  : ' + catalog.meta.counts.forReview);
console.log('  نصوص غير خدمية (قسم منفصل)        : ' + catalog.notServices.length);
console.log('  اقتراحات مرادفات (approved:false) : ' + suggestions.length);
console.log('');
console.log('  ' + ['الفئة'.padEnd(2), 'عدد', 'أول العناصر'].join(' | '));
console.log('  ' + '-'.repeat(74));
for (const c of catalog.categories) {
  console.log(`  ${c.name} | ${c.count} | ${c.examples.slice(0, 2).join(' / ').slice(0, 60)}`);
}
console.log('');
console.log('  ✅ ext/data/services-catalog.json');
console.log('  ✅ ext/data/aliases-suggested.json');
console.log('  ✅ ext/data/catalog-review.md');
console.log('');
