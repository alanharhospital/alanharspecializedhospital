#!/usr/bin/env node
/**
 * build-services.js — مولّد دليل الخدمات + فهرس البحث
 * ------------------------------------------------------------------
 * أمر واحد يعيد بناء كل شيء:
 *
 *     node ext/tools/build-services.js
 *
 * يقرأ (المصدر الوحيد):  ext/data/services-catalog.json  (عناصر publish=true)
 *                        ext/data/search-responses.json
 *                        ext/data/contact.json
 * ويكتب:
 *   services/index.html            صفحة الدليل + البحث
 *   services/diagnostics.html      مختبر + أشعة + قلب
 *   services/surgery.html          عمليات جراحية + تخصصات جراحية + تخدير + إجراءات وعمليات صغرى + عظام ومفاصل
 *   services/dental.html           أسنان
 *   services/women.html            نساء وولادة
 *   services/ent.html              أنف وأذن وحنجرة
 *   services/physio.html           علاج طبيعي
 *   services/emergency.html        طوارئ وإسعاف + رقود وخدمات تمريضية + تجهيزات وأسرة وأجهزة + وحدات وأقسام
 *   services/clinics-admin.html    عيادات ومعاينات + إدارات مساندة + خدمات إدارية وتقارير
 *   ext/data/services-index.json   فهرس البحث (ثابت)
 *
 * لا يعدّل أي ملف أصلي. لا يخترع أي معلومة: كل الأسماء من الكتالوج فقط.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const decisionEngine = require('./catalog-decisions');
const decisions = decisionEngine.load();

const ROOT = path.resolve(__dirname, '..', '..');
const EXT = path.join(ROOT, 'ext');
const DATA = path.join(EXT, 'data');
const OUT = path.join(ROOT, 'services');

const SITE = 'https://alanharhospital.com';
const HOSPITAL = 'مستشفى الأنهار التخصصي';

/* ------------------------------- إعادة بناء الكتالوج أولًا ------------------------------- */
if (!process.argv.includes('--no-catalog-rebuild')) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build-services-catalog.js')], { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ تعذّر بناء الكتالوج؛ إيقاف البناء حفاظًا على قرارات النشر.');
    process.exit(1);
  }
}

const catalog = JSON.parse(fs.readFileSync(path.join(DATA, 'services-catalog.json'), 'utf8'));
decisionEngine.apply(catalog.items, decisions);
const responses = JSON.parse(fs.readFileSync(path.join(DATA, 'search-responses.json'), 'utf8'));
const contact = JSON.parse(fs.readFileSync(path.join(DATA, 'contact.json'), 'utf8'));

/* ------------------------------- صفحات الدليل ------------------------------- */

const PAGES = [
  {
    slug: 'diagnostics',
    h1: 'فحوصات تشخيصية',
    cats: ['مختبر', 'أشعة', 'قلب'],
  },
  {
    slug: 'surgery',
    h1: 'عمليات وجراحة',
    cats: ['عمليات جراحية', 'تخصصات جراحية', 'تخدير', 'إجراءات وعمليات صغرى', 'عظام ومفاصل'],
  },
  { slug: 'dental', h1: 'أسنان', cats: ['أسنان'] },
  { slug: 'women', h1: 'نساء وولادة', cats: ['نساء وولادة'] },
  { slug: 'ent', h1: 'أنف وأذن وحنجرة', cats: ['أنف وأذن وحنجرة'] },
  { slug: 'physio', h1: 'علاج طبيعي', cats: ['علاج طبيعي'] },
  {
    slug: 'emergency',
    h1: 'طوارئ ورقود وتجهيزات',
    cats: ['طوارئ وإسعاف', 'رقود وخدمات تمريضية', 'تجهيزات وأسرة وأجهزة', 'وحدات وأقسام'],
  },
  {
    slug: 'clinics-admin',
    h1: 'عيادات وإدارات',
    cats: ['عيادات ومعاينات', 'إدارات مساندة', 'خدمات إدارية وتقارير'],
  },
];

