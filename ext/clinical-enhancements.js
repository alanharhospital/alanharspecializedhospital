(function () {
  'use strict';
  var rootScript = document.currentScript;
  var extBase = rootScript && rootScript.src ? new URL('.', rootScript.src) : new URL('ext/', document.baseURI);
  var trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'clinical-trigger';
  trigger.textContent = '🔍 ابحث عن فحص، عملية، أو عيادة | ⌘K';
  trigger.setAttribute('aria-haspopup', 'dialog');
  var dialog = document.createElement('dialog');
  dialog.className = 'clinical-dialog'; dialog.setAttribute('aria-labelledby', 'clinical-dialog-title');
  dialog.innerHTML = '<h2 id="clinical-dialog-title">البحث في دليل الخدمات</h2><div class="ss" data-services-search><form class="ss-form" role="search"><label class="ss-label" for="clinical-search-input">ابحث عن فحص، عملية، أو عيادة</label><input class="ss-input" id="clinical-search-input" type="search" autocomplete="off" data-services-search-input><button class="ss-button" type="submit" data-services-search-button>بحث</button></form><p class="ss-status" role="status" aria-live="polite" data-services-search-status></p><div class="ss-panel" data-services-search-panel></div></div><button type="button" class="clinical-close">إغلاق البحث</button>';
  var skip = document.body.querySelector('.enh-skip-link');
  if (skip) skip.insertAdjacentElement('afterend', trigger);
  else document.body.prepend(trigger);
  document.body.appendChild(dialog);
  var searchRoot = dialog.querySelector('[data-services-search]');
  searchRoot.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); });
  if (window.ServicesSearchEngine && window.ServicesSearchEngine.init) window.ServicesSearchEngine.init(searchRoot);
  else {
    var status = dialog.querySelector('[data-services-search-status]');
    status.textContent = 'تعذر تحميل البحث، ';
    var guide = document.createElement('a'); guide.href = new URL('../services/', extBase); guide.textContent = 'تصفح الدليل'; status.appendChild(guide);
  }
  var previousFocus;
  function open() { previousFocus = document.activeElement; if (!dialog.open && dialog.showModal) dialog.showModal(); else if (!dialog.open) dialog.setAttribute('open', ''); dialog.querySelector('input').focus(); }
  function close() { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); }
  trigger.addEventListener('click', open);
  dialog.querySelector('.clinical-close').addEventListener('click', close);
  dialog.addEventListener('close', function () { if (previousFocus && previousFocus.focus) previousFocus.focus(); });
  document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); } });

  var toastArea = document.createElement('div'); toastArea.className = 'clinical-toasts'; toastArea.setAttribute('aria-live', 'polite'); document.body.appendChild(toastArea);
  function toast(message) { var item = document.createElement('div'); item.className = 'clinical-toast'; item.textContent = message; toastArea.appendChild(item); setTimeout(function () { item.remove(); }, 3000); }
  document.querySelectorAll('.sg-share[hidden]').forEach(function (button) { button.hidden = false; });
  document.addEventListener('click', function (e) {
    var button = e.target.closest('[data-clinical-share]'); if (!button) return;
    var url = new URL(button.getAttribute('data-clinical-share'), location.href).href;
    if (navigator.share) navigator.share({title:document.title, url:url}).then(function () { toast('تمت المشاركة'); }).catch(function (err) { if (err.name !== 'AbortError') toast('تعذرت المشاركة'); });
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast('تم نسخ رابط الخدمة'); }).catch(function () { toast('تعذر نسخ الرابط'); });
    else toast('النسخ غير متاح في هذا المتصفح');
  });

  var finder = document.querySelector('[data-clinic-finder]');
  if (!finder) return;
  var clinics = [
    ['جراحة المخ والأعصاب والعمود الفقري', 'د. جمال العنسي', 'معالجة وجراحة انزلاقات العمود الفقري واعتلال الأعصاب.'],
    ['العظام والمفاصل', 'د. لبيب المقطري', 'معالجة الكسور وإصلاح المفاصل والأوتار.'],
    ['النساء والولادة', 'د. رشا فارع', 'رعاية الحمل ومتابعته والولادة الطبيعية والقيصرية.'],
    ['الأسنان وجراحة الوجه والفكين', 'د. هنادي الخزرجي، د. محمد الخولاني', 'طب الفم والأسنان وجراحة الوجه والفكين.'],
    ['الأطفال والحضانات', 'د. فؤاد طاهر مشهور', 'طب الأطفال وحديثي الولادة ورعاية الخدج والحضانات.'],
    ['المختبر والأشعة', 'يرجى الاستفسار عن المختص', 'المختبر الطبي ومركز الأشعة التشخيصية والأشعة المقطعية.'],
    ['القلب والباطنية', 'د. هيثم الشريف (الباطنية)', 'معاينة الباطنية العامة والقلب؛ يرجى الاستفسار عن اختصاصي القلب.']
  ];
  var chips = finder.querySelector('[data-clinic-chips]'), card = finder.querySelector('[data-clinic-card]'), selected = 0;
  clinics.forEach(function (clinic) {
    var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'clinical-chip'; chip.textContent = clinic[0]; chip.setAttribute('aria-pressed','false');
    chip.addEventListener('click', function () {
      var selection = ++selected;
      chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === chip)); });
      card.replaceChildren();
      var title = document.createElement('h3'); title.textContent = clinic[0]; card.appendChild(title);
      var summary = document.createElement('p'); summary.textContent = clinic[2]; card.appendChild(summary);
      var doctor = document.createElement('p'); doctor.textContent = 'الاختصاصي: ' + clinic[1] + '. يرجى تأكيد التوفر عند الحجز.'; card.appendChild(doctor);
      var hours = document.createElement('p'); hours.textContent = 'مواعيد العيادات المنشورة: صباحًا 8–1 ومساءً 4–8. يرجى تأكيد موعد الاختصاصي.'; card.appendChild(hours);
      function addBooking(contact) {
        if (selection !== selected || !contact || !/^\d+$/.test(contact.whatsappNumber || '')) return;
        var a = document.createElement('a'); a.className = 'clinical-wa'; a.target = '_blank'; a.rel = 'noopener';
        a.href = 'https://wa.me/' + contact.whatsappNumber + '?text=' + encodeURIComponent('السلام عليكم، أود الاستفسار عن ' + clinic[0]);
        a.textContent = 'الحجز والاستفسار عبر واتساب'; card.appendChild(a);
      }
      if (window.ServicesSearchData && window.ServicesSearchData.contact) addBooking(window.ServicesSearchData.contact);
      else fetch(new URL('data/contact.json', extBase)).then(function (r) { if (!r.ok) throw Error('contact'); return r.json(); }).then(addBooking).catch(function () { var p=document.createElement('p'); p.textContent='تعذر تحميل رابط الحجز؛ يرجى المحاولة لاحقًا.'; card.appendChild(p); });
      card.hidden = false;
    });
    chips.appendChild(chip);
  });
  finder.hidden = false;
})();
