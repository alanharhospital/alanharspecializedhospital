#!/usr/bin/env node
'use strict';
// Compare representatives of the 21 pre-existing color pairs against a local backup server.
const fs=require('fs'),path=require('path'),assert=require('assert'),pup=require('puppeteer-core'),chr=require('@sparticuz/chromium');
const cases=[
['دليل التذييل — صفحات الوحدات','/clinics.html','footer .enh-guide-link a','#0a2a5e','#0a2a5e'],
['التنبيه — الرئيسية','/','footer .enh-disclaimer','#0a2a5e','#132650'],
['دليل التذييل — الرئيسية','/','footer .enh-guide-link a','#0a2a5e','#14264f'],
['التنبيه — الأطباء','/doctors.html','footer .enh-disclaimer','#0a2a5e','#132248'],
['دليل التذييل — الأطباء','/doctors.html','footer .enh-guide-link a','#0a2a5e','#142247'],
['شارة الخبر','/news.html','article .hero-badge','#2ecc71','#d5f5e3'],
['زر واتساب الحجز','/','#btnSendWhatsApp','#ffffff','#25d366'],
['رمز فئة','/ancillary.html','.category-icon','#2ecc71','#f8fafc'],
['إحصاء العرض','/offers.html','.stat b','#2ecc71','#ffffff'],
['عرض التفاصيل','/ancillary.html','.expand-text','#2ecc71','#ffffff'],
['زر حجز الرئيسية','/','.hero a.btn-primary','#ffffff','#2ecc71'],
['نص الهوية المجاور للشعار','/doctors.html','.brand-name-sub','#40c057','#ffffff'],
['زر حجز طبيب','/doctors.html','.btn-book-now','#ffffff','#40c057'],
['شارة إعلان','/','.badge-limited','#ffffff','#ee7d55'],
['شارة تخصص الطبيب','/doctors.html','.spec-badge','#2f9e44','#e8f7eb'],
['رمز شريط الطوارئ','/','.quickbar__phone-ico','#ffffff','#4c8cda'],
['صلاحية العرض','/offers.html','.status','#1e8e4e','#e0f7ea'],
['تواصل مباشر','/pr.html','.live-badge','#1a8f4d','#e9f9f0'],
['زر فيسبوك الخبر','/news.html','a.btn[href*="facebook.com"] span','#ffffff','#1877f2'],
['نوع العرض','/offers.html','.cat-tag','#1f6fd1','#e9f1fa'],
['نجمة الحقل المطلوب','/','.form-group[style*="f0f8fc"] .required','#dc2626','#f0f8fc']
];
const nss='/tmp/arena-nss/dist/Linux6.1_x86_64_cc_glibc_PTH_64_OPT.OBJ/lib',env={...process.env};if(fs.existsSync(path.join(nss,'libnss3.so')))env.LD_LIBRARY_PATH=nss+(env.LD_LIBRARY_PATH?':'+env.LD_LIBRARY_PATH:'');
(async()=>{const browser=await pup.launch({executablePath:await chr.executablePath(),args:[...chr.args,'--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],env,headless:true});try{const data=[];for(const [name,route,selector,expectedFg,expectedBg] of cases){let values=[];for(const port of [8182,8181]){let p=await browser.newPage();await p.setViewport({width:1280,height:900});await p.setRequestInterception(true);p.on('request',r=>/^http:\/\/127\.0\.0\.1:(8181|8182)\//.test(r.url())||/^(data|blob):/.test(r.url())?void r.continue():void r.abort());await p.goto(`http://127.0.0.1:${port}${route}`,{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,300));let result=await p.$eval(selector,e=>{function rgba(s){let a=s.match(/^rgba?\(([^)]+)\)/);if(!a)return null;let n=a[1].split(/[, /]+/).filter(Boolean).map(Number);return n.length>=3?[n[0],n[1],n[2],n.length>3?n[3]:1]:null}function blend(f,b){let a=f[3]+b[3]*(1-f[3]);return a?[0,1,2].map(i=>(f[i]*f[3]+b[i]*b[3]*(1-f[3]))/a).concat(a):[0,0,0,0]}function hex(c){return '#'+c.slice(0,3).map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('')}function lum(c){let n=c.slice(0,3).map(x=>{let v=x/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*n[0]+.7152*n[1]+.0722*n[2]}let fg=rgba(getComputedStyle(e).color),bg=[0,0,0,0],unknown=false;for(let x=e;x;x=x.parentElement){let s=getComputedStyle(x),c=rgba(s.backgroundColor);if(s.backgroundImage!=='none'&&bg[3]<.999)unknown=true;if(c)bg=blend(bg,c);if(bg[3]>=.999)break;}if(!fg||bg[3]<.999||unknown)return {unknown:true};fg=blend(fg,bg);let a=lum(fg),b=lum(bg);return {fg:hex(fg),bg:hex(bg),ratio:+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)};});await p.close();values.push(result);}const [before,after]=values;assert(!before.unknown&&!after.unknown,name+' unknown');assert.equal(before.fg,expectedFg,name+' baseline foreground');assert.equal(before.bg,expectedBg,name+' baseline background');if(name==='نص الهوية المجاور للشعار'){assert.deepStrictEqual(after,before,'logo must be unchanged');}else{assert(after.ratio>=4.5,name+' after ratio '+after.ratio);}data.push({name,route,selector,before,after});console.log(name,`${before.fg}/${before.bg} ${before.ratio} → ${after.fg}/${after.bg} ${after.ratio}`);}
 fs.writeFileSync(path.resolve(__dirname,'../audit/6c-21-pairs.json'),JSON.stringify(data,null,2)+'\n');console.log('✅ 20/21 solid-background examples ≥4.5:1; logo is intentionally unchanged (2.36); emoji rendering may vary');
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
