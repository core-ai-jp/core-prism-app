import {IDS,BOOKING,configured,hash,redis,lock,notion,query,createOnce,patch,title,text,select,relation,date,ptext,nextEvent,publicEvent} from './academy.js';

export function parseLineIntake(value:string) {
  const lines=value.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length!==3)return null;
  const fields:Record<string,string>={};
  for(const line of lines){const match=line.match(/^(名前|氏名|会社名|業種)\s*[:：]\s*(.+)$/);if(!match)return null;const key=match[1]==='氏名'?'名前':match[1];if(fields[key])return null;fields[key]=match[2].trim();}
  if(!fields['名前']||!fields['会社名']||!fields['業種']||fields['名前'].length>100||fields['会社名'].length>150||fields['業種'].length>40||Object.values(fields).some(v=>/[\u0000-\u001f\u007f]/.test(v)))return null;
  return {name:fields['名前'],company:fields['会社名'],industry:fields['業種']};
}
export function isLineIntakeShape(value:string){const lines=value.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);return lines.length===3&&lines.every(line=>/^(名前|氏名|会社名|業種)\s*[:：]/.test(line));}
export function isLineIntakeStart(value:string){return /^(?:CORE\s*)?Academy\s*(?:申込|申し込み)$/i.test(value.trim());}
function retryId(eventId:string){const h=hash('line-intake:'+eventId);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}

