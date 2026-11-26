#!/usr/bin/env python3
"""Archive every tracked sr-only-seo section literally; report exact-name coverage."""
import collections, hashlib, html, html.parser, json, re, subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[2]; OUT=R/'ext/data'; AUD=R/'ext/audit'
class Reader(html.parser.HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.capture=None;self.depth=0;self.buf=[];self.entries=[];self.text=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'):self.depth+=1
  if tag=='li':self.capture='li';self.buf=[]
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.depth-=1
  if tag=='li' and self.capture=='li':self.entries.append(' '.join(''.join(self.buf).split()));self.capture=None
 def handle_data(self,data):
  if not self.depth:self.text.append(data)
  if self.capture:self.buf.append(data)
def split_items(text):
 out=[];cur='';depth=0
 for ch in text:
  if ch in '([':depth+=1
  elif ch in ')]':depth=max(0,depth-1)
  if ch in '،؛' and not depth:out.append(cur);cur=''
  else:cur+=ch
 out.append(cur)
 return [v for x in out if len(v:=' '.join(x.split()).strip('.،؛').strip())>=3]
files=subprocess.check_output(['git','ls-files','-z','--','*.html'],cwd=R).decode().split('\0');entries=[];blocks=[]
for fn in files:
 if not fn or fn.startswith(('ext/','_backup/')):continue
 raw=(R/fn).read_bytes()
 for number,m in enumerate(re.finditer(rb'<section\b(?=[^>]*\bclass\s*=\s*["\'][^"\']*\bsr-only-seo\b)[^>]*>[\s\S]*?</section\s*>',raw,re.I),1):
  block=m.group();p=Reader();p.feed(block.decode('utf8'));words=len(re.findall(r'[\w\u0600-\u06ff]+',' '.join(p.text)));blocks.append({'page':fn,'block':number,'words':words,'sha256':hashlib.sha256(block).hexdigest(),'bytes':block})
  for i,text in enumerate(p.entries):
   colon=text.find(':')
   pieces=([text[:colon].strip()]+split_items(text[colon+1:])) if 0<colon<90 and 8<=i<=13 else split_items(text)
   entries.extend({'page':fn,'block':number,'li':i,'name':piece} for piece in pieces if len(piece)>=3)
header='<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>أرشيف النص المخفي — نسخة حرفية</title></head><body>\n<h1>أرشيف كتل sr-only-seo كما هي</h1>\n<p>الأصل في ملفات الموقع لم يُمس. الكتل التالية نسخ حرفية؛ أرقام الكلمات وفق تجزئة Unicode المذكورة في تقرير التغطية.</p>\n'.encode()
out=bytearray(header)
for b in blocks:
 out.extend(f"<article><h2>{html.escape(b['page'])} — الكتلة {b['block']} — {b['words']} كلمة</h2>\n".encode());out.extend(b['bytes']);out.extend(b'\n</article>\n')
out.extend(b'</body></html>\n');(OUT/'hidden-text-archive.html').write_bytes(out)
cat=json.loads((OUT/'services-catalog.json').read_text());decisions=json.loads((OUT/'catalog-decisions.json').read_text()); reason_by_id={x['id']:x.get('reason') for x in decisions['decisions']};byname=collections.defaultdict(list)
for item in cat['items']:byname[' '.join(item['name'].split())].append(item)
for e in entries:
 matches=byname.get(e['name'],[]);e['matches']=[{'id':x['id'],'status':'searchOnly' if x.get('searchOnly') and x.get('publish') else 'منشور' if x.get('publish') else 'مستبعد' if x.get('excluded') else 'غير منشور','reason':reason_by_id.get(x['id']) or ({'category-rule':'الفئة الإدارية مستبعدة بقرار التصنيف','rule':'مطابقة قاعدة استبعاد الرسوم أو بدل المخاطر','owner':'استبعاد بقرار المالك'}.get(x.get('excludedBy'))) or ('للمراجعة لعدم وضوح التصنيف' if x.get('status')=='review' else x.get('status')) or 'لم يحدد سبب','excludedBy':x.get('excludedBy')} for x in matches]
 e['coverage']='غير موجود' if not matches else 'موجود'
by_page={}
for b in blocks:
 subset=[e for e in entries if e['page']==b['page'] and e['block']==b['block']]; by_page[b['page']]={'block':b['block'],'words':b['words'],'rawNameOccurrences':len(subset),'uniqueExactNames':len(set(e['name'] for e in subset)),'presentOccurrences':sum(e['coverage']=='موجود' for e in subset),'missingOccurrences':sum(e['coverage']=='غير موجود' for e in subset),'sha256':b['sha256']}
unique={e['name']:e for e in entries};counts=collections.Counter('غير موجود' if not e['matches'] else e['matches'][0]['status'] for e in unique.values())
result={'definition':'فصل بنود li عند الفاصلة العربية أو الفاصلة المنقوطة خارج الأقواس؛ عناوين ما قبل النقطتين في عناصر 8–13 تدرج كبنود كما يفعل مولد الكتالوج. مقارنة الاسم كاملا حرفيًا بعد توحيد الفراغات فقط. العناوين العامة والمقدمات خارج li ليست خدمات، وتقسيم الأسماء المركبة يتطلب مراجعة بشرية. النسخ preview ليست صفحات الإنتاج وتظهر منفصلة.','blocks':by_page,'uniqueAllBlocks':len(unique),'statusesUnique':dict(counts),'entries':entries}
(AUD/'5a9-hidden-coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['# تغطية أسماء كتل sr-only-seo','',result['definition'],'','| صفحة | كلمات | أسماء مستخرجة بالتكرار | أسماء فريدة | موجود بالتكرار | غير موجود بالتكرار |','|---|---:|---:|---:|---:|---:|']
for page,b in by_page.items():lines.append(f"| `{page}` | {b['words']} | {b['rawNameOccurrences']} | {b['uniqueExactNames']} | {b['presentOccurrences']} | {b['missingOccurrences']} |")
lines+=['',f"**الإجمالي الفريد عبر جميع الكتل:** {len(unique)}. التوزيع: "+'، '.join(f'{k} {v}' for k,v in counts.items())+'.','', '## القائمة الكاملة غير الموجودة حرفيًا','']
missing=[e for e in unique.values() if not e['matches']]
if not missing:lines.append('لا يوجد.')
for e in missing:lines.append(f"- {e['name']} — `{e['page']}`، البند {e['li']+1}.")
lines+=['','## الأسماء الموجودة وتصنيفها','']
for e in unique.values():
 if e['matches']:lines.append(f"- {e['name']} — "+'؛ '.join(f"{x['id']} {x['status']} ({x['reason']})" for x in e['matches']))
(AUD/'5a9-hidden-coverage.md').write_text('\n'.join(lines)+'\n')
print('blocks',len(blocks),'unique',len(unique),'statuses',dict(counts));print('page counts',by_page)
# Byte-for-byte proof: the copied raw block must appear once per archived source.
archive=(OUT/'hidden-text-archive.html').read_bytes()
for b in blocks:
 assert archive.count(b['bytes']) >= sum(other['bytes']==b['bytes'] for other in blocks)
