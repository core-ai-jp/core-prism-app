import data from '../src/corporate/robotsContent.json' with { type: 'json' };
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const p = s => `<p>${esc(s)}</p>`;
const section = (item, body) => `<section id="${item.id}"><h2>${esc(item.title)}</h2>${item.lead ? p(item.lead) : ''}${body}</section>`;
export const robotsRoutePage = {
  file:'corp-robots.html',theme:'corp',url:`https://www.core-ai.jp${data.seo.path}`,
  title:data.seo.title,description:data.seo.description,keywords:'CORE Robots,ロボティクス,共同実証,ヒューマノイド,研究開発',
  og:`https://www.core-ai.jp${data.seo.og}`,updatedAt:data.updatedAt,
  ld:[{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'CORE',item:'https://www.core-ai.jp/corp'},{'@type':'ListItem',position:2,name:data.name,item:`https://www.core-ai.jp${data.seo.path}`}]}],
  body:`<p class="k">${data.hero.kicker}</p><h1>${data.hero.title.map(esc).join('')}</h1>${p(data.stage)}${p(data.hero.lead)}
    <figure><img src="/corp/robots/humanoid-concept-v5.png" width="1100" height="1209" alt="ヒューマノイドの静止構想図。白い躯体の顔の輪郭と関節が光る外観構想。" style="width:100%;height:auto" /><figcaption>${data.scene.label} — ${esc(data.scene.caption)} ${esc(data.scene.disclaimer)}</figcaption></figure>
    <ol>${data.scene.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><a href="#robots-contact">${data.hero.primary}</a>
    <section id="robots-platform"><h2>${esc(data.platform.title)}</h2>${p(data.platform.lead)}${data.platform.items.map(x=>`<h3>${esc(x.name)}</h3>${p(x.body)}${p(x.status)}`).join('')}</section>
    ${section(data.field,data.field.examples.map(x=>`<h3>${esc(x.title)}</h3>${p(x.body)}`).join('')+p(data.field.note))}
    ${section(data.sim,data.sim.phases.map(x=>`<h3>${esc(x.name)}</h3>${p(x.status)}${p(x.body)}`).join(''))}
    ${section(data.areas,p(data.areas.note)+data.areas.items.map(x=>`<h3>${x.code} — ${esc(x.title)}</h3>${p(x.body)}${p(x.question)}`).join(''))}
    ${section(data.sorter,p(data.sorter.status)+data.sorter.checks.map(x=>`<h3>${esc(x.title)}</h3>${p(x.body)}`).join('')+p(data.sorter.note))}
    ${section(data.roai,p(data.roai.status)+data.roai.items.map(x=>`<h3>${esc(x.label)}：${esc(x.value)}</h3>${p(x.body)}`).join('')+p(data.roai.note)+'<a href="/return-on-ai">'+data.roai.link+'</a>')}
    ${section(data.contact,data.contact.intents.map(x=>`<h3>${esc(x.audience)}</h3>${p(x.body)}<p><a href="/corp#contact">${esc(x.label)}</a></p>`).join('')+p(data.contact.note))}
    ${p(`出典：${data.source.title} v${data.source.version}（${data.source.date}・${data.source.status}）`)}${p(data.source.note)}${p(`更新日：${data.updatedAt}`)}`,
  footer:'<a href="/corp">CORE ホーム</a> · <a href="/corp#contact">相談フォーム</a>'
};
