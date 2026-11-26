# اعتماد شرح البحث واستثناء السونار — تقرير وأدلة

## التنفيذ
- النسخة قبل التعديل: `_backup/2026-11-26_23-42-13/`؛ حفظها يشمل الملفين غير المتتبعين السابقين دون إدراجهما في الكوميت.
- نص الشرح المعتمد: «اكتب اسم الخدمة أو التحليل أو الفحص الذي تبحث عنه، وستظهر لك النتيجة. وإن لم تجد ما تريد، تواصل معنا عبر واتساب وسيساعدك فريقنا.»، و`introStatus: approved`. بقي noindex,follow وخريطة الموقع دون /services/ بقرار المالك، والتوليد يضمن ذلك بغض النظر عن حالة النص.
- استثناء `searchOverrides` في catalog-decisions.json يربط العبارتين فقط بـ SVC-0063؛ طُبّق قبل حذف الحشو، مع التحقق من المعرف والاسم والظهور وتصنيفات الاستبعاد؛ نُقلت بياناته للحزمة والفهرس. لا تغيير لبيانات أسماء الخدمات.
- "سونار" وحدها ما زالت خيارات 0063 و0332 و0331؛ لا خيارات إضافية للاستثناءين. صيغة الرد المعتمد:

> **نعم، الخدمة متوفرة لدينا**
> يتوفر لدينا السونار العام وسونار الحمل في مستشفى الأنهار التخصصي. للحجز أو استكمال الإجراءات أو معرفة المزيد من التفاصيل، تواصل معنا عبر واتساب وسيساعدك فريقنا.

الزر «تواصل عبر واتساب»، ورسالته: «السلام عليكم، أرغب في الحجز أو الاستفسار عن: السونار العام وسونار الحمل». الرقم من contact.json.

## الحارس
| الحالة | ظاهرة | مخفية | أسطر | روابط | صور | أقسام | عناصر | النتيجة |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| قبل | 4900 | 2089 | 8940 | 259 | 44 | 40 | 226 | PASS |
| بعد | 4900 | 2089 | 8940 | 259 | 44 | 40 | 226 | PASS |

## أ) أسطر التذييل قبل وبعد حرفيًا
المرجع قبل التبسيط `2160082`، وبعده الملفات الحالية؛ التغييرات الحالية في الصفحات الأصلية اقتصرت على رقم إصدار سكربتي البحث.

**index.html — قبل:2159، بعد:2159**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**offers.html — قبل:827، بعد:827**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**pr.html — قبل:2200، بعد:2200**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**ancillary.html — قبل:815، بعد:815**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**doctors.html — قبل:1216، بعد:1216**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**units.html — قبل:219، بعد:219**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**clinics.html — قبل:161، بعد:161**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**news.html — قبل:129، بعد:129**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

**404.html — قبل:41، بعد:41**
```html
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">دليل الفحوصات والعمليات والأشعة</a>
            <a href="services/" style="color:#0a2a5e;font-weight:700;text-decoration:underline">ابحث عن خدمة</a>
```

## ب) صناديق البحث وروابط التذييل
في الجذر تسع صفحات تشمل 404. «نافذة» مربع ديناميكي من `ext/clinical-enhancements.js:11–15` يفتح بالزر، ويحتاج JavaScript.
| الصفحة | المربع | موضع ربط السكربت أو المربع الثابت | رابط ابحث عن خدمة |
|---|---|---|---|
| `index.html` | ثابت + نافذة | `index.html:1404، index.html:2340` | نعم، `index.html:2159` |
| `offers.html` | نافذة | `offers.html:948` | نعم، `offers.html:827` |
| `pr.html` | نافذة | `pr.html:2592` | نعم، `pr.html:2200` |
| `ancillary.html` | نافذة | `ancillary.html:840` | نعم، `ancillary.html:815` |
| `doctors.html` | نافذة | `doctors.html:1597` | نعم، `doctors.html:1216` |
| `units.html` | نافذة | `units.html:231` | نعم، `units.html:219` |
| `clinics.html` | نافذة | `clinics.html:173` | نعم، `clinics.html:161` |
| `news.html` | نافذة | `news.html:141` | نعم، `news.html:129` |
| `404.html` | نافذة | `404.html:49` | نعم، `404.html:41` |
| `/services/` | ثابت | `services/index.html:33` | لا يوجد تذييل |

