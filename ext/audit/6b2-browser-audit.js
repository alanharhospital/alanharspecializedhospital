#!/usr/bin/env node
'use strict';
// فحص محلي فقط: يمنع كل طلب خارجي. لا يغيّر ملفات الموقع.
const fs = require('fs'), path=require('path'), crypto=require('crypto');
const root=path.resolve(__dirname,'../..'), origin='http://127.0.0.1:8181';
const puppeteer=require('../node_modules/puppeteer-core'), chromium=require('../node_modules/@sparticuz/chromium');
const routes=['/','/doctors.html','/offers.html','/clinics.html','/units.html','/ancillary.html','/pr.html','/news.html','/404.html','/services/','/services/diagnostics','/services/surgery','/services/dental','/services/women','/services/ent','/services/physio','/services/emergency','/services/clinics-admin'];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 let env={...process.env};const nss=process.env.NSS_LIB_DIR||'/tmp/arena-nss/dist/Linux6.1_x86_64_cc_glibc_PTH_64_OPT.OBJ/lib';if(fs.existsSync(path.join(nss,'libnss3.so')))env.LD_LIBRARY_PATH=nss+(env.LD_LIBRARY_PATH?':'+env.LD_LIBRARY_PATH:'');
 const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],headless:true,env});
 const result={browser:await browser.version(),origin,externalPolicy:'كل طلب إلى غير 127.0.0.1:8181 حُظر محليًا؛ لم تُفحص استجابته.',pages:{}};
 try {for(const route of routes){const entry={viewports:{}};result.pages[route]=entry;
  for(const width of [375,768,1280]){const page=await browser.newPage();await page.setViewport({width,height:900,isMobile:width===375,hasTouch:width===375});
   let failed=[],errors=[],blocked=[],resources=[];
   await page.setRequestInterception(true);
   page.on('request',r=>{if(r.url().startsWith('data:')||r.url().startsWith('blob:'))return void r.continue();if(!r.url().startsWith(origin+'/')){blocked.push({url:r.url(),type:r.resourceType()});return void r.abort('blockedbyclient');} r.continue();});
   page.on('requestfailed',r=>{if(r.url().startsWith(origin+'/')) failed.push({url:r.url(),error:r.failure()?.errorText});});
   page.on('response',r=>{if(r.url().startsWith(origin+'/')) {resources.push({url:r.url(),status:r.status(),type:r.request().resourceType()});if(r.status()>=400)failed.push({url:r.url(),status:r.status()});}});
   page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/ERR_BLOCKED_BY_CLIENT/.test(m.text()))errors.push('console: '+m.text());});
   await page.evaluateOnNewDocument(()=>{window.__auditLCP=[];try{new PerformanceObserver(l=>{for(const x of l.getEntries())window.__auditLCP.push({time:Math.round(x.startTime),size:x.size,tag:x.element?.tagName||null,url:x.url||null});}).observe({type:'largest-contentful-paint',buffered:true});}catch(e){}});
   try{await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:20000});await delay(500);
    const firstLoadResources=resources.slice(), firstLcp=await page.evaluate(()=>window.__auditLCP.slice());
    // فحص الحالة النهائية بعد الظهور: تغييرات DOM مؤقتة في المتصفح فقط، ليست قياسًا للتحميل الأول.
    await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('.reveal').forEach(e=>{e.style.transition='none';e.classList.add('is-in')});document.querySelectorAll('img[loading="lazy"]').forEach(e=>e.loading='eager');});
    for(let n=0;n<8;n++){await page.evaluate((x)=>window.scrollTo(0,document.documentElement.scrollHeight*x/7),n);await delay(55)}await page.evaluate(()=>window.scrollTo(0,0));await delay(350);
    const data=await page.evaluate(()=>{
      const qs=s=>Array.from(document.querySelectorAll(s));
      function vis(e){let s=getComputedStyle(e),r=e.getBoundingClientRect();if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||!r.width||!r.height)return false;for(let p=e.parentElement;p;p=p.parentElement){let c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||Number(c.opacity)===0||p.hasAttribute('hidden')||p.getAttribute('aria-hidden')==='true')return false;}return true;}
      function label(e){return (e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.value||e.getAttribute('name')||'').replace(/\s+/g,' ').trim().slice(0,110)}
      const ids={};qs('[id]').forEach(x=>{ids[x.id]=(ids[x.id]||0)+1});
      const head=qs('h1,h2,h3,h4,h5,h6').filter(vis).map(e=>({level:+e.tagName[1],text:(e.innerText||'').replace(/\s+/g,' ').slice(0,110)}));
      const links=qs('a[href]').map(a=>({href:a.getAttribute('href'),resolved:a.href,text:label(a),footer:!!a.closest('footer')}));
      const images=qs('img').map(e=>({src:e.getAttribute('src'),currentSrc:e.currentSrc,alt:e.getAttribute('alt'),natural:[e.naturalWidth,e.naturalHeight],display:[Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)],complete:e.complete,loading:e.loading,visible:vis(e)}));
      const controls=qs('a[href],button,input:not([type=hidden]),select,textarea,[role=button]').filter(vis);
      const small=controls.map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,text:label(e),href:e.getAttribute('href'),class:e.className,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10}}).filter(x=>x.w<44||x.h<44);
      const fields=qs('input:not([type=hidden]),select,textarea').filter(vis).filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>({tag:e.tagName,id:e.id,name:e.name,placeholder:e.getAttribute('placeholder')}));
      const unnamed=qs('button,[role=button],input[type=submit],input[type=button]').filter(vis).filter(e=>!label(e)&&!e.getAttribute('aria-labelledby')).map(e=>({tag:e.tagName,outer:e.outerHTML.slice(0,200)}));
      const obstructions=controls.filter(e=>{let r=e.getBoundingClientRect();return r.width&&r.height&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}).map(e=>{let r=e.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return h&&h!==e&&!e.contains(h)&&!h.contains(e)?{target:label(e),targetTag:e.tagName,coveredBy:h.tagName+'.'+String(h.className).slice(0,70)}:null}).filter(Boolean);
      const clipped=controls.map(e=>{let r=e.getBoundingClientRect();for(let p=e.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){let c=getComputedStyle(p),b=p.getBoundingClientRect();if((/hidden|clip/.test(c.overflowX)&&(r.left<b.left-1||r.right>b.right+1))||(/hidden|clip/.test(c.overflowY)&&(r.top<b.top-1||r.bottom>b.bottom+1)))return {target:label(e),tag:e.tagName,container:p.tagName+'.'+String(p.className).slice(0,60)};}return null}).filter(Boolean);
      const tiny=[], pairs={},unknown={count:0,examples:[]};
      function rgba(s){let a=s.match(/^rgba?\(([^)]+)\)/);if(!a)return null;let p=a[1].split(/[, /]+/).filter(Boolean).map(Number);return p.length>=3?[p[0],p[1],p[2],p.length>3?p[3]:1]:null}
      function blend(f,b){let a=f[3]+b[3]*(1-f[3]);return a?[0,1,2].map(i=>(f[i]*f[3]+b[i]*b[3]*(1-f[3]))/a).concat(a):[0,0,0,0]}
      function hex(c){return '#'+c.slice(0,3).map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('')}
      function lum(c){let n=c.slice(0,3).map(x=>{let v=x/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*n[0]+.7152*n[1]+.0722*n[2]}
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){let text=node.textContent.trim(),e=node.parentElement;if(!text||!e||['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName)||!vis(e))continue;let st=getComputedStyle(e),size=parseFloat(st.fontSize),weight=parseInt(st.fontWeight)||400;
       if(size<14)tiny.push({text:text.slice(0,80),size:Math.round(size*100)/100,tag:e.tagName,class:e.className});
       let fg=rgba(st.color),bg=[0,0,0,0],uncertain=false;
       for(let p=e;p;p=p.parentElement){let cs=getComputedStyle(p),c=rgba(cs.backgroundColor);if(cs.backgroundImage!=='none'&&bg[3]<.999)uncertain=true;if(Number(cs.opacity)<.999)uncertain=true;if(c)bg=blend(bg,c);if(bg[3]>=.999)break;}
       if(!fg||bg[3]<.999||uncertain){unknown.count++;if(unknown.examples.length<12)unknown.examples.push(text.slice(0,80));continue;}
       fg=blend(fg,bg);const x=lum(fg),y=lum(bg),ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05),large=size>=24||(size>=18.667&&weight>=700),key=hex(fg)+'/'+hex(bg)+'/'+(large?'large':'normal');
       if(!pairs[key])pairs[key]={foreground:hex(fg),background:hex(bg),ratio:Math.round(ratio*100)/100,minimum:large?3:4.5,count:0,examples:[]};pairs[key].count++;if(pairs[key].examples.length<3)pairs[key].examples.push(text.slice(0,90));
      }
      const jsonld=qs('script[type="application/ld+json"]').map((s,i)=>{try{let o=JSON.parse(s.textContent);return {index:i,valid:true,type:o['@type']||null}}catch(e){return {index:i,valid:false,error:e.message}}});
      const meta=k=>document.querySelector(k)?.content||null;
      const nav=document.querySelector('header'),foot=document.querySelector('footer');
      return {title:document.title,lang:document.documentElement.lang,dir:document.documentElement.dir,description:meta('meta[name="description"]'),canonical:document.querySelector('link[rel="canonical"]')?.href||null,ogUrl:meta('meta[property="og:url"]'),ogTitle:meta('meta[property="og:title"]'),ogDescription:meta('meta[property="og:description"]'),jsonld,duplicateIds:Object.entries(ids).filter(([,n])=>n>1),headings:head,allH1:qs('h1').length,links,images,searchFields:qs('[data-services-search-input]').filter(vis).length,guideFooter:links.some(a=>a.footer&&!a.href.startsWith('#')&&new URL(a.resolved).pathname==='/services/'),guideAny:links.some(a=>!a.href.startsWith('#')&&new URL(a.resolved).pathname==='/services/'),skipLink:links.some(a=>/تخطي|skip/i.test(a.text)),smallTargets:small,smallText:tiny,unlabelledFields:fields,unnamedButtons:unnamed,obstructions,clipped,contrastPairs:Object.values(pairs),contrastUnknown:unknown,scrollWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,header:nav?{text:(nav.innerText||'').slice(0,500),links:qs('header a[href]').map(a=>a.getAttribute('href'))}:null,footer:foot?{text:(foot.innerText||'').slice(0,500),links:qs('footer a[href]').map(a=>a.getAttribute('href'))}:null,styles:qs('link[rel="stylesheet"]').map(a=>a.getAttribute('href')),scripts:qs('script[src]').map(a=>a.getAttribute('src')),lcp:window.__auditLCP,navTiming:performance.getEntriesByType('navigation').map(x=>({domContentLoaded:Math.round(x.domContentLoadedEventEnd),load:Math.round(x.loadEventEnd),transfer:x.transferSize,decoded:x.decodedBodySize}))};
    });
    for(const r of resources){try{let p=decodeURIComponent(new URL(r.url).pathname);let f=path.join(root,p);if(fs.existsSync(f)&&fs.statSync(f).isFile())r.bytes=fs.statSync(f).size;else if(fs.existsSync(f+'.html'))r.bytes=fs.statSync(f+'.html').size;else if(fs.existsSync(path.join(f,'index.html')))r.bytes=fs.statSync(path.join(f,'index.html')).size;}catch(e){}}
    if(width===375){const focus=[];await page.keyboard.press('Tab');for(let i=0;i<6;i++){focus.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,text:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.innerText||'').trim().slice(0,90),outline:getComputedStyle(document.activeElement).outlineStyle})));await page.keyboard.press('Tab');}data.tabSample=focus;}
    entry.viewports[width]={...data,firstLoadResources,firstLcp,resourcesAfterEagerImageScan:resources,failed,errors,externalBlocked:blocked};
   }catch(e){entry.viewports[width]={auditError:e.message,failed,errors,externalBlocked:blocked};}finally{await page.close();}
   console.log(route,width,'done');
  }
  const page=await browser.newPage();await page.setViewport({width:375,height:900});await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin+'/')||r.url().startsWith('data:')||r.url().startsWith('blob:')?void r.continue():void r.abort('blockedbyclient'));
  try {await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:20000});entry.noJs=await page.evaluate(()=>({bodyText:document.body.innerText.slice(0,300),h1:document.querySelector('h1')?.innerText||null,links:document.querySelectorAll('a[href]').length,searchFields:document.querySelectorAll('[data-services-search-input]').length,searchTrigger:!!document.querySelector('.clinical-trigger'),reveals:document.querySelectorAll('.reveal').length,hiddenReveals:Array.from(document.querySelectorAll('.reveal')).filter(e=>getComputedStyle(e).opacity==='0').length,noscript:Array.from(document.querySelectorAll('noscript')).map(x=>x.textContent.trim().slice(0,200))}));}catch(e){entry.noJs={error:e.message}}finally{await page.close()}
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(__dirname,'6b2-browser-before.json'),JSON.stringify(result,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1});
