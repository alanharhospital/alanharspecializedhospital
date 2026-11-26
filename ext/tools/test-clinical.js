#!/usr/bin/env node
'use strict';
const path=require('path'), fs=require('fs'), assert=require('assert'), {spawn}=require('child_process');
const ROOT=path.resolve(__dirname,'../..'), puppeteer=require('puppeteer-core'), chromium=require('@sparticuz/chromium');
(async()=>{
  const port=29000+Math.floor(Math.random()*3000), server=spawn(process.execPath,[path.join(__dirname,'preview-server.js'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let browser;
  try {
    await new Promise((resolve,reject)=>{let t=setTimeout(()=>reject(Error('الخادم لم يبدأ')),10000);server.once('exit',()=>reject(Error('الخادم انتهى')));server.stdout.once('data',()=>{clearTimeout(t);resolve()});});
    let env={...process.env};const lib=process.env.NSS_LIB_DIR||'/tmp/arena-nss/dist/Linux6.1_x86_64_cc_glibc_PTH_64_OPT.OBJ/lib';if(fs.existsSync(path.join(lib,'libnss3.so')))env.LD_LIBRARY_PATH=lib+(env.LD_LIBRARY_PATH?':'+env.LD_LIBRARY_PATH:'');
    browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true,env});
    const routes=['/','/doctors.html','/offers.html','/clinics.html','/units.html','/ancillary.html','/pr.html','/news.html','/404.html','/services/','/services/dental','/services/diagnostics','/services/emergency','/services/ent','/services/physio','/services/surgery','/services/women','/services/clinics-admin'];
    for(const route of routes){
      const page=await browser.newPage(), errors=[];
      await page.setViewport({width:375,height:812,isMobile:true,hasTouch:true});
      await page.setRequestInterception(true); page.on('request',r=>r.url().startsWith('https://fonts.googleapis.com/')?void r.respond({status:200,contentType:'text/css',body:''}):void r.continue());
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:${port}`+route,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('.clinical-trigger'); await page.click('.clinical-trigger');
      assert(await page.$eval('.clinical-dialog',el=>el.open),route+' dialog');
      await page.$eval('.clinical-dialog input',el=>{el.value='16 حاضنة أطفال';el.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.waitForFunction(()=>document.querySelector('.clinical-dialog .ss-panel')?.textContent.includes('16 حاضنة أطفال'),{timeout:5000});
      let text=await page.$eval('.clinical-dialog .ss-panel',el=>el.textContent);
      assert(text.includes('مذكور في قائمة خدماتنا')&&!text.includes('يتوفر لدينا'),route+' listed');
      assert.equal(await page.$eval('.clinical-dialog .ss-panel a',a=>new URL(a.href).hostname),'wa.me');
      await page.click('.clinical-close');assert(!(await page.$eval('.clinical-dialog',el=>el.open)));
      assert(await page.$eval('.clinical-trigger',el=>el.getBoundingClientRect().height>=48),route+' touch target');
      const shortButtons = await page.$$eval('button, [role="button"], input[type="button"], input[type="submit"]', els => els.filter(el=>{let r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0 && r.height>0 && s.visibility!=='hidden' && r.height<47.9}).map(el=>el.outerHTML.slice(0,120)));
      assert.deepStrictEqual(shortButtons,[],route+' أزرار أصغر من 48px');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),route+' overflow');
      assert.deepStrictEqual(errors,[],route+' JS errors');
      console.log('✅ تجربة البحث الفوري: '+route);
      if(route==='/'){
        assert.equal(await page.$$eval('[data-clinic-chips] button',x=>x.length),7);
        for (let i=0;i<7;i++) {
          await page.click(`[data-clinic-chips] button:nth-child(${i+1})`);
          let clinic=await page.$eval('[data-clinic-card]',x=>x.textContent);
          assert(clinic.includes('الاختصاصي')&&clinic.includes('8–1')&&clinic.includes('تأكيد'));
          if (i===0) assert(clinic.includes('جمال العنسي'));
          assert((await page.$eval('[data-clinic-card] a',a=>a.href)).includes('wa.me/967771422070'));
        }
        assert.equal(await page.$$eval('.clinical-section details',x=>x.length),5);
        await page.click('.clinical-section details summary'); assert(await page.$eval('.clinical-section details',x=>x.open));
        assert(await page.evaluate(()=>[...document.querySelectorAll('script[type="application/ld+json"]')].some(s=>{try{return JSON.parse(s.textContent)['@type']==='FAQPage'}catch(e){return false}})));
        let img=await page.evaluate(()=>getComputedStyle(document.querySelector('.hero')).backgroundImage);assert(img.includes('above-900.webp'),img);
        const loaded=await page.evaluate(async()=>{let i=document.querySelector('picture img[src="icu.jpg"]'); i.scrollIntoView(); await i.decode(); return i.currentSrc});assert(loaded.endsWith('/ext/media/icu-700.webp') || loaded.endsWith('/ext/media/icu-optimized.webp'),loaded);
        console.log('✅ العيادات والأسئلة والصورة المحسنة');
      }
      if(route==='/services/dental'){
        await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:url=>{window.copiedService=url;return Promise.resolve()}},configurable:true});});
        await page.click('.sg-share');
        await page.waitForFunction(()=>document.querySelector('.clinical-toast')?.textContent.includes('تم نسخ رابط الخدمة'));
        assert(await page.evaluate(()=>window.copiedService.includes('/services/dental#svc-')));
      }
      if(route==='/services/'){
        await page.click('.clinical-trigger');await page.$eval('.clinical-dialog input',el=>{el.value='CBC';el.dispatchEvent(new Event('input',{bubbles:true}));});
        await page.waitForSelector('.clinical-dialog [data-clinical-share]');
        await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true});});
        await page.click('.clinical-dialog [data-clinical-share]'); await page.waitForFunction(()=>document.querySelector('.clinical-toast')?.textContent.includes('تم نسخ رابط الخدمة'));
        console.log('✅ نسخ رابط الخدمة وإشعار النسخ');
      }
      await page.close();
    }
  }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error('❌ اختبار الواجهة:',e.stack);process.exitCode=1});
