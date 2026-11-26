#!/usr/bin/env node
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const engine = require('../../services-search.js');
const index = require('../../data/services-index.json');
const catalog = require('../../data/services-catalog.json');
const responses = require('../../data/search-responses.json');
const contact = require('../../data/contact.json');
const data = {...index, responses, contact};
const queries = ['فحص دم','فحص دم عام','تحليل دم عام','سونار عام','الإدارة العامة','وحدة العناية','CBC','عملية جراحة مخ واعصاب','عين','تحليل','نقل الدم','سرير','أكثر من 40 سرير رقود خاص','جهاز التنفس','شهادة الوفاة'];
const all = r => (r.best ? [r.best] : []).concat(r.options || []);
const results = queries.map(query => {
  const result = engine.search(query, data), reply = engine.buildReply(result, data), found = all(result);
  assert(found.length <= 5, query);
  assert(found.every(x => !['units','admin','وحدات وأقسام','إدارات مساندة'].includes(x.category) && !['units','admin'].includes(x.type) && !engine.norm(x.name).includes(engine.norm('رسوم'))), query);
  if (result.type === 'none') assert(reply.lines.some(x => x.includes('نعتذر')) && reply.whatsappUrl, query);
  return {query, type:result.type, results:found.map(x=>({id:x.id,name:x.name,category:x.category,group:x.group})), reply};
});
const by = q => results.find(x=>x.query===q);
for (const q of ['فحص دم عام','تحليل دم عام']) {
  const r=by(q); assert.equal(r.type,'strong'); assert.deepEqual(r.results.map(x=>x.id),['SVC-0048']);
  assert.equal(r.reply.title,'نعم، الخدمة متوفرة لدينا');
  assert.equal(r.reply.lines[0],'يتوفر لدينا فحص الدم الشامل CBC في مستشفى الأنهار التخصصي. للحجز أو استكمال الإجراءات أو معرفة المزيد من التفاصيل، تواصل معنا عبر واتساب وسيساعدك فريقنا.');
  assert.equal(r.reply.whatsappLabel,'تواصل عبر واتساب');
  assert.equal(new URL(r.reply.whatsappUrl).pathname,'/'+contact.whatsappNumber);
  assert.equal(new URL(r.reply.whatsappUrl).searchParams.get('text'),'السلام عليكم، أرغب في الحجز أو الاستفسار عن: فحص الدم الشامل CBC');
}
for(const q of ['فحص دم','تحليل دم','صورة الدم']) assert.equal(engine.search(q,data).type,'weak',q);
for(const q of ['الإدارة العامة','وحدة العناية','شهادة الوفاة','نقل الدم']) assert.equal(by(q).type,'none',q);
assert(by('سونار عام').results.some(x=>x.id==='SVC-0063'));
assert.equal(by('CBC').results[0].id,'SVC-0048');
assert.equal(by('CBC').reply.lines[0],responses.groups.lab.text.replace('{name}','فحص الدم الشامل CBC'));
assert.equal(by('أكثر من 40 سرير رقود خاص').results[0].id,'SVC-0004');
assert(by('جهاز التنفس').results.length>0);
assert.notEqual(by('عين').type,'strong'); assert.notEqual(by('تحليل').type,'strong'); assert.notEqual(by('سرير').type,'strong');
for (const item of index.items.filter(i => ['وحدات وأقسام','إدارات مساندة'].includes(i.category))) {
  for (const q of [item.name, item.name+' عام']) assert(all(engine.search(q,data)).every(x=>!['وحدات وأقسام','إدارات مساندة','units','admin'].includes(x.category)),item.id);
}
for (const field of ['category','type']) for (const value of ['units','admin']) {
  const fake={id:'hidden',name:'تفاح موز عنب',[field]:value};
  assert(!all(engine.search(fake.name,{items:[fake],synonyms:[{phrase:'مفتاح',targetId:fake.id,approved:true,tier:'specific'}]})).length);
  assert(!all(engine.search('مفتاح',{items:[fake],synonyms:[{phrase:'مفتاح',targetId:fake.id,approved:true,tier:'specific'}]})).length);
}
const fee={id:'fee',name:'رسوم شهادة الوفاة'};
assert(!all(engine.search('شهادة الوفاة',{items:[fee],synonyms:[{phrase:'شهادة الوفاة',targetId:'fee',approved:true,tier:'specific'}]})).length);
for (const i of index.items.filter(x=>x.searchOnly)) assert.equal(engine.search(i.name,data).best?.id,i.id,'searchOnly exact '+i.id);
for (const q of ['عين','كبد','ولادة','قلب','سن','سرير','جهاز','فحص','تحليل','اشعة','سونار','إيكو','اختبار','عملية','جراحة']) assert.notEqual(engine.search(q,data).type,'strong','generic '+q);
assert.equal(engine.search('عام عامة تخصصي مركز عيادة',data).type,'none');
const sonars=catalog.items.filter(x=>x.name.includes('سونار')).map(x=>({id:x.id,name:x.name,publish:x.publish,queryResult:engine.search(x.name,data).type,selected:all(engine.search(x.name,data)).map(y=>y.id)}));
fs.writeFileSync(path.join(__dirname,'search-results.json'),JSON.stringify({results,sonars,excludedNamesChecked:27},null,2)+'\n');
console.log('PASS search:',results.length,'queries; 27 excluded full names; synthetic aliases, fees, general single words and 8 search-only names');
console.log('sonars:',JSON.stringify(sonars));
