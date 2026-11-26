#!/usr/bin/env node
'use strict';
// Read-only comparison against the actual local backup before the override.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../../..'),backup=path.join(root,'_backup/2026-11-26_23-42-13');
const old=require(path.join(backup,'ext/services-search.js')), current=require('../../services-search.js');
const oldIndex=require(path.join(backup,'ext/data/services-index.json')),newIndex=require('../../data/services-index.json');
const responses=require('../../data/search-responses.json'),contact=require('../../data/contact.json');
const before={...oldIndex,responses,contact},after={...newIndex,responses,contact};
assert.deepStrictEqual(newIndex.items,oldIndex.items);
const queries=new Set(['سونار','سونار حمل','سونار للحمل','فحص دم','تحليل دم','صورة الدم','فحص دم عام','تحليل دم عام','CBC','الإدارة العامة','وحدة العناية','تحليل','نقل الدم','جهاز التنفس','سرير','عين','سونار عام إضافي']);
for(const item of oldIndex.items){queries.add(item.name);queries.add(item.name.split(/\s+/).slice(0,2).join(' '));}
const approved=new Set(['سونار عام','السونار العام'].map(current.norm)),changed=[];let checked=0;
for(const q of queries){if(approved.has(current.norm(q)))continue;let a=old.search(q,before),b=current.search(q,after);let ar=old.buildReply(a,before),br=current.buildReply(b,after);if(JSON.stringify([a,ar])!==JSON.stringify([b,br]))changed.push(q);checked++;}
console.log('Compared',checked,'distinct non-override queries; differing results/replies:',changed.length);
if(changed.length)console.log(JSON.stringify(changed));
assert.deepStrictEqual(changed,[]);
fs.writeFileSync(path.join(__dirname,'comparison.json'),JSON.stringify({checked,changed,method:'all published full names and their first two words plus representative requests, excluding normalized override phrases'},null,2)+'\n');
