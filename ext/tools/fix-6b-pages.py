#!/usr/bin/env python3
"""Targeted 6-b edits preserving source line endings; no changes to hidden SEO content."""
from pathlib import Path
import json,re,urllib.parse
R=Path(__file__).resolve().parents[2];files=['index.html','doctors.html','offers.html','clinics.html','units.html','ancillary.html','pr.html','news.html','404.html'];contact=json.loads((R/'ext/data/contact.json').read_text());num=contact['whatsappNumber'];assert re.fullmatch(r'[1-9]\d{7,14}',num)
def once(s,old,new):
 if s.count(old)!=1:raise ValueError(f'expected one occurrence: {old[:70]!r} count {s.count(old)}')
 return s.replace(old,new,1)
for fn in files:
 p=R/fn;raw=p.read_bytes();s=raw.decode('utf8');nl='\r\n' if b'\r\n' in raw else '\n'
 if 'ENH:START fixes-6b-skip' in s:raise ValueError('already applied '+fn)
 css=nl.join(['<!-- ENH:START fixes-6b -->','<link rel="stylesheet" href="ext/fixes.css?v=1">','<!-- ENH:END fixes-6b -->'])+nl
 if fn=='index.html':css+=nl.join(['<!-- ENH:START fixes-6b-nojs -->','<noscript><style>.reveal{opacity:1!important;transform:none!important}#btnSendWhatsApp,#btnSendEmail{display:none!important}</style></noscript>','<!-- ENH:END fixes-6b-nojs -->'])+nl
 s=once(s,'</head>',css+'</head>')
 m=re.search(r'<body(?:\s[^>]*)?>',s,re.I);assert m
 skip=nl+nl.join(['<!-- ENH:START fixes-6b-skip -->','<a class="enh-skip-link" href="#enh-main">تخطي إلى المحتوى</a>','<!-- ENH:END fixes-6b-skip -->'])
 s=s[:m.end()]+skip+s[m.end():]
 if fn!='404.html':
  m=re.search(r'<main(?:\s[^>]*)?>',s,re.I);assert m and not re.search(r'\bid=',m.group())
  new=m.group()[:-1]+' id="enh-main" tabindex="-1">';s=s[:m.start()]+new+s[m.end():]
 else:
  m=re.search(r'(<div>)(\s*<h1>404</h1>)',s);assert m;s=s[:m.start()]+m.group(1).replace('<div>','<div id="enh-main" tabindex="-1">')+m.group(2)+s[m.end():]
  start='        <!-- ENH:START services-guide-link -->';end='        <!-- ENH:END services-guide-link -->';s=once(s,start,'<!-- ENH:START fixes-6b-footer -->'+nl+'<footer>'+nl+start);s=once(s,end,end+nl+'</footer>'+nl+'<!-- ENH:END fixes-6b-footer -->')
 if fn in ['clinics.html','units.html','ancillary.html','news.html']:
  stem=fn[:-5];meta=f'<!-- ENH:START fixes-6b-canonical -->{nl}<link rel="canonical" href="https://alanharhospital.com/{stem}.html">{nl}<meta property="og:url" content="https://alanharhospital.com/{stem}.html">{nl}<!-- ENH:END fixes-6b-canonical -->{nl}'
  s=once(s,'</head>',meta+'</head>')
 if fn=='index.html':
  msg=urllib.parse.quote('السلام عليكم، أود حجز موعد.',safe='')
  addition=nl.join(['<!-- ENH:START fixes-6b-booking-nojs -->','<noscript>','<p>للحجز دون جافاسكربت تواصل عبر واتساب؛ لا تُرسل بيانات النموذج تلقائيًا.</p>',f'<a class="enh-nojs-booking" href="https://wa.me/{num}?text={msg}" target="_blank" rel="noopener noreferrer">تواصل عبر واتساب للحجز</a>','</noscript>','<!-- ENH:END fixes-6b-booking-nojs -->'])
  s=once(s,'                        </form>','                        </form>'+nl+'                        '+addition.replace(nl,nl+'                        '))
  a=s.index('<section class="contact section-padding"');b=s.index('</section>',a);part=s[a:b];assert part.count('<h4>')==4 and part.count('</h4>')==4;part=part.replace('<h4>','<h3 class="enh-old-h4">').replace('</h4>','</h3>');s=s[:a]+part+s[b:]
 if fn=='clinics.html':
  a=s.index('<main ');b=s.index('</main>',a);part=s[a:b];assert part.count('<h3>')==8 and part.count('</h3>')==8;part=part.replace('<h3>','<h2 class="enh-old-h3">').replace('</h3>','</h2>');s=s[:a]+part+s[b:]
 if fn=='units.html':
  a=s.index('<main ');b=s.index('</main>',a);part=s[a:b];assert part.count('<h3 style=')==1 and part.count('</h3>')==1;part=part.replace('<h3 style=','<h2 class="enh-old-h3" style=',1).replace('</h3>','</h2>',1);assert part.count('<h4>')==24 and part.count('</h4>')==24;part=part.replace('<h4>','<h3 class="enh-old-h4">').replace('</h4>','</h3>');s=s[:a]+part+s[b:]
 p.write_bytes(s.encode('utf8'));print(fn,'updated')