const published = (catalog.items || []).filter((i) => i.publish === true);
const linkOnlyItems = published.filter((i) => i.linkOnly === true);
const searchOnlyItems = published.filter((i) => i.searchOnly === true);

/* تحقق: كل فئة منشورة يجب أن تكون في صفحة واحدة */
const assigned = new Map();
for (const pg of PAGES) {
  for (const c of pg.cats) {
    if (assigned.has(c)) throw new Error('الفئة مكررة في صفحتين: ' + c);
    assigned.set(c, pg.slug);
  }
}
const unassigned = published.filter((i) => !assigned.has(i.category) && !i.linkOnly);
if (unassigned.length) {
  throw new Error(
    'فئات بلا صفحة: ' + [...new Set(unassigned.map((i) => i.category))].join(' | ') + ` (${unassigned.length} عنصرًا)`
  );
}

/* ------------------------------- أدوات ------------------------------- */

const AR_LETTERS = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** أول حرف بعد التطبيع */
function firstLetter(name) {
  const n = String(name)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
  const ch = n.charAt(0);
  if (AR_LETTERS.includes(ch)) return ch;
  return 'ا';
}

function sortAr(list) {
  return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

/** وصف 120–160 حرفًا مبني على اسم الصفحة + اسم المستشفى + عدد العناصر فقط */
function makeDescription(h1, count) {
  const parts = [
    `دليل ${h1} في ${HOSPITAL}: ${count} خدمة مرتبة أبجديًا مع فهرس حروف.`,
    `تصفح القائمة الكاملة أو ابحث عن الخدمة التي تحتاجها.`,
    `الأسماء منقولة كما وردت في سجل خدمات المستشفى.`,
  ];
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (out.length >= 120) break;
    out += ' ' + parts[i];
  }
  while (out.length < 120) out += ' استخدم الفهرس للوصول السريع.';
  if (out.length > 160) {
    out = `دليل ${h1} في ${HOSPITAL}: ${count} خدمة مرتبة أبجديًا مع فهرس حروف، والأسماء كما وردت في سجل خدمات المستشفى.`;
  }
  if (out.length > 160 || out.length < 120) {
    throw new Error(`الوصف خارج النطاق (${out.length}): ${h1}`);
  }
  return out;
}

/* ------------------------------- قوالب ------------------------------- */

const NAV_ITEMS = [
  ['../index.html', 'الرئيسية'],
  ['../clinics.html', 'العيادات والتخصصات'],
  ['../units.html', 'الوحدات'],
  ['../ancillary.html', 'الوحدات الملحقة'],
  ['../pr.html', 'العلاقات العامة والتسويق'],
  ['../offers.html', 'العروض', 'nav-offer-link'],
  ['../news.html', 'الأخبار'],
  ['../doctors.html', 'الاستشاريون والطواقم'],
  ['./', 'دليل الخدمات', 'nav-active'],
];

function header(activeSlug) {
  const lis = NAV_ITEMS.map(([href, label, cls]) => {
    const isActive = label === 'دليل الخدمات' && activeSlug;
    const klass = isActive ? 'nav-active' : cls || '';
    return `                <li><a href="${href}"${klass ? ` class="${klass}"` : ''}>${label}</a></li>`;
  }).join('\n');
  return `    <header class="header" id="top">
        <nav class="navbar container" aria-label="القائمة الرئيسية">
            <a href="../index.html" class="brand">
                <img src="../logo.jpg" alt="شعار مستشفى الأنهار التخصصي" class="brand-logo" width="48" height="48" loading="lazy" decoding="async">
                <span>
                    <strong>مستشفى الأنهار</strong>
                    <small>التخصصي</small>
                </span>
            </a>
            <button class="menu-toggle" id="menuToggle" aria-label="فتح القائمة" aria-expanded="false" aria-controls="navLinks">
                <span></span><span></span><span></span>
            </button>
            <ul class="nav-links" id="navLinks">
${lis}
                <li><a href="../index.html#appointment" class="btn-nav-highlight">حجز موعد</a></li>
                <li><a href="../index.html#contact">اتصل بنا</a></li>
            </ul>
        </nav>
    </header>`;
}

