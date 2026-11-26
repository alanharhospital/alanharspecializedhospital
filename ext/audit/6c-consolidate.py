#!/usr/bin/env python3
"""Combine local browser/static observations; no external requests."""
import json,re,os,collections,urllib.parse,urllib.request,urllib.error,html.parser,xml.etree.ElementTree as ET,subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[2]; A=R/'ext/audit'; ORIGIN='http://127.0.0.1:8181'
browser=json.loads((A/'6c-browser-after.json').read_text()); static=json.loads((A/'6c-static-results.json').read_text())
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect); cache={}
def local_path(p):
 p=urllib.parse.unquote(p).lstrip('/'); target=R/p
 for f in [target,Path(str(target)+'.html'),target/'index.html']:
  if f.is_file():return f
 return None
class IdParser(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.ids=set()
 def handle_starttag(self,t,a):
  d=dict(a)
  if d.get('id'):self.ids.add(d['id'])
  if t=='a' and d.get('name'):self.ids.add(d['name'])
ids={}
def id_list(file):
 if file not in ids:
  p=IdParser();p.feed(file.read_text(encoding='utf8',errors='replace'));ids[file]=p.ids
 return ids[file]
def local_request(path,query):
 key=path+('?' + query if query else '')
 if key not in cache:
  try:
   with opener.open(ORIGIN+key,timeout=8) as r:cache[key]={'status':r.status,'location':r.headers.get('Location')}
  except urllib.error.HTTPError as e:cache[key]={'status':e.code,'location':e.headers.get('Location')}
  except Exception as e:cache[key]={'error':str(e)}
 return cache[key].copy()
def validate(link):
 raw=link['href'];u=urllib.parse.urlsplit(link['resolved']);result={'href':raw,'resolved':link['resolved'],'text':link['text'],'footer':link['footer']}
 if u.scheme=='tel':
  phone=urllib.parse.unquote(u.path);digits=re.sub(r'[^0-9]','',phone);result.update(kind='tel',valid=bool(re.fullmatch(r'\+?[0-9 ()-]+',phone)) and 7<=len(digits)<=15,limitation='صلاحية شكلية فقط')
 elif u.scheme=='mailto':
  address=urllib.parse.unquote(u.path);result.update(kind='mailto',valid=bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',address)),limitation='صلاحية شكلية فقط')
 elif u.hostname in ('wa.me','www.wa.me'):
  num=u.path.strip('/');result.update(kind='whatsapp',valid=not num or bool(re.fullmatch(r'[1-9][0-9]{7,14}',num)),limitation='صلاحية شكلية فقط، لم يجر الاتصال')
 elif u.scheme in ('http','https') and u.hostname in ('127.0.0.1','localhost','alanharhospital.com','www.alanharhospital.com'):
  response=local_request(u.path or '/',u.query);result.update(kind='internal',**response);f=local_path(u.path or '/')
  if u.fragment:
   fragment=urllib.parse.unquote(u.fragment)
   result['fragment']=fragment
   if f and f.suffix.lower() in ('.html','.htm'):
    result['fragmentValid']=fragment in id_list(f) or fragment=='top'
   else:result['fragmentValid']=None
  result['valid']=not response.get('error') and 200<=response.get('status',0)<400 and result.get('fragmentValid',True) is not False
 else:result.update(kind='external_or_other',valid=None,limitation='لم يُطلب أو يُفحص')
 return result
sitemap=ET.parse(R/'sitemap.xml'); locs=[e.text for e in sitemap.iter() if e.tag.endswith('}loc')]
def targetfile(route):return 'index.html' if route=='/' else ('services/index.html' if route=='/services/' else route.strip('/')+(('.html' if not route.endswith('.html') else '')))
imgdim={}
def dimensions(u):
 try:
  p=urllib.parse.urlsplit(u).path; f=local_path(p)
  if not f:return None
  if str(f) not in imgdim:
   z=subprocess.run(['identify','-ping','-format','%w %h',str(f)],capture_output=True,text=True,timeout=5)
   v=z.stdout.strip().split();imgdim[str(f)]=[int(v[0]),int(v[1])] if z.returncode==0 and len(v)>=2 else None
  return imgdim[str(f)]
 except Exception:return None
issues=[];pairs={}; pages={}
def issue(route,priority,category,evidence,visibleTextChange='غير محدد'):
 issues.append({'page':route,'priority':priority,'category':category,'evidence':evidence,'visibleTextChange':visibleTextChange})
for route,p in browser['pages'].items():
 v=p['viewports']['375']; f=targetfile(route);views=p['viewports'];
 if 'auditError' in v:issue(route,'P0','تعذر الفحص',v['auditError']);continue
 links=[validate(l) for l in v['links']];broken=[l for l in links if l['kind']=='internal' and not l['valid']];badcontacts=[l for l in links if l['kind'] in ('tel','mailto','whatsapp') and not l['valid']]
 redirects=[l for l in links if 300<=l.get('status',0)<400]
 img=[]
 for i in v['images']:
  d=i.copy();d['sourceFilePixels']=dimensions(urllib.parse.urljoin(ORIGIN+route,i['src'])) if i['src'] else None;d['selectedFilePixels']=dimensions(i['currentSrc']) if i['currentSrc'] and i['currentSrc'].startswith(ORIGIN) else None;img.append(d)
 missing=[i for i in img if i['src'] and urllib.parse.urlsplit(urllib.parse.urljoin(ORIGIN+route,i['src'])).hostname=='127.0.0.1' and not local_path(urllib.parse.urlsplit(urllib.parse.urljoin(ORIGIN+route,i['src'])).path)]
 noalt=[i for i in img if i['alt'] is None]
 failcolors=[x for x in v['contrastPairs'] if x['ratio']<x['minimum']]
 for vw,w in views.items():
  for c in w.get('contrastPairs',[]):
   key=(c['foreground'],c['background'],c['minimum']);x=pairs.setdefault(key,{'foreground':key[0],'background':key[1],'minimum':key[2],'ratio':c['ratio'],'instances':0,'pages':[],'examples':[]});x['instances']+=c['count'];
   if route not in x['pages']:x['pages'].append(route)
   for example in c['examples']:
    if example not in x['examples'] and len(x['examples'])<4:x['examples'].append(example)
 if broken:issue(route,'P1','روابط أو مراسٍ داخلية مكسورة',{'count':len(broken),'examples':broken[:5]},'لا')
 if badcontacts:issue(route,'P1','صيغة روابط الاتصال',{'count':len(badcontacts),'examples':badcontacts[:5]},'لا')
 if missing:issue(route,'P0','صور مصادرها مفقودة',missing,'لا')
 if noalt:issue(route,'P1','صور بلا alt',noalt,'نعم')
 if v['duplicateIds']:issue(route,'P1','معرّفات مكررة',v['duplicateIds'],'لا')
 if v['allH1']!=1:issue(route,'P1','عدد H1 غير واحد',v['allH1'],'غير محدد')
 seq=v['headings']; jumps=[{'before':a,'after':b} for a,b in zip(seq,seq[1:]) if b['level']>a['level']+1]
 if jumps:issue(route,'P1','تجاوز تسلسل العناوين',jumps[:8],'لا')
 if route!='/404.html' and not v['canonical']:issue(route,'P1','canonical مفقود',None,'لا')
 if route!='/404.html' and not v['ogUrl']:issue(route,'P1','og:url مفقود',None,'لا')
 if v['canonical'] and v['ogUrl'] and v['canonical']!=v['ogUrl']:issue(route,'P1','canonical وog:url مختلفان',{'canonical':v['canonical'],'ogUrl':v['ogUrl']},'لا')
 if route!='/404.html' and v['canonical'] and v['canonical'] not in locs:issue(route,'P1','canonical غير مدرج في sitemap',v['canonical'],'لا')
 if any(not j['valid'] for j in v['jsonld']):issue(route,'P1','JSON-LD غير صالح',v['jsonld'],'لا')
 if not v['title'] or not v['description'] or v['lang']!='ar' or v['dir']!='rtl':issue(route,'P1','بيانات وصفية أو لغة أو اتجاه ناقص',{'title':v['title'],'description':v['description'],'lang':v['lang'],'dir':v['dir']},'لا')
 if not v['skipLink']:issue(route,'P1','لا يوجد رابط تخطي للمحتوى',None,'نعم')
 if v['smallTargets']:issue(route,'P1','أهداف لمس أصغر من 44px',{'count':len(v['smallTargets']),'examples':v['smallTargets'][:5]},'لا')
 if failcolors:issue(route,'P1','تباين نصوص أقل من WCAG AA',{'countPairs':len(failcolors),'examples':failcolors[:8]},'لا')
 if v['unlabelledFields'] or v['unnamedButtons']:issue(route,'P1','حقول أو أزرار بلا اسم',{'fields':v['unlabelledFields'],'buttons':v['unnamedButtons']},'لا')
 if v['scrollWidth']>v['viewportWidth']:issue(route,'P1','تجاوز أفقي',{'scroll':v['scrollWidth'],'viewport':v['viewportWidth']},'لا')
 if p['noJs'].get('hiddenReveals',0):issue(route,'P0','محتوى مخفي بلا JavaScript',{'hidden':p['noJs']['hiddenReveals'],'total':p['noJs']['reveals']},'لا')
 if v['failed'] or v['errors']:issue(route,'P0','أخطاء محلية أو طلبات فاشلة',{'failed':v['failed'],'console':v['errors']},'لا')
 if not v['guideFooter']:issue(route,'P2','لا رابط مباشر للدليل في التذييل',None,'نعم')
 # تحقق ثابت للقواعد الجديدة فقط؛ لا يثبت تطبيقها فعليًا على Cloudflare.
 headers=(R/'_headers').read_text(encoding='utf8')
 guide_cache_rule=re.search(r'(?m)^/services/\*\s*\n\s*! Cache-Control\s*\n\s*Cache-Control:\s*public, max-age=0, must-revalidate',headers)
 if route.startswith('/services/') and not guide_cache_rule:issue(route,'P2','كاش HTML بلا قاعدة صريحة للمسار دون امتداد',{'rule':'/*.html','route':route,'limitation':'يستلزم التأكد من الرؤوس الفعلية وCloudflare'},'لا')
 if v['smallText']:issue(route,'P2','نص أصغر من 14px',{'count':len(v['smallText']),'examples':v['smallText'][:4]},'لا')
 obstructed=[{'width':vw,'items':w['obstructions'][:6]} for vw,w in views.items() if w.get('obstructions')]
 if obstructed:issue(route,'P2','احتمال تراكب عند نقطة اللمس',obstructed,'لا')
 if v['clipped']:issue(route,'P2','احتمال قص داخل حاوية',{'count':len(v['clipped']),'examples':v['clipped'][:5]},'لا')
 first=v['firstLoadResources'];weight=sum(x.get('bytes',0) for x in first)
 if weight>500000:issue(route,'P2','وزن محلي أولي مرتفع',{'bytes':weight},'لا')
 if p['noJs'].get('searchFields') and not p['noJs'].get('noscript'):issue(route,'P2','حقل البحث لا يعمل بلا JavaScript دون شرح noscript',None,'نعم')
 counts=collections.Counter(x['priority'] for x in issues if x['page']==route)
 pages[route]={'source':f,'issues':dict(counts),'linkAudit':links,'brokenLinks':broken,'redirectedLinks':redirects,'invalidContactLinks':badcontacts,'imageAudit375':img,'missingImages':missing,'imagesWithoutAlt':noalt,'metadata':{k:v[k] for k in ['title','description','canonical','ogUrl','ogTitle','ogDescription','lang','dir','jsonld','allH1','headings','duplicateIds']},'headingJumps':jumps,'hiddenWordsSrOnlySeo':static['files'][f]['hiddenWordsSrOnlySeo'],'tagClosureHeuristic':static['files'][f]['tagClosureHeuristic'],'hasGuideFooter':v['guideFooter'],'hasGuideAnywhere':v['guideAny'],'searchFieldsVisible':v['searchFields'],'noJS':p['noJs'],'header':v['header'],'footer':v['footer'],'styles':v['styles'],'scripts':v['scripts'],'performance375':{'firstLocalBytes':weight,'largestFive':sorted(first,key=lambda x:x.get('bytes',0),reverse=True)[:5],'firstLcp':v['firstLcp'][-1] if v['firstLcp'] else None,'limitations':'لقطة أولية بعد DOMContentLoaded و500ms: أحجام أجسام الموارد المحلية المرصودة دون احتساب ضغط النقل، وقد لا تشمل طلبات متأخرة أو خطوطًا خارجية. LCP مختبري أولي لا يمثل المستخدمين.'},'viewports':views}
allcolors=sorted(pairs.values(),key=lambda x:(x['ratio'],x['foreground'],x['background']))
responses=json.loads((R/'ext/data/search-responses.json').read_text());claims=[{'key':k,'text':v['text'],'claimsApproved':v.get('claimsApproved')} for k,v in responses['groups'].items() if re.search('أحدث|مدار الساعة|جودة|سلامة',v.get('text',''))]
result={'task':'6-ج بعد التنسيق','date':'2026-11-26','scope':'18 صفحة، 375/768/1280px؛ تدقيق محلي بعد الإصلاح','limitations':['تم حظر الطلبات الخارجية، ولم تفحص صحة الخدمات أو الخطوط أو الخرائط الخارجية.','الأداء مختبري محلي دون محاكاة شبكة الهاتف أو Lighthouse، وحجم الصفحة مجموع أحجام الملفات المحلية المرصودة.','التباين تقديري ويجمع الألوان حسب CSS؛ الخلفيات بالصور والتدرجات أو الشفافية وحالات hover وfocus تحتاج فحصًا يدويًا، وقد تختلف رسوم الرموز التعبيرية عن لون CSS المحسوب.','التداخل عند مراكز العناصر بالمنطقة المرئية فقط؛ القص مرشح آلي وليس إثباتًا.','فحص إغلاق الوسوم استرشادي وليس محلل HTML مطابقًا للمواصفة.','الروابط الديناميكية التي تنشأ بعد عمليات البحث أو تفاعل المستخدم ليست جميعها معدودة.','التحقق من tel/mailto/wa.me شكلي فقط دون الاتصال أو إثبات ملكية الرقم.','خادم المعاينة يحاكي الروابط بلا امتداد ولا يثبت سلوك Cloudflare الفعلي أو إعادة التوجيه أو الرؤوس.'], 'gate':{'testAll':'نجاح 70/70 واختبارات المتصفح','gitStatus':'تغييرات 6-ب قيد الإنجاز','gitLog':['cd2b8f5']},'browser':browser['browser'],'pages':pages,'issues':issues,'contrastPairs':allcolors,'failedContrastPairs':[x for x in allcolors if x['ratio']<x['minimum']],'contacts':static['contacts'],'gmailOccurrences':static['gmail'],'offerPercentDateLines':static['offers_expiring'],'sitemap':locs,'claimsForOwner':claims,'centerMention':'النص الحرفي موجود في رد البحث dental، وليس في HTML الصفحات التسع أو الدليل؛ يجب التحقق من التسمية.','headersFindings':['قاعدة /services/* الجديدة تقصد تغطية المسارات بلا امتداد؛ يلزم اختبار رؤوس Cloudflare الفعلية.','قواعد الصور بالامتداد؛ يغطي النمط كتابةً الصور المنتهية بذلك الامتداد لكن تفاصيل مطابقة النجمة للمسارات المتداخلة وتطبيقها تتطلب فحص Cloudflare.','قاعدة /ext/* الجديدة تحدد كاشًا قصيرًا؛ يلزم اختبار رؤوس Cloudflare الفعلية.']}
(A/'6c-site-after.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('pages',len(pages),'issues',dict(collections.Counter(x['priority'] for x in issues)),'checked local URLs',len(cache),'failed color pairs',len(result['failedContrastPairs']))
