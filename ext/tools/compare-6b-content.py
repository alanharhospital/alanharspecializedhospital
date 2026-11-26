#!/usr/bin/env python3
"""Compare a 6-b pre-change directory with the working tree; fail on lost words, links, images, or service IDs/names."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import json, re, sys
R=Path(__file__).resolve().parents[2]
if len(sys.argv)!=2:raise SystemExit('Usage: python3 ext/tools/compare-6b-content.py BACKUP_PATH')
B=Path(sys.argv[1]).resolve();files=['index.html','doctors.html','offers.html','clinics.html','units.html','ancillary.html','pr.html','news.html','404.html']+['services/index.html']+[f'services/{x}.html' for x in ['diagnostics','surgery','dental','women','ent','physio','emergency','clinics-admin']]
class P(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.ex=[];self.text=[];self.links=[];self.images=[];self.service=None;self.services={};self.ignored=0
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t in ('script','style','noscript'):self.ex.append(t)
  if t=='a' and 'href' in a:self.links.append(a['href'])
  if t=='img':self.images.append(a.get('src',''))
  if t=='li' and a.get('id','').startswith('svc-'):self.service=a['id'];self.services[self.service]=''
  if self.service and t in ('button','span'):self.ignored+=1
 def handle_endtag(self,t):
  if t in self.ex:self.ex.remove(t)
  if self.service and t in ('button','span'):self.ignored-=1
  if t=='li':self.service=None;self.ignored=0
 def handle_data(self,s):
  if not self.ex:self.text.append(s)
  if self.service and not self.ignored:self.services[self.service]+=s
 def finish(self):self.services={k:' '.join(v.split()) for k,v in self.services.items()}
def parse(p):
 s=p.read_text(encoding='utf8');parser=P();parser.feed(s);parser.finish();words=Counter(re.findall(r'[\w\u0600-\u06ff]+',' '.join(parser.text)));return parser,words,len(s.splitlines())
report={};failed=False
for f in files:
 a,aw,al=parse(B/f);b,bw,bl=parse(R/f);missing={'words':list((aw-bw).elements()),'links':list((Counter(a.links)-Counter(b.links)).elements()),'images':list((Counter(a.images)-Counter(b.images)).elements()),'services':{k:v for k,v in a.services.items() if b.services.get(k)!=v}}
 failed|=any(missing.values());report[f]={'before':{'words':sum(aw.values()),'lines':al,'links':len(a.links),'images':len(a.images),'services':len(a.services)},'after':{'words':sum(bw.values()),'lines':bl,'links':len(b.links),'images':len(b.images),'services':len(b.services)},'missing':missing}
 print(f,report[f]['before'],'=>',report[f]['after'],'missing',sum(map(len,missing.values())))
(R/'ext/audit/6b-content-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
raise SystemExit(1 if failed else 0)