function footer(isIndex = false) {
  const footerHeading = isIndex ? `<h2 class="enh-old-h3">${HOSPITAL}</h2>` : `<h3>${HOSPITAL}</h3>`;
  return `    <footer class="footer">
        <div class="container footer-content">
            <div class="footer-brand">
                <img src="../logo.jpg" alt="شعار المستشفى" class="footer-logo" width="64" height="64" loading="lazy" decoding="async">
                <div>
                    ${footerHeading}
                    <p>صحتكم مسؤوليتنا ❤️</p>
                </div>
            </div>
            <div class="footer-social">
                <a href="https://www.facebook.com/profile.php?id=61565589033008" target="_blank" rel="noopener noreferrer">فيسبوك</a>
            </div>
            <div class="footer-bottom">
                <p>© 2026 ${HOSPITAL} - جميع الحقوق محفوظة.</p>
                <p class="designer-credit">Designed by Dr. Ammar Al-Qahwi (د. عمار القحوي)</p>
                <a href="#top" class="back-to-top">العودة للأعلى ↑</a>
                <!-- ENH:START fixes-6b-guide -->
                <a href="./">دليل الفحوصات والعمليات والأشعة</a>
                <!-- ENH:END fixes-6b-guide -->
            </div>
        </div>
    </footer>`;
}

const GUIDE_CSS = `        /* دليل الخدمات — تنسيق خاص بالصفحات المولّدة */
        .sg-main { padding: 2rem 0 3rem; }
        .sg-h1 { color: #0a2a5e; font-size: clamp(1.5rem, 4vw, 2.2rem); margin: 0 0 .6rem; }
        .sg-intro { color: #333; line-height: 1.9; margin: 0 0 1.2rem; max-width: 70ch; }
        .sg-letters { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0 0 1.5rem; padding: .6rem; background: #f4f7fb; border: 1px solid #d7dee8; border-radius: 12px; }
        .sg-letters span { font-weight: 700; color: #4a5568; margin-inline-end: .35rem; align-self: center; font-size: .9rem; }
        .sg-letters a { min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: #fff; border: 1px solid #d7dee8; color: #0a2a5e; font-weight: 700; text-decoration: none; }
        .sg-letters a:hover, .sg-letters a:focus-visible { background: #0a2a5e; color: #fff; border-color: #0a2a5e; }
        .sg-letters a:focus-visible { outline: 3px solid #0b5cad; outline-offset: 2px; }
        .sg-cat { color: #0a2a5e; font-size: 1.25rem; margin: 2rem 0 .75rem; padding-block-end: .4rem; border-bottom: 2px solid #e2e8f0; }
        .sg-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
        .sg-list li { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: .6rem .85rem; color: #16202e; line-height: 1.7; }
        .sg-list li:target { border-color: #0a2a5e; background: #eef3fa; box-shadow: 0 0 0 2px rgba(10,42,94,.15); }
        .sg-id { color: #64748b; font-size: .75rem; margin-inline-start: .5rem; }
        .sg-cards { list-style: none; margin: 1.5rem 0 0; padding: 0; display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        .sg-cards li { background: #fff; border: 1px solid #d7dee8; border-radius: 14px; }
        .sg-cards a { display: block; min-height: 48px; padding: 1rem; text-decoration: none; color: #0a2a5e; font-weight: 700; }
        .sg-cards a:hover, .sg-cards a:focus-visible { background: #eef3fa; border-radius: 14px; }
        .sg-cards a:focus-visible { outline: 3px solid #0b5cad; outline-offset: 2px; }
        .sg-count { display: block; color: #4a5568; font-weight: 500; font-size: .85rem; margin-top: .3rem; }
        .sg-offers { margin: 1.5rem 0 0; padding: 1rem; background: #f4f7fb; border: 1px solid #d7dee8; border-radius: 12px; }
        .sg-offers a { color: #0a2a5e; font-weight: 700; text-decoration: underline; }
        .sg-noscript { margin-top: 1rem; }`;

function jsonLd(crumbs) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
  return JSON.stringify(data, null, 2);
}

