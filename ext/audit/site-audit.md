# تدقيق الموقع وهوية المستشفى — المهمة 6-أ — 2026-11-26

## النطاق والمنهج والقيود
- مرجع البداية HEAD `e59f6b3`، الشجرة نظيفة، واختبار `test-all.js` ناجح 45/45 مع اختبارات المتصفح. لم نغيّر أي ملف أصلي؛ Git هو مرجع الحالة لأن إنشاء نسخة خارج المواقع المسموحة يتعارض مع نطاق المهمة.
- Chromium محلي؛ 18 صفحة × 375 و768 و1280، ثم فحص 375 بلا JavaScript. حظر كل الشبكة الخارجية بما فيها خطوط Google؛ لا إثبات لسلوك Cloudflare الحقيقي. فُحص التحميل الأول ثم أُظهرت العناصر المؤجلة وحُمّلت الصور محليًا لتدقيقها؛ هذا الإظهار تغيير مؤقت في DOM فقط وليس قياس تجربة الزائر الأصلية.
- تم حظر الطلبات الخارجية، ولم تفحص صحة الخدمات أو الخطوط أو الخرائط الخارجية.
- الأداء مختبري محلي دون محاكاة شبكة الهاتف أو Lighthouse، وحجم الصفحة مجموع أحجام الملفات المحلية المرصودة.
- التباين تقديري ويجمع الألوان حسب CSS؛ الخلفيات بالصور والتدرجات أو الشفافية وحالات hover وfocus تحتاج فحصًا يدويًا، وقد تختلف رسوم الرموز التعبيرية عن لون CSS المحسوب.
- التداخل عند مراكز العناصر بالمنطقة المرئية فقط؛ القص مرشح آلي وليس إثباتًا.
- فحص إغلاق الوسوم استرشادي وليس محلل HTML مطابقًا للمواصفة.
- الروابط الديناميكية التي تنشأ بعد عمليات البحث أو تفاعل المستخدم ليست جميعها معدودة.
- التحقق من tel/mailto/wa.me شكلي فقط دون الاتصال أو إثبات ملكية الرقم.
- خادم المعاينة يحاكي الروابط بلا امتداد ولا يثبت سلوك Cloudflare الفعلي أو إعادة التوجيه أو الرؤوس.
- مقاييس P0/P1/P2 هي تقدير هندسي: P0 يعطل مسارًا أساسيًا في الحالة المفحوصة؛ P1 عائق وظيفي أو إتاحة؛ P2 تحسين أو مراجعة. لا تستنتج من غياب الإبلاغ سلامة شاملة. فحص لوحة المفاتيح يقتصر على أول 6 Tab في أعلى الصفحة، ولم يُختبر تدفق كل نافذة أو قوائم ولوحة مفاتيح كاملًا.

## المفاضلة قبل الفحص
| الخيار | الأمان | الأداء | الصيانة | الاحتراف | عدم التدخل | الجوال/RTL |
|---|---:|---:|---:|---:|---:|---:|
| قراءة ثابتة فقط | 10 | 10 | 9 | 6 | 10 | 4 |
| مختبري محلي + تحليل ثابت | 10 | 8 | 9 | 9 | 10 | 9 |
| اختبار خارجي/تثبيت أدوات جديدة | 4 | 5 | 6 | 8 | 6 | 8 |
اختير المحلي والثابت لتغطية العرض الحقيقي مع حماية البيانات وعدم المساس بالموقع. التقييم تقدير لا قياس معياري.

## أهم 10 نتائج
1. **P0 الرئيسية بلا JavaScript:** 56/56 من عناصر `.reveal` بما فيها حاوية نموذج الحجز مخفية؛ زرا الإرسال من نوع button ويحتاجان JavaScript (`index.html:181,1984,2034`). لا يثبت ذلك فشل الوسائل الأخرى مثل الهاتف.
2. **P1 فهارس الحروف:** 76 مرساة `#h-*` بلا هدف في صفحات فئات الدليل الثماني؛ مثال `services/dental.html:131`، ما يمنع الانتقال؛ إصلاح IDs لا يتطلب تغيير النص الظاهر.
3. **P1 تباين نصوص وأزرار:** الأبيض على الأخضر `#2ecc71` بنسبة 2.10:1، وخيارات حجز الأطباء 2.36:1؛ حد النص العادي 4.5:1. جميع الأزواج بالأسفل، والرموز التعبيرية مؤشرات فقط.
4. **P1 دليل التذييل والتنبيه:** كحلي على خلفية كحلية، نحو 1.00–1.12:1؛ تظهر الأرقام بالتفصيل. فحص التدرج تقريبي ويستحسن التحقق بصريًا.
5. **P1 التنقل والإتاحة:** لا رابط تخطٍ في 18 صفحة وفق الفحص الآلي، وأهداف لمس بأبعاد دون 44px؛ 44px هدف تصميمي، لا يُعد كل هدف دونه مخالفة WCAG تلقائية.
6. **P1 بيانات الفهرسة:** صفحات العيادات والوحدات والملحقة والأخبار بلا canonical وog:url، بينما sitemap يسجلها بـ `.html`؛ الدليل يستخدم بلا امتداد. 404 حالة خاصة وليست صفحة فهرسة مطلوبة.
7. **P1 بنية العناوين:** توجد قفزات تسلسل في صفحات محددة بالجدول وبيانات JSON؛ هذا فحص دلالي لا يعني عدم إغلاق الوسوم.
8. **P2 الحجز في الجوال:** مركز زر الحجز الرئيسي مغطى بزر عائم عند 375px في الاختبار؛ فحص المركز فقط والنتيجة تحتاج إعادة تحقق بصري وتفاعلي.
9. **P2 الأداء:** اللقطة المحلية الأولى للأطباء تتجاوز 2 MB دون خطوط خارجية؛ أكبر الأصول وLCP التقريبي في الجدول. لا يمثل الإنترنت الحقيقي.
10. **P2 المعلومات والإدارة:** Gmail الشخصي وتواريخ العروض والنسب وادعاءات أحدث التجهيزات و24 ساعة تتطلب مراجعة المالك؛ نصوص ردود البحث مسجلة أصلًا `claimsApproved: true`، وليست ادعاءات غير معتمدة.

