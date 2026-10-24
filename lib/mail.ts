import type { Order, State } from './model';

export type Notice = State['outbox'][number];
const validEmail = (v:string) => /^[^\s,;<>@]+@[^\s,;<>@]+\.[^\s,;<>@]+$/.test(v) && v.length <= 254 && !v.endsWith('.local');
export const recipientsFor = (s:State, email:string) => [...new Set([...s.recipients, email].map(e=>e.trim().toLowerCase()).filter(validEmail))];
const stamp = (at:string) => new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(at));
const day = (d:string) => d.split('-').reverse().join('/');
export function orderText(o:Order, at:string, event:string, overdue=false) {
 const lines = overdue ? o.lines.filter(l=>l.qty>l.returned&&l.due<localDay(at)) : o.lines;
 return ['MAKINO - KHO VẬT TƯ', event, 'Mã đơn: '+o.id, 'Cập nhật: '+stamp(at)+' (giờ Việt Nam)', 'Kỹ sư: '+(o.name||o.userEmail), 'Gmail: '+o.userEmail, 'Job: '+o.customer, 'Machine Problem: '+o.purpose, 'Trạng thái: '+(o.status==='completed'?'Đã trả hết':o.status==='cancelled'?'Đã hủy':'Đang mượn'), '', ...lines.map(l=>l.name+' ['+l.itemId+'] | Mượn: '+l.qty+' | Đã trả: '+l.returned+' | Còn giữ: '+(l.qty-l.returned)+' | Hẹn trả: '+day(l.due)+' | Hiện trạng lúc mượn: '+l.condition), '', 'Mở app: https://quanlytool.lekhanhtrinh15082022.workers.dev'].join('\n');
}
const escapeHtml = (value:unknown) => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function orderHtml(o:Order,at:string,event:string,overdue=false){
 const esc=escapeHtml, lines=overdue?o.lines.filter(l=>l.qty>l.returned&&l.due<localDay(at)):o.lines;
 const cell='padding:9px 7px;border-bottom:1px solid #dce5ee;text-align:left;vertical-align:top;';
 const row=(label:string,value:string)=>'<p style="margin:6px 0"><b>'+esc(label)+':</b> '+esc(value)+'</p>';
 return '<!doctype html><html lang="vi"><body style="margin:0;padding:16px;background:#f1f5f9;font-family:Arial,sans-serif;color:#18334d"><div style="max-width:720px;margin:auto;background:white;padding:20px;border-radius:12px"><h2 style="color:#1565b0;margin-top:0">MAKINO · Kho vật tư</h2><p>'+esc(event)+'</p>'+row('Kỹ sư',o.name||o.userEmail)+row('Gmail',o.userEmail)+row('Job',o.customer)+row('Machine Problem',o.purpose)+row('Đơn',o.id)+row('Cập nhật',stamp(at)+' · Giờ Việt Nam')+'<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:18px"><thead><tr style="background:#eaf3fc">'+['Vật tư','Mượn','Đã trả','Còn','Hẹn trả'].map(h=>'<th style="'+cell+'">'+h+'</th>').join('')+'</tr></thead><tbody>'+lines.map(l=>'<tr><td style="'+cell+'"><b>'+esc(l.name)+'</b><br><span style="color:#60788e">'+esc(l.itemId)+'</span><br>'+esc(l.condition.slice(0,160))+'</td>'+[l.qty,l.returned,l.qty-l.returned,day(l.due)].map(v=>'<td style="'+cell+'">'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table><p style="margin-top:20px"><a href="https://quanlytool.lekhanhtrinh15082022.workers.dev" style="color:#1565b0">Mở kho vật tư MAKINO</a></p></div></body></html>';
}
export function localDay(at:string) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at)); }
export function overdueNotices(s:State, now=new Date()):Notice[] {
 const at=now.toISOString(), date=localDay(at);
 // Chỉ nhắc từ 08:00 Việt Nam; ngày trả chỉ có ngày nên quá hạn từ ngày kế tiếp.
 if (new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(now)<'08') return [];
 return s.orders.filter(o=>['borrowed','return_pending'].includes(o.status)&&o.lines.some(l=>l.qty>l.returned&&l.due<date)).map(o=>({id:'overdue:'+o.id+':'+date,at,subject:'[MAKINO] Quá hạn trả '+o.id,status:'Đang chờ gửi',to:recipientsFor(s,o.userEmail),text:orderText(o,at,'Nhắc trả vật tư quá hạn',true),html:orderHtml(o,at,'Nhắc trả vật tư quá hạn',true)}));
}
export function mailConfigured(e:Cloudflare.Env) { return !!(e.MAIL_SECRET&&e.MAIL_SECRET.length>=32&&e.MAIL_WEBHOOK_URL&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(e.MAIL_WEBHOOK_URL)); }
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
     const res=await fetch(e.MAIL_WEBHOOK_URL!,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:e.MAIL_SECRET,id:job.id,to:[job.recipient],subject:job.subject,text:content.text,html:content.html}),signal:AbortSignal.timeout(8000),redirect:'follow'});
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
 const configured=mailConfigured(e);
 if(!e.DB||!configured)return {configured,outbox:notices.slice(0,100).map(n=>({...n,status:n.id?'Chưa kết nối gửi Gmail':n.status}))};
 try {
  await schema(e.DB);
  const rows=(await e.DB.prepare('SELECT event_id,subject,created,recipient,status,error FROM mail_jobs ORDER BY created DESC LIMIT 1000').all<{event_id:string;subject:string;created:string;recipient:string;status:string;error:string}>()).results;
  const events=new Map<string,Notice>();
  for(const n of notices.slice(0,100))events.set(n.id||'legacy:'+n.at+':'+n.subject,{...n});
  for(const r of rows)if(r.event_id.startsWith('overdue:')&&!events.has(r.event_id))events.set(r.event_id,{id:r.event_id,at:r.created,subject:r.subject,status:'Đang chờ gửi',to:rows.filter(x=>x.event_id===r.event_id).map(x=>x.recipient)});
  for(const [id,n]of events){if(!n.id)continue;const group=rows.filter(r=>r.event_id===id);n.status=!n.to.length?'Chưa có email nhận':!group.length?'Đang chờ gửi':group.every(r=>r.status==='sent')&&group.length>=n.to.length?'Đã gửi':group.some(r=>r.error==='UNAUTHORIZED')?'Khóa Gmail chưa khớp':group.some(r=>r.error==='DAILY_QUOTA')?'Đợi hạn mức Gmail':group.some(r=>r.status==='failed')?'Gửi lỗi':group.every(r=>r.status==='cancelled')?'Đã bỏ nhắc':'Đang chờ gửi';}
  return {configured,outbox:[...events.values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100)};
 } catch {return {configured,outbox:notices.slice(0,100)};}
}
