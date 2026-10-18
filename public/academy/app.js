'use strict';
const form=document.querySelector('#registration-form');
const intent=document.querySelector('#intent');
const submit=document.querySelector('#submit-button');
let config={ready:false,event:null,booking:'https://timerex.net/s/core-ai/061de4f3',line:'https://lin.ee/XVR8ySP'};
let surveyToken='';
const api=async(action,body)=>{
  const r=await fetch('/api/academy?action='+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(action==='register'?90000:25000)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'処理を完了できませんでした。');return data;
};
function links(data){for(const a of document.querySelectorAll('[data-booking]'))a.href=data.booking||config.booking;for(const a of document.querySelectorAll('[data-line]'))a.href=data.line||config.line;}
function complete(data,title,message){
  for(const section of document.querySelectorAll('main>section'))section.hidden=true;
  const panel=document.querySelector('#completion');panel.hidden=false;
  document.body.classList.add('completed');document.querySelector('#completion-title').textContent=title;
  document.querySelector('#completion-message').textContent=message;
  document.querySelector('.mobile-cta').hidden=true;links(data);window.scrollTo(0,0);
}
async function init(){
  if(location.pathname.replace(/\/$/,'').endsWith('/apply')){
    for(const section of document.querySelectorAll('main>section'))section.hidden=section.id!=='apply';
    document.querySelector('.mobile-cta').hidden=true;document.body.classList.add('form-page');
    document.querySelector('#apply h2').textContent='CORE Academy 参加申し込み';
  }
  if(location.pathname.replace(/\/$/,'').endsWith('/survey')){
    surveyToken=location.hash.slice(1);history.replaceState(null,'','/academy/survey');
    for(const section of document.querySelectorAll('main>section'))section.hidden=true;
    document.querySelector('#survey-panel').hidden=false;document.body.classList.add('completed');
    return;
  }
  if(location.pathname.replace(/\/$/,'').endsWith('/verify')){
    const token=location.hash.slice(1);history.replaceState(null,'','/academy/verify');
    complete(config,'メールアドレスを確認しています。','しばらくお待ちください。');
    try{const data=await api('verify',{token});complete(data,'メール確認が完了しました。','ご希望の方は、LINE連携や個別相談の日程予約へお進みください。');document.querySelector('#line-login').hidden=!data.lineLogin;document.querySelector('#line-code').hidden=!data.lineCode;}
    catch(e){complete(config,'メール確認を完了できませんでした。',e instanceof Error?e.message:'受付メールをご確認ください。');}
    return;
  }
  if(new URLSearchParams(location.search).get('line')==='linked'){
    complete(config,'LINE連携が完了しました。','友だち追加もお済ませください。営業配信に同意いただいた方へ案内をお届けします。');return;
  }
  submit.disabled=true;
  try{
    config=await api('config');links(config);
    document.querySelector('#form-readiness').textContent=config.ready?'送信後、受付メールをご確認ください。':'受付準備中です。公式LINEからお問い合わせいただけます。';
    submit.disabled=!config.ready;
    const e=config.event;
    if(e){
      document.querySelector('#event-status').textContent=e.status==='満席'?'キャンセル待ち受付':'参加申し込み受付中';
      document.querySelector('#event-theme').textContent=e.theme;
      const day=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(e.start));
      const time=d=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d));
      document.querySelector('#event-date').textContent=day+' '+time(e.start)+(e.end?'〜'+time(e.end):'');
      document.querySelector('#event-venue').textContent=e.venue;document.querySelector('#event-capacity').textContent=e.capacity+'名';document.querySelector('#event-fee').textContent=e.fee;
      const option=document.createElement('option');option.value='event';option.textContent=day+' '+(e.status==='満席'?'キャンセル待ち':'勉強会に参加');intent.prepend(option);intent.value='event';
      document.querySelector('#event-note').textContent=e.fee==='未確定'?'参加費は未確定です。確定した条件をご確認いただいてから参加をお決めいただけます。':'';
    }else{
      document.querySelector('#event-status').textContent=config.ready?'次回開催の先行案内':'開催情報を確認できません';
      document.querySelector('#event-date').textContent=config.ready?'次回開催日を調整しています':config.error||'公式LINEからお問い合わせください。';
      document.querySelector('#event-venue').textContent='神戸市内';document.querySelector('#event-capacity').textContent='開催案内でお知らせ';document.querySelector('#event-fee').textContent='開催案内でお知らせ';
    }
  }catch{document.querySelector('#event-status').textContent='開催情報を取得できません';document.querySelector('#event-date').textContent='ページを再読み込みするか、公式LINEへお問い合わせください。';document.querySelector('#form-readiness').textContent='通信に失敗しました。再読み込みしてお試しください。';}
}
form.addEventListener('submit',async ev=>{
  ev.preventDefault();if(!form.reportValidity())return;
  const f=new FormData(form),error=document.querySelector('#form-error');error.textContent='';submit.disabled=true;
  try{
    const source=new URLSearchParams(location.search).get('utm_source')||'direct';
    const body={name:f.get('name'),company:f.get('company'),role:f.get('role'),email:f.get('email'),phone:f.get('phone'),industry:f.get('industry'),aiLevel:f.get('aiLevel'),challenge:f.get('challenge'),consultation:f.has('consultation')||f.get('intent')==='consultation',marketing:f.has('marketing'),privacy:f.has('privacy'),eventId:f.get('intent')==='event'?config.event?.id||'':'',source,website:f.get('website')};
    const data=await api('register',body);
    history.pushState(null,'','/academy/thanks');
    complete(data,data.registrationStatus==='キャンセル待ち'?'キャンセル待ちの受付を行いました。':'受付処理を行いました。','ご入力のメールアドレスへ確認メールをお送りします。迷惑メールフォルダもご確認ください。');
  }catch(e){error.textContent=(e instanceof Error?e.message:'通信に失敗しました。')+' 入力内容は残っています。';}
  finally{submit.disabled=false;}
});
document.querySelector('#survey-form').addEventListener('submit',async ev=>{
  ev.preventDefault();const target=ev.currentTarget;if(!target.reportValidity())return;
  const f=new FormData(target),button=target.querySelector('button');button.disabled=true;
  try{const data=await api('survey',{token:surveyToken,rating:Number(f.get('rating')),note:f.get('note'),consultation:f.has('consultation')});complete(data,'ご回答ありがとうございました。','個別相談をご希望の方は、下のTimeRexから日程をお選びいただけます。');}
  catch(e){document.querySelector('#survey-error').textContent=e instanceof Error?e.message:'送信できませんでした。';}
  finally{button.disabled=false;}
});
init();

document.querySelector('#line-code').addEventListener('click',async ev=>{
  const button=ev.currentTarget;button.disabled=true;
  try{const data=await api('line-code',{});const a=document.querySelector('#line-code-open');a.href=data.url;a.hidden=false;document.querySelector('#line-code-note').textContent='リンクを開き、入力された連携コードをそのまま送信すると紐づきます。コードは10分間・1回限り有効です。';}
  catch(e){document.querySelector('#line-code-note').textContent=e instanceof Error?e.message:'連携を開始できませんでした。';}
  finally{button.disabled=false;}
});
