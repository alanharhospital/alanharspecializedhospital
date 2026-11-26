#!/usr/bin/env node
'use strict';
// Compare actual engines against the same catalog and configuration; requires local backup.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');if(!process.argv[2]) throw Error('Usage: node ext/tools/compare-5a10.js BACKUP_DIR');
const beforeRoot=path.resolve(process.argv[2]);
function read(root){const index=require(path.join(root,'ext/data/services-index.json'));return {engine:require(path.join(root,'ext/services-search.js')),data:{...index,responses:require(path.join(root,'ext/data/search-responses.json')),contact:require(path.join(root,'ext/data/contact.json'))}}}
const b=read(beforeRoot),a=read(root);
const asked=['عملية جراحة مخ واعصاب','جراحة المخ والاعصاب','جراحة العظام','اشعة مقطعية','الاشعة المقطعية CT','سونار','سونار حمل','ايكو للقلب','قلع ضرس','زراعة سن','جلسة علاج طبيعي','فحص السكر التراكمي'];
const singles=['سرير','جهاز','دم','قلب','عين','سن','ضرس','كبد','كلى','عظام','ولادة','تحليل','اشعة','عملية','ممرض','طوارئ','فحص'];
const tests=['هل يوجد أشعة مقطعية','أكثر من 12 جهاز تنفس صناعي','أكثر من 35 جهاز مراقبة للعلامات الحيوية','12 جهاز تنفس صناعي','16 حاضنة أطفال'];
function run(x,q){const r=x.engine.search(q,x.data),all=(r.best?[r.best]:[]).concat(r.options||[]);return {type:r.type,categoryHint:r.categoryHint||null,firstThree:all.slice(0,3).map(({id,name})=>({id,name}))};}
const result={asked:asked.map(q=>({query:q,before:run(b,q),after:run(a,q)})),singles:singles.map(q=>({query:q,before:run(b,q),after:run(a,q)})),tests:tests.map(q=>({query:q,before:run(b,q),after:run(a,q)}))};
fs.writeFileSync(path.join(root,'ext/audit/5a10-comparison.json'),JSON.stringify(result,null,2)+'\n');
for(const x of result.asked.concat(result.tests)) console.log(x.query+' | '+x.before.type+' → '+x.after.type+' | '+x.after.firstThree.map(i=>i.name).join(' ؛ '));
for(const x of result.singles) if(JSON.stringify(x.before)!==JSON.stringify(x.after))throw Error('تغيرت نتيجة مفردة: '+x.query);
console.log('✅ المفردات الـ17: النوع وأول ثلاث نتائج متطابقة قبل/بعد');
