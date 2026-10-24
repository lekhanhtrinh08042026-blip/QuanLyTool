import { env } from 'cloudflare:workers';
import { currentUser } from '../../../lib/session';
import { workbook } from '../../../lib/excel';
import { emailExportRows,allDeliveries } from '../../../lib/email-export';
import type { State } from '../../../lib/model';
export async function GET(req:Request){
 const u=await currentUser();if(u?.role!=='admin')return Response.json({error:'Chỉ Admin được xuất Excel'},{status:403});
 const db=(env as Cloudflare.Env).DB;if(!db)return Response.json({error:'Chưa kết nối database'},{status:503});
 const row=await db.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();
 const s:State=row?JSON.parse(row.data):{items:[],outbox:[]};
 const email=new URL(req.url).searchParams.get('type')==='email';
 const rows:(string|number)[][]=email?emailExportRows(s,await allDeliveries(db)):[['Mã','Tên vật tư','Tên tắt','Phân loại','Đơn vị','Tổng số lượng','Sẵn sàng','Cần kiểm tra','Vị trí','Hiện trạng'],...s.items.filter(i=>!i.deleted).map(i=>[i.id,i.name,i.aliases,i.category,i.unit,i.total,i.available,i.repair,i.location,i.condition||'Tốt'])];
 const bytes=workbook(rows,{sheetName:email?'Su kien email':'Ton kho',widths:email?[25,60,36,28,14,25,100]:undefined});
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="'+(email?'MAKINO-su-kien-email':'MAKINO-ton-kho')+'.xlsx"','Cache-Control':'no-store'}});
}
