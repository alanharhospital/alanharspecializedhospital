#!/usr/bin/env python3
"""Read-only static analysis. Local server only; no external network requests."""
import os,re,json,collections,urllib.parse,urllib.request,urllib.error,html.parser,xml.etree.ElementTree as ET
from pathlib import Path
R=Path(__file__).resolve().parents[2]; A=R/'ext/audit'; O='http://127.0.0.1:8181'
files=['index.html','doctors.html','offers.html','clinics.html','units.html','ancillary.html','pr.html','news.html','404.html']+['services/index.html']+[f'services/{x}.html' for x in ['diagnostics','surgery','dental','women','ent','physio','emergency','clinics-admin']]
class Parser(html.parser.HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.stack=[];self.ids=set();self.hidden_depth=0;self.hidden_words=0;self.issues=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.add(a['id'])
  if tag=='a' and a.get('name'):self.ids.add(a['name'])
  if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
   self.stack.append((tag,self.getpos()[0],bool(re.search(r'(^|\s)sr-only-seo(\s|$)',a.get('class','')))))
 def handle_startendtag(self,tag,attrs):pass
 def handle_endtag(self,tag):
  pos=next((i for i in range(len(self.stack)-1,-1,-1) if self.stack[i][0]==tag),None)
  if pos is None:
   if tag not in {'p','li','option','br'}:self.issues.append({'line':self.getpos()[0],'kind':'end_without_start','tag':tag})
   return
  implicit=self.stack[pos+1:]
  for t,line,_ in implicit:
   if t not in {'p','li','option','dt','dd','tr','td','th','thead','tbody','tfoot'}:self.issues.append({'line':line,'kind':'implicitly_closed','tag':t,'before':tag})
  del self.stack[pos:]
 def handle_data(self,data):
  if any(h for _,_,h in self.stack) and not any(t in ('script','style') for t,_,_ in self.stack):self.hidden_words+=len(re.findall(r'[\w\u0600-\u06ff]+',data))
 def finish(self):
  for t,line,_ in self.stack:
   if t not in {'p','li','option','dt','dd','tr','td','th','thead','tbody','tfoot'}:self.issues.append({'line':line,'kind':'unclosed_at_eof','tag':t})
parsers={}; result={'method':'HTMLParser stack heuristic; optional HTML closing tags excluded; not a standards validator. Only localhost is requested.','files':{},'contacts':{},'gmail':[],'offers_expiring':[]}
for f in files:
 p=Parser();p.feed((R/f).read_text(encoding='utf8'));p.close();p.finish();parsers[f]=p
 result['files'][f]={'hiddenWordsSrOnlySeo':p.hidden_words,'tagClosureHeuristic':p.issues}
# Phone occurrences in actual pages plus associated first-party application/config source, including structured markup; exclude generated copies and dependencies.
other=['script.js','ext/clinical-enhancements.js','ext/services-search.js','ext/data/contact.json','ext/data/search-responses.json']
for f in files+other:
 if not (R/f).exists():continue
 for n,line in enumerate((R/f).read_text(encoding='utf8').splitlines(),1):
  line_ascii=line.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'))
  for m in re.finditer(r'(?<!\d)(?:(?:\+?967)[\s-]*)?(?:0?3[\s-]?\d{6}|7\d{8})(?!\d)',line_ascii):
   raw=m.group(); normalized=re.sub(r'[^0-9]','',raw)
   result['contacts'].setdefault(normalized,[]).append({'file':f,'line':n,'context':line.strip()[:230]})
  for m in re.finditer(r'[A-Z0-9._%+-]+@gmail\.com',line,re.I):result['gmail'].append({'address':m.group(),'file':f,'line':n,'context':line.strip()[:230]})
  if f=='offers.html' and re.search(r'(?:\d+\s*[%٪]|\b20\d{2}[-/]\d{1,2}|\b20\d{2}\b)',line):result['offers_expiring'].append({'file':f,'line':n,'context':line.strip()[:260]})
# CSS inventory is literal occurrences in style.css, excluding comments, not computed styles.
css=(R/'style.css').read_text(encoding='utf8');css=re.sub(r'/\*[\s\S]*?\*/','',css)
def counts(pattern):return dict(collections.Counter(x.strip().lower() for x in re.findall(pattern,css,re.I)).most_common())
rootblock=re.search(r':root\s*\{([^}]+)\}',css); variables=dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);',rootblock.group(1)))
brand={'source':'style.css literal declarations and local images; computed browser colors in site-audit.json','rootVariables':variables,'hexColorOccurrences':counts(r'#[0-9a-f]{3,8}\b'),'rgbColorOccurrences':counts(r'rgba?\([^)]*\)'),'fontFamilyDeclarations':counts(r'font-family\s*:\s*([^;}]+)'),'fontSizes':counts(r'font-size\s*:\s*([^;}]+)'),'spacing':counts(r'(?:margin|padding|gap)\s*:\s*([^;}]+)'),'shadows':counts(r'box-shadow\s*:\s*([^;}]+)'),'radii':counts(r'border-radius\s*:\s*([^;}]+)'),'buttons':sorted(set(re.findall(r'(?m)^\s*([^{}\n]*(?:\.btn|button)[^{}\n]*)\s*\{',css))),'cards':sorted(set(re.findall(r'(?m)^\s*([^{}\n]*\.card[^{}\n]*)\s*\{',css))),'logo':'شعار دائري عربي وإنجليزي، أزرق وأحمر وأخضر، يتضمن شكل أسرة ويدًا ونبضًا طبيًا على أرضية بيضاء.','hero':'صورة فوتوغرافية لواجهة المستشفى؛ خلفية الرئيسية تعتمد صورة أصلية مع بدائل WebP وتدرج لوني فوقها.','caveat':'الألوان المحسوبة وفحوص التباين عيّنات المتصفح المحلي، ولا تشمل الألوان على الصور والتدرجات غير القابلة للحساب.'}
(R/'ext/data/brand-profile.json').write_text(json.dumps(brand,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(A/'static-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('static files',len(files),'phones',len(result['contacts']),'gmail',len(result['gmail']),'offers date/percent lines',len(result['offers_expiring']))
