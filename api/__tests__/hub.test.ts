import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {validate,canMarket,csvCell,secureEqual} from '../_lib/hub';
const storage=new Map<string,string>();const sets=new Map<string,Set<string>>();
vi.mock('../_lib/academy.js',()=>({redis:vi.fn(async(cmd:(string|number)[])=>{const [op,k,...args]=cmd;const key=String(k);if(op==='GET')return storage.get(key)||null;if(op==='SET'){storage.set(key,String(args[0]));return 'OK';}if(op==='DEL'){storage.delete(key);return 1;}if(op==='EVAL')return 1;if(op==='SADD'){const s=sets.get(key)||new Set<string>();args.forEach(a=>s.add(String(a)));sets.set(key,s);return 1;}if(op==='SREM'){args.forEach(a=>sets.get(key)?.delete(String(a)));return 1;}if(op==='SMEMBERS')return [...(sets.get(key)||[])];return 1;}),lock:async(_k:string,f:()=>unknown)=>f(),mail:vi.fn(),createOnce:vi.fn(),IDS:{leads:''},title:vi.fn(),text:vi.fn(),date:vi.fn(),select:vi.fn()}));
import handler from '../hub/index';
const payload={name:'架空担当者',company:'テスト会社',email:'test@example.invalid',resource:'harness-starter-kit',marketing:false,privacy:true,website:'',event_id:'lecture-001',campaign_id:'october'};
function response(){return {statusCode:200,body:null as unknown,headers:{} as Record<string,string>,setHeader(k:string,v:string){this.headers[k]=v;return this;},status(n:number){this.statusCode=n;return this;},json(v:unknown){this.body=v;return this;},send(v:unknown){this.body=v;return this;}};}
async function request(action:string,body:unknown=payload,headers:Record<string,string>={origin:'https://www.core-ai.jp'},method='POST'){const res=response();await handler({query:{action},body,headers,method} as never,res as never);return res;}
beforeEach(()=>{storage.clear();sets.clear();vi.stubEnv('HUB_ENABLED','true');vi.stubEnv('UPSTASH_REDIS_REST_URL','https://example.invalid');vi.stubEnv('UPSTASH_REDIS_REST_TOKEN','test-only');vi.stubEnv('HUB_MAIL_ENABLED','false');vi.stubEnv('HUB_CRM_ENABLED','false');vi.stubEnv('HUB_ADMIN_KEY','');});
afterEach(()=>vi.useRealTimers());
describe('Hub validation and permissions',()=>{
 it('normalizes identity without enabling marketing',()=>expect(validate(payload)).toMatchObject({email:'test@example.invalid',marketing:false}));
 it.each([{privacy:false},{marketing:'yes'},{resource:'toString'},{email:'bad'},{website:'bot'},{event_id:'https://evil.invalid'},{name:'x\nHeader'}])('rejects unsafe input %j',change=>expect(()=>validate({...payload,...change})).toThrow());
 it('gates consent by verification, withdrawal and booking',()=>{const good={verified:true,marketing:true,booked:false,unsubscribed:false};expect(canMarket(good,true)).toBe(true);for(const change of [{verified:false},{marketing:false},{booked:true},{unsubscribed:true}])expect(canMarket({...good,...change},true)).toBe(false);expect(canMarket(good,false)).toBe(false);});
 it('escapes spreadsheet formulas',()=>expect(csvCell('=1+1')).toBe('"\'=1+1"'));
 it('does not accept empty/different secret',()=>{expect(secureEqual('abc','abcd')).toBe(false);expect(secureEqual('abc','xyz')).toBe(false);});
 it('returns validation errors through async dispatch',async()=>expect((await request('register',{...payload,email:'bad'})).statusCode).toBe(422));
 it('blocks foreign origins and unauthorized metrics',async()=>{expect((await request('register',payload,{origin:'https://evil.invalid'})).statusCode).toBe(403);expect((await request('metrics',{}, {},'GET')).statusCode).toBe(401);});
 it('fails closed without runtime setup',async()=>{vi.stubEnv('HUB_ENABLED','false');expect((await request('register')).statusCode).toBe(503);});
 it('deduplicates lead and registration; never accepts anonymous marketing mutation',async()=>{const first=await request('register');expect(first.statusCode).toBe(200);await request('register',{...payload,marketing:true,name:'changed'});expect(sets.get('hub:v1:leads')?.size).toBe(1);expect(sets.get('hub:v1:registrations')?.size).toBe(1);const lead=JSON.parse([...storage].find(([k])=>k.startsWith('hub:v1:lead:'))![1]);expect(lead.input.name).toBe('架空担当者');expect(lead.marketing).toBe(false);expect((first.body as {mailStatus:string}).mailStatus).toBe('disabled');});
 it('rejects unknown verification and expired download',async()=>{expect((await request('verify',{token:'a'.repeat(64)})).statusCode).toBe(410);const res=response();await handler({query:{action:'download',token:'a'.repeat(64)},method:'GET',headers:{}} as never,res as never);expect(res.statusCode).toBe(410);});
 it('does not resurrect consumed verification after duplicate registration',async()=>{await request('register',{...payload,marketing:true});const r=JSON.parse([...storage].find(([k])=>k.startsWith('hub:v1:registration:'))![1]);expect((await request('verify',{token:r.verifyToken})).statusCode).toBe(200);await request('register',{...payload,marketing:true});expect((await request('verify',{token:r.verifyToken})).statusCode).toBe(410);});
 it('keeps original registration and consent history when issuing a new receipt',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T00:00:00Z'));await request('register',{...payload,marketing:true});
  const first=JSON.parse([...storage].find(([k])=>k.startsWith('hub:v1:receipt:'))![1]);await request('verify',{token:first.verifyToken});
  vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));await request('register',{...payload,marketing:false});
  const receipts=[...storage].filter(([k])=>k.startsWith('hub:v1:receipt:')).map(([,v])=>JSON.parse(v));expect(receipts).toHaveLength(2);expect(receipts[1].verifyToken).not.toBe(first.verifyToken);
  await request('verify',{token:receipts[1].verifyToken});expect([...storage].filter(([k])=>k.startsWith('hub:v1:consent:'))).toHaveLength(2);
  const initial=JSON.parse([...storage].find(([k])=>k.startsWith('hub:v1:registration:'))![1]);expect(initial.created).toBe('2026-10-29T00:00:00.000Z');expect(sets.get('hub:v1:registrations')?.size).toBe(1);
 });
 it('serves a real PDF after registration without mail enabled',async()=>{
  const registered=await request('register');const url=new URL((registered.body as {downloads:{url:string}[]}).downloads[0].url);const res=response();
  await handler({query:Object.fromEntries(url.searchParams),method:'GET',headers:{}} as never,res as never);
  expect(res.statusCode).toBe(200);expect(res.headers['Content-Type']).toBe('application/pdf');expect(Buffer.isBuffer(res.body)).toBe(true);expect((res.body as Buffer).subarray(0,4).toString()).toBe('%PDF');expect(sets.get('hub:v1:downloaded')?.size).toBe(1);
 });
 it('withdrawal is sticky against a later verification link',async()=>{
  await request('register',{...payload,marketing:true});const first=JSON.parse([...storage].find(([k])=>k.startsWith('hub:v1:receipt:'))![1]);
  const stop='b'.repeat(64);const {hash}=await import('../_lib/hub');storage.set('hub:v1:unsubscribe:'+hash(stop),JSON.stringify(first.leadId));
  expect((await request('unsubscribe',{token:stop})).statusCode).toBe(200);await request('verify',{token:first.verifyToken});
  const lead=JSON.parse(storage.get('hub:v1:lead:'+first.leadId)!);expect(lead.marketing).toBe(false);expect(lead.unsubscribed).toBe(true);
 });
 it('moves interrupted sends into operator review without resending',async()=>{
  await request('register');const [jobKey,raw]=[...storage].find(([k])=>k.startsWith('hub:v1:job:'))!;const job=JSON.parse(raw);job.state='sending';storage.set(jobKey,JSON.stringify(job));
  vi.stubEnv('HUB_MAIL_ENABLED','true');vi.stubEnv('HUB_ADMIN_KEY','a'.repeat(32));const res=await request('jobs',{}, {authorization:'Bearer '+'a'.repeat(32)});
  expect(res.statusCode).toBe(200);expect(sets.get('hub:v1:mail-review')?.size).toBe(1);expect(sets.get('hub:v1:jobs')?.size).toBe(0);
 });

});
