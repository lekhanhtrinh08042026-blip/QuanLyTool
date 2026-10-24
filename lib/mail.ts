import type { Order, State } from './model';

export type Notice = State['outbox'][number];
const validEmail = (v:string) => /^[^\s,;<>@]+@[^\s,;<>@]+\.[^\s,;<>@]+$/.test(v) && v.length <= 254 && !v.endsWith('.local');
export const recipientsFor = (s:State, email:string) => [...new Set([...s.recipients, email].map(e=>e.trim().toLowerCase()).filter(validEmail))];
const stamp = (at:string) => new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
const day = (d:string) => d.split('-').reverse().join('/');
function emailView(o:Order,at:string,event:string,overdue=false){
 const lines=overdue?o.lines.filter(l=>l.qty>l.returned&&l.due<localDay(at)):o.lines;
 const normalized=event.toLocaleLowerCase('vi');
 const kind=overdue?'overdue':/trả|nhận trả/.test(normalized)?'return':/mượn|bàn giao/.test(normalized)&&lines.every(l=>l.returned===0)?'borrow':'update';
 const remaining=lines.filter(l=>l.qty>l.returned),dated=kind==='return'?remaining:lines;
 const dates=[...new Set(dated.map(l=>l.due))];
 return {lines,kind,remaining,commonDue:dates.length===1?dates[0]:'',title:kind==='borrow'?'Đã mượn vật tư':kind==='return'?'Đã trả vật tư':kind==='overdue'?'Nhắc trả vật tư':'Cập nhật đơn vật tư',status:o.status==='completed'?'Đã trả hết':o.status==='cancelled'?'Đã hủy':overdue?'Quá hạn':kind==='return'?'Trả một phần':'Đang mượn'};
}
export function orderText(o:Order,at:string,event:string,overdue=false){
 const v=emailView(o,at,event,overdue);
 const rows=v.lines.map((l,i)=>[
  (i+1)+'. '+l.name+' ['+l.itemId+']',
  v.kind==='borrow'?'   Số lượng mượn: '+l.qty:v.kind==='overdue'?'   Còn giữ: '+(l.qty-l.returned):'   Đã mượn: '+l.qty+' · Đã trả: '+l.returned+' · Còn giữ: '+(l.qty-l.returned),
  !v.commonDue?'   Hẹn trả: '+day(l.due):'',
  l.condition!=='Tốt'?'   Hiện trạng lúc mượn: '+l.condition:''
 ].filter(Boolean).join('\n')).join('\n\n');
 return ['MAKINO · FSE HCM',v.title+' · '+o.id,'Cập nhật: '+stamp(at)+' (giờ Việt Nam)','', 'Kỹ sư: '+(o.name||o.userEmail),'Gmail: '+o.userEmail,'Job: '+o.customer,'Machine Problem: '+o.purpose,'Trạng thái: '+v.status,v.commonDue?'Hẹn trả chung: '+day(v.commonDue):'','',rows,'',v.lines.every(l=>l.condition==='Tốt')?'Hiện trạng lúc mượn: Tất cả vật tư tốt.':'',v.kind==='update'?event:'','Mở đơn: https://quanlytool.lekhanhtrinh15082022.workers.dev'].filter((x,i,a)=>x!==''||a[i-1]!=='').join('\n');
}
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function orderHtml(o:Order,at:string,event:string,overdue=false){
 const esc=escapeHtml,v=emailView(o,at,event,overdue),blue='#0755a6';
 const cell='padding:13px 8px;border-bottom:1px solid #e5ecf3;vertical-align:middle;';
 const number=(n:number)=>'<td style="'+cell+'text-align:center;font-size:18px;font-weight:bold;color:'+blue+'">'+n+'</td>';
 const label='font-size:11px;font-weight:bold;letter-spacing:.7px;color:#667c90;margin-bottom:5px;';
 const count=v.lines.reduce((n,l)=>n+(v.kind==='overdue'?l.qty-l.returned:l.qty),0);
 const headers=v.kind==='borrow'?['VẬT TƯ','SL MƯỢN']:v.kind==='overdue'?['VẬT TƯ','CÒN GIỮ']:['VẬT TƯ','MƯỢN','ĐÃ TRẢ','CÒN'];
 const duePanel=v.commonDue?'<table role="presentation" width="100%" cellspacing="0" style="margin-top:12px;border:1px solid #f0d69e;background:#fff9ec;border-radius:9px"><tr><td style="padding:13px 15px"><div style="'+label+'color:#87612e">'+(overdue?'HẸN TRẢ ĐÃ QUÁ HẠN':v.kind==='return'?'HẸN TRẢ PHẦN CÒN LẠI':'HẸN TRẢ TẤT CẢ VẬT TƯ')+'</div><b style="font-size:19px;color:#75501d">'+day(v.commonDue)+'</b></td></tr></table>':'';
 const rows=v.lines.map(l=>'<tr><td style="'+cell+'"><strong style="font-size:15px;line-height:1.5;color:#123b61">'+esc(l.name)+'</strong><div style="font-size:11px;color:#718697;margin-top:4px">'+esc(l.itemId)+'</div>'+(!v.commonDue&&!(v.kind==='return'&&l.qty===l.returned)?'<div style="font-size:11px;color:#87612e;margin-top:5px">Hẹn trả: <b>'+day(l.due)+'</b></div>':'')+(l.condition!=='Tốt'?'<div style="font-size:11px;color:#805a2c;margin-top:5px">Lúc mượn: '+esc(l.condition.slice(0,200))+'</div>':'')+'</td>'+(v.kind==='borrow'?number(l.qty):v.kind==='overdue'?number(l.qty-l.returned):number(l.qty)+number(l.returned)+number(l.qty-l.returned))+'</tr>').join('');
 const condition=v.lines.every(l=>l.condition==='Tốt')?'<p style="font-size:12px;line-height:1.6;color:#347454;background:#edf8f2;border-radius:7px;padding:12px;margin:14px 0 20px"><b>Hiện trạng lúc mượn:</b> Tất cả vật tư tốt.</p>':'';
 const statusColor=overdue?'#9b4939':o.status==='completed'?'#24734e':'#276693';
 return '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;color:#18334d;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellspacing="0" style="background:#edf2f7"><tr><td align="center" style="padding:16px 8px"><table role="presentation" width="100%" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #dbe5ef;border-radius:12px;overflow:hidden"><tr><td style="padding:24px 20px 20px;background:'+blue+';color:white"><div style="font-size:11px;letter-spacing:1.6px;font-weight:bold;color:#d6eaff">MAKINO · FSE HCM</div><h1 style="font-size:25px;line-height:1.3;margin:13px 0 9px;color:#fff">'+v.title+'</h1><div style="font-size:12px;line-height:1.6;color:#deecff">'+esc(o.id)+' &nbsp;·&nbsp; '+esc(stamp(at))+'</div></td></tr><tr><td style="padding:20px"><div style="'+label+'">KỸ SƯ MƯỢN</div><div style="font-size:24px;font-weight:800;line-height:1.35;color:#123456">'+esc(o.name||o.userEmail)+'</div><div style="font-size:11px;line-height:1.6;color:#687d90;word-break:break-word;margin-top:4px">'+esc(o.userEmail)+'</div><p style="font-size:11px;margin:10px 0 0;color:'+statusColor+';font-weight:bold">'+v.status+'</p><table role="presentation" width="100%" cellspacing="0" style="margin-top:17px;background:#f3f7fb;border-radius:9px"><tr><td style="padding:14px 15px 10px"><div style="'+label+'">JOB</div><strong style="font-size:17px;color:#173b5f">'+esc(o.customer)+'</strong></td></tr><tr><td style="padding:0 15px 14px"><div style="border-top:1px solid #dce6ef;padding-top:11px;'+label+'">MACHINE PROBLEM</div><div style="font-size:14px;line-height:1.6;color:#173b5f">'+esc(o.purpose)+'</div></td></tr></table>'+duePanel+'<table role="presentation" width="100%" cellspacing="0" style="margin:22px 0 10px"><tr><td style="font-size:16px;font-weight:bold">'+(overdue?'Vật tư cần trả':v.kind==='borrow'?'Vật tư đã mượn':'Tình trạng trả vật tư')+'</td><td style="text-align:right;font-size:11px;color:#60778d">'+v.lines.length+' loại'+(v.kind==='borrow'||overdue?' · '+count+' món':'')+'</td></tr></table><table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:13px"><thead><tr style="background:#edf4fc">'+headers.map((h,i)=>'<th style="padding:10px 6px;text-align:'+(i?'center':'left')+';font-size:10px;color:#526b83;'+(i?'width:52px':'')+'">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'+condition+(v.kind==='update'?'<p style="font-size:12px;line-height:1.6">'+esc(event)+'</p>':'')+'<table role="presentation" width="100%" cellspacing="0" style="margin-top:20px"><tr><td align="center" style="border-radius:7px;background:'+blue+'"><a href="https://quanlytool.lekhanhtrinh15082022.workers.dev" style="display:block;padding:15px 8px;color:#fff;text-decoration:none;font-weight:bold;font-size:13px">Xem đơn trong kho MAKINO →</a></td></tr></table><p style="font-size:10px;line-height:1.6;color:#8091a0;text-align:center;margin:13px 0 0">Thông báo tự động · Thời gian theo giờ Việt Nam</p></td></tr></table></td></tr></table></body></html>';
}

export function localDay(at:string) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at)); }
export function overdueNotices(s:State, now=new Date()):Notice[] {
 const at=now.toISOString(), date=localDay(at);
 // Chỉ nhắc từ 08:00 Việt Nam; ngày trả chỉ có ngày nên quá hạn từ ngày kế tiếp.
 if (new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(now)<'08') return [];
 return s.orders.filter(o=>['borrowed','return_pending'].includes(o.status)&&o.lines.some(l=>l.qty>l.returned&&l.due<date)).map(o=>({id:'overdue:'+o.id+':'+date,at,subject:'[MAKINO] Quá hạn trả '+o.id,status:'Đang chờ gửi',to:recipientsFor(s,o.userEmail),text:orderText(o,at,'Nhắc trả vật tư quá hạn',true),html:orderHtml(o,at,'Nhắc trả vật tư quá hạn',true)}));
}
export function mailSetup(e:Cloudflare.Env){
 const secret=e.MAIL_SECRET?.trim()||'',url=e.MAIL_WEBHOOK_URL?.trim()||'';
 const message=!secret?'Thiếu MAIL_SECRET trên Cloudflare. Thêm khóa dưới dạng Secret.':secret.length<32?'MAIL_SECRET chưa đúng: cần dán toàn bộ khóa từ Apps Script.':!url?'Thiếu MAIL_WEBHOOK_URL trên Cloudflare.':!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)?'MAIL_WEBHOOK_URL chưa đúng. Dùng URL ứng dụng web kết thúc bằng /exec.':'';
 return {configured:!message,message};
}
export function mailConfigured(e:Cloudflare.Env){return mailSetup(e).configured;}
async function schema(db:D1Database) {
 await db.prepare("CREATE TABLE IF NOT EXISTS mail_jobs (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '')").run();
}
async function jobId(id:string, email:string) { const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id+':'+email));return Array.from(new Uint8Array(b),b=>b.toString(16).padStart(2,'0')).join(''); }
export async function mailCycle(e:Cloudflare.Env, reminders=false) {
 if(!e.DB||!mailConfigured(e)) return;
 const db=e.DB; await schema(db);
 const row=await db.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();if(!row)return;
 const state:State=JSON.parse(row.data);
 const notices=[...state.outbox.filter(n=>n.id&&n.text),...(reminders?overdueNotices(state):[])];
 const known=new Set((await db.prepare('SELECT id FROM mail_jobs').all<{id:string}>()).results.map(r=>r.id));
 for(const n of notices)for(const to of n.to.filter(validEmail)) {
   const id=await jobId(n.id!,to); if(known.has(id))continue;
   await db.prepare('INSERT OR IGNORE INTO mail_jobs(id,event_id,recipient,subject,body,created) VALUES(?,?,?,?,?,?)').bind(id,n.id!,to,n.subject.slice(0,200),JSON.stringify({text:n.text!.slice(0,20000),html:n.html&&n.html.length<=100000?n.html:undefined}),n.at).run();known.add(id);
 }
 const now=Date.now();
 const jobs=await db.prepare("SELECT * FROM mail_jobs WHERE status='pending' AND next_attempt<=? AND lease_until<? ORDER BY created,id LIMIT 8").bind(now,now).all<{id:string;event_id:string;recipient:string;subject:string;body:string;attempts:number}>();
 const started=Date.now();
 for(const job of jobs.results) {
   if(Date.now()-started>20000)break;
   // Bỏ nhắc cũ khi đơn đã trả hoặc được gia hạn.
   if(job.event_id.startsWith('overdue:')) {
     const fresh=await db.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();
     const active=fresh&&overdueNotices(JSON.parse(fresh.data)).some(n=>n.id===job.event_id&&n.to.includes(job.recipient));
     if(!active){await db.prepare("UPDATE mail_jobs SET status='cancelled' WHERE id=? AND status='pending'").bind(job.id).run();continue;}
   }
   const claim=await db.prepare("UPDATE mail_jobs SET lease_until=?,attempts=attempts+1 WHERE id=? AND status='pending' AND lease_until<? AND next_attempt<=?").bind(Date.now()+120000,job.id,Date.now(),Date.now()).run();
   if(!claim.meta.changes)continue;
   let error='NETWORK';
   try {
     let content:{text:string;html?:string}={text:job.body};try{const parsed=JSON.parse(job.body);if(typeof parsed.text==='string')content=parsed;}catch{}
     const res=await fetch(e.MAIL_WEBHOOK_URL!.trim(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:e.MAIL_SECRET!.trim(),id:job.id,to:[job.recipient],subject:job.subject,text:content.text,html:content.html}),signal:AbortSignal.timeout(8000),redirect:'follow'});
     const data:any=await res.json();
     if(res.ok&&data.ok===true){await db.prepare("UPDATE mail_jobs SET status='sent',lease_until=0,error='' WHERE id=?").bind(job.id).run();continue;}
     error=['UNAUTHORIZED','DAILY_QUOTA','BUSY','INVALID_REQUEST','INVALID_ID','INVALID_RECIPIENT','INVALID_MESSAGE','SEND_FAILED'].includes(data.error)?data.error:'WEBHOOK';
   } catch { /* Không ghi khóa hoặc nội dung thư ra log. */ }
   // Hạn mức chờ 24 giờ; lỗi mạng thử tối đa 5 lần. Khóa sai chờ sửa cấu hình.
   const retryable=error==='DAILY_QUOTA'||error==='UNAUTHORIZED';
   const delay=error==='DAILY_QUOTA'?24*3600000:error==='UNAUTHORIZED'?3600000:Math.min(6*3600000,300000*Math.pow(2,job.attempts));
   await db.prepare('UPDATE mail_jobs SET status=?,error=?,next_attempt=?,lease_until=0 WHERE id=?').bind(!retryable&&job.attempts+1>=5?'failed':'pending',error,Date.now()+delay,job.id).run();
   if(retryable)break;
 }
}
export async function emailOverview(e:Cloudflare.Env, notices:Notice[]) {
 const {configured,message}=mailSetup(e);
 if(!e.DB||!configured)return {configured,message,outbox:notices.slice(0,100).map(n=>({...n,status:n.id?'Chưa kết nối gửi Gmail':n.status}))};
 try {
  await schema(e.DB);
  const rows=(await e.DB.prepare('SELECT event_id,subject,created,recipient,status,error FROM mail_jobs ORDER BY created DESC LIMIT 1000').all<{event_id:string;subject:string;created:string;recipient:string;status:string;error:string}>()).results;
  const events=new Map<string,Notice>();
  for(const n of notices.slice(0,100))events.set(n.id||'legacy:'+n.at+':'+n.subject,{...n});
  for(const r of rows)if(r.event_id.startsWith('overdue:')&&!events.has(r.event_id))events.set(r.event_id,{id:r.event_id,at:r.created,subject:r.subject,status:'Đang chờ gửi',to:rows.filter(x=>x.event_id===r.event_id).map(x=>x.recipient)});
  for(const [id,n]of events){if(!n.id)continue;const group=rows.filter(r=>r.event_id===id);n.status=!n.to.length?'Chưa có email nhận':!group.length?'Đang chờ gửi':group.every(r=>r.status==='sent')&&group.length>=n.to.length?'Đã gửi':group.some(r=>r.error==='UNAUTHORIZED')?'Khóa Gmail chưa khớp':group.some(r=>r.error==='DAILY_QUOTA')?'Đợi hạn mức Gmail':group.some(r=>r.status==='failed')?'Gửi lỗi':group.every(r=>r.status==='cancelled')?'Đã bỏ nhắc':'Đang chờ gửi';}
  return {configured,message,outbox:[...events.values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100)};
 } catch {return {configured,message,outbox:notices.slice(0,100)};}
}
