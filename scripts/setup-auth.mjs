import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {createInterface} from 'node:readline';
console.log('Cấu hình Admin cho MAKINO. Không gửi các giá trị này vào chat hoặc GitHub.');
if(!process.stdin.isTTY)throw new Error('Chạy script trực tiếp trong terminal riêng của bạn.');
const password=await new Promise(resolve=>{let value='';process.stdout.write('Nhập mật khẩu Admin bạn muốn dùng (ẩn ký tự): ');process.stdin.setRawMode(true);process.stdin.resume();const listener=chunk=>{const s=chunk.toString();for(const c of s){if(c==='\r'||c==='\n'){process.stdin.off('data',listener);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value);return;}if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(1);}if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c>=' ')value+=c;}};process.stdin.on('data',listener);});
if(password.length<8||password.length>200)throw new Error('Mật khẩu cần từ 8–200 ký tự.');const salt=randomBytes(16).toString('hex');const hash='pbkdf2:100000:'+salt+':'+pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
console.log('\nTrong Cloudflare > quanlytool > Settings > Variables and Secrets, thêm 2 Secret sau:');console.log('\nSESSION_SECRET\n'+randomBytes(48).toString('hex'));console.log('\nADMIN_PASSWORD_HASH\n'+hash);console.log('\nKhông chia sẻ hoặc chụp màn hình chứa các giá trị trên.');