// A follow only offers the form. Customer data is created after the person sends
// the three explicitly requested fields, following the privacy-purpose notice.
export async function handleLineIntake(e:any,enqueue:(key:string,value:unknown)=>Promise<void>) {
  if(e.source?.type!=='user')return false;
  const message=e.type==='message'&&e.message?.type==='text'?String(e.message.text):'';
  const start=e.type==='follow'||isLineIntakeStart(message),input=message?parseLineIntake(message):null;
  if(!start&&!isLineIntakeShape(message))return false;
  if(!configured()){if(e.type==='follow')return true;throw new Error('INTAKE_NOT_CONFIGURED');}
  const uid=e.source.userId,pendingKey='academy:line-intake:'+hash(uid);
  const reply=async(message:string,registrationId?:string)=>enqueue('line-message:'+e.webhookEventId,{kind:'line-message',userId:uid,message,retryKey:retryId(e.webhookEventId),...(registrationId?{registrationId}:{})});
  const rate='academy:line-intake-rate:'+hash(uid)+':'+new Date().toISOString().slice(0,16);
  const count=await redis(['INCR',rate]);await redis(['EXPIRE',rate,120]);if(count>10)return true;
  if(start){
    const event=await nextEvent();
    await redis(['SET',pendingKey,JSON.stringify({eventId:event?.id||''}),'EX',1800]);
    await reply('【CORE Academy｜かんたん申込】\n'+(event?new Date(event.start).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+'／'+event.theme+'\n会場：'+event.venue+'／参加費：'+event.fee+'\n':'次回開催の先行案内受付です。\n')+'\n以下の3項目を1通でお送りください。\n\n名前：\n会社名：\n業種：\n\n送信いただく情報は、株式会社COREが申込受付・開催連絡・ご希望の相談対応に利用し、Notion顧客リストへ記録します。利用目的をご確認・同意のうえお送りください。営業情報の配信登録は行いません。\nプライバシーポリシー：https://www.core-ai.jp/privacy\n\n入力期限は30分です。やり直す場合は「Academy申込」と送信してください。');
    return true;
  }
  if(!input){await reply('名前・会社名・業種をそれぞれ入力し、3行をまとめてお送りください。名前は100文字、会社名は150文字、業種は40文字までです。\n\n名前：\n会社名：\n業種：');return true;}
  const raw=await redis(['GET',pendingKey]);
  if(!raw){await reply('先に「Academy申込」と送信して、開催情報と個人情報の利用目的をご確認ください。その後、名前・会社名・業種の3項目をお送りいただけます。');return true;}
  const pending=JSON.parse(raw);
  const event=pending.eventId?publicEvent(await notion('pages/'+pending.eventId)):null;
  if(pending.eventId&&!event){await reply('開催の受付状況が変わりました。「Academy申込」と送信して最新の案内をご確認ください。');await redis(['DEL',pendingKey]);return true;}
  await lock('line:'+hash(uid),async()=>{
    const existing=await query(IDS.leads,{property:'LINE ID',rich_text:{equals:uid}});
    if(existing.length>1)throw new Error('DUPLICATE_REQUIRES_REVIEW');
    const key=existing[0]?(ptext(existing[0],'顧客キー')||hash('line:'+uid)):hash('line:'+uid);
    const lead=existing[0]||await createOnce(IDS.leads,'顧客キー',key,{'氏名':title(input!.name),'会社名':text(input!.company),'業種':select(input!.industry),'顧客キー':text(key),'流入元':text('LINE公式／CORE Academy'),'LINE ID':text(uid),'LINE連携状況':select('連携済み'),'営業配信同意':{checkbox:false},'同意日時':date(),'相談希望':{checkbox:false},'営業ステータス':select(event?'申込済み':'新規リード'),'最終接点':date(),'次回アクション':text('開催案内・希望に応じたTimeRex個別相談')});
    // Only the authenticated LINE-native customer may refresh their three fields.
    if(key===hash('line:'+uid)&&!lead.properties?.['メール']?.email)await patch(lead.id,{'氏名':title(input!.name),'会社名':text(input!.company),'業種':select(input!.industry),'LINE ID':text(uid),'LINE連携状況':select('連携済み'),'最終接点':date()});
    await lock('event:'+(event?.id||'advance'),async()=>{
      const regKey=hash(key+':'+(event?.id||'advance'));
      const old=await query(IDS.registrations,{property:'申込ID',title:{equals:regKey}});
      if(old.length>1)throw new Error('DUPLICATE_REQUIRES_REVIEW');
      let status=old[0]?.properties['参加状況']?.select?.name||'先行案内';
      const reapply=old[0]?.properties['参加状況']?.select?.name==='キャンセル';
      if(reapply)status=event?'申込済み':'先行案内';
      if((!old.length||reapply)&&event){
        const histories=await query(IDS.registrations,{property:'開催',relation:{contains:event.id}});
        for(const row of histories)if(['キャンセル','欠席'].includes(row.properties['参加状況']?.select?.name))await redis(['SREM','academy:seats:'+event.id,ptext(row,'申込ID')]);
        const reserved=await redis(['SCARD','academy:seats:'+event.id]);
        status=event.status==='満席'||Math.max(histories.filter(r=>['申込済み','参加済み'].includes(r.properties['参加状況']?.select?.name)).length,reserved)>=event.capacity?'キャンセル待ち':'申込済み';
        if(status==='申込済み')await redis(['SADD','academy:seats:'+event.id,regKey]);
      }
      const registration=old[0]||await createOnce(IDS.registrations,'申込ID',regKey,{'申込ID':title(regKey),'顧客':relation(lead.id),...(event?{'開催':relation(event.id)}:{}),'申込日':date(),'参加状況':select(status),'相談希望':{checkbox:false},'営業配信同意':{checkbox:false},'流入元':text('LINE公式／CORE Academy'),'フォロー状況':select('未対応'),'受付通知':select('未送信')});
      if(reapply)await patch(registration.id,{'参加状況':select(status),'申込日':date(),'フォロー状況':select('未対応'),'受付通知':select('未送信')});
      if(event)await enqueue('count:'+event.id,{kind:'count',eventId:event.id});
      await reply('【CORE Academy】受付しました。\n受付区分：'+status+'\n'+(reapply?'再申込として受け付けました。\n':old.length?'同じ開催回への重複登録は行っていません。\n':'')+'\n無料個別相談をご希望の方は、こちらから井出直毅の空き日程をご予約ください。\n'+BOOKING+'\n\n会場・参加費などの確定条件をご確認いただいてから参加をお決めいただけます。\n営業情報の配信には登録していません。配信停止は「配信停止」と送信してください。',registration.id);
    });
  });
  await redis(['DEL',pendingKey]);
  return true;
}
