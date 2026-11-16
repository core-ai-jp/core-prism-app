# -*- coding: utf-8 -*-

from pathlib import Path
import json, html
root=Path(__file__).resolve().parent.parent
out=root/'public/academy'
data=json.loads((out/'studio-curriculum.json').read_text())
weeks=data['weeks']
plans=data['plans']
def esc(x):return html.escape(str(x))
planhtml=''
for p in plans:
 planhtml+=f'''<article class="plan" id="{p['id']}"><p class="label">{p['name']}</p><h3>{p['jp']}</h3><p>{p['goal']}</p><p class="price"><strong>{p['price']}</strong>万円<span>／月・税別</span></p><p class="total">月額税込 {p['price']*1.1:.0f}万円<br>3ヶ月総額 {p['price']*3}万円（税別）<br>税込 {p['price']*3*1.1:.0f}万円</p><p class="audience">{p['for']}</p><ul>{''.join('<li>'+x+'</li>' for x in p['extra'])}</ul><details><summary>このプランの到達目標を見る</summary><p>{p['outputs']}</p><p>作品数は学習上の制作目標です。受講者ご自身で制作し、研修内で講評・改善を行います。</p></details><a class="btn secondary" href="#consult" data-plan="{p['jp']}">{p['jp']}を相談する</a></article>'''
weekhtml=''
for i,w in enumerate(weeks):
 if i in [0,4,8]:weekhtml+=f'<h3 class="month">MONTH {i//4+1:02d}<span>{["設計し、生成する。","仕上げて、広告へ。","改善し、仕事にする。"][i//4]}</span></h3>'
 weekhtml+=f'''<details class="week"><summary><span class="week-no">WEEK {i+1:02d}</span><span><strong>{w[0]}</strong><small>{w[1]}</small></span><span class="expand" aria-hidden="true"></span></summary><div class="lesson"><h4>学ぶこと・実習</h4><ul>{''.join('<li>'+x+'</li>' for x in w[2])}</ul><div class="lesson-out"><p><b>制作するもの</b>{w[3]}</p><p><b>到達チェック</b>{w[4]}</p></div></div></details>'''

copy=json.loads((out/'studio-content.json').read_text())
usecases=''
for i,c in enumerate(copy['useCases']):
 usecases+=f'''<article class="use-panel" id="use-{i}" aria-labelledby="tab-{i}"><p class="label">{esc(c['eyebrow'])}</p><div class="use-grid"><div><h3>{esc(c['title'])}</h3><p>{esc(c['body'])}</p></div><div class="use-output"><span>研修で取り組む題材</span><strong>{esc(c['output'])}</strong><p>{esc(c['detail'])}</p><a class="textlink" href="#{esc(c['plan'])}">{esc(c['link'])}</a></div></div></article>'''
faq=''.join(f'<details class="faq"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in copy['faq'])
months=[]
for i,part in enumerate(weekhtml.split('<h3 class="month">')[1:]):
 heading,body=part.split('</h3>',1)
 months.append(f'<details class="month-group"><summary>{heading}</summary><div class="month-weeks">{body}</div></details>')
page=(root/'scripts/studio-academy-template.html').read_text()
for key,value in {'PLANS_SECTION':(root/'scripts/studio-academy-plans.html').read_text().replace('<!-- PLANS -->',planhtml),'CURRICULUM':''.join(months),'USECASES':usecases,'FAQ':faq}.items():
 page=page.replace('<!-- '+key+' -->',value)
(out/'studio.html').write_text(page)
print('Generated studio.html')
