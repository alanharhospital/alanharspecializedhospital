#!/usr/bin/env node
/**
 * test-search.js — 21 حالة اختبار لمحرّك بحث دليل الخدمات
 * التشغيل: node ext/tools/test-search.js
 * يعتمد على: ext/tools/build-services.js (لازم تشغيله أولًا)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'ext', 'data');

const engine = require(path.join(ROOT, 'ext', 'services-search.js'));
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'services-index.json'), 'utf8'));
const responses = JSON.parse(fs.readFileSync(path.join(DATA, 'search-responses.json'), 'utf8'));
const contact = JSON.parse(fs.readFileSync(path.join(DATA, 'contact.json'), 'utf8'));

const catalog = JSON.parse(fs.readFileSync(path.join(DATA, 'services-catalog.json'), 'utf8'));
const data = { items: index.items, synonyms: index.synonyms, excludedTerms: index.excludedTerms, responses, contact };

const results = [];
function check(n, desc, fn) {
  let ok = false;
  let note = '';
  try {
    const out = fn();
    ok = out === true || (out && out.ok === true);
    note = (out && out.note) || (out === true ? '' : String(out));
  } catch (e) {
    ok = false;
    note = 'EXC: ' + e.message;
  }
  results.push({ n, desc, ok, note });
}

const run = (q) => engine.search(q, data);
const reply = (q) => engine.buildReply(run(q), data);
const hasCBC = (opts) => (opts || []).some((o) => /CBC/.test(o.name));

/* -------------------------------- الحالات -------------------------------- */

check(1, '«هل يوجد فحص دم» ← خيارات تشمل CBC', () => {
  const r = run('هل يوجد فحص دم');
  const rep = engine.buildReply(r, data);
  return { ok: r.type === 'weak' && hasCBC(rep.options.concat(r.best ? [r.best] : [])), note: `${r.type}, options=${rep.options.length}` };
});

check(2, '«لديكم فحص دم» ← خيارات تشمل CBC', () => {
  const r = run('لديكم فحص دم');
  const rep = engine.buildReply(r, data);
  return { ok: r.type === 'weak' && hasCBC(rep.options), note: `${r.type}, options=${rep.options.length}` };
});

check(3, '«هل عندكم فحص صورة الدم الكامل» ← نعم مختبر CBC', () => {
  const r = run('هل عندكم فحص صورة الدم الكامل');
  return { ok: r.type === 'strong' && /CBC/.test(r.best.name) && r.best.group === 'lab', note: `${r.type} → ${r.best && r.best.name}` };
});

check(4, '«CBC» ← نعم مختبر', () => {
  const r = run('CBC');
  return { ok: r.type === 'strong' && r.best.group === 'lab', note: `${r.type} → ${r.best && r.best.name}` };
});

check(5, '«cbc» ← نفس النتيجة', () => {
  const r = run('cbc');
  return { ok: r.type === 'strong' && /CBC/.test(r.best.name), note: `${r.type} → ${r.best && r.best.name}` };
});

check(6, '«عملية جراحة مخ واعصاب» ← نعم بنص surgery', () => {
  const r = run('عملية جراحة مخ واعصاب');
  const rep = engine.buildReply(r, data);
  const ok = r.type === 'strong' && r.best.group === 'surgery' && rep.lines.some((l) => l.indexOf('عملياتنا مجهزة') !== -1);
  return { ok, note: `${r.type} → ${r.best && r.best.name}` };
});

check(7, '«هل يوجد سونار» ← radiology أو خيارات', () => {
  const r = run('هل يوجد سونار');
  const rep = engine.buildReply(r, data);
  const inRad = (r.best && r.best.group === 'radiology') || rep.options.some((o) => o.group === 'radiology');
  return { ok: (r.type === 'strong' || r.type === 'weak') && inRad, note: `${r.type}, options=${rep.options.length}` };
});

check(8, '«قلع ضرس» ← رد dental', () => {
  const r = run('قلع ضرس');
  const rep = engine.buildReply(r, data);
  const ok = r.type === 'strong' && r.best.group === 'dental' && rep.lines.some((l) => l.indexOf('مركز جراحة الوجه والفكين') !== -1);
  return { ok, note: `${r.type} → ${r.best && r.best.name}` };
});

check(9, '«فحص كورونا الفضائي» ← اعتذار + واتساب', () => {
  const r = run('فحص كورونا الفضائي');
  const rep = engine.buildReply(r, data);
  const ok = r.type === 'none' && rep.lines[0].indexOf('نعتذر') === 0 && rep.whatsappUrl.indexOf('wa.me') !== -1;
  return { ok, note: `${r.type}` };
});

check(10, '«نزيف حاد» ← سطر الطوارئ', () => {
  const r = run('نزيف حاد');
  const rep = engine.buildReply(r, data);
  const ok = r.emergency === true && rep.lines[0].indexOf('في الحالات الطارئة') === 0;
  return { ok, note: `emergency=${r.emergency}, lines=${rep.lines.length}` };
});

check(11, 'حرف واحد «د» ← لا نتائج', () => {
  const r = run('د');
  const rep = engine.buildReply(r, data);
  return { ok: r.type === 'idle' && rep.lines.length === 0 && rep.options.length === 0, note: `${r.type}` };
});

