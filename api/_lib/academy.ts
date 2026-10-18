import { createHash, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const IDS = {
  events: process.env.ACADEMY_EVENTS_DS || '',
  leads: process.env.ACADEMY_LEADS_DS || '',
  registrations: process.env.ACADEMY_REGISTRATIONS_DS || '',
  settings: process.env.ACADEMY_SETTINGS_DS || '',
  companies: process.env.ACADEMY_COMPANIES_DS || '',
  tasks: process.env.ACADEMY_TASKS_DS || '',
  deals: process.env.ACADEMY_DEALS_DS || '',
};
export const INDUSTRIES = ['製造','建設・不動産','医療・福祉','小売・EC','飲食・宿泊','IT・通信','士業・コンサル','教育','金融・保険','その他'];
export const AI_LEVELS = ['未導入','個人で試用','一部業務で導入','全社で活用'];
export const BOOKING = 'https://timerex.net/s/core-ai/061de4f3';
export const LINE = 'https://lin.ee/XVR8ySP';
export const POLICY = 'academy-2026-10-18-v1';
export const origin = () => process.env.ACADEMY_ORIGIN || (process.env.VERCEL_ENV==='preview' && process.env.VERCEL_URL ? 'https://'+process.env.VERCEL_URL : 'https://www.core-ai.jp');
export const opaque = () => randomBytes(32).toString('hex');
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function equal(a: string, b: string) {
  const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y);
}
export function signature(body: string, secret: string, supplied: string) {
  return equal(createHmac('sha256',secret).update(body).digest('base64'),supplied);
}
export function json(res: VercelResponse, data: unknown, status=200) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(status).json(data);
}
export function sameOrigin(req: VercelRequest) {
  const o = req.headers.origin;
  return typeof o==='string' && [origin(), ...(process.env.ACADEMY_TEST_ORIGIN ? [process.env.ACADEMY_TEST_ORIGIN] : [])].includes(o);
}
export function configured() {
  return Boolean(process.env.ACADEMY_ENABLED==='true' && process.env.NOTION_API_KEY && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && IDS.events && IDS.leads && IDS.registrations && IDS.settings);
}
export function cookie(req: VercelRequest, name: string) {
  return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
}
export async function redis(cmd: (string|number)[]): Promise<any> {
  if(!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('STORE_NOT_CONFIGURED');
  const r=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error('STORE_UNAVAILABLE'); const result=await r.json();
  if(result.error) throw new Error('STORE_ERROR'); return result.result;
}
export async function lock<T>(name: string, fn:()=>Promise<T>):Promise<T> {
  const key='academy:lock:'+name, token=opaque();
  if(await redis(['SET',key,token,'NX','EX',120])!=='OK') throw new Error('BUSY');
  try{return await fn();}finally{await redis(['EVAL',"if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key,token]);}
}
export async function notion(path: string, body?: unknown, method?: string):Promise<any> {
  if(!process.env.NOTION_API_KEY) throw new Error('NOTION_NOT_CONFIGURED');
  const r=await fetch('https://api.notion.com/v1/'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${process.env.NOTION_API_KEY}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error('NOTION_'+r.status);return r.json();
}
export const text=(v:string)=>({rich_text:[{text:{content:v.slice(0,2000)}}]});
export const title=(v:string)=>({title:[{text:{content:v.slice(0,200)}}]});
export const select=(v:string)=>({select:{name:v}});
export const relation=(id:string)=>({relation:[{id}]});
export const date=(iso=new Date().toISOString())=>({date:{start:iso}});
export const ptext=(p:any,n:string)=> (p.properties?.[n]?.title||p.properties?.[n]?.rich_text||[]).map((x:any)=>x.plain_text||x.text?.content||'').join('');
export async function query(ds:string,filter?:unknown):Promise<any[]> {
  const rows:any[]=[];let cursor:string|undefined;
  do{const r=await notion('data_sources/'+ds+'/query',{...(filter?{filter}:{}),page_size:100,...(cursor?{start_cursor:cursor}:{})});rows.push(...r.results);cursor=r.has_more?r.next_cursor:undefined;if(rows.length>10000)throw new Error('QUERY_LIMIT');}while(cursor);
  return rows;
}
export async function find(ds:string,field:string,value:string) {
  const type=ds===IDS.registrations||ds===IDS.companies?'title':'rich_text';
  const r=await query(ds,{property:field,[type]:{equals:value}});
  if(r.length>1) throw new Error('DUPLICATE_REQUIRES_REVIEW');return r[0]||null;
}
// An uncertain Notion create is never repeated blindly. Resolve its unique key first.
export async function createOnce(ds:string,field:string,key:string,properties:unknown) {
  const old=await find(ds,field,key);if(old)return old;
  const op='academy:create:'+hash(ds+':'+key);
  if(await redis(['GET',op]))throw new Error('UNCERTAIN_CREATE_REQUIRES_REVIEW');
  await redis(['SET',op,'pending']);
  const p=await notion('pages',{parent:{data_source_id:ds},properties});
  await redis(['SET',op,p.id]);return p;
}
export async function patch(id:string,properties:unknown) {return notion('pages/'+id,{properties},'PATCH');}
export async function settings() {
  const rows=await query(IDS.settings);const p=rows.find(x=>ptext(x,'設定名')==='CORE 共通相談窓口');
  const booking=p?.properties?.['TimeRex URL']?.url||BOOKING;
  const line=p?.properties?.['LINE URL']?.url||LINE;
  return {booking: safeURL(booking,['timerex.net'])||BOOKING,line:safeURL(line,['lin.ee','line.me'])||LINE,survey:safeURL(p?.properties?.['アンケートURL']?.url)||null};
}
export function safeURL(raw:unknown,hosts?:string[]) {
  try{const u=new URL(String(raw));return u.protocol==='https:'&&(!hosts||hosts.includes(u.hostname))?u.toString():null;}catch{return null;}
}
export function publicEvent(p:any,now=Date.now()) {
  const q=p.properties||{}, start=q['開催日時']?.date?.start;
  const status=q['募集状況']?.select?.name;
  if(!q['公開状態']?.checkbox||!start||Date.parse(start)<=now||!['募集中','満席'].includes(status))return null;
  const deadline=q['申込締切']?.date?.start;
  const cutoff=deadline&&/^\d{4}-\d{2}-\d{2}$/.test(deadline)?Date.parse(deadline+'T23:59:59+09:00'):Date.parse(deadline||'');
  if(deadline&&cutoff<=now)return null;
  const capacity=q['定員']?.number;
  if(!Number.isInteger(capacity)||capacity<=0)return null;
  return {id:p.id,theme:ptext(p,'テーマ'),start,end:q['開催日時']?.date?.end||null,venue:ptext(p,'会場')||'神戸市内（詳細は追ってご案内）',capacity,fee:ptext(p,'参加費')||'未確定',deadline,status};
}
export async function nextEvent() {
  const rows=await query(IDS.events,{property:'公開状態',checkbox:{equals:true}});
  const event=rows.map(p=>publicEvent(p)).filter(Boolean).sort((a:any,b:any)=>Date.parse(a.start)-Date.parse(b.start))[0]||null;
  if(!event)return null;
  const count=await applicationCount(event.id);
  const reserved=Number(await redis(['SCARD','academy:seats:'+event.id]));
  return {...event,status:event.status==='満席'||Math.max(count,reserved)>=event.capacity?'満席':'募集中'};
}
export async function applicationCount(eventId:string) {
  const regs=await query(IDS.registrations,{property:'開催',relation:{contains:eventId}});
  return regs.filter(p=>['申込済み','参加済み'].includes(p.properties['参加状況']?.select?.name)).length;
}
export interface Input {name:string;company:string;role:string;email:string;phone:string;industry:string;aiLevel:string;challenge:string;consultation:boolean;marketing:boolean;eventId:string;source:string;privacy:true;website:string}
export function validate(b:any):Input {
  if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('INVALID_INPUT');
  const str=(k:string,max:number,required=false)=>{const v=b[k];if(v===undefined&&!required)return '';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('INVALID_'+k);return v.trim();};
  const email=str('email',254,true).normalize('NFKC').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('INVALID_email');
  if(b.privacy!==true||typeof b.marketing!=='boolean'||typeof b.consultation!=='boolean')throw new Error('INVALID_CONSENT');
  const industry=str('industry',40,true),aiLevel=str('aiLevel',40,true);
  if(!INDUSTRIES.includes(industry)||!AI_LEVELS.includes(aiLevel))throw new Error('INVALID_SELECTION');
  const eventId=str('eventId',60);if(eventId&&!/^[a-f\d-]{32,36}$/i.test(eventId))throw new Error('INVALID_EVENT');
  return {name:str('name',100,true),company:str('company',150,true),role:str('role',100,true),email,phone:str('phone',40),industry,aiLevel,challenge:str('challenge',1500,true),consultation:b.consultation,marketing:b.marketing,eventId,source:str('source',120)||'direct',privacy:true,website:str('website',200)};
}
export async function mail(to:string,subject:string,body:string,idempotency:string) {
  // Prefer the existing, configured SMTP account over an unrelated shared Resend key.
  if(process.env.RESEND_API_KEY&&!(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD)){
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify({from:process.env.EMAIL_FROM||'CORE <info@core-ai.jp>',to,subject,text:body}),signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('MAIL_FAILED');return;
  }
  if(!process.env.GMAIL_USER||!process.env.GMAIL_APP_PASSWORD)throw new Error('MAIL_NOT_CONFIGURED');
  const module=await import('nodemailer');const nodemailer=module.default??module;
  const smtp=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  await smtp.sendMail({from:process.env.GMAIL_USER,to,subject,text:body,messageId:`<${hash(idempotency)}@core-ai.jp>`});
}
export async function linePush(userId:string,message:string,retryKey:string) {
  if(!process.env.LINE_CHANNEL_ACCESS_TOKEN)throw new Error('LINE_NOT_CONFIGURED');
  const r=await fetch('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:`Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,'Content-Type':'application/json','X-Line-Retry-Key':retryKey},body:JSON.stringify({to:userId,messages:[{type:'text',text:message}]}),signal:AbortSignal.timeout(10000)});
  if(!r.ok&&r.status!==409)throw new Error('LINE_SEND_FAILED');
}
