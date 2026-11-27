#!/usr/bin/env node
'use strict';
// Recreate the 671-query sample from approved-sonar/compare.js against the pre-task commit.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process');
const root=path.resolve(__dirname,'../../..'), ref='a7f7cfa6e09e5ac3f4edbb1fe45b8245f6eef34c';
function oldFile(name){return cp.execFileSync('git',['show',ref+':'+name],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});}
const sandbox={module:{exports:{}}};vm.runInNewContext(oldFile('ext/services-search.js'),sandbox);const old=sandbox.module.exports;
const current=require('../../services-search.js'),oldIndex=JSON.parse(oldFile('ext/data/services-index.json')),newIndex=require('../../data/services-index.json');
const responses=require('../../data/search-responses.json'),contact=require('../../data/contact.json');
const before={...oldIndex,responses,contact},after={...newIndex,responses,contact};assert.deepStrictEqual(newIndex.items,oldIndex.items);
const queries=new Set(['سونار','سونار حمل','سونار للحمل','فحص دم','تحليل دم','صورة الدم','فحص دم عام','تحليل دم عام','CBC','الإدارة العامة','وحدة العناية','تحليل','نقل الدم','جهاز التنفس','سرير','عين','سونار عام إضافي']);
for(const item of oldIndex.items){queries.add(item.name);queries.add(item.name.split(/\s+/).slice(0,2).join(' '));}
const previousOverrides=new Set(['سونار عام','السونار العام'].map(current.norm));
const override=newIndex.searchOverrides.find(x=>x.response==='approved-ventilator-service');assert(override);
const allowed=new Set(override.queries.map(current.norm)),changed=[],unchanged=[];let count=0;
function view(engine,data,q){const result=engine.search(q,data),reply=engine.buildReply(result,data);return JSON.parse(JSON.stringify({result,reply}));}
for(const q of queries){if(previousOverrides.has(current.norm(q)))continue;const a=view(old,before,q),b=view(current,after,q);(JSON.stringify(a)===JSON.stringify(b)?unchanged:changed).push(q);count++;}
assert.equal(count,671);assert(changed.length>0);assert(changed.every(q=>allowed.has(current.norm(q))));
const requested=['جهاز التنفس','هل يوجد جهاز تنفس','عندكم اجهزة تنفس','خروج جهاز تنفس صناعي لمدة ساعة داخل المدينة','أكثر من 12 جهاز تنفس صناعي'];
const details=requested.map(q=>({query:q,before:view(old,before,q),after:view(current,after,q)}));
const additional=override.queries.map(q=>({query:q,before:view(old,before,q),after:view(current,after,q)}));
assert(additional.every(x=>JSON.stringify(x.before)!==JSON.stringify(x.after)));
const report={baseCommit:ref,sampleCount:count,changedCount:changed.length,changed,unchangedCount:unchanged.length,method:'same 671 queries as approved-sonar comparison; normalized sonar overrides excluded as before; full results and replies compared',requested:details,allVentilatorPhrases:additional};
fs.writeFileSync(path.join(__dirname,'comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sampleCount:count,changedCount:changed.length,changed,unchangedCount:unchanged.length},null,2));