function head({ title, description, canonical, ogTitle, ogDesc, eyebrows, crumbs, extraCss = '' }) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a2a5e">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(HOSPITAL)}">
    <meta property="og:title" content="${esc(ogTitle)}">
    <meta property="og:description" content="${esc(ogDesc)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE}/logo.jpg">
    <meta property="og:locale" content="ar_YE">
    <meta name="twitter:card" content="summary">
    <link rel="icon" type="image/jpeg" href="../logo.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css?v=10">
    <!-- ENH:START 6b2-assets-css -->
${extraCss}
    <link rel="stylesheet" href="../ext/clinical-polish.css?v=2">
    <!-- ENH:END 6b2-assets-css -->
    <style>
${GUIDE_CSS}
    </style>
    <script type="application/ld+json">
${jsonLd(crumbs || [{ name: 'الرئيسية', url: SITE + '/' }, { name: 'دليل الخدمات', url: SITE + '/services/' }])}
    </script>
    <!-- ENH:START fixes-6b -->
    <link rel="stylesheet" href="../ext/fixes.css?v=2">
    <!-- ENH:END fixes-6b -->
    <!-- ENH:START 6c-brand -->
    <link rel="stylesheet" href="../ext/brand.css?v=2">
    <!-- ENH:END 6c-brand -->
</head>`;
}

/* ------------------------------- صفحة فئة ------------------------------- */

function buildCategoryPage(page) {
  const items = published.filter((i) => !i.searchOnly && !i.directoryHidden && page.cats.includes(i.category));
  if (!items.length) throw new Error('صفحة بلا عناصر: ' + page.slug);

  const letters = new Set(items.map((i) => firstLetter(i.name)));
  const lettersHtml = AR_LETTERS.filter((l) => letters.has(l))
    .map((l) => `<a href="#h-${l}">${l}</a>`)
    .join('\n            ');

  const byCat = page.cats
    .map((cat) => ({ cat, list: sortAr(items.filter((i) => i.category === cat)) }))
    .filter((g) => g.list.length);

  // لكل حرف أول ظهور واحد: عنوان داخل عنصر الخدمة نفسه يحفظ نص الاسم ومرساه الأصلي.
  const placedLetters = new Set();
  const sections = byCat
    .map((g) => {
      const lis = g.list
        .map((it) => {
          const letter = firstLetter(it.name);
          const first = !placedLetters.has(letter);
          placedLetters.add(letter);
          const name = first ? `<h3 class="enh-letter-heading" id="h-${letter}">${esc(it.name)}</h3>` : esc(it.name);
          return `                    <li id="${it.id.toLowerCase()}">${name}<span class="sg-id" aria-hidden="true">${it.id}</span><button type="button" class="sg-share" data-clinical-share="#${it.id.toLowerCase()}" aria-label="مشاركة ${esc(it.name)}" hidden>مشاركة</button></li>`;
        })
        .join('\n');
      return `            <h2 class="sg-cat" id="cat-${g.cat.replace(/\s+/g, '-')}">${esc(g.cat)}</h2>
            <ul class="sg-list">
${lis}
            </ul>`;
    })
    .join('\n');

  const description = makeDescription(page.h1, items.length);
  const title = `دليل ${page.h1} | ${HOSPITAL}`;
  const canonical = `${SITE}/services/${page.slug}`;

  const html = `${head({
    title,
    description,
    canonical,
    ogTitle: `دليل ${page.h1}`,
    ogDesc: description,
    extraCss: '    <link rel="stylesheet" href="../ext/services-search.css?v=5">',
    crumbs: [
      { name: 'الرئيسية', url: SITE + '/' },
      { name: 'دليل الخدمات', url: SITE + '/services/' },
      { name: page.h1, url: canonical },
    ],
  })}
<body>
    <!-- ENH:START fixes-6b-skip -->
    <a class="enh-skip-link" href="#enh-main">تخطي إلى المحتوى</a>
    <!-- ENH:END fixes-6b-skip -->
