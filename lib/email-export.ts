import type { State } from './model';
export type Delivery={id:string;event_id:string;recipient:string;subject:string;body:string;created:string;status:string;attempts:number;error:string};
export function deliveryStatus(status:string,error=''){
 if(status==='sent')return 'Đã gửi';if(status==='cancelled')return 'Đã bỏ nhắc';if(status==='failed')return 'Gửi lỗi';if(error==='UNAUTHORIZED')return 'Khóa Gmail chưa khớp';if(error==='DAILY_QUOTA')return 'Đợi hạn mức Gmail';return 'Đang chờ gửi';
}
const timestamp=(at:string)=>{const d=new Date(at);return Number.isNaN(d.getTime())?at:new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(d);};
export function emailExportRows(state:Pick<State,'outbox'>,jobs:Delivery[]){
 const records=new Map<string,{at:string;subject:string;recipient:string;status:string;attempts:number;error:string;text:string}>();
 for(const n of state.outbox){
  const id=n.id||'legacy:'+n.at+':'+n.subject;
  for(const recipient of n.to.length?n.to:['']) records.set(id+'|'+recipient.toLowerCase(),{at:n.at,subject:n.subject,recipient,status:!recipient?'Chưa có email nhận':n.status,attempts:0,error:'',text:n.text||''});
 }
 for(const j of jobs){let text=j.body;try{const parsed=JSON.parse(j.body);if(typeof parsed.text==='string')text=parsed.text;}catch{}
  records.set(j.event_id+'|'+j.recipient.toLowerCase(),{at:j.created,subject:j.subject,recipient:j.recipient,status:deliveryStatus(j.status,j.error),attempts:j.attempts,error:j.error,text});
 }
 return [['Thời gian (Việt Nam)','Sự kiện / Tiêu đề','Email nhận','Trạng thái','Số lần thử','Mã lỗi','Nội dung email'],...[...records.values()].sort((a,b)=>b.at.localeCompare(a.at)).map(r=>[timestamp(r.at),r.subject,r.recipient,r.status,r.attempts,r.error,r.text])];
}
export async function allDeliveries(db:D1Database){
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mail_jobs'").first();
 if(!exists)return [];
 return (await db.prepare('SELECT id,event_id,recipient,subject,body,created,status,attempts,error FROM mail_jobs ORDER BY created DESC,id').all<Delivery>()).results;
}
