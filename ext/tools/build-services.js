#!/usr/bin/env node
'use strict';
// Build the single search page and search index from the existing data sources.
const fs = require('fs');
const path = require('path');
const decisionEngine = require('./catalog-decisions');
const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(ROOT, 'ext/data');
const read = name => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
const catalog = read('services-catalog.json');
const decisions = decisionEngine.load();
decisionEngine.apply(catalog.items, decisions);
const responses = read('search-responses.json');
const contact = read('contact.json');
const page = read('services-page.json');
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
if (!page.intro || !['draft', 'approved'].includes(page.introStatus)) throw Error('Invalid services page text');
if (!/^\d+$/.test(contact.whatsappNumber)) throw Error('Invalid contact number');
const ranks = [
  ['مختبر', 'أشعة', 'قلب'],
  ['عمليات جراحية', 'تخصصات جراحية', 'تخدير', 'إجراءات وعمليات صغرى', 'عظام ومفاصل'],
  ['أسنان'], ['نساء وولادة'], ['أنف وأذن وحنجرة'], ['علاج طبيعي'],
  ['طوارئ وإسعاف', 'رقود وخدمات تمريضية', 'تجهيزات وأسرة وأجهزة', 'وحدات وأقسام'],
  ['عيادات ومعاينات', 'إدارات مساندة', 'خدمات إدارية وتقارير']
];
const published = catalog.items.filter(i => i.publish === true);
const searchOverrides = decisions.searchOverrides || [];
for (const override of searchOverrides) {
  const target = published.find(i => i.id === override.targetId && i.name === override.targetName);
  if (!target || target.searchOnly || !Array.isArray(override.queries) || !override.queries.length || override.queries.some(q => typeof q !== 'string' || !q.trim()) || override.response !== 'approved-availability') throw Error('Invalid search override: ' + override.targetId);
}
const index = {
  meta: { generatedBy:'ext/tools/build-services.js', generatedAt:decisions.generatedAt, hospital:'مستشفى الأنهار التخصصي', site:'https://alanharhospital.com', note:'فهرس بحث ثابت. كل الأسماء من ext/data/services-catalog.json (publish=true فقط).' },
  items: published.map(i => {
    const rank = ranks.findIndex(cats => cats.includes(i.category));
    return { id:i.id, name:i.name, category:i.category, group:i.responseGroup, slug:'index', rank:rank < 0 ? 99 : rank,
      url:i.searchOnly ? null : i.linkOnly ? 'offers.html' : 'services/', searchOnly:!!i.searchOnly,
      exactMatchOnly:!!i.exactMatchOnly, exactMatchMinWords:i.exactMatchMinWords || null, directoryHidden:!!i.directoryHidden,
      matchName:i.matchName || '', numberRequired:!!i.numberRequired, exactPhrases:i.exactPhrases || [] };
  }),
  excludedTerms:decisions.excludeRules, blockedQueries:decisions.blockedQueries || [],
  searchOnlyMatch:{...decisions.searchOnlyMatch}, yesMatch:{...decisions.yesMatch},
  categoryHints:{...decisions.categoryHints}, synonyms:(decisions.approvedAliases || []).map(s => ({...s})),
  searchOverrides:searchOverrides.map(o => ({...o, queries:[...o.queries]}))
};
const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a2a5e">
    <meta name="robots" content="noindex,follow">
    <title>البحث عن خدمة | مستشفى الأنهار التخصصي</title>
    <meta name="description" content="${esc(page.intro)}">
    <link rel="canonical" href="https://alanharhospital.com/services/">
    <link rel="icon" type="image/jpeg" href="../logo.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <!-- ENH:START services-search-css -->
    <link rel="stylesheet" href="../ext/services-search.css?v=5">
    <!-- ENH:END services-search-css -->
    <!-- ENH:START fixes-6b -->
    <link rel="stylesheet" href="../ext/fixes.css?v=2">
    <!-- ENH:END fixes-6b -->
    <!-- ENH:START 6c-brand -->
    <link rel="stylesheet" href="../ext/brand.css?v=3">
    <!-- ENH:END 6c-brand -->
</head>
<body data-services-standalone>
    <main id="enh-main" class="container" style="padding-block:2rem 3rem">
        <h1>البحث عن خدمة</h1>
${page.introTitle ? '        <h2>' + esc(page.introTitle) + '</h2>\n' : ''}        <p>${esc(page.intro)}</p>
        <div class="ss" data-services-search>
            <label class="ss-label" for="ss-input">${esc(responses.searchBox.inputLabel)}</label>
            <form class="ss-form" role="search" onsubmit="return false;">
                <input class="ss-input" id="ss-input" type="search" autocomplete="off" placeholder="${esc(responses.searchBox.placeholder)}" aria-describedby="ss-hint" data-services-search-input>
                <button class="ss-button" type="button" data-services-search-button>بحث</button>
            </form>
            <p class="ss-hint" id="ss-hint">${esc(responses.searchBox.hint)}</p>
            <p class="ss-status" role="status" aria-live="polite" data-services-search-status></p>
            <div class="ss-panel" data-services-search-panel></div>
            <noscript><p>البحث يحتاج إلى JavaScript. يمكنك التواصل عبر واتساب.</p></noscript>
            <p><a class="ss-wa" href="https://wa.me/${esc(contact.whatsappNumber)}" target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a></p>
        </div>
    </main>
    <!-- ENH:START services-search-scripts -->
    <script src="../ext/data/services-index.js?v=7"></script>
    <script src="../ext/services-search.js?v=7" defer></script>
    <!-- ENH:END services-search-scripts -->
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT, 'services'), {recursive:true});
fs.writeFileSync(path.join(ROOT, 'services/index.html'), html);
fs.writeFileSync(path.join(DATA, 'services-index.json'), JSON.stringify(index, null, 2));
const bundle = {index, responses, contact};
fs.writeFileSync(path.join(DATA, 'services-index.js'), 'window.ServicesSearchData = ' + JSON.stringify(bundle).replace(/</g, '\\u003c') + ';\n');
console.log('Built services/index.html and search index:', index.items.length, 'published items retained.');
