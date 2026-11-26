#!/usr/bin/env node
'use strict';
const assert = require('assert');
const engine = require('../services-search.js');
const index = require('../data/services-index.json');
const data = {...index, responses:require('../data/search-responses.json'), contact:require('../data/contact.json')};
const queries = ['سرير','جهاز','دم','قلب','عين','سن','ضرس','كبد','كلى','عظام','ولادة','تحليل','اشعة','عملية','ممرض','طوارئ','فحص'];
function wholeSingle(query, name) {
  const normalizeWord = word => {
    if (/^(وال|بال|كال|فال)/.test(word) && word.length > 5) return word[0] + word.slice(3);
    if (/^لل/.test(word) && word.length > 3) return word.slice(2);
    if (/^ال/.test(word) && word.length > 3) return word.slice(2);
    return word;
  };
  const term = normalizeWord(engine.norm(query));
  return engine.norm(name).split(' ').map(normalizeWord).includes(term);
}
console.log('\nفحص الاستعلامات المفردة:');
for (const query of queries) {
  const result = engine.search(query, data);
  const options = (result.best ? [result.best] : []).concat(result.options || []).slice(0,3);
  assert(['strong','weak','none','category'].includes(result.type), query + ': لا رد');
  if (result.type === 'strong') {
    assert(wholeSingle(query, result.best.name), query + ': نعم دون كلمة كاملة — ' + result.best.name);
  }
  console.log(query + ' | ' + ({strong:'نعم',weak:'خيارات',none:'اعتذار',category:'رابط قسم'})[result.type] + ' | ' + (options.map(x=>x.name).join(' ؛ ') || '—'));
}
const item={id:'TEST',name:'التقييم السريري للتوازن',group:'general'};
for (const [query,type] of [['سرير','none'],['سريري','weak'],['سرير توازن','weak'],['سريري توازن','strong']]) {
  const result=engine.search(query,{items:[item]});
  assert.equal(result.type,type,query+' نوع غير صحيح');
}
const wordItem={id:'TEST-WORD',name:'قسم الولادة',group:'general'};
assert.equal(engine.search('لادة',{items:[wordItem]}).type,'none', 'لا تُحذف واو أصلية فتتحول المطابقة الجزئية إلى نعم');
assert.equal(engine.search('ولادة',{items:[wordItem]}).type,'weak', 'مطابقة الولادة وحدها لا تغطي 60% من اسم الخدمة');
assert.equal(engine.search('1 فتق',{items:[{id:'TEST-NUMBER',name:'عملية فتق'}]}).type,'weak', 'الرقم المميز لا يسقط من التحقق');
const cbc = engine.search('فحص صورة الدم الكامل', data);
assert(cbc.type === 'strong' && cbc.best.id === 'SVC-0048', 'المرادف المعتمد تغير');
console.log('✅ كل ردود نعم المفردة مطابقة لكلمة كاملة؛ اختبارات التقريبي والمرادف ناجحة.');
