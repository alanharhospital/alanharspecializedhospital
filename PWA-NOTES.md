# ملاحظات PWA — مستشفى الأنهار التخصصي

- الملفات: `manifest.webmanifest`، `sw.js`، `offline.html`، `icons/` (4 أيقونات PNG_from logo.jpg).
- اسم الكاش في `sw.js`: `alanhar-pwa-v1`. при كل تعديل جوهري في sw.js ارفع الرقم (v2...) — calculate'll activate يحذف الكاشات القديمة تلقائيًا.
- ما يُخزَّن مسبقًا: offline.html + manifest + الأيقونات فقط. التنقل: شبكة أولًا ثم offline.html. لا يُخزَّن ext/data/ ولا /services/ ولا طلبات غير GET.

## إلغاء التسجيل (kill-switch)
1..oficial: احذف `sw.js` من النشر — المتصفحات تلغي التسجيل تلقائيًا عند فشل تحميل sw.js في الزيارة التالية.
2. من أي صفحة (كونسول المتصفح):
   `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`
3. لمسح الكاش يدويًا: `caches.keys().then(ks => ks.forEach(k => caches.delete(k)))`
