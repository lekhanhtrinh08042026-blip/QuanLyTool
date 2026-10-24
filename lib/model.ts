export type Item={deleted?:boolean;condition?:string;conditionImages?:string[];id:string;name:string;aliases:string;category:string;unit:string;total:number;available:number;repair:number;location:string;image:string;notes:{at:string;by:string;text:string;image?:string;images?:string[]}[]};
export type Line={itemId:string;name:string;qty:number;returned:number;due:string;condition:string};
export type Order={returnKeys?:string[];id:string;key:string;userId:string;userEmail:string;name:string;customer:string;purpose:string;created:string;status:string;lines:Line[];returnRequest?:{itemId:string;qty:number;bad:number;reason:string}[];extension?:{date:string;reason:string};history:{at:string;by:string;text:string}[]};
export type State={categories?:string[];items:Item[];orders:Order[];members:{email:string;role:string}[];recipients:string[];audit:{at:string;by:string;text:string}[];outbox:{id?:string;text?:string;at:string;subject:string;status:string;to:string[]}[];counter:number};
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const emptyState=():State=>({items:[],orders:[],members:[],recipients:[],audit:[],outbox:[],counter:0});
export function samples():Item[]{return [
 ['Đồng hồ vạn năng','multimeter đồng hồ đo điện','Thiết bị đo','cái',5,'A1 · Ngăn 01','meter'],
 ['Thước cặp điện tử','caliper thước đo','Thiết bị đo','cái',4,'A1 · Ngăn 02','caliper'],
 ['Bộ lục giác','allen hex chìa lục giác','Dụng cụ','bộ',8,'B1 · Ngăn 01','hex'],
 ['Máy khoan cầm tay','drill khoan pin','Dụng cụ','cái',3,'B2 · Ngăn 01','drill'],
 ['Đồng hồ so','dial indicator','Thiết bị đo','cái',6,'A2 · Ngăn 01','dial'],
 ['Cáp kết nối USB','dây usb cable','Phụ kiện','cái',12,'C1 · Ngăn 03','cable']
 ].map((a,i)=>({id:`0${i<2||i===4?1:i===5?3:2}-${String(i+1).padStart(4,'0')}`,name:String(a[0]),aliases:String(a[1]),category:String(a[2]),unit:String(a[3]),total:Number(a[4]),available:Number(a[4]),repair:0,location:String(a[5]),image:'',notes:[]}));}