${header(page.slug)}

    <main class="sg-main" id="enh-main" tabindex="-1">
        <div class="container">
            <nav aria-label="مسار التصفح" class="sg-crumbs"><a href="../index.html">الرئيسية</a> ← <a href="./">دليل الخدمات</a> ← <span>${esc(page.h1)}</span></nav>
            <h1 class="sg-h1">دليل ${esc(page.h1)} في ${HOSPITAL}</h1>
            <p class="sg-intro">دليل ${esc(page.h1)} في ${HOSPITAL}: ${items.length} خدمة مرتبة أبجديًا، مع فهرس حروف أعلى الصفحة لتسهيل الوصول.</p>

${searchWidget()}

            <nav class="sg-letters" aria-label="فهرس الحروف">
                <span>فهرس الحروف:</span>
                ${lettersHtml}
            </nav>

${sections}

            <p class="sg-back"><a href="./">العودة إلى دليل الخدمات</a></p>
        </div>
    </main>

${footer()}
    <!-- ENH:START 6b2-assets-scripts -->
    <script src="../ext/data/services-index.js?v=5"></script>
    <script src="../ext/services-search.js?v=5" defer></script>
    <script src="../ext/clinical-enhancements.js?v=2" defer></script>
    <!-- ENH:END 6b2-assets-scripts -->
</body>
</html>
`;
  return { slug: page.slug, html, count: items.length, description };
}

function searchWidget() {
  return `            <div class="ss" data-services-search>
                <label class="ss-label" for="ss-input">${esc(responses.searchBox.inputLabel)}</label>
                <form class="ss-form" role="search" onsubmit="return false;">
                    <input class="ss-input" id="ss-input" type="search" autocomplete="off"
                           placeholder="${esc(responses.searchBox.placeholder)}"
                           aria-describedby="ss-hint" data-services-search-input>
                    <button class="ss-button" type="button" data-services-search-button>بحث</button>
                </form>
                <p class="ss-hint" id="ss-hint">${esc(responses.searchBox.hint)}</p>
                <p class="ss-status" role="status" aria-live="polite" data-services-search-status></p>
                <div class="ss-panel" data-services-search-panel></div>
                <noscript>
                    <p class="sg-noscript">البحث الفوري يحتاج JavaScript. يمكنك تصفح الدليل كاملًا من الروابط أدناه.</p>
                </noscript>
            </div>
`;
}

/* ------------------------------- صفحة الفهرس ------------------------------- */

function buildIndexPage(stats) {
  const total = stats.reduce((a, s) => a + s.count, 0);
  const description = (() => {
    let d = `دليل الخدمات الطبية في ${HOSPITAL}: ${total} خدمة في ${stats.length} صفحات مرتبة أبجديًا، مع بحث فوري وروابط مباشرة لكل خدمة.`;
    while (d.length < 120) d += ' تصفّح حسب التخصص.';
    if (d.length > 160) d = `دليل الخدمات الطبية في ${HOSPITAL}: ${total} خدمة في ${stats.length} صفحات، مرتبة أبجديًا مع بحث فوري.`;
    return d;
  })();
  const canonical = `${SITE}/services/`;

  const cards = stats
    .map(
      (s) => `                <li><a href="./${s.slug}">${esc(s.h1)}<span class="sg-count">${s.count} خدمة</span></a></li>`
    )
    .join('\n');

  const html = `${head({
    title: `دليل الخدمات الطبية | ${HOSPITAL}`,
    description,
    canonical,
    ogTitle: 'دليل الخدمات الطبية',
    ogDesc: description,
    extraCss: '    <link rel="stylesheet" href="../ext/services-search.css?v=5">',
  })}
<body>
    <!-- ENH:START fixes-6b-skip -->
    <a class="enh-skip-link" href="#enh-main">تخطي إلى المحتوى</a>
    <!-- ENH:END fixes-6b-skip -->
${header('index')}

    <main class="sg-main" id="enh-main" tabindex="-1">
        <div class="container">
            <nav aria-label="مسار التصفح" class="sg-crumbs"><a href="../index.html">الرئيسية</a> ← <span>دليل الخدمات</span></nav>
            <h1 class="sg-h1">دليل الخدمات الطبية في ${HOSPITAL}</h1>
            <p class="sg-intro">${total} خدمة موزعة على ${stats.length} صفحات، مرتبة أبجديًا ومصنفة كما وردت في سجل خدمات المستشفى.</p>