check(12, '<img src=x onerror=alert(1)> ← نص لا يُنفَّذ', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const r = run(payload);
  const rep = engine.buildReply(r, data);
  const allText = JSON.stringify(rep.lines);
  const ok =
    allText.indexOf('<img') === -1 && /* الرد نفسه لا يحتوي HTML */
    rep.whatsappUrl.indexOf('%3Cimg') !== -1 && /* النص يُرمَّز */
    !rep.options.some((o) => typeof o.name !== 'string');
  return { ok, note: `type=${r.type}, url-encoded=${rep.whatsappUrl.indexOf('%3Cimg') !== -1}` };
});

check(13, '«هل عندكم قلع ضرس» ← dental', () => {
  const r = run('هل عندكم قلع ضرس');
  return { ok: r.type === 'strong' && r.best.group === 'dental', note: `${r.type} → ${r.best && r.best.name}` };
});

check(14, '«هل يوجد أشعة مقطعية» ← radiology', () => {
  const r = run('هل يوجد أشعة مقطعية');
  return { ok: r.type === 'strong' && r.best.group === 'radiology', note: `${r.type} → ${r.best && r.best.name}` };
});

check(15, '«ايكو للقلب» ← radiology', () => {
  const r = run('ايكو للقلب');
  return { ok: r.type === 'strong' && r.best.group === 'radiology', note: `${r.type} → ${r.best && r.best.name}` };
});

check(16, '«تخطيط القلب ECG» ← general', () => {
  const r = run('تخطيط القلب ECG');
  return { ok: r.type === 'strong' && r.best.group === 'general', note: `${r.type} → ${r.best && r.best.name} (${r.best && r.best.group})` };
});

check(17, '«سونار حمل» ← radiology أو خيارات تشمل سونار الحمل', () => {
  const r = run('سونار حمل');
  const rep = engine.buildReply(r, data);
  const ok =
    (r.best && r.best.group === 'radiology') ||
    rep.options.some((o) => o.name.indexOf('سونار') !== -1 && o.name.indexOf('حمل') !== -1);
  return { ok, note: `${r.type} → ${r.best ? r.best.name : ''}, options=${rep.options.length}` };
});

check(18, 'رقم واتساب من contact.json فقط لا في كود البحث أو الردود', () => {
  const rep = reply('قلع ضرس');
  const usesContact = rep.whatsappUrl.indexOf('wa.me/' + contact.whatsappNumber + '?') !== -1;
  const files = [path.join(ROOT, 'ext', 'services-search.js'), path.join(DATA, 'search-responses.json')];
  const offenders = files.filter(f => {
    const txt = fs.readFileSync(f, 'utf8');
    return txt.includes(String(contact.whatsappNumber)) || txt.includes(String(contact.whatsappDisplay));
  }).map(f => path.relative(ROOT, f));
  return { ok: usesContact && !offenders.length, note: `offenders=${offenders.length ? offenders.join(',') : 'لا شيء'}` };
});

check(19, '«16 حاضنة» ← listed دون «يتوفر لدينا»', () => {
  const r = run('16 حاضنة');
  const rep = engine.buildReply(r, data);
  return { ok: r.type === 'strong' && r.best.group === 'listed' && rep.lines.some(l => l.includes('مذكور في قائمة خدماتنا')) && rep.lines.every(l => !l.includes('يتوفر لدينا')) && rep.lines.some(l => l.includes(String(contact.whatsappDisplay))) && !rep.lines.some(l => l.includes('{whatsappDisplay}')), note: `${r.type}, ${r.best && r.best.group}` };
});

check(20, '«بدل مخاطر» ← لا نتائج', () => {
  const r = run('بدل مخاطر');
  return { ok: r.type === 'none' && !r.best && r.options.length === 0, note: r.type };
});

check(21, 'كل مستبعد لا يظهر عند البحث باسمه', () => {
  const excluded = catalog.items.filter(i => i.excluded === true);
  const failures = excluded.filter(i => {
    const r = run(i.name), found = (r.best ? [r.best] : []).concat(r.options || []);
    return found.some(x => x.id === i.id);
  });
  return {ok: excluded.length > 0 && failures.length === 0, note: `فُحص=${excluded.length}، إخفاق=${failures.map(i => i.id).join(',') || 'لا شيء'}`};
});

/* -------------------------------- التقرير -------------------------------- */

console.log('\n  اختبار محرّك البحث — 21 حالة');
console.log('  ' + '-'.repeat(76));
let pass = 0;
for (const r of results) {
  const mark = r.ok ? '✅' : '❌';
  if (r.ok) pass++;
  console.log(`  ${mark} ${String(r.n).padStart(2)}. ${r.desc}`);
  if (!r.ok || process.argv.includes('--verbose')) console.log(`        → ${r.note}`);
}
console.log('  ' + '-'.repeat(76));
console.log(`  النتيجة: ${pass}/${results.length} ناجحة`);
console.log('');

/* نسبة تباين زر الواتساب #1b5e20 مع الأبيض */
function luminance(hex) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const L1 = luminance('#ffffff');
const L2 = luminance('#1b5e20');
const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
console.log(`  تباين زر واتساب (#1b5e20 على #ffffff) = ${ratio.toFixed(2)}:1  ${ratio >= 4.5 ? '✅ AA' : '❌'}`);
console.log('');

process.exit(pass === results.length ? 0 : 1);