## ج) ملف التحويلات حرفيًا
```
# ENH:START services-simplification
# Named segment must be nonempty; /services/* would redirect /services/ to itself.
/services/diagnostics /services/ 301
/services/surgery /services/ 301
/services/:path /services/ 301
/services/:path/* /services/ 301
# ENH:END services-simplification
```
اختبار Wrangler المحلي: `/services` = 308 إلى `/services/`، و`/services/` = 200، وdiagnostics وsurgery = 301. لا يثبت هذا بمفرده الحالة الحية.

## د) عناصر جهاز التنفس
| المعرّف | الاسم | الفئة | الحالة |
|---|---|---|---|
| SVC-0405 | خروج جهاز تنفس صناعي لمدة ساعة داخل المدينة | طوارئ وإسعاف | active، منشور؛ general، ليس رسومًا |
| SVC-0406 | خروج جهاز تنفس صناعي لمدة يوم واحد خارج المحافظة | طوارئ وإسعاف | active، منشور؛ general، ليس رسومًا |
| SVC-0007 | الأجهزة الطبية: أكثر من 12 جهاز تنفس صناعي | تجهيزات وأسرة وأجهزة | active، منشور؛ listed وsearchOnly والرقم مطلوب، ليس رسومًا |
يُطابق «جهاز التنفس» كلمتين كاملتين في 0405 و0406؛ مسار تغطية الاستعلام يسمح بالتأكيد بكلمتين، ويُقدّم 0405 لقصر الاسم عند التعادل، مع 0406 خيارًا. 0007 يتطلب 3 كلمات مميزة والرقم 12. الرد يتعلق بخدمة خروج الجهاز وليس تأكيدًا عامًا لتوفر الجهاز.

## هـ) الاعتذار و«تحليل» و«نقل الدم»
الرد الظاهر للحالتين هو نفسه حرفيًا:
> نعتذر منكم، ربما لم نتمكن من فهم طلبكم بدقة، وقد تكون الخدمة التي تبحثون عنها متاحة لدينا لكننا لم نستطع التأكد منها. يمكنكم مراسلتنا على واتساب المستشفى (771422070) وسنوافيكم بالجواب في أقرب وقت. شاكرين لكم تفهمكم.
زر الحالتين «تواصل معنا عبر واتساب»؛ رسالة تحليل: «السلام عليكم، أبحث عن: تحليل»، ورسالة نقل الدم: «السلام عليكم، أبحث عن: نقل الدم».

## و) الاختبارات وعدم تغيير بقية البحث
- الحالات التاريخية 51 و52 و58 و66 موجودة، وكان مجموعها مع البقية 70/70 قبل العمل. تغير توقع حالة السونار في 58 إلى نعم وفق القرار، وأضيف 71 و72 للاستثناء وصيغته وحدوده؛ النتيجة 72/72، والاختبارات الشاملة نجحت.
- مقارنة فعلية لنتائج وردود 671 استعلامًا مختلفًا غير العبارتين (أسماء العناصر المنشورة وأول كلمتين وغيرها): صفر فروق. هذا نطاق عينة وليس برهانًا على جميع الاستعلامات. `comparison.json`.
- Chromium فحص نتيجة العبارتين وخيارات الكلمة المفردة، الصفحة وnoindex، العرض 360 و1280، بلا JS واحتياط JSON؛ التفاصيل `results.json` والصور. الخطوط الخارجية محجوبة محليًا.
- HTML الأصلي: تغيير روابط إصداري محرك البحث وحزمة البيانات v6 إلى v7 فقط في الصفحات التسع. لم يتغير sitemap أو redirects أو contact أو brand.css أو الكتالوج أو النص المخفي.
