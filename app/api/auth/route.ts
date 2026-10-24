import { env } from 'cloudflare:workers';
import { profileName,registerName } from '../../../lib/profiles';
import { signingSecret } from '../../../lib/runtime-auth';
import { cookie,normalizeEmail,validEmail,verifyPassword,passwordVersion,signSession,sameOrigin,validPasswordHash,temporaryAdminDeadline } from '../../../lib/auth-core';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(){const until=temporaryAdminDeadline((env as Cloudflare.Env).TEMP_ADMIN_NO_PASSWORD_UNTIL);return json({temporaryAdminUntil:until?new Date(until).toISOString():null});}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nguồn yêu cầu không hợp lệ'},403);
 const e=env as Cloudflare.Env;
 try{const raw=await req.text();if(raw.length>3000)return json({error:'Yêu cầu không hợp lệ'},400);const body=JSON.parse(raw);const secure=new URL(req.url).protocol==='https:';
 if(body.action==='logout')return json({ok:true},200,{'Set-Cookie':cookie('',secure,0)});
 const deadline=temporaryAdminDeadline(e.TEMP_ADMIN_NO_PASSWORD_UNTIL);const temporaryAdmin=body.role==='admin'&&deadline>0;const passwordHash=e.ADMIN_PASSWORD_HASH||'';
 if(!e.DB)return json({error:'Chưa kết nối database D1. Chủ kho cần hoàn tất thiết lập cloud.'},503);
 const sessionSecret=await signingSecret(e);
 if(!sessionSecret||(!e.ADMIN_PASSWORD_HASH&&!deadline))return json({error:'Chưa cấu hình đăng nhập. Chủ kho cần thêm SESSION_SECRET và ADMIN_PASSWORD_HASH.'},503);
 if(body.role==='admin'&&!temporaryAdmin&&!validPasswordHash(passwordHash))return json({error:'ADMIN_PASSWORD_HASH trên Cloudflare chưa đúng định dạng. Cần dán toàn bộ chuỗi pbkdf2 từ công cụ tạo mật khẩu, không điền mật khẩu trực tiếp.'},503);
 if(sessionSecret.length<32)return json({error:'Cấu hình đăng nhập chưa hợp lệ'},503);
 const ip=req.headers.get('CF-Connecting-IP')||'local';const dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));const key=(temporaryAdmin?'temporary-admin:':body.role==='admin'?'admin:':'user:')+Array.from(new Uint8Array(dig)).map(x=>x.toString(16).padStart(2,'0')).join('');const window=Math.floor(Date.now()/900000);
 await e.DB.prepare('INSERT INTO login_limits (id, window, count) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window').bind(key,window).run();const attempts=await e.DB.prepare('SELECT count FROM login_limits WHERE id=?').bind(key).first<{count:number}>();if((attempts?.count||0)>(body.role==='admin'&&!temporaryAdmin?10:40))return json({error:'Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.'},429);
 let email='',displayName='',role:'admin'|'borrower'='borrower';
 if(body.role==='admin'){if(!temporaryAdmin&&!await verifyPassword(String(body.password||''),passwordHash))return json({error:'Mật khẩu Admin không đúng'},401);role='admin';email='admin@makino.local';displayName='Chủ kho';}
 else if(body.role==='borrower'){email=normalizeEmail(body.email);if(!validEmail(email))return json({error:'Nhập địa chỉ Gmail hợp lệ'},400);const row=await e.DB.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();if(!row||!JSON.parse(row.data).members.some((m:any)=>normalizeEmail(m.email)===email))return json({error:'Gmail chưa được chủ kho thêm vào danh sách'},403);displayName=await profileName(e.DB,email);if(!displayName){if(!body.displayName)return json({needsName:true});try{displayName=await registerName(e.DB,email,body.displayName);}catch(error){return json({error:error instanceof Error?error.message:'Họ tên không hợp lệ'},400);}}}
 else return json({error:'Vai trò không hợp lệ'},400);
 const user={userId:role==='admin'?'admin':'email:'+email,email,displayName,role,exp:temporaryAdmin?deadline:Date.now()+30*86400000,temporaryAdmin,version:role==='admin'?await passwordVersion(passwordHash):''};const token=await signSession(user,sessionSecret);return json({ok:true},200,{'Set-Cookie':cookie(token,secure,temporaryAdmin?Math.max(1,Math.floor((deadline-Date.now())/1000)):2592000)});
 }catch(error){console.error('Auth setup or database error',error instanceof Error?error.name:'Unknown');return json({error:'Chưa thể đăng nhập. Kiểm tra database và migration cloud.'},503);}
}
