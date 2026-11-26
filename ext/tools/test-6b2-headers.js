#!/usr/bin/env node
'use strict';
// Static simulation of ordered Cloudflare Pages _headers splats and ! detach.
// Not a request to Cloudflare and not evidence of deployed headers.
const fs=require('fs'),assert=require('assert');const text=fs.readFileSync('_headers','utf8'),rules=[];let cur;
for(const line of text.split(/\r?\n/)){if(!line.trim()||line.trimStart().startsWith('#'))continue;if(!/^\s/.test(line)){cur={path:line.trim(),operations:[]};rules.push(cur);continue;}assert(cur);let op=line.trim();if(op.startsWith('! '))cur.operations.push({remove:op.slice(2).toLowerCase()});else {let i=op.indexOf(':');assert(i>0);cur.operations.push({key:op.slice(0,i).toLowerCase(),value:op.slice(i+1).trim()});}}
function headers(path){const out={};for(const rule of rules){let re=new RegExp('^'+rule.path.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');if(!re.test(path))continue;for(const op of rule.operations){if(op.remove)delete out[op.remove];else out[op.key]=out[op.key]?out[op.key]+', '+op.value:op.value;}}return out;}
const expected={'/services':'public, max-age=0, must-revalidate','/services/':'public, max-age=0, must-revalidate','/services/dental':'public, max-age=0, must-revalidate','/services/dental.html':'public, max-age=0, must-revalidate','/ext/services-search.js':'public, max-age=300, must-revalidate','/ext/data/services-index.js':'public, max-age=300, must-revalidate','/ext/media/above-900.webp':'public, max-age=300, must-revalidate','/logo.jpg':'public, max-age=31536000, immutable','/style.css':'public, max-age=2592000','/':'public, max-age=0, must-revalidate'};
for(const [url,want] of Object.entries(expected)){let h=headers(url);assert.equal(h['cache-control'],want,url);assert(h['content-security-policy-report-only'],url+' missing report-only CSP');assert(!h['content-security-policy'],url+' enforced CSP');console.log(url,'→',h['cache-control']);}
console.log('✅ static simulation only; verify deployed Cloudflare responses separately');