## جدول كل الصفحات: أعداد الفئات المسجلة
| الصفحة | P0 | P1 | P2 | ملاحظات سريعة |
|---|---:|---:|---:|---|
| `/` | 1 | 4 | 4 | تجاوز تسلسل العناوين؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ محتوى مخفي بلا JavaScript؛ نص أصغر من 14px؛ احتمال تراكب عند نقطة اللمس؛ وزن محلي أولي مرتفع؛ حقل البحث لا يعمل بلا JavaScript دون شرح noscript |
| `/doctors.html` | 0 | 3 | 2 | لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px؛ وزن محلي أولي مرتفع |
| `/offers.html` | 0 | 3 | 3 | لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px؛ احتمال تراكب عند نقطة اللمس؛ وزن محلي أولي مرتفع |
| `/clinics.html` | 0 | 6 | 1 | تجاوز تسلسل العناوين؛ canonical مفقود؛ og:url مفقود؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px |
| `/units.html` | 0 | 6 | 1 | تجاوز تسلسل العناوين؛ canonical مفقود؛ og:url مفقود؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px |
| `/ancillary.html` | 0 | 5 | 1 | canonical مفقود؛ og:url مفقود؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px |
| `/pr.html` | 0 | 3 | 1 | لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px |
| `/news.html` | 0 | 5 | 1 | canonical مفقود؛ og:url مفقود؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ نص أصغر من 14px |
| `/404.html` | 0 | 4 | 2 | بيانات وصفية أو لغة أو اتجاه ناقص؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ تباين نصوص أقل من WCAG AA؛ لا رابط مباشر للدليل في التذييل؛ نص أصغر من 14px |
| `/services/` | 0 | 3 | 3 | تجاوز تسلسل العناوين؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/diagnostics` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/surgery` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/dental` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/women` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/ent` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/physio` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/emergency` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |
| `/services/clinics-admin` | 0 | 3 | 3 | روابط أو مراسٍ داخلية مكسورة؛ لا يوجد رابط تخطي للمحتوى؛ أهداف لمس أصغر من 44px؛ لا رابط مباشر للدليل في التذييل؛ كاش HTML بلا قاعدة صريحة للمسار دون امتداد؛ نص أصغر من 14px |

## سجل كل مشكلة وأدلتها
كل سجل يحمل الصفحة والأولوية والدليل وهل التعديل المقترح يمس النص الظاهر؛ «نعم» لا تعني تصريحًا بالتعديل. التفاصيل الكاملة للمراسي وعناصر القياس متاحة في `site-audit.json`.
- **P1 `/` — تجاوز تسلسل العناوين**؛ دليل: [{"before":{"level":2,"text":"اتصل بنا"},"after":{"level":4,"text":"العنوان الرئيسي"}}]؛ يمس نصًا ظاهرًا: لا.
- **P1 `/` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/` — أهداف لمس أصغر من 44px**؛ دليل: {"count":34,"examples":[{"tag":"A","text":"03-235270","href":"tel:03235270","class":"","w":77.8,"h":22.8},{"tag":"A","text":"03-226277","href":"tel:03226277","class":"","w":77.8,"h":22.8},{"tag":"BUTTON","text":"قائمة التصفح الجوالة","href":null,"class":"menu-toggle","w":42,"h":48},{"tag":"A","text":"03 235270","href":"tel:03235270","class":"","w":89.8,"h":18},{"tag":"A","text":"235271","href":"te؛ يمس نصًا ظاهرًا: لا.
- **P1 `/` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":7,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":2,"examples":["📅 احجز موعدك الآن","👁️ اضغط هنا لزيارة ومشاهدة صفحة العروض الحالية ←"]},{"foreground":"#ffffff","background":"#4c8cda","ratio":3.47,"minimum":4.5,"count":1,"examples":["🚑"]},{"foreground":"#ffffff","background":"#ee7d55","ratio":2.73,"minimum":4.5,"count":1,"examples":["⏳ إعل؛ يمس نصًا ظاهرًا: لا.
- **P0 `/` — محتوى مخفي بلا JavaScript**؛ دليل: {"hidden":56,"total":56}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/` — نص أصغر من 14px**؛ دليل: {"count":31,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"📍 الحديدة - شارع صنعاء - أمام كلية الشفاء","size":13,"tag":"LI","class":""},{"text":"☎️ استعلامات وطوارئ 24/7:","size":13,"tag":"LI","class":""},{"text":"03-235270","size":13,"tag":"STRONG","class":""}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/` — احتمال تراكب عند نقطة اللمس**؛ دليل: [{"width":"375","items":[{"target":"📅 احجز موعدك الآن","targetTag":"A","coveredBy":"A.floating-bot-btn"}]}]؛ يمس نصًا ظاهرًا: لا.
- **P2 `/` — وزن محلي أولي مرتفع**؛ دليل: {"bytes":520870}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/` — حقل البحث لا يعمل بلا JavaScript دون شرح noscript**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/doctors.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/doctors.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":6,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"mobile-toggle","w":21.5,"h":48},{"tag":"INPUT","text":"بحث عن طبيب","href":null,"class":"","w":293,"h":39},{"tag":"SELECT","text":"تصفية حسب التخصص","href":null,"class":"","w":240,"h":41},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":61.3,"h":24.3},{"tag":"A"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/doctors.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":5,"examples":[{"foreground":"#40c057","background":"#ffffff","ratio":2.36,"minimum":4.5,"count":1,"examples":["التخصصي"]},{"foreground":"#2f9e44","background":"#e8f7eb","ratio":3.12,"minimum":4.5,"count":8,"examples":["استشاري جراحة الفم والوجه والفكين","استشاري جراحة المخ والأعصاب والعمود الفقري","استشاري جراحة العظام والمفاصل"]},{"foreground":"#ffffff","background":"#40c057","ratio؛ يمس نصًا ظاهرًا: لا.
- **P2 `/doctors.html` — نص أصغر من 14px**؛ دليل: {"count":70,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SPAN","class":"brand-name-sub"},{"text":"استشاري جراحة الفم والوجه والفكين","size":12.48,"tag":"SPAN","class":"spec-badge"},{"text":"متخصص في كسور الوجه والفكين، جراحات الأورام والأكياس المرضية، والعيوب الخلقية وا","size":13.6,"tag":"DIV؛ يمس نصًا ظاهرًا: لا.
- **P2 `/doctors.html` — وزن محلي أولي مرتفع**؛ دليل: {"bytes":2140635}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/offers.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/offers.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":36,"examples":[{"tag":"BUTTON","text":"قائمة التصفح","href":null,"class":"menu-toggle","w":42,"h":48},{"tag":"A","text":"الرئيسية","href":"index.html","class":"","w":46.8,"h":16},{"tag":"A","text":"🩺 باقة الجراحة 130,000 ريال","href":"#offer-surgery","class":"chip","w":247.2,"h":41.8},{"tag":"A","text":"🤰 خصم الولادة 40%","href":"#offer-women","class":"chip","w":177.1,"h":41.8},{"tag":"A"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/offers.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":8,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":7,"examples":["👁️ شاهد العروض","خصم 50%","خصم 30%"]},{"foreground":"#1f6fd1","background":"#e9f1fa","ratio":4.32,"minimum":4.5,"count":3,"examples":["🩺 الجراحة العامة","🤰 النساء والولادة","🦷 طب الأسنان"]},{"foreground":"#1e8e4e","background":"#e0f7ea","ratio":3.71,"minimum":4.5,"count":3,"e؛ يمس نصًا ظاهرًا: لا.
- **P2 `/offers.html` — نص أصغر من 14px**؛ دليل: {"count":38,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"أكبر صرح طبي في محافظة الحديدة","size":12.48,"tag":"SMALL","class":""},{"text":"الرئيسية","size":13.6,"tag":"A","class":""},{"text":"‹","size":13.6,"tag":"NAV","class":"crumbs"}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/offers.html` — احتمال تراكب عند نقطة اللمس**؛ دليل: [{"width":"1280","items":[{"target":"🚑 طوارئ واستعلامات 24/7 03 235270","targetTag":"A","coveredBy":"SPAN."}]}]؛ يمس نصًا ظاهرًا: لا.
- **P2 `/offers.html` — وزن محلي أولي مرتفع**؛ دليل: {"bytes":931261}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/clinics.html` — تجاوز تسلسل العناوين**؛ دليل: [{"before":{"level":1,"text":"العيادات الطبية المتخصصة"},"after":{"level":3,"text":"عيادة طب الأطفال وحديثي الولادة"}}]؛ يمس نصًا ظاهرًا: لا.
- **P1 `/clinics.html` — canonical مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/clinics.html` — og:url مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/clinics.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/clinics.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":4,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":50.3,"h":24.3},{"tag":"A","text":"العودة للأعلى ↑","href":"#top","class":"back-to-top","w":109.6,"h":22.5},{"tag":"A","text":"دليل الفحوصات والعمليات والأشعة","href":"services/","class"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/clinics.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":2,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":1,"examples":["احجز موعدك الآن"]},{"foreground":"#0a2a5e","background":"#0a2a5e","ratio":1,"minimum":4.5,"count":2,"examples":["دليل الفحوصات والعمليات والأشعة","المعلومات للتوعية ولا تغني عن استشارة الطبيب، وفي الطوارئ تواصل مع الطوارئ فورًا."]}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/clinics.html` — نص أصغر من 14px**؛ دليل: {"count":2,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/units.html` — تجاوز تسلسل العناوين**؛ دليل: [{"before":{"level":1,"text":"الوحدات الطبية والتشخيصية"},"after":{"level":3,"text":"نفخر في مستشفى الأنهار التخصصي بتعاقدنا مع نخبة من الاستشاريين الجراحيين في جميع التخصصات الجراحية."}}]؛ يمس نصًا ظاهرًا: لا.
- **P1 `/units.html` — canonical مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/units.html` — og:url مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/units.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/units.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":4,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":50.3,"h":24.3},{"tag":"A","text":"العودة للأعلى ↑","href":"#top","class":"back-to-top","w":109.6,"h":22.5},{"tag":"A","text":"دليل الفحوصات والعمليات والأشعة","href":"services/","class"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/units.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":2,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":1,"examples":["للتنسيق والحجز اضغط هنا"]},{"foreground":"#0a2a5e","background":"#0a2a5e","ratio":1,"minimum":4.5,"count":2,"examples":["دليل الفحوصات والعمليات والأشعة","المعلومات للتوعية ولا تغني عن استشارة الطبيب، وفي الطوارئ تواصل مع الطوارئ فورًا."]}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/units.html` — نص أصغر من 14px**؛ دليل: {"count":2,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/ancillary.html` — canonical مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/ancillary.html` — og:url مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/ancillary.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/ancillary.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":4,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":50.3,"h":24.3},{"tag":"A","text":"العودة للأعلى ↑","href":"#top","class":"back-to-top","w":109.6,"h":22.5},{"tag":"A","text":"دليل الفحوصات والعمليات والأشعة","href":"services/","class"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/ancillary.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":5,"examples":[{"foreground":"#2ecc71","background":"#f8fafc","ratio":2.01,"minimum":3,"count":4,"examples":["🏥","🛡️","📚"]},{"foreground":"#2ecc71","background":"#ffffff","ratio":2.1,"minimum":4.5,"count":13,"examples":["عرض التفاصيل","عرض التفاصيل","عرض التفاصيل"]},{"foreground":"#ffffff","background":"#25d366","ratio":1.98,"minimum":4.5,"count":1,"examples":["💬 واتساب الحجوزات"]},{"؛ يمس نصًا ظاهرًا: لا.
- **P2 `/ancillary.html` — نص أصغر من 14px**؛ دليل: {"count":15,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"عرض التفاصيل","size":13.33,"tag":"SPAN","class":"expand-text"},{"text":"عرض التفاصيل","size":13.33,"tag":"SPAN","class":"expand-text"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/pr.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/pr.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":31,"examples":[{"tag":"A","text":"03-235270","href":"tel:+9673235270","class":"","w":81.3,"h":16},{"tag":"A","text":"اتصال","href":"tel:+967783395352","class":"","w":75.9,"h":38.4},{"tag":"A","text":"اتصال","href":"tel:+967735539107","class":"","w":75.9,"h":38.4},{"tag":"A","text":"اتصال","href":"tel:+9673235270","class":"","w":75.9,"h":38.4},{"tag":"INPUT","text":"","href":null,"class":"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/pr.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":2,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":4,"examples":["📋 أرسل إحالة الآن","💬 واتساب","💬 تجهيز الإحالة عبر واتساب"]},{"foreground":"#1a8f4d","background":"#e9f9f0","ratio":3.79,"minimum":4.5,"count":1,"examples":["تواصل مباشر"]}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/pr.html` — نص أصغر من 14px**؛ دليل: {"count":8,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"📍 الحديدة - شارع صنعاء - أمام كلية الشفاء","size":13.6,"tag":"SPAN","class":""},{"text":"🚑 الطوارئ 24 ساعة /","size":13.6,"tag":"SPAN","class":""},{"text":"03-235270","size":13.6,"tag":"A","class":""}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/news.html` — canonical مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/news.html` — og:url مفقود**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: لا.
- **P1 `/news.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/news.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":4,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":50.3,"h":24.3},{"tag":"A","text":"العودة للأعلى ↑","href":"#top","class":"back-to-top","w":109.6,"h":22.5},{"tag":"A","text":"دليل الفحوصات والعمليات والأشعة","href":"services/","class"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/news.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":4,"examples":[{"foreground":"#2ecc71","background":"#d5f5e3","ratio":1.8,"minimum":4.5,"count":1,"examples":["إنجاز طبي نوعي"]},{"foreground":"#ffffff","background":"#1877f2","ratio":4.23,"minimum":4.5,"count":1,"examples":["للمزيد من التفاصيل اضغط لمشاهدة الخبر على فيسبوك ↗"]},{"foreground":"#2ecc71","background":"#ffffff","ratio":2.1,"minimum":4.5,"count":1,"examples":["مستشفى الأن؛ يمس نصًا ظاهرًا: لا.
- **P2 `/news.html` — نص أصغر من 14px**؛ دليل: {"count":2,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/404.html` — بيانات وصفية أو لغة أو اتجاه ناقص**؛ دليل: {"title":"الصفحة غير موجودة / مستشفى الأنهار التخصصي","description":null,"lang":"ar","dir":"rtl"}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/404.html` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/404.html` — أهداف لمس أصغر من 44px**؛ دليل: {"count":2,"examples":[{"tag":"A","text":"الرئيسية","href":"index.html","class":"","w":126.5,"h":43},{"tag":"A","text":"العروض","href":"offers.html","class":"","w":122,"h":43}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/404.html` — تباين نصوص أقل من WCAG AA**؛ دليل: {"countPairs":1,"examples":[{"foreground":"#ffffff","background":"#2ecc71","ratio":2.1,"minimum":4.5,"count":2,"examples":["الرئيسية","العروض"]}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/404.html` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/404.html` — نص أصغر من 14px**؛ دليل: {"count":1,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/` — تجاوز تسلسل العناوين**؛ دليل: [{"before":{"level":1,"text":"دليل الخدمات الطبية في مستشفى الأنهار التخصصي"},"after":{"level":3,"text":"مستشفى الأنهار التخصصي"}}]؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/` — أهداف لمس أصغر من 44px**؛ دليل: {"count":5,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"العروض والخصومات","href":"../offers.html","class":"","w":158.3,"h":19},{"tag":"A","text":"فيسبوك","href":"https://www.facebook.com/profile.php?id=61565589033008","class":"","w":50.3,"h":24.3},؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/` — نص أصغر من 14px**؛ دليل: {"count":11,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"30 خدمة","size":13.6,"tag":"SPAN","class":"sg-count"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/diagnostics` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":8,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/diagnostics#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ت","resolved":"http://127.0.0.1:8181/services/diagnostics#h-%D8%AA","text":"ت","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ت",؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/diagnostics` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/diagnostics` — أهداف لمس أصغر من 44px**؛ دليل: {"count":14,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ت","href":"#h-ت","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/diagnostics` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/diagnostics` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/diagnostics","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/diagnostics` — نص أصغر من 14px**؛ دليل: {"count":33,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0052","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/surgery` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":14,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/surgery#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ت","resolved":"http://127.0.0.1:8181/services/surgery#h-%D8%AA","text":"ت","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ت","fragme؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/surgery` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/surgery` — أهداف لمس أصغر من 44px**؛ دليل: {"count":20,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ت","href":"#h-ت","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/surgery` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/surgery` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/surgery","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/surgery` — نص أصغر من 14px**؛ دليل: {"count":87,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0043","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/dental` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":13,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/dental#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ب","resolved":"http://127.0.0.1:8181/services/dental#h-%D8%A8","text":"ب","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ب","fragment؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/dental` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/dental` — أهداف لمس أصغر من 44px**؛ دليل: {"count":19,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ب","href":"#h-ب","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/dental` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/dental` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/dental","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/dental` — نص أصغر من 14px**؛ دليل: {"count":99,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0158","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/women` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":10,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/women#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ب","resolved":"http://127.0.0.1:8181/services/women#h-%D8%A8","text":"ب","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ب","fragmentVa؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/women` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/women` — أهداف لمس أصغر من 44px**؛ دليل: {"count":16,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ب","href":"#h-ب","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/women` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/women` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/women","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/women` — نص أصغر من 14px**؛ دليل: {"count":28,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0321","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/ent` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":11,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/ent#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ت","resolved":"http://127.0.0.1:8181/services/ent#h-%D8%AA","text":"ت","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ت","fragmentValid"؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/ent` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/ent` — أهداف لمس أصغر من 44px**؛ دليل: {"count":17,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ت","href":"#h-ت","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/ent` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/ent` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/ent","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/ent` — نص أصغر من 14px**؛ دليل: {"count":33,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0266","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/physio` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":3,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/physio#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ت","resolved":"http://127.0.0.1:8181/services/physio#h-%D8%AA","text":"ت","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ت","fragmentV؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/physio` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/physio` — أهداف لمس أصغر من 44px**؛ دليل: {"count":9,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ت","href":"#h-ت","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/physio` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/physio` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/physio","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/physio` — نص أصغر من 14px**؛ دليل: {"count":40,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0239","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/emergency` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":12,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/emergency#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-ت","resolved":"http://127.0.0.1:8181/services/emergency#h-%D8%AA","text":"ت","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ت","fr؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/emergency` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/emergency` — أهداف لمس أصغر من 44px**؛ دليل: {"count":18,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"ت","href":"#h-ت","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/emergency` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/emergency` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/emergency","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/emergency` — نص أصغر من 14px**؛ دليل: {"count":67,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0424","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/clinics-admin` — روابط أو مراسٍ داخلية مكسورة**؛ دليل: {"count":5,"examples":[{"href":"#h-ا","resolved":"http://127.0.0.1:8181/services/clinics-admin#h-%D8%A7","text":"ا","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h-ا","fragmentValid":false,"valid":false},{"href":"#h-خ","resolved":"http://127.0.0.1:8181/services/clinics-admin#h-%D8%AE","text":"خ","footer":false,"kind":"internal","status":200,"location":null,"fragment":"h؛ يمس نصًا ظاهرًا: لا.
- **P1 `/services/clinics-admin` — لا يوجد رابط تخطي للمحتوى**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P1 `/services/clinics-admin` — أهداف لمس أصغر من 44px**؛ دليل: {"count":11,"examples":[{"tag":"BUTTON","text":"فتح القائمة","href":null,"class":"menu-toggle","w":30,"h":48},{"tag":"A","text":"الرئيسية","href":"../index.html","class":"","w":55.1,"h":19},{"tag":"A","text":"دليل الخدمات","href":"./","class":"","w":90.6,"h":19},{"tag":"A","text":"ا","href":"#h-ا","class":"","w":40,"h":40},{"tag":"A","text":"خ","href":"#h-خ","class":"","w":40,"h":40}]}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/clinics-admin` — لا رابط مباشر للدليل في التذييل**؛ دليل: لم يُرصد؛ يمس نصًا ظاهرًا: نعم.
- **P2 `/services/clinics-admin` — كاش HTML بلا قاعدة صريحة للمسار دون امتداد**؛ دليل: {"rule":"/*.html","route":"/services/clinics-admin","limitation":"يستلزم التأكد من الرؤوس الفعلية وCloudflare"}؛ يمس نصًا ظاهرًا: لا.
- **P2 `/services/clinics-admin` — نص أصغر من 14px**؛ دليل: {"count":47,"examples":[{"text":"🔍 ابحث عن فحص، عملية، أو عيادة / ⌘K","size":13.12,"tag":"BUTTON","class":"clinical-trigger"},{"text":"التخصصي","size":13.6,"tag":"SMALL","class":""},{"text":"اكتب حرفين على الأقل","size":13.6,"tag":"P","class":"ss-hint"},{"text":"SVC-0252","size":12,"tag":"SPAN","class":"sg-id"}]}؛ يمس نصًا ظاهرًا: لا.

## الروابط والاتصال والصور والهيكل
- تدقيق الروابط من DOM الابتدائي لكل صفحة: الطلبات المحلية دون متابعة تحويل؛ لكل رابط في JSON الصيغة وHTTP والمرسى. الروابط الخارجية لم تُفتح؛ تلغرام وفيسبوك والخرائط وغيرها لم تُختبر. الروابط الديناميكية ليست جميعها ضمن الفحص.
- لا روابط داخلية مكسورة سوى مراسي فهارس الحروف المذكورة، ولا صيغ tel/mailto/wa.me غير صالحة ضمن روابط DOM الأولية؛ التحقق شكلي لا يتحقق من اتصال أو ملكية. التحويلات المحلية المرصودة: 0. الخادم المحلي لا يثبت تحويلات Cloudflare.
- لا مصدر صورة محلي مفقود ولا `alt` غائب في عناصر الصور، وفق الفحص؛ عناصر الصور وأبعادها الطبيعية/المعروضة ومصادرها في JSON، مع ملاحظة أن alt الفارغ قد يكون مقصودًا. لم تفحص الصور خارج الشبكة.
- HTML: لكل صفحة H1 واحد، لم تظهر IDs مكررة، ولم يكشف محلل Python الإرشادي وسومًا غير مغلقة؛ ليس مدقق HTML5. لغة واتجاه الصفحات ar/rtl. JSON-LD المرصود صالح نحويًا فقط دون ضمان صحة المخطط. القائمة الوصفية في JSON.
- لا تجاوز أفقي على العروض الثلاثة ولا أخطاء محلية في console/network في الزيارات الأولية؛ لا يشمل التفاعلات كافة ولا الشبكة المحجوبة. نتائج قص/تداخل مرشحة، لا حكم نهائي.
- رأس/تذييل وقائمة البحث: بيانات عناصر header/footer وتفاصيل ?v محفوظة لكل عرض في JSON؛ `style.css?v=10` و`script.js?v=10` في الصفحات المشتركة، `services-search` وبياناته `?v=4` والتحسينات `?v=1`. الدليل في تذييل الصفحات الثماني الرئيسية باستثناء 404، وغير موجود كرابط مباشر في تذييل الدليل وصفحاته الثماني؛ 404 يعرض رابط الدليل في المتن لا تذييلًا.
- البحث المرئي المضمن موجود في الرئيسية وصفحات الدليل؛ الواجهات المُحقنة ديناميكيًا وتفاعلاتها لا يثبتها عدّ الحقول وحده. دون JS صفحات الدليل تعرض شرحًا وبديل التصفح؛ الرئيسية لا يظهر لها شرح noscript، فضلًا عن العناصر المخفية.

### الأرقام ومواقعها
الأرقام مستخرجة من صفحات HTML وملفات الاتصال/السكريبتات المحددة في `static-audit.py`، وقد تتكرر في نفس السطر. الرقم `771234567` مجرد مثال placeholder لا رقم تواصل. لا يفترض توحيد الصيغ أو إثبات الملكية.
- `9673235270`: `index.html:71`, `doctors.html:672`, `offers.html:60`, `pr.html:1198`, `pr.html:1495`, `pr.html:1892`, `pr.html:2154`.
- `9673235271`: `index.html:72`, `offers.html:60`.
- `9673235272`: `index.html:73`, `offers.html:60`.
- `9673235273`: `index.html:74`, `offers.html:60`.
- `9673226277`: `index.html:75`.
- `967735539107`: `index.html:76`, `offers.html:60`, `offers.html:723`, `offers.html:823`, `pr.html:1490`, `pr.html:2303`.
- `967783395352`: `index.html:77`, `offers.html:60`, `offers.html:723`, `pr.html:1485`.
- `967771422070`: `index.html:78`, `index.html:95`, `index.html:2046`, `index.html:2142`, `index.html:2277`, `offers.html:60`, `offers.html:479`, `offers.html:521`, `offers.html:555`, `offers.html:588`, `offers.html:722`, `offers.html:805`, `offers.html:838`, `units.html:170`, `ancillary.html:772`, `pr.html:1096`, `pr.html:1461`, `pr.html:1468`, `pr.html:1523`, `pr.html:2161`, `pr.html:2199`, `pr.html:2302`, `script.js:91`, `script.js:98`, `ext/data/contact.json:3`.
- `03235270`: `index.html:1286`, `index.html:1286`, `index.html:1348`, `index.html:1352`, `index.html:2044`, `index.html:2044`, `index.html:2071`, `index.html:2071`, `index.html:2125`, `offers.html:155`, `offers.html:476`, `offers.html:476`, `offers.html:522`, `offers.html:556`, `offers.html:589`, `offers.html:721`, `offers.html:721`, `offers.html:761`, `offers.html:804`, `offers.html:804`, `ancillary.html:773`, `pr.html:1167`, `pr.html:1198`, `pr.html:1494`, `pr.html:1892`, `pr.html:2064`, `pr.html:2155`.
- `03226277`: `index.html:1287`, `index.html:1287`, `index.html:1953`, `index.html:2047`, `index.html:2047`, `index.html:2079`, `ancillary.html:774`, `services/diagnostics.html:146`, `services/diagnostics.html:146`.
- `771234567`: `index.html:1998`.
- `03235271`: `index.html:2044`, `index.html:2071`, `offers.html:721`.
- `03235272`: `index.html:2044`, `index.html:2071`, `offers.html:721`.
- `03235273`: `index.html:2044`, `index.html:2071`, `index.html:2079`, `offers.html:721`.
- `783395352`: `index.html:2045`, `index.html:2045`, `index.html:2075`, `index.html:2075`, `offers.html:723`, `pr.html:1167`, `pr.html:2063`.
- `735539107`: `index.html:2045`, `index.html:2045`, `index.html:2075`, `index.html:2075`, `offers.html:649`, `offers.html:672`, `offers.html:723`, `offers.html:824`, `pr.html:1167`, `pr.html:2061`.
- `771422070`: `index.html:2141`, `index.html:2144`, `index.html:2312`, `index.html:2314`, `offers.html:479`, `offers.html:722`, `offers.html:805`, `pr.html:1523`, `pr.html:2165`, `pr.html:2204`, `ext/data/contact.json:4`.

### البريد الشخصي
- `ammaralqhwi20@gmail.com` — `index.html:80`.
- `ammaralqhwi20@gmail.com` — `index.html:2048`.
- `ammaralqhwi20@gmail.com` — `index.html:2048`.
- `ammaralqhwi20@gmail.com` — `index.html:2296`.
- `ammaralqhwi20@gmail.com` — `offers.html:61`.
- `ammaralqhwi20@gmail.com` — `offers.html:724`.
- `ammaralqhwi20@gmail.com` — `offers.html:724`.
- `ammaralqhwi20@gmail.com` — `pr.html:1097`.
- `ammaralqhwi20@gmail.com` — `pr.html:1864`.
- `ammaralqhwi20@gmail.com` — `pr.html:2304`.
- `ammaralqhwi20@gmail.com` — `script.js:116`.
- `ammaralqhwi20@gmail.com` — `script.js:123`.
- `ammaralqhwi20@gmail.com` — `script.js:137`.

### العروض والتواريخ والادعاءات
- قنوات الحجز بالبريد وواتساب قد تتضمن بيانات شخصية؛ لم يُختبر تسليم حقيقي أو توافق الخصوصية. يلزم قرار المالك عن القناة المعتمدة قبل أي تغيير.
- في `offers.html`: باقة 130,000 ريال، 20 أكتوبر–30 ديسمبر 2026؛ النساء والأسنان حتى 31 ديسمبر 2026؛ نسب 50% و30% و40% حسب العرض. سجلات الأسطر المطابقة جميعها في JSON تحت `offerPercentDateLines`، وتشمل metadata وJSON-LD والإعلانات؛ لا نؤكد السريان الفعلي أو الأسعار.
- `ext/data/search-responses.json` — `lab`, `claimsApproved: true`: «نعم، يتوفر لدينا {name}. ولدينا مختبرات طبية متكاملة وبنك دم مجهزة بأحدث التجهيزات الطبية، وتعمل على مدار الساعة. نسعد بخدمتكم ونتمنى لكم دوام الصحة والعافية.»
- `ext/data/search-responses.json` — `surgery`, `claimsApproved: true`: «نعم، تتوفر لدينا {name}. عملياتنا مجهزة بأحدث التجهيزات الطبية ووفق أحدث معايير الجودة والدقة العالية، وهي متاحة على مدار الساعة، مع جاهزية للاستجابة لأي حالة طارئة في أي وقت. نسعد بخدمتكم ونتمنى لكم دوام الصحة والعافية.»
- `ext/data/search-responses.json` — `dental`, `claimsApproved: true`: «نعم، يتوفر لدينا {name}. لدينا مركز جراحة الوجه والفكين وعيادة الأسنان والتقويم، بأحدث التجهيزات الطبية وأعلى معايير السلامة في الجراحة، ورعاية سليمة تحافظ على ابتسامتك وتجعلها الفارق. نسعد بخدمتكم ونتمنى لكم دوام الصحة والعافية.»
- `ext/data/search-responses.json` — `radiology`, `claimsApproved: true`: «نعم، يتوفر لدينا {name}. لدينا مركز تشخيصي متكامل يضم الأشعة المقطعية والأشعة الرقمية الكشافة (DR) والسونار (الموجات فوق الصوتية) وإيكو القلب، بأحدث أجهزة الأشعة المقطعية وأجهزة السونار والإيكو الحديثة، ويقدّم القسم خدماته على مدار الساعة. نسعد بخدمتكم ونتمنى لكم دوام الصحة والعافية.»
- العبارة «مركز جراحة الوجه والفكين» وردت حرفيًا في رد dental وملف البيانات المولد؛ لم تظهر حرفيًا في صفحات HTML الثماني عشرة. يذكر حقل التحقق اعتماد المالك للنص؛ لا يُستنتج وجود مسمى مركز مستقل من مجرد الرد.

### `.sr-only-seo`
عدّ tokens بتحليل HTML وفق `[\w\u0600-\u06ff]+`: الرئيسية 2163؛ باقي الصفحات 0. حارس المحتوى يستخدم طريقة مختلفة ويذكر 2089 كلمة مخفية؛ الفرق منهجي. لم يُمس النص المخفي.

## SEO والكاش
- `/`: canonical `https://alanharhospital.com/`؛ og:url `https://alanharhospital.com/`؛ description موجود؛ JSON-LD 2؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/doctors.html`: canonical `https://alanharhospital.com/doctors.html`؛ og:url `https://alanharhospital.com/doctors.html`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/offers.html`: canonical `https://alanharhospital.com/offers.html`؛ og:url `https://alanharhospital.com/offers.html`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/clinics.html`: canonical `غير موجود`؛ og:url `غير موجود`؛ description موجود؛ JSON-LD 0؛ في sitemap لا أو لا canonical. 404 مستثنى طبيعيًا من sitemap.
- `/units.html`: canonical `غير موجود`؛ og:url `غير موجود`؛ description موجود؛ JSON-LD 0؛ في sitemap لا أو لا canonical. 404 مستثنى طبيعيًا من sitemap.
- `/ancillary.html`: canonical `غير موجود`؛ og:url `غير موجود`؛ description موجود؛ JSON-LD 0؛ في sitemap لا أو لا canonical. 404 مستثنى طبيعيًا من sitemap.
- `/pr.html`: canonical `https://alanharhospital.com/pr.html`؛ og:url `https://alanharhospital.com/pr.html`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/news.html`: canonical `غير موجود`؛ og:url `غير موجود`؛ description موجود؛ JSON-LD 0؛ في sitemap لا أو لا canonical. 404 مستثنى طبيعيًا من sitemap.
- `/404.html`: canonical `غير موجود`؛ og:url `غير موجود`؛ description غير موجود؛ JSON-LD 0؛ في sitemap لا أو لا canonical. 404 مستثنى طبيعيًا من sitemap.
- `/services/`: canonical `https://alanharhospital.com/services/`؛ og:url `https://alanharhospital.com/services/`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/diagnostics`: canonical `https://alanharhospital.com/services/diagnostics`؛ og:url `https://alanharhospital.com/services/diagnostics`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/surgery`: canonical `https://alanharhospital.com/services/surgery`؛ og:url `https://alanharhospital.com/services/surgery`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/dental`: canonical `https://alanharhospital.com/services/dental`؛ og:url `https://alanharhospital.com/services/dental`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/women`: canonical `https://alanharhospital.com/services/women`؛ og:url `https://alanharhospital.com/services/women`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/ent`: canonical `https://alanharhospital.com/services/ent`؛ og:url `https://alanharhospital.com/services/ent`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/physio`: canonical `https://alanharhospital.com/services/physio`؛ og:url `https://alanharhospital.com/services/physio`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/emergency`: canonical `https://alanharhospital.com/services/emergency`؛ og:url `https://alanharhospital.com/services/emergency`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- `/services/clinics-admin`: canonical `https://alanharhospital.com/services/clinics-admin`؛ og:url `https://alanharhospital.com/services/clinics-admin`؛ description موجود؛ JSON-LD 1؛ في sitemap نعم. 404 مستثنى طبيعيًا من sitemap.
- /*.html لا يتطابق نصيًا مع /services/dental دون امتداد، ولا يوجد مسار صريح مكافئ للتخزين؛ تأكيد الرؤوس الفعلية يتطلب فحص Cloudflare دون تخمين.
- قواعد الصور بالامتداد؛ يغطي النمط كتابةً الصور المنتهية بذلك الامتداد لكن تفاصيل مطابقة النجمة للمسارات المتداخلة وتطبيقها تتطلب فحص Cloudflare.
- لا قواعد صريحة للإصدارات داخل /ext/؛ قاعدة style.css وscript.js لا تنطبق نصيًا على خدمات البحث.
- تحليل ثابت فقط: `/*` يرصد رؤوس الأمن؛ `/*.html` و`/` مخصصان لكاش HTML قصير؛ CSS/JS الأساسيان محددان بالاسم؛ امتدادات الصور للكاش الطويل. لا يُحسم التطابق الفعلي أو أولوية القواعد أو كاش النسخة المنشورة دون اختبار الاستضافة.

## الأداء المحلي المبدئي عند 375px
| صفحة | بايت الموارد المحلية الأولى | LCP التقريبي ms | أكبر خمسة موارد محلية (بايت) |
|---|---:|---:|---|
| `/` | 520870 | 340 | `/` 149713، `/ext/data/services-index.js?v=4` 147580، `/ext/media/above-900.webp` 91804، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898 |
| `/doctors.html` | 2140635 | 108 | `/doctor7.png` 450405، `/doctor8.png` 450405، `/doctor6.png` 301259، `/doctor1.png` 225216، `/ext/data/services-index.js?v=4` 147580 |
| `/offers.html` | 931261 | 172 | `/mener.png` 227534، `/ext/data/services-index.js?v=4` 147580، `/menerperson.png` 145040، `/women.jpg?v=2` 119488، `/ext/media/above-900.webp` 91804 |
| `/clinics.html` | 314596 | 88 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931، `/clinics.html` 9755 |
| `/units.html` | 320806 | 80 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931، `/units.html` 15965 |
| `/ancillary.html` | 352996 | 144 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ancillary.html` 48155، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931 |
| `/pr.html` | 408001 | 124 | `/ext/data/services-index.js?v=4` 147580، `/pr.html` 91686، `/logo.jpg` 84349، `/ext/media/shar3-700.webp` 36962، `/ext/services-search.js?v=4` 28898 |
| `/news.html` | 313414 | 64 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931، `/news.html` 8573 |
| `/404.html` | 194842 | 80 | `/ext/data/services-index.js?v=4` 147580، `/ext/services-search.js?v=4` 28898، `/ext/clinical-enhancements.js?v=1` 7618، `/ext/services-search.css?v=4` 4638، `/ext/clinical-polish.css?v=1` 4361 |
| `/services/` | 306287 | 80 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931، `/services/` 10912 |
| `/services/diagnostics` | 316133 | 64 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/services/diagnostics` 20758، `/style.css?v=10` 17931 |
| `/services/surgery` | 332971 | 72 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/services/surgery` 37596، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931 |
| `/services/dental` | 335487 | 68 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/services/dental` 40112، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931 |
| `/services/women` | 313671 | 84 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/services/women` 18296، `/style.css?v=10` 17931 |
| `/services/ent` | 316200 | 72 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/services/ent` 20825، `/style.css?v=10` 17931 |
| `/services/physio` | 317901 | 68 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/services/physio` 22526، `/style.css?v=10` 17931 |
| `/services/emergency` | 327183 | 64 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/services/emergency` 31808، `/ext/services-search.js?v=4` 28898، `/style.css?v=10` 17931 |
| `/services/clinics-admin` | 320110 | 64 | `/ext/data/services-index.js?v=4` 147580، `/logo.jpg` 84349، `/ext/services-search.js?v=4` 28898، `/services/clinics-admin` 24735، `/style.css?v=10` 17931 |

## الهوية — 15 سطرًا من الملفات
1. اسم المستشفى عربي وإنجليزي ضمن الشعار والموقع.
2. الهوية عربية RTL وتستعمل لغة مباشرة بطابع طبي خدمي.
3. الكحلي الأساسي `#0a2a5e` للإطار المؤسسي.
4. الأزرق `#1e4a8a` لون تكميلي.
5. الأخضر `#2ecc71` لإبراز الأفعال والخدمات.
6. الخلفية الأساسية `#f8f9fa` والنص `#333333`.
7. الأبيض `#ffffff` والحدود `#e2e8f0` للأسطح.
8. الخط المعلن Tajawal واحتياطي sans-serif؛ بعض الصفحات تطلب Cairo أيضًا.
9. لم تُحمّل الخطوط الخارجية أثناء التدقيق، والمظهر الفعلي بوجودها غير محسوم.
10. أحجام `style.css` الحرفية تمتد من 0.68rem إلى 2.5rem مع قواعد صفحات إضافية.
11. المسافات المتكررة 1 و1.5 و2rem؛ توجد مسافات أخرى كما في ملف الهوية.
12. زوايا عامة 8 و12 و18px وظلال صغيرة ومتوسطة.
13. الشعار دائري عربي/إنجليزي، كحلي وأحمر وأخضر، بنبض وعناصر طبية.
14. صورة hero للواجهة الحقيقية للمبنى، مع طبقة لونية ونسخ WebP.
15. الأزرار بارزة ومستديرة والبطاقات بيضاء ذات حواف وظلال؛ التباين متباين بين الصفحات.
- تكرار كل لون حرفي في `style.css`، عائلات وأحجام الخطوط، المسافات، الظلال والزوايا ومحددات البطاقات والأزرار، والأزواج المحسوبة: `ext/data/brand-profile.json`. هذه إحصاءات ملف CSS لا كل الأنماط المضمنة.

## أزواج التباين الفاشلة المرصودة
| النص | الخلفية | النسبة | الحد | الصفحة/مثال |
|---|---|---:|---:|---|
| `#0a2a5e` | `#0a2a5e` | 1.00:1 | 4.5:1 | /clinics.html, /units.html, /ancillary.html, /news.html — دليل الفحوصات والعمليات والأشعة |
| `#0a2a5e` | `#132650` | 1.06:1 | 4.5:1 | /, /offers.html — المعلومات للتوعية ولا تغني عن استشارة الطبيب، وفي الطوارئ تواصل مع الطوارئ فورًا. |
| `#0a2a5e` | `#14264f` | 1.06:1 | 4.5:1 | /, /offers.html — دليل الفحوصات والعمليات والأشعة |
| `#0a2a5e` | `#132248` | 1.11:1 | 4.5:1 | /doctors.html — المعلومات للتوعية ولا تغني عن استشارة الطبيب، وفي الطوارئ تواصل مع الطوارئ فورًا. |
| `#0a2a5e` | `#142247` | 1.12:1 | 4.5:1 | /doctors.html — دليل الفحوصات والعمليات والأشعة |
| `#2ecc71` | `#d5f5e3` | 1.80:1 | 4.5:1 | /news.html — إنجاز طبي نوعي |
| `#ffffff` | `#25d366` | 1.98:1 | 4.5:1 | /, /offers.html, /ancillary.html — 💬 إرسال عبر واتساب |
| `#2ecc71` | `#f8fafc` | 2.01:1 | 3:1 | /ancillary.html — 🏥 |
| `#2ecc71` | `#ffffff` | 2.10:1 | 3:1 | /offers.html — 0 |
| `#2ecc71` | `#ffffff` | 2.10:1 | 4.5:1 | /ancillary.html, /news.html — عرض التفاصيل |
| `#ffffff` | `#2ecc71` | 2.10:1 | 4.5:1 | /, /offers.html, /clinics.html, /units.html, /ancillary.html, /pr.html, /news.html, /404.html — 📅 احجز موعدك الآن |
| `#40c057` | `#ffffff` | 2.36:1 | 4.5:1 | /doctors.html — التخصصي |
| `#ffffff` | `#40c057` | 2.36:1 | 4.5:1 | /doctors.html — حجز موعد |
| `#ffffff` | `#ee7d55` | 2.73:1 | 4.5:1 | /, /offers.html, /pr.html — ⏳ إعلانات ومخيمات طبية لفترة محدودة |
| `#2f9e44` | `#e8f7eb` | 3.12:1 | 4.5:1 | /doctors.html — استشاري جراحة الفم والوجه والفكين |
| `#ffffff` | `#4c8cda` | 3.47:1 | 4.5:1 | / — 🚑 |
| `#1e8e4e` | `#e0f7ea` | 3.71:1 | 4.5:1 | /offers.html — ساري حتى 30 ديسمبر 2026 |
| `#1a8f4d` | `#e9f9f0` | 3.79:1 | 4.5:1 | /pr.html — تواصل مباشر |
| `#ffffff` | `#1877f2` | 4.23:1 | 4.5:1 | /news.html — للمزيد من التفاصيل اضغط لمشاهدة الخبر على فيسبوك ↗ |
| `#1f6fd1` | `#e9f1fa` | 4.32:1 | 4.5:1 | /offers.html — 🩺 الجراحة العامة |
| `#dc2626` | `#f0f8fc` | 4.49:1 | 4.5:1 | / — * |
هذه ليست قائمة كل الحالات: في JSON `contrastPairs` لجميع الأزواج القابلة للحساب و`contrastUnknown` للحالات المستبعدة، مع الصفحات والعروض. الرموز الملوّنة والتدرجات تستلزم مراجعة حقيقية.

## الصفحات التسع: الدور والإجراء وما يحتاج قرارًا
| الصفحة | الوظيفة | CTA الموجود | الناقص أو المطلوب تأكيده |
|---|---|---|---|
| / | التعريف والخدمات والحجز | نموذج واتساب/بريد وأرقام | بديل واضح بلا JS، وتأكيد البريد والخصوصية ومسار التسليم |
| /doctors.html | عرض الاستشاريين | حجز موعد للرئيسية | توضيح طريقة ربط الطبيب بالحجز وتأكيد البيانات |
| /offers.html | العروض والمخيم | واتساب واتصال | تأكيد صلاحية الأسعار والخصومات قبل انقضاء التواريخ |
| /clinics.html | عرض العيادات | حجز بالرئيسية | بيانات اتصال مباشرة أو مسار تحديد العيادة بقرار المالك |
| /units.html | عرض الوحدات | حجز وواتساب وهاتف | تأكيد أرقام الاتصال ومسار التنسيق للوحدة |
| /ancillary.html | الخدمات الملحقة | واتساب وطوارئ ومختبر | تأكيد الجهة المناسبة لكل خدمة ومواعيدها |
| /pr.html | العلاقات العامة والتنسيق | اتصال وواتساب وبريد | تحديد البريد الرسمي ومسؤول التواصل |
| /news.html | الأخبار والإنجازات | روابط الأخبار وحجز في القائمة | تحديد قناة الاستفسار أو الحجز المرتبطة بكل خبر عند الحاجة |
| /404.html | استعادة الزائر من صفحة مفقودة | الرئيسية والعروض والدليل | لا وسيلة اتصال مباشرة؛ يقرر المالك الحاجة إليها |

## أسئلة المالك
1. ما بريد المستشفى الرسمي للحجوزات والعلاقات العامة، وهل يستمر البريد الشخصي الحالي؟
2. ما الأرقام المعتمدة لكل من الحجز والطوارئ والمختبر والتواصل، وهل اختلاف أرقام واتساب مقصود؟
3. هل تستمر الأسعار والنسب والعروض حتى تواريخها المذكورة، وما تعليمات التعامل بعدها؟
4. هل يبقى اعتماد نصوص أحدث التجهيزات والمعايير و24 ساعة وأسماء الأقسام كما هو، وهل «مركز جراحة الوجه والفكين» تسمية رسمية قائمة بذاتها؟
5. هل المطلوب حجز مؤكد أم طلب تواصل فقط؟ وما بديل الحجز عند تعطيل JavaScript؟
6. هل نعتمد رابط دليل صريحًا في كل تذييل بما في ذلك صفحات الدليل و404، وما السياسة المفضلة للروابط `.html` وبلا امتداد؟

## قائمة تحقق مرجعية
- WCAG 2.2: تباين النص 1.4.3، إعادة التدفق 1.4.10، أسماء الحقول 1.3.1 و4.1.2، لوحة المفاتيح 2.1.1، تجاوز الكتل 2.4.1، وأهداف اللمس 2.5.8 (استثناءاتها تختلف عن هدف التصميم 44px). معايير وأسماء للرجوع فقط؛ لم تُجلب الصفحات الخارجية ولم يُثبت امتثال كامل.
- Cloudflare Pages `_headers`، وGoogle إرشادات canonical وsitemap: يجب مراجعة الوثائق وسلوك النشر المباشر عندما يسمح بذلك؛ ليس هذا الاختبار شهادة مطابقة.

## الخطوة التالية
تأكيد الأولويات والقرارات ثم مهمة إصلاح مستقلة لا تغيّر المحتوى دون إذن، وإعادة اختبار لوحة المفاتيح والمرئيات والتباين على خطوط محملة وCloudflare الفعلي عند السماح. الملفات الخام والآلات: `site-audit.json` و`browser-results.json` و`static-results.json` وسكربتات الفحص في نفس المجلد.
