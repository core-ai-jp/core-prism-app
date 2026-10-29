import type {VercelRequest,VercelResponse} from '@vercel/node';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {redis,lock,mail,createOnce,IDS,title,text,date,select} from '../_lib/academy.js';
import {POLICY,files,hash,token,secureEqual,origin,validate,sequence,csvCell} from '../_lib/hub.js';
import type {Registration} from '../_lib/hub.js';
interface Lead {id:string;input:Registration;created:string;verified:boolean;marketing:boolean;unsubscribed:boolean;booked:boolean;consentVersion:string;consentAt?:string;crmId?:string;}
interface Job {leadId:string;registration:string;verifyToken:string;downloadToken:string;attempts:number;state:'pending'|'sending'|'sent'|'uncertain'|'expired';created:string}
interface Receipt {receiptId:string;registrationId:string;input:Registration;created:string;leadId:string;downloadToken:string;verifyToken:string;expiresAt:number;verified?:boolean;}
const key=(s:string)=>(process.env.VERCEL_ENV==='preview'?'hub:preview:v1:':'hub:v1:')+s;
async function get<T>(k:string):Promise<T|null>{const raw=await redis(['GET',key(k)]);return raw?JSON.parse(raw):null;}
async function put(k:string,v:unknown,ttl?:number){await redis(['SET',key(k),JSON.stringify(v),...(ttl?['EX',ttl]:[])]);}
function json(res:VercelResponse,data:unknown,status=200){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');return res.status(status).json(data);}
function enabled(){return process.env.HUB_ENABLED==='true'&&!!process.env.UPSTASH_REDIS_REST_URL&&!!process.env.UPSTASH_REDIS_REST_TOKEN;}
function admin(req:VercelRequest){const secret=process.env.HUB_ADMIN_KEY;const supplied=String(req.headers.authorization||'');return !!secret&&secret.length>=24&&secureEqual(supplied,'Bearer '+secret);}
async function rate(scope:string,max:number,seconds:number){const count=await redis(['EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",1,key('rate:'+scope),seconds]);if(count>max)throw Error('RATE_LIMIT');}
async function audit(event:string,id:string){await redis(['LPUSH',key('audit'),JSON.stringify({event,id,at:new Date().toISOString()})]);await redis(['LTRIM',key('audit'),0,9999]);}
async function register(req:VercelRequest,res:VercelResponse){
 const input=validate(req.body);const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0];
 await rate('ip:'+hash(ip),6,600);await rate('email:'+hash(input.email),4,3600);
 const id=hash(input.email),rid=hash(id+':'+input.resource+':'+input.event_id+':'+input.campaign_id);
 const receipt=await lock(key('lead:'+id),async()=>{
  const active=await get<string>('active:'+rid);
  let r=active?await get<Receipt>('receipt:'+active):null;
  if(!r||r.expiresAt<=Date.now()){
   const receiptId=token();r={receiptId,registrationId:rid,input,created:new Date().toISOString(),leadId:id,downloadToken:token(),verifyToken:token(),expiresAt:Date.now()+86400000};
   await put('receipt:'+receiptId,r);await put('active:'+rid,receiptId);
  }
  if(!await get('registration:'+rid))await put('registration:'+rid,r);
  const lead=await get<Lead>('lead:'+id);if(!lead)await put('lead:'+id,{id,input:r.input,created:r.created,verified:false,marketing:false,unsubscribed:false,booked:false,consentVersion:POLICY} satisfies Lead);
  await redis(['SADD',key('leads'),id]);await redis(['SADD',key('registrations'),rid]);await redis(['SADD',key('receipts'),r.receiptId]);
  const ttl=Math.max(1,Math.floor((r.expiresAt-Date.now())/1000));
  await put('download:'+hash(r.downloadToken),{resource:r.input.resource,registration:rid,receipt:r.receiptId},ttl);
  if(!r.verified)await put('verify:'+hash(r.verifyToken),{leadId:id,registration:r.receiptId,marketing:r.input.marketing,created:r.created},ttl);
  const job=await get<Job>('job:'+r.receiptId);if(!job){await put('job:'+r.receiptId,{leadId:id,registration:r.receiptId,verifyToken:r.verifyToken,downloadToken:r.downloadToken,attempts:0,state:'pending',created:r.created} satisfies Job);}
  const pending=await get<Job>('job:'+r.receiptId);if(pending?.state==='pending')await redis(['SADD',key('jobs'),r.receiptId]);return r;
 });
 await audit('registration',rid);
 return json(res,{ok:true,downloads:files[input.resource].map((file,index)=>({title:file,url:origin()+'/api/hub?action=download&token='+receipt.downloadToken+'&file='+index})),mailStatus:process.env.HUB_MAIL_ENABLED==='true'?'queued':'disabled'});
}
async function download(req:VercelRequest,res:VercelResponse){const t=String(req.query.token||'');if(!/^[a-f0-9]{64}$/.test(t))return json(res,{error:'リンクが無効です。'},400);const d=await get<{resource:string;registration:string;receipt:string}>('download:'+hash(t));if(!d)return json(res,{error:'有効期限が切れています。資料ページから再度お申し込みください。'},410);const idx=String(req.query.file||'0');if(!/^[0-9]$/.test(idx))return json(res,{error:'ファイルがありません。'},404);const file=files[d.resource]?.[Number(idx)];if(!file)return json(res,{error:'ファイルがありません。'},404);const bytes=await readFile(join(process.cwd(),'data/toolkit',file));await redis(['SADD',key('downloaded'),d.registration]);await redis(['SADD',key('receipt-downloads'),d.receipt]);res.setHeader('Content-Type',file.endsWith('.pdf')?'application/pdf':file.endsWith('.csv')?'text/csv; charset=utf-8':'text/markdown; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${file}"`);res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).send(bytes);}
async function verify(req:VercelRequest,res:VercelResponse){const t=req.body?.token;if(typeof t!=='string'||!/^[a-f0-9]{64}$/.test(t))return json(res,{error:'リンクが無効です。'},400);const v=await get<{leadId:string;registration:string;marketing:boolean;created:string}>('verify:'+hash(t));if(!v)return json(res,{error:'リンクの期限が切れています。'},410);await lock(key('lead:'+v.leadId),async()=>{const lead=await get<Lead>('lead:'+v.leadId);if(!lead)throw Error('NOT_FOUND');lead.verified=true;
 // Withdrawal is sticky. An old confirmation link cannot resubscribe a person.
 if(!lead.unsubscribed){lead.marketing=v.marketing;lead.consentAt=new Date().toISOString();lead.consentVersion=POLICY;}
 const receipt=await get<Receipt>('receipt:'+v.registration);if(!receipt||receipt.verifyToken!==t||receipt.expiresAt<=Date.now())throw Error('EXPIRED');receipt.verified=true;await put('receipt:'+v.registration,receipt);
 await put('lead:'+lead.id,lead);await put('consent:'+v.registration,{version:POLICY,at:lead.consentAt,requested:v.marketing,active:lead.marketing,source:v.registration});await redis(['SADD',key('crm-jobs'),lead.id]);await redis(['DEL',key('verify:'+hash(t))]);await audit('email_verified',lead.id);});return json(res,{ok:true});}
async function unsubscribe(req:VercelRequest,res:VercelResponse){const t=req.body?.token;if(typeof t!=='string'||!/^[a-f0-9]{64}$/.test(t))return json(res,{error:'リンクが無効です。'},400);const id=await get<string>('unsubscribe:'+hash(t));if(!id)return json(res,{error:'リンクが無効です。窓口へご連絡ください。'},410);await lock(key('lead:'+id),async()=>{const lead=await get<Lead>('lead:'+id);if(!lead)throw Error('NOT_FOUND');lead.marketing=false;lead.unsubscribed=true;await put('lead:'+id,lead);await audit('unsubscribed',id);});return json(res,{ok:true});}
async function jobs(res:VercelResponse){let sent=0;const ids:string[]=await redis(['SMEMBERS',key('jobs')]);if(process.env.HUB_MAIL_ENABLED==='true')for(const id of ids.slice(0,10)){await lock(key('job:'+id),async()=>{const job=await get<Job>('job:'+id);if(!job||job.state!=='pending'||job.attempts>=3){if(job?.state==='sending'||job?.state==='uncertain')await redis(['SADD',key('mail-review'),id]);await redis(['SREM',key('jobs'),id]);return;}const r=await get<Receipt>('receipt:'+id);if(!r)return;
 if(r.expiresAt<=Date.now()){job.state='expired';await put('job:'+id,job);await redis(['SREM',key('jobs'),id]);await audit('receipt_expired',id);return;}
 const stop=token();await put('unsubscribe:'+hash(stop),job.leadId);
 const body=`資料のお申し込みありがとうございます。\n\n資料（受付から24時間有効）:\n${files[r.input.resource].map((f,i)=>f+'\n'+origin()+'/api/hub?action=download&token='+job.downloadToken+'&file='+i).join('\n')}\n\nご自身の申込の場合はメールアドレスを確認してください。\n${origin()}/resources/confirm#${job.verifyToken}\n\nAI Toolkitメール案内の希望：${r.input.marketing?'希望あり（本人確認後に有効）':'希望なし'}\nAI Toolkitメールの配信停止：${origin()}/resources/confirm?action=unsubscribe#${stop}\n\n株式会社CORE\n${process.env.HUB_SENDER_ADDRESS||''}\ninfo@core-ai.jp\n心当たりがない場合は確認せず、このメールを破棄してください。`;
 if(!process.env.HUB_SENDER_ADDRESS)throw Error('SENDER_NOT_CONFIGURED');
 job.state='sending';job.attempts++;await put('job:'+id,job);
 try{await mail(r.input.email,'CORE AI Toolkit｜ご請求資料',body,'hub-receipt-'+id);job.state='sent';sent++;}catch{job.state='uncertain';await audit('mail_uncertain',id);}await put('job:'+id,job);await redis(['SREM',key('jobs'),id]);if(job.state==='uncertain')await redis(['SADD',key('mail-review'),id]);
 });}
 const crmLeads=process.env.VERCEL_ENV==='preview'?(process.env.HUB_TEST_CRM_LEADS_DS||''):IDS.leads;
 let synced=0;if(process.env.HUB_CRM_ENABLED==='true'&&crmLeads){const crmIds:string[]=await redis(['SMEMBERS',key('crm-jobs')]);for(const id of crmIds.slice(0,5)){await lock(key('lead:'+id),async()=>{const lead=await get<Lead>('lead:'+id);if(!lead?.verified)return;const p=await lock('lead:'+id,()=>createOnce(crmLeads,'顧客キー',id,{'氏名':title(lead.input.name),'顧客キー':text(id),'会社名':text(lead.input.company),'メール':{email:lead.input.email},'流入元':text('CORE AI Toolkit'),'営業ステータス':select('新規リード'),'営業配信同意':{checkbox:false},'最終接点':date()}));lead.crmId=p.id;await put('lead:'+id,lead);await redis(['SREM',key('crm-jobs'),id]);synced++;});}}
 return json(res,{sent,synced,marketing:'disabled_pending_e2e',sequenceDrafts:sequence});}
async function metrics(req:VercelRequest,res:VercelResponse){const ids:string[]=await redis(['SMEMBERS',key('registrations')]);if(ids.length>10000)throw Error('REPORT_LIMIT');const downloaded=new Set<string>(await redis(['SMEMBERS',key('downloaded')]));const rows=[];for(const id of ids){const r=await get<Receipt>('registration:'+id);if(!r)continue;const month=r.created.slice(0,7);if(req.query.month&&req.query.month!==month||req.query.event&&req.query.event!==r.input.event_id||req.query.resource&&req.query.resource!==r.input.resource)continue;const l=await get<Lead>('lead:'+r.leadId);rows.push({month,event:r.input.event_id,campaign:r.input.campaign_id,resource:r.input.resource,downloaded:downloaded.has(id),verified:l?.verified===true,consented:l?.marketing===true,booked:l?.booked===true});}await audit('metrics_read','admin');if(req.query.format==='csv'){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Disposition','attachment; filename="lead-funnel.csv"');return res.send('\ufeff'+[['month','event','campaign','resource','downloaded','verified','consented','booked'],...rows.map(r=>Object.values(r))].map(r=>r.map(csvCell).join(',')).join('\r\n'));}return json(res,{rows,visits:null,confirmedOrders:null,revenue:null,taxBasis:'unknown',note:'予約・売上の接続未完。未計測を0件と扱わない。'});}
export default async function handler(req:VercelRequest,res:VercelResponse){try{const action=String(req.query.action||'config');if(action==='config'&&req.method==='GET')return json(res,{enabled:enabled(),mail:process.env.HUB_MAIL_ENABLED==='true',policy:POLICY});
 if(['jobs','metrics','health'].includes(action)){if(!admin(req))return json(res,{error:'認証が必要です。'},401);if(action==='health')return json(res,{enabled:enabled(),mail:process.env.HUB_MAIL_ENABLED==='true',crm:process.env.HUB_CRM_ENABLED==='true',marketing:false});if(!enabled())return json(res,{error:'Hubの受付設定が未完了です。'},503);if(action==='metrics'&&req.method==='GET')return await metrics(req,res);if(action==='jobs'&&req.method==='POST')return await jobs(res);return json(res,{error:'Method not allowed'},405);}
 if(!enabled())return json(res,{error:'資料受付の接続確認中です。時間をおいてお試しください。'},503);
 if(action==='download'&&req.method==='GET')return await download(req,res);
 if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
 if(req.headers.origin!==origin())return json(res,{error:'送信元を確認できません。'},403);
 if(Buffer.byteLength(JSON.stringify(req.body||{}))>8192)return json(res,{error:'入力が長すぎます。'},413);
 if(action==='register')return await register(req,res);if(action==='verify')return await verify(req,res);if(action==='unsubscribe')return await unsubscribe(req,res);return json(res,{error:'Not found'},404);
 }catch(e){const code=e instanceof Error?e.message:'UNKNOWN';if(code==='INVALID_INPUT')return json(res,{error:'入力内容と同意を確認してください。'},422);if(code==='RATE_LIMIT'){res.setHeader('Retry-After','600');return json(res,{error:'送信が続いています。時間をおいてお試しください。'},429);}console.error('[hub]',{code:code==='BUSY'?'BUSY':'DEPENDENCY_FAILURE'});return json(res,{error:'受付を完了できませんでした。しばらくしてから再度お試しください。'},503);}}
