/**
 * disclaimer.js — إخلاء المسؤولية الطبي (إضافة قابلة للإزالة)
 * ------------------------------------------------------------------
 * ENH:medical-disclaimer
 * يضيف سطرًا ظاهرًا في تذييل الصفحة. نص ثابت مكتوب هنا حرفيًا،
 * بلا أي رقم هاتف أو ادعاء طبي. لا يعدّل أي نص قائم.
 *
 * للإزالة: احذف مجلد ext/disclaimer + سطر الربط المحاط بـ ENH في كل صفحة.
 */
(function () {
  'use strict';

  var TEXT =
    'المعلومات للتوعية ولا تغني عن استشارة الطبيب، وفي الطوارئ تواصل مع الطوارئ فورًا.';

  function build() {
    if (document.querySelector('.enh-disclaimer')) return;

    var box = document.createElement('p');
    box.className = 'enh-disclaimer';
    box.setAttribute('role', 'note');
    box.setAttribute('lang', 'ar');
    box.textContent = TEXT;

    /* تنسيق داخلي بسيط بألوان الهوية — بلا ملف CSS إضافي */
    box.style.cssText = [
      'margin:1.25rem auto 0',
      'max-width:900px',
      'padding:.85rem 1rem',
      'border-radius:10px',
      'border:1px solid rgba(10,42,94,.2)',
      'background:rgba(10,42,94,.06)',
      'color:#0a2a5e',
      'font-size:.9rem',
      'line-height:1.8',
      'text-align:center',
      'font-weight:600',
    ].join(';');

    var footer = document.querySelector('footer');
    if (footer) {
      footer.appendChild(box);
    } else {
      /* صفحات بلا تذييل (مثل 404) — يُضاف في نهاية المتن */
      var main = document.querySelector('main') || document.body;
      main.appendChild(box);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
