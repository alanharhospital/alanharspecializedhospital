#!/usr/bin/env node
'use strict';
// Real Chromium tests. Run `npm ci --prefix ext` and install the system NSS/NSPR libraries first.
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let puppeteer, chromium;
  try { puppeteer = require('puppeteer-core'); chromium = require('@sparticuz/chromium'); }
  catch (e) { throw new Error('أدوات Chromium غير مثبتة: npm ci --prefix ext'); }
  const candidates = process.env.NSS_LIB_DIR ? [process.env.NSS_LIB_DIR] : ['/tmp/arena-nss/dist/Linux6.1_x86_64_cc_glibc_PTH_64_OPT.OBJ/lib'];
  const libs = candidates.find(p => fs.existsSync(path.join(p, 'libnss3.so')));
  const env = {...process.env};
  if (libs) env.LD_LIBRARY_PATH = libs + (env.LD_LIBRARY_PATH ? ':' + env.LD_LIBRARY_PATH : '');
  const ports = [19000 + Math.floor(Math.random() * 4000), 24000 + Math.floor(Math.random() * 4000)];
  const sites = [{port: ports[0], prefix: ''}, {port: ports[1], prefix: '/sub/dir'}];
  const servers = [];
  let browser;
  try {
    for (const site of sites) {
      const server = spawn(process.execPath, [path.join(ROOT, 'ext/tools/preview-server.js'), String(site.port)], {
        cwd: ROOT, stdio: ['ignore','pipe','pipe'], env: {...process.env, PREVIEW_BASE_PATH: site.prefix ? site.prefix + '/' : '/'}
      });
      servers.push(server);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('الخادم لم يبدأ')), 10000);
        server.once('exit', code => {clearTimeout(timer); reject(new Error('الخادم انتهى: ' + code));});
        server.stdout.once('data', () => {clearTimeout(timer); resolve();});
        server.stderr.on('data', c => process.stderr.write(c));
      });
    }
    browser = await puppeteer.launch({executablePath:await chromium.executablePath(), args:chromium.args, headless:true, env});
    console.log('متصفح حقيقي: ' + await browser.version() + '؛ 375px مع اللمس');
    console.log('اختبار محلي: تُستبدل طلبات خطوط Google الخارجية برد فارغ بسبب تقييد الشبكة؛ لا يُحكم على تحميل الخطوط الفعلي.');
    for (const site of sites) {
      const prefix = site.prefix;
      const base = `http://127.0.0.1:${site.port}${prefix}`;
      console.log('\nاختبار النشر تحت ' + (prefix || '/') + ':');
      if (prefix) {
        const host = `http://127.0.0.1:${site.port}`;
        const redirect = await fetch(host+prefix+'?test=1', {redirect:'manual'});
        assert.equal(redirect.status, 308);
        assert.equal(redirect.headers.get('location'), prefix+'/?test=1');
        assert.equal((await fetch(host+'/services/')).status, 404, 'الخادم يسمح بتحميل ملفات خارج البادئة');
      }
    for (const route of ['/', '/services/']) {
      const page = await browser.newPage();
      await page.setViewport({width:375,height:812,isMobile:true,hasTouch:true});
      const failures = [], errors = [], js = [], json = [], fonts = [];
      await page.setRequestInterception(true);
      page.on('request', r => {
        const u = r.url();
        if (u.startsWith('https://fonts.googleapis.com/')) {fonts.push(u); return void r.respond({status:200, contentType:'text/css', body:'/* external font unavailable in sandbox */'});}
        if (u.endsWith('.json') || u.includes('.json?')) json.push(u);
        r.continue();
      });
      page.on('pageerror', e => errors.push('JS: ' + e.message));
      page.on('console', msg => {if (msg.type() === 'error') errors.push('console: ' + msg.text());});
      page.on('requestfailed', r => failures.push(r.url() + ' ' + (r.failure() || {}).errorText));
      page.on('response', r => {if (r.status() >= 400) failures.push(r.status()+' '+r.url());});
      page.on('requestfinished', r => {if (/services-search\.js/.test(r.url())) js.push(r.url());});
      await page.goto(base + route, {waitUntil:'networkidle0', timeout:30000});
      const input = await page.$('[data-services-search-input]');
      assert(input, route + ' حقل البحث غير موجود');
      assert(js.some(x => new URL(x).pathname === prefix + '/ext/services-search.js'), route + ' لم يُحمّل سكربت البحث');
      assert.equal(json.length, 0, route + ' يعتمد على fetch رغم وجود حزمة البيانات');

      const guideLinks = await page.$$eval('a[href]', nodes => nodes.map(a => a.href).filter(x => {try{return new URL(x).pathname.includes('/services/');}catch(e){return false;}}));
      assert(guideLinks.every(href => new URL(href).pathname.startsWith(prefix + '/services/')), route + ' روابط الدليل هربت من المسار الفرعي: ' + guideLinks.join(','));
      if (route === '/services/') {
        assert.equal(await page.$$('.sg-cards a').then(x=>x.length),0, 'لا توجد بطاقات ثابتة في صفحة البحث');
      }

      const responses = [];
      for (const q of ['عين','كبد','تحليل','سرير','قلع ضرس','CBC','أكثر من 40 سرير رقود خاص','نقل الدم','16 حاضنة']) {
        await input.evaluate((el,v) => {
          el.focus(); el.value = v;
          el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
          el.dispatchEvent(new CompositionEvent('compositionupdate',{bubbles:true,data:v}));
          el.dispatchEvent(new KeyboardEvent('keydown',{keyCode:229,which:229,bubbles:true,isComposing:true}));
          el.dispatchEvent(new InputEvent('input',{bubbles:true,data:v,isComposing:true,inputType:'insertCompositionText'}));
          el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:v}));
        }, q);
        await page.waitForFunction(() => !!document.querySelector('[data-services-search-panel] .ss-reply'), {timeout:5000});
        await sleep(220);
        const text = await page.$eval('[data-services-search-panel]', el => el.textContent);
        if (q === 'CBC' || q === 'قلع ضرس' || q === 'أكثر من 40 سرير رقود خاص') assert(text.includes(q), route + ' لم يستجب للاستعلام ' + q + ': ' + text);
        if (q === '16 حاضنة') assert(text.includes('نعتذر') && !text.includes('مذكور في قائمة خدماتنا'), 'يجب الاعتذار عن حاضنة مختصرة');
        if (q === 'سرير') assert(text.includes('نعتذر') && !text.includes('التقييم السريري') && !text.includes('أكثر من 13 سرير') && !text.includes('أكثر من 40 سرير'), 'رد غير صحيح للفظ سرير');
        if (q === 'عين' || q === 'كبد') assert(text.includes('هل تقصد') && !text.includes('نعم،') && !text.includes('أخذ عينة'), 'رد خيارات غير صحيح: '+q);
        if (q === 'تحليل') assert(!text.includes('نعم،'), 'الكلمة العامة لا تؤكد التوفر');
        if (q === 'نقل الدم') assert(text.includes('نعتذر') && !text.includes('يتوفر لدينا'), 'نقل الدم يجب أن يعطي اعتذارًا');
        if (q === 'أكثر من 40 سرير رقود خاص') assert(text.includes('مذكور في قائمة خدماتنا') && !text.includes('يتوفر لدينا'), 'رد searchOnly غير صحيح');

        if (q === 'CBC') assert.equal(await page.$$eval('[data-services-search-panel] .ss-result-link', nodes=>nodes.length), 0, 'لا تفاصيل لصفحات محذوفة');

        if (q === 'أكثر من 40 سرير رقود خاص') {
          const a = await page.$$eval('[data-services-search-panel] a', nodes => nodes.map(n=>n.href));
          assert(a.every(u=>u.startsWith('https://wa.me/')), 'بحث فقط: رابط غير واتساب');
        }
        responses.push(q + ': ' + text);
      }
      const view = await page.evaluate(() => {
        const panel = document.querySelector('[data-services-search-panel]');
        panel.scrollIntoView({block:'center'});
        const r = panel.getBoundingClientRect(), st = getComputedStyle(panel);
        const x = Math.max(1, Math.min(innerWidth-1, r.left + r.width/2));
        const y = Math.max(1, Math.min(innerHeight-1, r.top + 10));
        const hit = document.elementFromPoint(x,y);
        return {scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth, width:r.width, height:r.height, display:st.display, visibility:st.visibility, hitPanel:!!hit&&(hit===panel||panel.contains(hit))};
      });
      assert(view.scrollWidth <= view.clientWidth, route + ' تجاوز أفقي');
      assert(view.width>0 && view.height>0 && view.display!=='none' && view.visibility!=='hidden' && view.hitPanel, route + ' لوحة النتائج غير مرئية أو مغطاة: ' + JSON.stringify(view));
      assert.deepStrictEqual(failures, [], route + ' طلبات فاشلة: ' + failures.join(' | '));
      assert.deepStrictEqual(errors, [], route + ' أخطاء: ' + errors.join(' | '));
      console.log(`✅ ${route}: حقل موجود، JS=${js.join(',')}, JSON fetch=${json.length}, أخطاء=0، طلبات فاشلة=0، عرض=${view.scrollWidth}/${view.clientWidth}، خطوط مستبدلة=${fonts.length}`);
      responses.forEach(x=>console.log('   '+x));
      if (route === '/services/') {
        await input.evaluate(el => {el.value='فحص دم';el.dispatchEvent(new Event('input',{bubbles:true}));});
        await page.waitForFunction(() => document.querySelectorAll('[data-services-search-panel] .ss-option').length > 0, {timeout:5000});
        const optionLinks = await page.$$eval('[data-services-search-panel] .ss-options a.ss-result-link', nodes => nodes.map(a=>a.href));
        assert(optionLinks.every(href=>new URL(href).pathname.endsWith('/offers.html')), 'لا روابط تفاصيل لصفحات محذوفة');
      }
      await page.close();
    }
    // Homepage button must navigate to the guide, retaining the query only in the hash.
    const homePage = await browser.newPage();
    await homePage.setRequestInterception(true);
    homePage.on('request', r => r.url().startsWith('https://fonts.googleapis.com/') ? void r.respond({status:200,contentType:'text/css',body:''}) : void r.continue());
    await homePage.goto(base+'/',{waitUntil:'networkidle0'});
    await homePage.$eval('[data-services-search-input]', el => {el.value='CBC';});
    await Promise.all([homePage.waitForNavigation({waitUntil:'domcontentloaded'}), homePage.click('[data-services-search-button]')]);
    assert(new URL(homePage.url()).pathname===prefix+'/services/' && new URL(homePage.url()).hash==='#q=CBC');
    console.log('✅ زر الرئيسية يفتح الدليل ويحفظ الاستعلام في التجزئة فقط');
    await homePage.close();
    // Static bundle unavailable: JSON fetch should still provide a functioning fallback.
    for (const fallbackRoute of ['/', '/services/']) {
    const fallbackPage = await browser.newPage();
    const fallbackJson = [];
    await fallbackPage.setRequestInterception(true);
    fallbackPage.on('request', r => {
      if (/\/ext\/data\/services-index\.js(?:\?|$)/.test(r.url())) return void r.respond({status:404,body:'unavailable'});
      if (r.url().startsWith('https://fonts.googleapis.com/')) return void r.respond({status:200,contentType:'text/css',body:''});
      if (/\/ext\/data\/.*\.json/.test(r.url())) fallbackJson.push(r.url());
      r.continue();
    });
    await fallbackPage.goto(base+fallbackRoute,{waitUntil:'networkidle0'});
    await fallbackPage.$eval('[data-services-search-input]', el=>{el.value='CBC';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await fallbackPage.waitForFunction(()=>document.querySelector('[data-services-search-panel]')?.textContent.includes('CBC'),{timeout:5000});
    assert.equal(fallbackJson.length, 3, 'لم تُطلب ملفات JSON الثلاثة');
    assert(fallbackJson.every(u=>new URL(u).pathname.startsWith(prefix+'/ext/data/')), 'JSON خارج البادئة');
    console.log('✅ احتياط fetch يعمل: ' + fallbackRoute);
    await fallbackPage.close();
    // Missing data: both static script and fetch fail; a visible recovery link must appear.
    const failurePage = await browser.newPage();
    await failurePage.setRequestInterception(true);
    failurePage.on('request', r => {
      if (/\/ext\/data\/services-index\.js(?:\?|$)/.test(r.url()) || /\/ext\/data\/.*\.json/.test(r.url())) return void r.respond({status:503,body:'unavailable'});
      if (r.url().startsWith('https://fonts.googleapis.com/')) return void r.respond({status:200,contentType:'text/css',body:''});
      r.continue();
    });
    await failurePage.goto(base+fallbackRoute,{waitUntil:'networkidle0'});
    const failure = await failurePage.$eval('[data-services-search-status]', el => ({text:el.textContent,href:el.querySelector('a')?.getAttribute('href')}));
    assert(failure.text.includes('تعذر تحميل البحث، تصفح الدليل') && new URL(failure.href).pathname===prefix+'/services/');
    console.log('✅ انقطاع البيانات: رسالة ظاهرة ورابط للدليل');
    await failurePage.close();
    }
      console.log('✅ اكتملت اختبارات الجذر/المسار الفرعي وروابط الدليل والنتائج والواتساب.');
    }
    // file:// uses the script bundle rather than blocked JSON fetch.
    const filePage = await browser.newPage();
    await filePage.goto('file://'+path.join(ROOT,'services/index.html'),{waitUntil:'load'});
    const fileInput = await filePage.$('[data-services-search-input]');
    await fileInput.evaluate(el=>{el.value='CBC';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await filePage.waitForFunction(()=>document.querySelector('[data-services-search-panel]')?.textContent.includes('CBC'),{timeout:5000});
    console.log('✅ file://: البحث يعمل بحزمة البيانات، دون الاعتماد على fetch');
    await filePage.close();
  } finally {
    if (browser) await browser.close();
    for (const server of servers) server.kill('SIGTERM');
  }
}
main().catch(e => { console.error('❌ اختبار المتصفح:',e.message); process.exitCode = 1; });
