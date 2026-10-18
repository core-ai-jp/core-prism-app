import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
const E='11111111-1111-4111-8111-111111111111';
const L='22222222-2222-4222-8222-222222222222';
const R='33333333-3333-4333-8333-333333333333';
const S='44444444-4444-4444-8444-444444444444';
let handler:any,core:any,failCreate=false;
const kv=new Map<string,any>(),pages=new Map<string,any>(),sets=new Map<string,Set<any>>();
const sendMail=vi.fn(async()=>({messageId:'test'}));
vi.mock('nodemailer',()=>({default:{createTransport:()=>({sendMail})}}));
const rich=(s:string)=>({rich_text:[{text:{content:s}}]});
function match(p:any,f:any):boolean {
  if(!f)return true;if(f.and)return f.and.every((x:any)=>match(p,x));if(f.or)return f.or.some((x:any)=>match(p,x));
  const v=p.properties[f.property];
  if(f.rich_text)return (v?.rich_text||[]).map((x:any)=>x.text?.content||x.plain_text).join('')===f.rich_text.equals;
  if(f.title)return (v?.title||[]).map((x:any)=>x.text?.content||x.plain_text).join('')===f.title.equals;
  if(f.checkbox)return v?.checkbox===f.checkbox.equals;
  if(f.select)return v?.select?.name===f.select.equals;
  if(f.relation)return v?.relation?.some((x:any)=>x.id===f.relation.contains);
  throw new Error('Unsupported filter');
}
beforeEach(async()=>{
  vi.resetModules();vi.unstubAllEnvs();kv.clear();pages.clear();sets.clear();sendMail.mockClear();failCreate=false;
  Object.entries({NOTION_API_KEY:'test',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',ACADEMY_EVENTS_DS:E,ACADEMY_LEADS_DS:L,ACADEMY_REGISTRATIONS_DS:R,ACADEMY_SETTINGS_DS:S,ACADEMY_TASKS_DS:'tasks',GMAIL_USER:'test@example.invalid',GMAIL_APP_PASSWORD:'test',LINE_CHANNEL_SECRET:'test-secret'}).forEach(([k,v])=>vi.stubEnv(k,v));
  pages.set(E,{id:E,parent:{data_source_id:E},properties:{テーマ:{title:[{text:{content:'テスト開催'}}]},開催日時:{date:{start:'2099-10-25T13:00:00+09:00'}},公開状態:{checkbox:true},定員:{number:1},募集状況:{select:{name:'募集中'}},会場:rich('テスト会場'),参加費:rich('未確定')}});
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:any={})=>{
    const b=options.body?JSON.parse(options.body):{};
    if(String(url)==='https://redis.test'){
      const [cmd,key,...args]=b;let result:any;
      if(cmd==='SET'){if(args.includes('NX')&&kv.has(key))result=null;else{kv.set(key,args[0]);result='OK';}}
      else if(cmd==='GET')result=kv.get(key)??null;
      else if(cmd==='GETDEL'){result=kv.get(key)??null;kv.delete(key);}
      else if(cmd==='DEL')result=kv.delete(key)?1:0;
      else if(cmd==='INCR'){result=Number(kv.get(key)||0)+1;kv.set(key,result);}
      else if(cmd==='EXPIRE')result=1;
      else if(cmd==='EVAL'){const lockKey=args[1],token=args[2];result=kv.get(lockKey)===token?(kv.delete(lockKey),1):0;}
      else if(cmd==='SADD'){const set=sets.get(key)||new Set();set.add(args[0]);sets.set(key,set);result=1;}
      else if(cmd==='SREM')result=sets.get(key)?.delete(args[0])?1:0;
      else if(cmd==='SCARD')result=sets.get(key)?.size||0;
      else if(cmd==='SMEMBERS')result=[...(sets.get(key)||[])];
      else throw new Error('Unsupported redis '+cmd);
      return Response.json({result});
    }
    if(String(url).startsWith('https://api.notion.com/v1/')){
      const path=String(url).slice('https://api.notion.com/v1/'.length);
      if(path.startsWith('data_sources/')){const ds=path.split('/')[1];return Response.json({results:[...pages.values()].filter(p=>p.parent?.data_source_id===ds&&match(p,b.filter)),has_more:false});}
      if(path==='pages'){
        if(failCreate)return Response.json({error:'unavailable'},{status:503});
        const id=crypto.randomUUID();const page={id,...b};pages.set(id,page);return Response.json(page);
      }
      const id=path.split('/')[1],p=pages.get(id);
      if(!p)return Response.json({error:'missing'},{status:404});
      if(options.method==='PATCH')p.properties={...p.properties,...b.properties};
      return Response.json(p);
    }
    throw new Error('Unexpected external request '+url);
  }));
  core=await import('../academy/_core');handler=(await import('../academy/index')).default;
});
function input(extra={}){return {name:'テスト担当',company:'テスト株式会社',role:'代表',email:'test@example.invalid',phone:'',industry:'製造',aiLevel:'未導入',challenge:'社内資料の整理',consultation:false,marketing:false,privacy:true,eventId:E,source:'test',website:'',...extra};}
async function call(action:string,body?:any,extra:any={}){
  const req:any={method:body===undefined?'GET':'POST',headers:{origin:'https://www.core-ai.jp'},query:{action},body,...extra};
  const res:any={code:200,headers:{},setHeader(k:string,v:any){this.headers[k]=v;return this;},status(n:number){this.code=n;return this;},json(data:any){this.data=data;return this;},redirect(n:number,u:string){this.code=n;this.location=u;return this;}};
  await handler(req,res);return res;
}
describe('Academy validation and public event boundary',()=>{
  it('rejects unknown industry, oversized strings and missing application consent',()=>{
    for(const patch of [{industry:'injected'},{company:'x'.repeat(151)},{privacy:false},{marketing:'true'},{email:'invalid'}])expect(()=>core.validate(input(patch))).toThrow();
  });
  it('normalizes the deduplication identity',()=>{expect(core.validate(input({email:' TEST@EXAMPLE.INVALID '})).email).toBe('test@example.invalid');});
  it('does not publish draft, ended, past, deadline-closed or invalid-capacity events',()=>{
    const p=pages.get(E);expect(core.publicEvent(p)).not.toBeNull();
    for(const props of [{公開状態:{checkbox:false}},{募集状況:{select:{name:'準備中'}}},{開催日時:{date:{start:'2000-01-01'}}},{申込締切:{date:{start:'2000-01-01'}}},{定員:{number:0}}])expect(core.publicEvent({...p,properties:{...p.properties,...props}})).toBeNull();
  });
  it('rejects changed webhook bodies and malformed signature lengths',()=>{
    const body='{"events":[]}',sig=createHmac('sha256','test-secret').update(body).digest('base64');
    expect(core.signature(body,'test-secret',sig)).toBe(true);expect(core.signature(body+' ','test-secret',sig)).toBe(false);expect(core.signature(body,'test-secret','x')).toBe(false);
  });
});
describe('Academy application persistence',()=>{
  it('persists one customer and history, and repeated application cannot overwrite contact or consent',async()=>{
    const first=await call('register',input());expect(first.code).toBe(200);
    const again=await call('register',input({name:'別人の入力',email:'TEST@EXAMPLE.INVALID',marketing:true}));expect(again.code).toBe(200);
    const leads=[...pages.values()].filter(p=>p.parent?.data_source_id===L),regs=[...pages.values()].filter(p=>p.parent?.data_source_id===R);
    expect(leads).toHaveLength(1);expect(regs).toHaveLength(1);expect(core.ptext(leads[0],'氏名')).toBe('テスト担当');expect(leads[0].properties['営業配信同意'].checkbox).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);expect(JSON.stringify(first.data)).not.toContain('leadId');expect(JSON.stringify(first.data)).not.toContain('verifyToken');
  });
  it('places a second attendee on the waitlist at capacity',async()=>{
    await call('register',input());const second=await call('register',input({email:'another@example.invalid'}));expect(second.data.registrationStatus).toBe('キャンセル待ち');
  });
  it('rejects cross-origin requests without external side effects',async()=>{
    const r=await call('register',input(),{headers:{origin:'https://attacker.invalid'}});expect(r.code).toBe(403);expect(kv.size).toBe(0);
  });
  it('fails closed on missing credentials instead of pretending to save',async()=>{
    vi.stubEnv('NOTION_API_KEY','');const r=await call('register',input());expect(r.code).toBe(503);expect(sendMail).not.toHaveBeenCalled();
  });
  it('does not blindly retry an uncertain Notion create',async()=>{
    failCreate=true;expect((await call('register',input())).code).toBe(503);failCreate=false;
    expect((await call('register',input())).code).toBe(503);expect([...pages.values()].filter(p=>p.parent?.data_source_id===L)).toHaveLength(0);
  });
  it('requires the emailed token before LINE identity linking',async()=>{expect((await call('line-start')).code).toBe(401);});
  it('rejects forged webhook events and anonymous job execution',async()=>{
    expect((await call('webhook','{"events":[]}')).code).toBe(401);expect((await call('jobs')).code).toBe(401);
  });
});
