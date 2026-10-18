import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import {IDS,BOOKING,LINE,POLICY,origin,opaque,hash,json,equal,cookie,configured,sameOrigin,redis,lock,notion,query,find,createOnce,patch,title,text,select,relation,date,ptext,settings,nextEvent,publicEvent,validate,signature,mail,linePush} from './_core.js';
export const config={maxDuration:120};
const PREFIX='academy:';
const OAUTH_COOKIE='academy_oauth';
async function verified(req:VercelRequest):Promise<string|null> {
  const token=cookie(req,'academy_verified');if(!/^[a-f0-9]{64}$/.test(token))return null;
  return redis(['GET',PREFIX+'verified:'+hash(token)]);
}
async function enqueue(key:string,value:unknown) {
  await redis(['SET',PREFIX+'job:'+key,JSON.stringify(value)]);
  await redis(['SADD',PREFIX+'jobs',key]);
}
async function register(req:VercelRequest,res:VercelResponse) {
  if(!sameOrigin(req))return json(res,{error:'送信元を確認できません。ページを開き直してください。'},403);
  if(!configured())return json(res,{error:'受付を準備しています。公式LINEからお問い合わせください。'},503);
  const b=validate(req.body);if(b.website)return json(res,{error:'入力を確認してください。'},422);
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0];
  const ipKey=PREFIX+'rate:'+hash(ip+':'+new Date().toISOString().slice(0,16));
  const n=await redis(['INCR',ipKey]);await redis(['EXPIRE',ipKey,120]);
  if(n>5)return json(res,{error:'送信が続いています。少し時間をおいてお試しください。'},429);
  const emailKey=hash(b.email), regKey=hash(emailKey+':'+(b.eventId||'advance'));
  const result=await lock('lead:'+emailKey,()=>lock('event:'+(b.eventId||'advance'),async()=>{
    let saga=JSON.parse(await redis(['GET',PREFIX+'registration:'+regKey])||'null');
    if(saga?.done)return saga;
    // Freeze the first payload. A repeated anonymous request cannot change existing identity or consent.
    if(!saga){saga={input:b,regKey,created:new Date().toISOString()};await redis(['SET',PREFIX+'registration:'+regKey,JSON.stringify(saga)]);}
    const input=saga.input;
    let event:any=null;
    if(input.eventId){event=publicEvent(await notion('pages/'+input.eventId));if(!event)throw new Error('EVENT_CLOSED');}
    if(!saga.leadId){
      const lead=await createOnce(IDS.leads,'顧客キー',emailKey,{'氏名':title(input.name),'顧客キー':text(emailKey),'会社名':text(input.company),'役職':text(input.role),'メール':{email:input.email},'電話番号':{phone_number:input.phone||null},'業種':select(input.industry),'流入元':text(input.source),'AI活用状況':text(input.aiLevel),'AI課題':text(input.challenge),'営業ステータス':select(input.consultation?'相談希望':event?'申込済み':'新規リード'),'LINE連携状況':select('未連携'),'営業配信同意':{checkbox:false},'相談希望':{checkbox:input.consultation},'予約状況':select('未予約'),'最終接点':date(),'次回アクション':text(input.consultation?'メール確認後、TimeRexで相談日程予約':'開催案内')});
      saga.leadId=lead.id;await redis(['SET',PREFIX+'registration:'+regKey,JSON.stringify(saga)]);
    }
    if(!saga.status){
      let full=false;
      if(event){
        const current=await query(IDS.registrations,{and:[{property:'開催',relation:{contains:event.id}},{property:'参加状況',select:{equals:'申込済み'}}]});
        const reservations=await redis(['SCARD',PREFIX+'seats:'+event.id]);
        full=event.status==='満席'||Math.max(current.length,reservations)>=event.capacity;
      }
      saga.status=event?(full?'キャンセル待ち':'申込済み'):'先行案内';
      if(event&&!full)await redis(['SADD',PREFIX+'seats:'+event.id,regKey]);
      await redis(['SET',PREFIX+'registration:'+regKey,JSON.stringify(saga)]);
    }
    const registration=await createOnce(IDS.registrations,'申込ID',regKey,{'申込ID':title(regKey),'顧客':relation(saga.leadId),...(event?{'開催':relation(event.id)}:{}),'申込日':date(saga.created),'参加状況':select(saga.status),'相談希望':{checkbox:input.consultation},'営業配信同意':{checkbox:input.marketing},'流入元':text(input.source),'フォロー状況':select('未対応'),'受付通知':select('未送信')});
    saga.registrationId=registration.id;
    if(!saga.verifyToken)saga.verifyToken=opaque();
    await redis(['SET',PREFIX+'emailverify:'+hash(saga.verifyToken),JSON.stringify({leadId:saga.leadId,registrationId:registration.id,marketing:input.marketing,consultation:input.consultation}),'EX',86400]);
    await enqueue('receipt:'+regKey,{kind:'receipt',to:input.email,token:saga.verifyToken,registrationId:registration.id,status:saga.status,eventId:event?.id||null,leadId:saga.leadId});
    if(input.consultation)await enqueue('task:'+regKey,{kind:'task',leadId:saga.leadId,registrationId:registration.id});
    saga.done=true;await redis(['SET',PREFIX+'registration:'+regKey,JSON.stringify(saga)]);
    return saga;
  }));
  const s=await settings();
  // Durable jobs remain queued if transport fails. A cron retries them.
  await drainJobs();
  // Deliberately generic: no email-existence signal, customer ID or email-verification token.
  return json(res,{ok:true,status:'受付処理を行いました。メールをご確認ください。',booking:s.booking,line:s.line,registrationStatus:result.status});
}
async function verify(req:VercelRequest,res:VercelResponse) {
  if(!sameOrigin(req))return json(res,{error:'送信元が一致しません。'},403);
  const token=req.body?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return json(res,{error:'確認リンクが無効です。'},400);
  return lock('verify:'+hash(token),async()=>{
    const raw=await redis(['GET',PREFIX+'emailverify:'+hash(token)]);if(!raw)return json(res,{error:'確認リンクの有効期限が切れています。'},410);
    const v=JSON.parse(raw);const session=opaque();
    const lead=await notion('pages/'+v.leadId);
    const early=['新規リード','申込済み','参加済み'].includes(lead.properties['営業ステータス']?.select?.name);
    await patch(v.leadId,{'営業配信同意':{checkbox:v.marketing},'同意日時':date(),'最終接点':date(),...(v.consultation?{'相談希望':{checkbox:true},...(early?{'営業ステータス':select('相談希望')}:{})}:{})});
    await redis(['SET',PREFIX+'verified:'+hash(session),v.leadId,'EX',3600]);
    await redis(['DEL',PREFIX+'emailverify:'+hash(token)]);
    res.setHeader('Set-Cookie',`academy_verified=${session}; HttpOnly; Secure; SameSite=Lax; Path=/api/academy; Max-Age=3600`);
    return json(res,{ok:true,...await settings(),lineLogin:!!process.env.LINE_LOGIN_CHANNEL_ID});
  });
}
async function lineStart(req:VercelRequest,res:VercelResponse) {
  const leadId=await verified(req);if(!leadId)return json(res,{error:'受付メールの確認リンクから本人確認をしてください。'},401);
  if(!process.env.LINE_LOGIN_CHANNEL_ID||!process.env.LINE_LOGIN_CHANNEL_SECRET)return json(res,{error:'LINE連携を準備しています。'},503);
  const state=opaque(),nonce=opaque();await redis(['SET',PREFIX+'oauth:'+hash(state),JSON.stringify({leadId,nonce}),'EX',600]);
  res.setHeader('Set-Cookie',`${OAUTH_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/academy; Max-Age=600`);
  const u=new URL('https://access.line.me/oauth2/v2.1/authorize');
  u.search=new URLSearchParams({response_type:'code',client_id:process.env.LINE_LOGIN_CHANNEL_ID,redirect_uri:origin()+'/api/academy?action=line-callback',state,scope:'openid profile',nonce,bot_prompt:'normal'}).toString();
  return res.redirect(302,u.toString());
}
async function lineCallback(req:VercelRequest,res:VercelResponse) {
  const state=String(req.query.state||'');if(!state||!equal(state,cookie(req,OAUTH_COOKIE)))return json(res,{error:'連携の確認に失敗しました。'},400);
  const raw=await redis(['GETDEL',PREFIX+'oauth:'+hash(state)]);if(!raw)return json(res,{error:'連携の有効期限が切れています。'},410);
  if(req.query.error)return res.redirect(303,'/academy/?line=cancelled');
  const v=JSON.parse(raw),redirect=origin()+'/api/academy?action=line-callback';
  const r=await fetch('https://api.line.me/oauth2/v2.1/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:String(req.query.code||''),redirect_uri:redirect,client_id:process.env.LINE_LOGIN_CHANNEL_ID!,client_secret:process.env.LINE_LOGIN_CHANNEL_SECRET!}),signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('LINE_LOGIN_FAILED');const t=await r.json();
  const vr=await fetch('https://api.line.me/oauth2/v2.1/verify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id_token:t.id_token,client_id:process.env.LINE_LOGIN_CHANNEL_ID!,nonce:v.nonce}),signal:AbortSignal.timeout(10000)});
  if(!vr.ok)throw new Error('LINE_IDENTITY_INVALID');const identity=await vr.json();
  if(!identity.sub||identity.nonce!==v.nonce)throw new Error('LINE_IDENTITY_INVALID');
  await lock('line:'+hash(identity.sub),async()=>{
    const other=await query(IDS.leads,{property:'LINE ID',rich_text:{equals:identity.sub}});
    if(other.some(p=>p.id!==v.leadId))throw new Error('LINE_ALREADY_LINKED');
    await patch(v.leadId,{'LINE ID':text(identity.sub),'LINE連携状況':select('連携済み'),'最終接点':date()});
  });
  res.setHeader('Set-Cookie',`${OAUTH_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api/academy; Max-Age=0`);
  return res.redirect(303,'/academy/?line=linked');
}
async function webhook(req:VercelRequest,res:VercelResponse) {
  if(!process.env.LINE_CHANNEL_SECRET)return json(res,{error:'LINE_NOT_CONFIGURED'},503);
  const raw=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):null;
  // Raw body is mandatory. Never reconstruct JSON before signature verification.
  if(raw===null||!signature(raw,process.env.LINE_CHANNEL_SECRET,String(req.headers['x-line-signature']||'')))return json(res,{error:'INVALID_SIGNATURE'},401);
  const body=JSON.parse(raw);if(!Array.isArray(body.events))return json(res,{error:'INVALID_EVENTS'},400);
  for(const e of body.events){
    if(!e.webhookEventId||!e.source?.userId)continue;
    await lock('webhook:'+e.webhookEventId,async()=>{
      if(await redis(['GET',PREFIX+'lineevent:'+e.webhookEventId]))return;
      const leads=await query(IDS.leads,{property:'LINE ID',rich_text:{equals:e.source.userId}});
      for(const lead of leads){
        if(e.type==='unfollow'||(e.type==='message'&&e.message?.type==='text'&&/^(停止|配信停止|STOP)$/i.test(e.message.text.trim()))){
          await patch(lead.id,{'営業配信同意':{checkbox:false},'LINE連携状況':select('配信停止')});
        }
        // Re-follow never silently re-enables consent.
      }
      await redis(['SET',PREFIX+'lineevent:'+e.webhookEventId,'done','EX',604800]);
    });
  }
  return json(res,{ok:true});
}
async function drainJobs() {
  const keys=await redis(['SMEMBERS',PREFIX+'jobs']);let done=0,failed=0;
  for(const key of keys.slice(0,20))try{await lock('job:'+key,async()=>{
    const raw=await redis(['GET',PREFIX+'job:'+key]);if(!raw){await redis(['SREM',PREFIX+'jobs',key]);return;}
    const j=JSON.parse(raw);
    if(j.kind==='receipt'){
      const s=await settings();
      await mail(j.to,'【CORE Academy】受付とメール確認のご案内',`CORE Academyへのお申し込みありがとうございます。\n受付区分：${j.status}\n\nメール確認・LINE連携はこちら（24時間有効）：\n${origin()}/academy/verify#${j.token}\n\n無料個別相談の日程予約：\n${s.booking}\n\n公式LINE：${s.line}\n\n会場・料金等の確定情報は別途ご案内します。\n株式会社CORE / info@core-ai.jp`,key);
      await patch(j.registrationId,{'受付通知':select('送信済み')});
    }else if(j.kind==='task'){
      const lead=await notion('pages/'+j.leadId);
      await createOnce(IDS.tasks,'根拠','academy:'+j.registrationId,{'タスク':title('Academy個別相談：'+ptext(lead,'会社名')+' '+ptext(lead,'氏名')),'根拠':text('academy:'+j.registrationId),'ステータス':select('未着手'),'優先度':select('A'),'種別':select('顧客対応'),'次回確認日':date(),'完了条件':text('TimeRex予約の確定と相談実施を確認する。顧客： https://www.notion.so/'+j.leadId.replaceAll('-',''))});
    }
    await redis(['DEL',PREFIX+'job:'+key]);await redis(['SREM',PREFIX+'jobs',key]);done++;
  });}catch{failed++;}
  return {done,failed};
}
async function scheduledNotifications() {
  const events=await query(IDS.events),s=await settings();let sent=0;
  for(const event of events){
    const start=Date.parse(event.properties['開催日時']?.date?.start||'');
    const until=start-Date.now();const kind=until>0&&until<=129600000?'before':until<0&&until>=-172800000?'after':null;
    if(!kind)continue;
    const regs=await query(IDS.registrations,{and:[{property:'開催',relation:{contains:event.id}},{property:'参加状況',select:{equals:kind==='before'?'申込済み':'参加済み'}}]});
    for(const reg of regs){
      const leadId=reg.properties['顧客']?.relation?.[0]?.id;if(!leadId)continue;
      const lead=await notion('pages/'+leadId),uid=ptext(lead,'LINE ID');
      if(!uid||lead.properties['LINE連携状況']?.select?.name!=='連携済み'||!lead.properties['営業配信同意']?.checkbox)continue;
      if(kind==='after'&&!s.survey)continue;
      const key=PREFIX+'sent:'+reg.id+':'+kind;
      await lock(key,async()=>{
        if(await redis(['GET',key]))return;
        let retryKey=await redis(['GET',key+':retry']);if(!retryKey){retryKey=randomUUID();await redis(['SET',key+':retry',retryKey]);}
        const message=kind==='before'?`CORE Academyの開催が近づいています。\n${ptext(event,'テーマ')}\n${new Date(start).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}\n${ptext(event,'会場')}`:`CORE Academyへのご参加ありがとうございました。\nアンケート：${s.survey}\n無料個別相談：${s.booking}\n配信停止は「停止」と送信してください。`;
        await linePush(uid,message,retryKey);await redis(['SET',key,'done']);await patch(reg.id,{[kind==='before'?'前日通知':'事後通知']:{checkbox:true}});sent++;
      });
    }
  }
  return sent;
}
export default async function handler(req:VercelRequest,res:VercelResponse) {
  const action=String(req.query.action||'config');
  try{
    if(action==='config'&&req.method==='GET'){
      if(!configured())return json(res,{ready:false,event:null,booking:BOOKING,line:LINE,error:'開催情報を確認できません。公式LINEからお問い合わせください。'});
      return json(res,{ready:true,event:await nextEvent(),...await settings()});
    }
    if(action==='register'&&req.method==='POST')return await register(req,res);
    if(action==='verify'&&req.method==='POST')return await verify(req,res);
    if(action==='line-start'&&req.method==='GET')return await lineStart(req,res);
    if(action==='line-callback'&&req.method==='GET')return await lineCallback(req,res);
    if(action==='webhook'&&req.method==='POST')return await webhook(req,res);
    if(action==='jobs'&&req.method==='GET'){
      const secret=process.env.CRON_SECRET;
      if(!secret||!equal(String(req.headers.authorization||''),'Bearer '+secret))return json(res,{error:'UNAUTHORIZED'},401);
      return json(res,{ok:true,jobs:await drainJobs(),notifications:await scheduledNotifications()});
    }
    return json(res,{error:'METHOD_NOT_ALLOWED'},405);
  }catch(e){
    const code=e instanceof Error?e.message:'ERROR';
    console.error('[academy]',/^[A-Z_0-9]+$/.test(code)?code:'ERROR');
    const invalid=code.startsWith('INVALID_');
    return json(res,{error:invalid?'入力内容を確認してください。':code==='EVENT_CLOSED'?'この開催回は受付を終了しました。ページを更新してください。':'処理を完了できませんでした。少し時間をおいて再送するか、公式LINEへお問い合わせください。'},invalid?422:code==='EVENT_CLOSED'?409:503);
  }
}
