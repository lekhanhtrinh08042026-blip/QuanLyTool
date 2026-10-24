export function fullName(value:unknown) {
 const name=typeof value==='string'?value.normalize('NFC').trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>100||/[\p{Cc}\p{Cf}<>]/u.test(name))throw new Error('Họ tên cần từ 2–100 ký tự, không chứa ký tự đặc biệt.');
 return name;
}
export async function profileName(db:D1Database,email:string) {
 await db.prepare('CREATE TABLE IF NOT EXISTS user_profiles (email TEXT PRIMARY KEY NOT NULL, full_name TEXT NOT NULL, created TEXT NOT NULL)').run();
 return (await db.prepare('SELECT full_name FROM user_profiles WHERE email=?').bind(email).first<{full_name:string}>())?.full_name||'';
}
export async function registerName(db:D1Database,email:string,value:unknown) {
 const name=fullName(value);await profileName(db,email);
 // Chỉ điền tên lần đầu, không ghi đè khi hai phiên đăng nhập đồng thời.
 await db.prepare('INSERT OR IGNORE INTO user_profiles(email,full_name,created) VALUES(?,?,?)').bind(email,name,new Date().toISOString()).run();
 return profileName(db,email);
}