${searchWidget()}

            <ul class="sg-cards">
${cards}
            </ul>

            <div class="sg-offers">
                <p>العروض والخصومات الحالية تُعرض في صفحة العروض: <a href="../offers.html">العروض والخصومات</a></p>
            </div>
        </div>
    </main>

${footer(true)}
    <!-- ENH:START 6b2-assets-scripts -->
    <script src="../ext/data/services-index.js?v=5"></script>
    <script src="../ext/services-search.js?v=5" defer></script>
    <script src="../ext/clinical-enhancements.js?v=2" defer></script>
    <!-- ENH:END 6b2-assets-scripts -->
</body>
</html>
`;
  return { html, total, description };
}

/* ------------------------------- الكتابة ------------------------------- */

fs.mkdirSync(OUT, { recursive: true });

const written = [];
const stats = [];
for (const page of PAGES) {
  const res = buildCategoryPage(page);
  fs.writeFileSync(path.join(OUT, `${res.slug}.html`), res.html, 'utf8');
  written.push({ file: `services/${res.slug}.html`, count: res.count, size: Buffer.byteLength(res.html) });
  stats.push({ slug: page.slug, h1: page.h1, count: res.count, description: res.description });
}

const idx = buildIndexPage(stats);
fs.writeFileSync(path.join(OUT, 'index.html'), idx.html, 'utf8');
written.unshift({ file: 'services/index.html', count: idx.total, size: Buffer.byteLength(idx.html) });

/* ------------------------------- فهرس البحث ------------------------------- */

const CBC_TARGET = catalog.items.find((i) => /CBC/.test(i.name));
if (!CBC_TARGET) throw new Error('لم أجد عنصر فحص الدم الشامل CBC');

const SYNONYM_PHRASES = decisions.approvedAliases || [];
const yesMatch = decisions.yesMatch;
if (!yesMatch || !Number.isFinite(yesMatch.coverageMin) || yesMatch.coverageMin <= 0 || yesMatch.coverageMin > 1) throw new Error('إعداد yesMatch غير صالح');
const expectedHints = {تحليل:'diagnostics', فحص:'diagnostics', اشعة:'diagnostics', عملية:'surgery', عمليات:'surgery'};
if (JSON.stringify(decisions.categoryHints) !== JSON.stringify(expectedHints)) throw new Error('إعداد categoryHints غير صالح');
const searchOnlyMatch = decisions.searchOnlyMatch;
if (!searchOnlyMatch || !Number.isFinite(searchOnlyMatch.minCoverage) || searchOnlyMatch.minCoverage <= 0 || searchOnlyMatch.minCoverage > 1 || !Number.isInteger(searchOnlyMatch.minWords) || searchOnlyMatch.minWords < 1) {
  throw new Error('إعداد searchOnlyMatch غير صالح');
}

const slugOfCategory = new Map();
for (const pg of PAGES) for (const c of pg.cats) slugOfCategory.set(c, pg.slug);

const searchIndex = {
  meta: {
    generatedBy: 'ext/tools/build-services.js',
    generatedAt: decisions.generatedAt,
    hospital: HOSPITAL,
    site: SITE,
    note: 'فهرس بحث ثابت. كل الأسماء من ext/data/services-catalog.json (publish=true فقط).',
  },
  items: published.map((i) => {
    const slug = slugOfCategory.get(i.category) || 'index';
    const rank = PAGES.findIndex((pg) => pg.slug === slug);
    return {
      id: i.id,
      name: i.name,
      category: i.category,
      group: i.responseGroup,
      slug,
      rank: rank === -1 ? 99 : rank,
      url: i.searchOnly ? null : i.linkOnly ? 'offers.html' : `services/${slug}#${i.id.toLowerCase()}`,
      searchOnly: !!i.searchOnly,
      exactMatchOnly: !!i.exactMatchOnly,
      exactMatchMinWords: i.exactMatchMinWords || null,
      directoryHidden: !!i.directoryHidden,
      matchName: i.matchName || "",
      numberRequired: !!i.numberRequired,
      exactPhrases: i.exactPhrases || [],
    };
  }),
  excludedTerms: decisions.excludeRules,
  blockedQueries: decisions.blockedQueries || [],
  searchOnlyMatch: { ...searchOnlyMatch },
  yesMatch: { ...decisions.yesMatch },
  categoryHints: { ...decisions.categoryHints },
  synonyms: SYNONYM_PHRASES.map(s => ({ ...s })),
};

