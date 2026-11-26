#!/usr/bin/env node
/**
 * test-search.js — 45 حالة اختبار لمحرّك بحث دليل الخدمات
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
const data = { items: index.items, synonyms: index.synonyms, excludedTerms: index.excludedTerms, blockedQueries: index.blockedQueries, searchOnlyMatch: index.searchOnlyMatch, yesMatch: index.yesMatch, categoryHints: index.categoryHints, responses, contact };

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

check(6, '«عملية جراحة مخ واعصاب» ← نعم بتغطية السؤال', () => {
  const r = run('عملية جراحة مخ واعصاب');
  const rep = engine.buildReply(r, data);
  const ok = r.type === 'strong' && r.best.id === 'SVC-0009' && r.best.group === 'surgery' && rep.lines.some(l => l.includes('عملياتنا مجهزة'));
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

check(14, '«هل يوجد أشعة مقطعية» ← نعم بتغطية السؤال', () => {
  const r = run('هل يوجد أشعة مقطعية');
  return { ok: r.type === 'strong' && r.best.id === 'SVC-0061' && r.best.group === 'radiology', note: `${r.type} → ${r.best && r.best.name}` };
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

check(19, '«16 حاضنة» ← اعتذار وواتساب، بلا searchOnly', () => {
  const r=run('16 حاضنة'), rep=engine.buildReply(r,data);
  return {ok:r.type==='none' && !r.best && !r.options.length && rep.lines.some(x=>x.includes('نعتذر')) && !!rep.whatsappUrl, note:`${r.type}: ${rep.lines.join(' ')}`};
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

check(22, '«أجور التخدير» ← listed', () => {
  const r = run('أجور التخدير'), rep = engine.buildReply(r, data);
  return {ok:r.type === 'strong' && r.best.group === 'listed' && rep.lines.some(x => x.includes('مذكور في قائمة خدماتنا')) && rep.lines.every(x => !x.includes('يتوفر لدينا')),note:`${r.type} ${r.best && r.best.id}`};
});
check(23, '«هل يوجد فحص صورة الدم الكامل» ← CBC مع اعتماد المرادفات الثمانية', () => {
  const d = JSON.parse(fs.readFileSync(path.join(DATA, 'catalog-decisions.json'), 'utf8'));
  const required=[['CBC','specific'],['فحص الدم الشامل','specific'],['تحليل الدم الشامل','specific'],['صورة الدم الكاملة','specific'],['صورة الدم الكامل','specific'],['فحص دم','generic'],['تحليل دم','generic'],['صورة الدم','generic']];
  const target=catalog.items.find(i=>i.id==='SVC-0048');
  const pinned=required.every(([phrase,tier]) => d.approvedAliases.some(a=>a.phrase===phrase&&a.tier===tier&&a.targetId==='SVC-0048'&&a.approved) && index.synonyms.some(a=>a.phrase===phrase&&a.tier===tier&&a.targetId==='SVC-0048'&&a.approved) && target.aliases.some(a=>a.phrase===phrase&&a.tier===tier&&a.approved));
  const r=run('هل يوجد فحص صورة الدم الكامل');
  return {ok:pinned&&r.type==='strong'&&r.best.id==='SVC-0048'&&r.best.group==='lab',note:`aliases=${pinned}, ${r.type}`};
});
check(24, '«أكثر من 13 سرير عناية» ← بلا searchOnly وصفحات الدليل خالية منها', () => {
  const r=run('أكثر من 13 سرير عناية'), found=(r.best?[r.best]:[]).concat(r.options);
  const pages=fs.readdirSync(path.join(ROOT,'services')).filter(x=>x.endsWith('.html')).map(f=>fs.readFileSync(path.join(ROOT,'services',f),'utf8'));
  const only=index.items.filter(x=>x.searchOnly);
  const allValid=only.length===8 && only.every(item=>{
    const exact=run(item.name), rep=engine.buildReply(exact,data);
    return item.url===null && item.group==='listed' && pages.every(p=>!p.includes(item.name)&&!p.includes('id="'+item.id.toLowerCase()+'"')) && exact.type==='strong' && exact.best.id===item.id && !exact.options.length && rep.lines.some(x=>x.includes('مذكور في قائمة خدماتنا')) && rep.lines.every(x=>!x.includes('يتوفر لدينا')) && !!rep.whatsappUrl;
  });
  return {ok:allValid && found.every(x=>!x.searchOnly),note:`${r.type}: ${found.map(x=>x.id).join(',')}; full names=${allValid}`};
});
check(25, '«جهاز تنفس صناعي» ← بلا searchOnly أو رسوم جهاز التنفس', () => {
  const r=run('جهاز تنفس صناعي'), found=(r.best?[r.best]:[]).concat(r.options||[]);
  return {ok:found.every(i=>!i.searchOnly&&i.id!=='SVC-0369'&&!i.name.includes('رسوم جهاز التنفس')),note:`${r.type}: ${found.map(i=>i.id).join(',')}`};
});
check(26, '«نقل الدم» ← لا نتائج', () => {
  const r=run('نقل الدم');return {ok:r.type==='none'&&!r.best&&!r.options.length,note:r.type};
});
check(27, '«عناية» ← لا تظهر عناصر searchOnly ضمن الخيارات', () => {
  const r=run('عناية');return {ok:(r.options||[]).every(x=>!x.searchOnly),note:`${r.type}, options=${r.options.length}`};
});

const foundItems = r => (r.best ? [r.best] : []).concat(r.options || []);
const noOnly = q => foundItems(run(q)).every(i => !i.searchOnly);
const describe = q => { const r=run(q); return `${r.type}: ${foundItems(r).map(i=>i.id+' '+i.name).join(' | ') || 'لا نتائج'}`; };
check(28, '«سرير» ← لا searchOnly', () => ({ok:noOnly('سرير'),note:describe('سرير')}));
check(29, '«جهاز» و«أجهزة» ← لا searchOnly', () => ({ok:['جهاز','أجهزة'].every(noOnly),note:['جهاز','أجهزة'].map(describe).join('؛ ')}));
check(30, '«حاضنة» ← لا searchOnly', () => ({ok:noOnly('حاضنة'),note:describe('حاضنة')}));
check(31, '«عناية مركزة» ← 0356 و0357 و0367 فقط', () => {
  const r=run('عناية مركزة'), ids=foundItems(r).map(i=>i.id).sort();
  return {ok:ids.join(',')==='SVC-0356,SVC-0357,SVC-0367'&&foundItems(r).every(i=>!i.searchOnly),note:describe('عناية مركزة')};
});
check(32, 'الاسم الكامل مع ICU ← 0001 وlisted', () => {
  const r=run('أكثر من 13 سرير عناية مركزة للكبار (ICU)'), rep=engine.buildReply(r,data);
  return {ok:r.type==='strong'&&r.best.id==='SVC-0001'&&!r.options.length&&rep.lines.some(x=>x.includes('مذكور في قائمة خدماتنا'))&&rep.lines.every(x=>!x.includes('يتوفر لدينا'))&&!!rep.whatsappUrl,note:describe(r.query)};
});
check(33, '«13 سرير عناية مركزة للكبار» ← 0001', () => {const q='13 سرير عناية مركزة للكبار',r=run(q);return {ok:r.type==='strong'&&r.best.id==='SVC-0001'&&!r.options.length,note:describe(q)};});
check(34, '«16 حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج» ← 0003', () => {const q='16 حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج',r=run(q);return {ok:r.type==='strong'&&r.best.id==='SVC-0003'&&!r.options.length,note:describe(q)};});
check(35, '«8 أسرة عناية مركزة للأطفال» ← تحديد ظهور 0002', () => {const q='8 أسرة عناية مركزة للأطفال',r=run(q);return {ok:r.type==='strong'&&r.best.id==='SVC-0002'&&!r.options.length,note:describe(q)};});
check(36, '«أكثر من 12 جهاز تنفس صناعي» و«أكثر من 35 جهاز مراقبة للعلامات الحيوية»', () => {
  const q1='أكثر من 12 جهاز تنفس صناعي',q2='أكثر من 35 جهاز مراقبة للعلامات الحيوية',r1=run(q1),r2=run(q2);
  const config=index.searchOnlyMatch, restricted={...data, searchOnlyMatch:{minCoverage:1,minWords:6}};
  const restrictedResult=engine.search(q2,restricted);
  const tieItems=[{id:'TEST-A',name:'الف باء جيم دال',searchOnly:true},{id:'TEST-B',name:'الف باء جيم دال',searchOnly:true}];
  const tie=engine.search('الف باء جيم دال',{items:tieItems,searchOnlyMatch:config});
  const boundaryItems=[{id:'BOUNDARY',name:'تفاح موز عنب رمان',searchOnly:true}];
  const boundary = q => engine.search(q,{items:boundaryItems,searchOnlyMatch:config});
  const stricter=engine.search('تفاح موز عنب',{items:boundaryItems,searchOnlyMatch:{...config,minCoverage:0.8}});
  const alias=engine.search('خفي',{items:boundaryItems,searchOnlyMatch:config,synonyms:[{phrase:'خفي',tier:'specific',approved:true,targetId:'BOUNDARY'}]});
  return {ok:config.minCoverage===0.75&&config.minWords===3&&!foundItems(r1).some(x=>x.id==='SVC-0007')&&r2.type==='strong'&&r2.best.id==='SVC-0008'&&!r2.options.length&&!foundItems(restrictedResult).some(x=>x.searchOnly)&&tie.best?.id==='TEST-A'&&!tie.options.length&&boundary('تفاح موز عنب').best?.id==='BOUNDARY'&&!boundary('تفاح موز').best&&!stricter.best&&!foundItems(alias).some(x=>x.searchOnly),note:q1+' ← '+describe(q1)+'؛ '+q2+' ← '+describe(q2)};
});

check(37, '«سرير» ← لا نعم للتقييم السريري', () => {const r=run('سرير');return {ok:r.type!=='strong'&&(!r.best||r.best.id!=='SVC-0263'),note:describe('سرير')};});
check(38, '«سريري» ← لا نعم لخدمة بلا مطابقة كلمة كاملة', () => {const r=run('سريري');return {ok:r.type!=='strong'||engine.wholeWordMatch('سريري',r.best.name),note:describe('سريري')};});
check(39, '«قلع ضرس»، «CBC»، «ايكو للقلب» لا تتأثر', () => {
  const expected=[['قلع ضرس','SVC-0070',['SVC-0071','SVC-0072','SVC-0074']],['CBC','SVC-0048',[]],['ايكو للقلب','SVC-0246',['SVC-0247','SVC-0065']]];
  const specific=['CBC','فحص الدم الشامل','تحليل الدم الشامل','صورة الدم الكاملة','صورة الدم الكامل'];
  const generic=['فحص دم','تحليل دم','صورة الدم'];
  const aliasesOk=specific.every(q=>{const r=run(q);return r.type==='strong'&&r.best.id==='SVC-0048'}) && generic.every(q=>{const r=run(q);return r.type==='weak'&&r.options.some(x=>x.id==='SVC-0048')});
  return {ok:aliasesOk&&expected.every(([q,id,options])=>{const r=run(q), rep=engine.buildReply(r,data);return r.type==='strong'&&r.best.id===id&&JSON.stringify(r.options.map(x=>x.id))===JSON.stringify(options)&&(!options.length||rep.lines.some(x=>x.includes('هل تقصد')))}),note:expected.map(([q])=>q+' ← '+describe(q)).join('؛ ')};
});
check(40, '«أكثر من 12 جهاز تنفس صناعي» ← لا 0007 دون تغطية 75%', () => {const r=run('أكثر من 12 جهاز تنفس صناعي');return {ok:!foundItems(r).some(x=>x.id==='SVC-0007'),note:describe(r.query)};});
check(41, '«12 جهاز تنفس صناعي» ← لا 0007 دون تغطية 75%', () => {const r=run('12 جهاز تنفس صناعي');return {ok:!foundItems(r).some(x=>x.id==='SVC-0007'),note:describe(r.query)};});
check(42, '«جهاز تنفس صناعي» ← لا 0007', () => ({ok:noOnly('جهاز تنفس صناعي'),note:describe('جهاز تنفس صناعي')}));
check(43, '«١٦ حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج» ← 0003', () => {const q='١٦ حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج',r=run(q);return {ok:r.type==='strong'&&r.best.id==='SVC-0003',note:describe(q)};});
check(44, '«حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج» بلا رقم ← لا 0003', () => {const q='حاضنة أطفال في وحدة العناية بحديثي الولادة ورعاية الخدج';return {ok:noOnly(q),note:describe(q)};});

check(45, 'التجهيزات: العمومي والعبارة المختصرة لا تظهر searchOnly', () => {
  const decisions=JSON.parse(fs.readFileSync(path.join(DATA,'catalog-decisions.json'),'utf8'));
  const only=index.items.filter(x=>x.searchOnly);
  const r=run('16 حاضنة أطفال');
  const numberIds=['SVC-0001','SVC-0002','SVC-0003','SVC-0004','SVC-0007','SVC-0008'];
  const flags=only.length===8&&only.every(i=>i.exactMatchOnly&&i.directoryHidden&&i.numberRequired===numberIds.includes(i.id)&&i.matchName===(i.id==='SVC-0007'?'أكثر من 12 جهاز تنفس صناعي':'')&&decisions.decisions.some(d=>d.id===i.id&&d.exactMatchOnly&&d.directoryHidden&&d.matchName===i.matchName&&d.numberRequired===i.numberRequired));
  const broad=['سرير','جهاز','أجهزة','حواضن','رقود'].every(noOnly);
  const reverse=noOnly('أطفال حاضنة 16');
  const incomplete=noOnly('16 أطفال حاضنة');
  const wrongNumbers=['14 سرير عناية مركزة للكبار','9 أسرة عناية مركزة للأطفال','17 حاضنة أطفال','41 سرير رقود خاص','13 جهاز تنفس صناعي','36 جهاز مراقبة للعلامات الحيوية'].every(noOnly);
  const persian=run('۱۲ جهاز تنفس صناعي');
  const exactItem={id:'EXACT-TEST',name:'تفاح موز عنب رمان',searchOnly:true,exactMatchOnly:true};
  const threshold=q=>engine.search(q,{items:[exactItem],searchOnlyMatch:index.searchOnlyMatch});
  const tooStrict=engine.search('تفاح موز عنب',{items:[exactItem],searchOnlyMatch:{...index.searchOnlyMatch,minCoverage:0.8}});
  return {ok:flags&&broad&&reverse&&incomplete&&wrongNumbers&&!foundItems(persian).some(x=>x.id==='SVC-0007')&&!foundItems(r).some(x=>x.id==='SVC-0003')&&threshold('تفاح موز عنب').best?.id==='EXACT-TEST'&&!tooStrict.best,note:`flags=${flags}, broad=${broad}, reversed=${reverse}, 16 حاضنة أطفال=${r.best?.id}`};
});

check(46, 'عين خيارات بلا عينة', () => {const r=run('عين');return {ok:r.type==='weak' && r.options.some(x=>x.id==='SVC-0434') && !r.options.some(x=>x.name.includes('عينة')),note:describe('عين')};});
check(47, 'كبد خيارات', () => ({ok:run('كبد').type==='weak',note:describe('كبد')}));
check(48, 'ولادة خيارات بلا هولتر', () => {const r=run('ولادة');return {ok:r.type==='weak' && !r.options.some(x=>x.name.includes('هولتر')),note:describe('ولادة')};});
check(49, 'غسيل العين نعم', () => {const r=run('غسيل العين');return {ok:r.type==='strong'&&r.best.id==='SVC-0434',note:describe('غسيل العين')};});
check(50, 'خزعة من الكبد نعم', () => {const r=run('خزعة من الكبد');return {ok:r.type==='strong'&&r.best.id==='SVC-0191',note:describe('خزعة من الكبد')};});
check(51, 'تحليل رابط diagnostics', () => {const r=run('تحليل'),p=engine.buildReply(r,data);return {ok:r.type==='category'&&p.categoryHint?.slug==='diagnostics'&&p.categoryHint.text==='تصفّح قسم فحوصات تشخيصية في دليل الخدمات',note:JSON.stringify(p.categoryHint)};});
check(52, 'عملية رابط surgery', () => {const r=run('عملية'),p=engine.buildReply(r,data);return {ok:r.type==='category'&&p.categoryHint?.slug==='surgery',note:JSON.stringify(p.categoryHint)};});
check(53, 'قلب خيارات', () => ({ok:run('قلب').type==='weak',note:describe('قلب')}));
check(54, 'رقود غرفة خاصة نعم 0352', () => {const r=run('رقود غرفة خاصة');return {ok:r.type==='strong'&&r.best.id==='SVC-0352',note:describe(r.query)};});
check(55, '16 حاضنة أطفال لا يظهر 0003', () => {const r=run('16 حاضنة أطفال');return {ok:!foundItems(r).some(x=>x.id==='SVC-0003'),note:describe(r.query)};});
check(56, 'الاسم الكامل لـ0003 يظهر', () => {const item=index.items.find(x=>x.id==='SVC-0003'),r=run(item.name);return {ok:r.type==='strong'&&r.best.id===item.id,note:describe(item.name)};});
check(57, 'سن خيارات، قلع ضرس وCBC وتخطيط القلب وايكو نعم', () => {const cases=[['سن','weak'],['قلع ضرس','strong'],['CBC','strong'],['تخطيط القلب ECG','strong'],['ايكو للقلب','strong']];return {ok:cases.every(([q,t])=>run(q).type===t),note:cases.map(([q])=>describe(q)).join('؛ ')};});
check(58, 'الكلمات العامة الخمس وحدها وروابطها', () => {const q={تحليل:'diagnostics',فحص:'diagnostics',اشعة:'diagnostics',عملية:'surgery',عمليات:'surgery'};return {ok:JSON.stringify(Object.keys(index.categoryHints).sort())===JSON.stringify(Object.keys(q).sort())&&Object.entries(q).every(([x,slug])=>engine.buildReply(run(x),data).categoryHint?.slug===slug),note:JSON.stringify(index.categoryHints)};});
check(59, 'عتبة تغطية الاسم قابلة للضبط دون تجاوز حماية الكلمة الواحدة', () => {const name='الف باء جيم دال',items=[{id:'T',name}];const high=engine.wholeWordMatch('الف',name,0.3),low=engine.wholeWordMatch('الف',name,0.2),single=engine.search('الف',{items,yesMatch:{coverageMin:0.2}});return {ok:index.yesMatch.coverageMin===0.6&&!high&&low&&single.type==='weak',note:`0.3=${high}, 0.2=${low}, single=${single.type}`};});
check(60, 'الأقواس والأرقام والحروف المفردة لا تدخل تغطية الاسم', () => {const items=[{id:'T',name:'قلع ضرس A 123 (كبير وصغير)'}],r=engine.search('قلع ضرس',{items});return {ok:r.type==='strong'&&r.best.id==='T',note:r.type};});
check(61, 'قصير لا بادئة أو تقريب واسم الفئة لا يولد خيارًا', () => {const d={items:[{id:'P',name:'عينة من عنق الرحم',category:'عين'},{id:'F',name:'التقييم السريري للتوازن',category:'سرير'},{id:'C',name:'جهاز لمدة طويلة',category:'ولادة'}]};return {ok:['عين','سرير','ولادة'].every(q=>!foundItems(engine.search(q,d)).length),note:'أسماء اصطناعية'};});
check(62, 'الكامل قبل التقريبي', () => {const d={items:[{id:'FUZZ',name:'مختبر التحاليل الخاصة'}, {id:'EXACT',name:'التحاليل'}, {id:'FULL',name:'التحاليل الطبية'}]},r=engine.search('تحاليل',{...d,yesMatch:{coverageMin:1}});const all=foundItems(r);return {ok:all[0]?.id==='EXACT',note:all.map(x=>x.id).join(',')};});
check(63, 'المرادفات غير المعتمدة لا تعمل', () => {const d={items:[{id:'T',name:'تفاح موز عنب'}],synonyms:[{phrase:'رمزسري',targetId:'T',approved:false,tier:'specific'}]};const r=engine.search('رمزسري',d);return {ok:r.type==='none',note:r.type};});
check(64, 'الاسم الكامل للجهاز 0007 ورقمه الخاطئ', () => {const item=index.items.find(x=>x.id==='SVC-0007'),a=run(item.name),b=run(item.name.replace('12','13'));return {ok:a.best?.id===item.id&&!foundItems(b).some(x=>x.id===item.id),note:describe(item.name)};});
check(65, 'عبارة زائدة لا تعطى نعم دون تطابق كل الكلمات', () => {const r=engine.search('تفاح موز عنب غريب',{items:[{id:'T',name:'تفاح موز عنب'}]});return {ok:r.type!=='strong',note:r.type};});
check(66, 'أسئلة متعددة واضحة في الأسماء الطويلة ← نعم', () => {const cases=[['عملية جراحة مخ واعصاب','SVC-0009'],['جراحة المخ والاعصاب','SVC-0009'],['جراحة العظام','SVC-0021'],['اشعة مقطعية','SVC-0061'],['الاشعة المقطعية CT','SVC-0061']];return {ok:cases.every(([q,id])=>{const r=run(q);return r.type==='strong'&&r.best.id===id}),note:cases.map(([q])=>describe(q)).join('؛ ')};});
check(67, 'المفردات العامة لا تعطي نعم حتى مع اسم مطابق أو مرادف محدد', () => {const words=['عين','كبد','ولادة','قلب','سن','سرير','جهاز'];return {ok:words.every(q=>run(q).type!=='strong'&&engine.search(q,{items:[{id:'T',name:q}]}).type!=='strong'&&engine.search(q,{items:[{id:'T',name:q}],synonyms:[{phrase:q,targetId:'T',approved:true,tier:'specific'}]}).type!=='strong'),note:words.map(describe).join('؛ ')};});
check(68, 'تغطية السؤال كلمات كاملة فقط، والرقم والواو الأصلية محفوظان', () => {const item={id:'T',name:'تفاح موز عنب رمان خوخ مشمش'}, d={items:[item]};const exact=engine.search('تفاح موز',d),extra=engine.search('تفاح موز غريب',d),fuzzy=engine.search('تفاحه موز',d),num=engine.search('تفاح موز 12',d),w=engine.search('ولادة تفاح',{items:[{id:'W',name:'لادة تفاح'}]});return {ok:exact.type==='strong'&&extra.type!=='strong'&&fuzzy.type!=='strong'&&num.type!=='strong'&&w.type!=='strong',note:`exact=${exact.type}, extra=${extra.type}, fuzzy=${fuzzy.type}, number=${num.type}, waw=${w.type}`};});
check(69, 'تغطية السؤال لا تتجاوز قيود searchOnly أو الكلمات العامة', () => {const hidden={id:'H',name:'تفاح موز عنب رمان خوخ',searchOnly:true},d={items:[hidden],searchOnlyMatch:{minCoverage:0.75,minWords:3}};const r=engine.search('تفاح موز عنب',d),generic=engine.search('فحص عين',{items:[{id:'G',name:'فحص عين'}]});return {ok:!foundItems(r).some(x=>x.id==='H')&&generic.type!=='strong',note:`searchOnly=${r.type}, فحص عين=${generic.type}`};});
check(70, 'أولوية نعم السابقة محفوظة عند سونار حمل', () => {const r=run('سونار حمل');return {ok:r.type==='strong'&&r.best.id==='SVC-0332',note:describe(r.query)};});

/* -------------------------------- التقرير -------------------------------- */

console.log('\n  اختبار محرّك البحث — الحالات كاملة');
console.log('  ' + '-'.repeat(76));
let pass = 0;
for (const r of results) {
  const mark = r.ok ? '✅' : '❌';
  if (r.ok) pass++;
  console.log(`  ${mark} ${String(r.n).padStart(2)}. ${r.desc}`);
  if (!r.ok || r.n >= 28 || process.argv.includes('--verbose')) console.log(`        → ${r.note}`);
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
