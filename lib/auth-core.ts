export type SessionUser={userId:string;email:string;displayName:string;role:'admin'|'borrower';exp:number;version:string};
export const sessionName='makino_session';
export const normalizeEmail=(s:unknown)=>typeof s==='string'?s.trim().toLowerCase():'';
export const validEmail=(s:string)=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
const to64=(s:string)=>btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const from64=(s:string)=>atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4));
async function key(secret:string){if(secret.length<32)throw new Error('SESSION_SECRET cần tối thiểu 32 ký tự');return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signSession(user:SessionUser,secret:string){const body=to64(String.fromCharCode(...enc.encode(JSON.stringify(user))));const sig=await crypto.subtle.sign('HMAC',await key(secret),enc.encode(body));return body+'.'+to64(String.fromCharCode(...new Uint8Array(sig)));}
export async function readSession(token:string,secret:string,passwordHash:string):Promise<SessionUser|null>{try{if(token.length>3000)return null;const [body,sig,...rest]=token.split('.');if(rest.length||!body||!sig)return null;const valid=await crypto.subtle.verify('HMAC',await key(secret),Uint8Array.from(from64(sig),c=>c.charCodeAt(0)),enc.encode(body));if(!valid)return null;const u=JSON.parse(new TextDecoder().decode(Uint8Array.from(from64(body),c=>c.charCodeAt(0))));if(!['admin','borrower'].includes(u.role)||typeof u.email!=='string'||typeof u.exp!=='number'||u.exp<=Date.now()||u.exp>Date.now()+31*86400000)return null;if(u.role==='admin'&&u.version!==await passwordVersion(passwordHash))return null;if(u.role==='borrower'&&(!validEmail(u.email)||u.userId!=='email:'+u.email))return null;return u;}catch{return null;}}
export async function passwordVersion(hash:string){return hex(await crypto.subtle.digest('SHA-256',enc.encode(hash)));}
export async function verifyPassword(password:string,stored:string){if(password.length>200||!/^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored))return false;const [,iterations,salt,expected]=stored.split(':');const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const result=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:Number(iterations),hash:'SHA-256'},key,256));let diff=0;for(let i=0;i<expected.length;i++)diff|=result.charCodeAt(i)^expected.charCodeAt(i);return diff===0;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
export function cookie(token:string,secure:boolean,maxAge=2592000){return `${sessionName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`;}

