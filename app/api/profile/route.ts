import { env } from 'cloudflare:workers';
import { currentUser } from '../../../lib/session';
import { sameOrigin,normalizeEmail } from '../../../lib/auth-core';
import { registerName } from '../../../lib/profiles';
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Nguồn yêu cầu không hợp lệ'},{status:403});
 const u=await currentUser(),db=(env as Cloudflare.Env).DB;
 if(!u||u.role!=='borrower')return Response.json({error:'Vui lòng đăng nhập User'},{status:401});
 if(!db)return Response.json({error:'Chưa kết nối database'},{status:503});
 try {
  const row=await db.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();
  if(!row||!JSON.parse(row.data).members.some((m:any)=>normalizeEmail(m.email)===u.email))return Response.json({error:'Gmail đã bị thu hồi quyền truy cập'},{status:403});
  const raw=await req.text();if(raw.length>1000)return Response.json({error:'Thông tin quá dài'},{status:400});
  const displayName=await registerName(db,u.email,JSON.parse(raw).displayName);
  return Response.json({ok:true,displayName},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Chưa lưu được họ tên. Nhập từ 2–100 ký tự và thử lại.'},{status:400});}
}