fs.writeFileSync(path.join(DATA, 'services-index.json'), JSON.stringify(searchIndex, null, 2), 'utf8');
/* حزمة بيانات ثابتة بلا fetch؛ متغيرها مصدره ملفات البيانات نفسها. */
const bundle = {index: searchIndex, responses, contact};
fs.writeFileSync(path.join(DATA, 'services-index.js'), 'window.ServicesSearchData = ' + JSON.stringify(bundle).replace(/</g, '\\u003c') + ';\n', 'utf8');

/* ------------------------------- تحقق ------------------------------- */

const totalPublished = published.length;
const totalInPages = stats.reduce((a, s2) => a + s2.count, 0); /* صفحات الفئات فقط (بلا الفهرس) */
const linkOnlyCount = linkOnlyItems.length;
const unpublished = catalog.items.filter((i) => i.publish !== true);

const problems = [];
if (totalInPages !== totalPublished - linkOnlyCount - searchOnlyItems.length) {
  problems.push(`عدم تطابق: صفحات=${totalInPages} منشور=${totalPublished} linkOnly=${linkOnlyCount}`);
}
/* كل عنصر منشور في صفحة واحدة بالضبط */
const seenIds = new Map();
for (const file of written.map((w) => w.file)) {
  if (file.endsWith('index.html')) continue;
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of html.matchAll(/<li id="(svc-\d+)"/g)) {
    seenIds.set(m[1], (seenIds.get(m[1]) || 0) + 1);
  }
}
for (const it of published) {
  if (it.linkOnly || it.searchOnly) continue;
  const n = seenIds.get(it.id.toLowerCase()) || 0;
  if (n !== 1) problems.push(`العنصر ${it.id} ظهر ${n} مرة`);
}
/* لا رقم واتساب مكتوب في الملفات المولدة */
const waNum = String(contact.whatsappNumber);
for (const w of written) {
  const txt = fs.readFileSync(path.join(ROOT, w.file), 'utf8');
  if (txt.includes(waNum) || txt.includes(String(contact.whatsappDisplay))) {
    problems.push(`رقم واتساب مكتوب نصًا في ${w.file}`);
  }
}

/* ------------------------------- التقرير ------------------------------- */

console.log('\n  دليل الخدمات — بناء مكتمل');
console.log('  ' + '-'.repeat(72));
console.log('  الصفحة'.padEnd(34) + 'عناصر'.padStart(8) + '   حجم'.padStart(10));
for (const w of written) {
  console.log('  ' + w.file.padEnd(32) + String(w.count).padStart(8) + ('   ' + (w.size / 1024).toFixed(1) + ' KB').padStart(10));
}
console.log('  ' + '-'.repeat(72));
console.log(`  المنشور (publish=true)        : ${totalPublished}`);
console.log(`  داخل الصفحات                  : ${totalInPages}`);
console.log(`  روابط فقط (عروض)              : ${linkOnlyCount}`);
console.log(`  بحث فقط                       : ${searchOnlyItems.length}`);
console.log(`  غير منشور (publish=false)     : ${unpublished.length}`);
console.log(`  عناصر البحث                   : ${searchIndex.items.length}`);
console.log(`  مرادفات مفعّلة                : ${searchIndex.synonyms.filter(s => s.approved).length} → ${CBC_TARGET.name}`);

if (problems.length) {
  console.error('\n❌ مشاكل:');
  problems.forEach((p) => console.error('   • ' + p));
  process.exit(1);
}
console.log('\n  ✅ كل العناصر المنشورة موجودة مرة واحدة بالضبط (عدا روابط العروض)');
console.log('  ✅ لا رقم واتساب مكتوب في أي صفحة مولّدة');
console.log('');
