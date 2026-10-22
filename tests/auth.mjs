import assert from 'node:assert/strict';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {signSession,readSession,verifyPassword,passwordVersion,cookie,normalizeEmail,validEmail,sameOrigin,validPasswordHash,temporaryAdminDeadline} from '../lib/auth-core.ts';
const salt=randomBytes(16).toString('hex');const hash='pbkdf2:100000:'+salt+':'+pbkdf2Sync('test-only-password',salt,100000,32,'sha256').toString('hex');const secret=randomBytes(48).toString('hex');let count=0;
const test=async(name,fn)=>{await fn();count++;console.log('PASS '+name)};
await test('Password hash accepts correct and rejects wrong',async()=>{assert.equal(await verifyPassword('test-only-password',hash),true);assert.equal(await verifyPassword('wrong',hash),false)});
const admin={userId:'admin',email:'admin@makino.local',displayName:'Chủ kho',role:'admin',exp:Date.now()+86400000,version:await passwordVersion(hash)};const token=await signSession(admin,secret);
await test('Unicode admin signed session',async()=>assert.equal((await readSession(token,secret,hash)).displayName,'Chủ kho'));
await test('Tampered session rejected',async()=>{const [b,s]=token.split('.');assert.equal(await readSession(b+'.'+(s[0]==='a'?'b':'a')+s.slice(1),secret,hash),null)});
await test('Secret rotation invalidates session',async()=>assert.equal(await readSession(token,randomBytes(48).toString('hex'),hash),null));
await test('Password change invalidates admin session',async()=>assert.equal(await readSession(token,secret,'different'),null));
await test('Expired session rejected',async()=>assert.equal(await readSession(await signSession({...admin,exp:Date.now()-1},secret),secret,hash),null));
await test('User token stays borrower',async()=>{const user={userId:'email:a@gmail.com',email:'a@gmail.com',displayName:'a',role:'borrower',exp:Date.now()+86400000,version:''};assert.equal((await readSession(await signSession(user,secret),secret,hash)).role,'borrower')});
await test('Cookie flags and CSRF origin',async()=>{assert.match(cookie(token,true),/HttpOnly/);assert.match(cookie(token,true),/Secure/);assert.match(cookie(token,true),/SameSite=Lax/);assert.equal(sameOrigin(new Request('https://example.test/api/auth',{headers:{origin:'https://evil.test'}})),false)});
await test('Email normalized and validated',async()=>{assert.equal(normalizeEmail(' A@Gmail.com '),'a@gmail.com');assert.equal(validEmail('wrong'),false)});
await test('Copied outer whitespace accepted',async()=>assert.equal(await verifyPassword('test-only-password',' '+hash+'\r\n'),true));
await test('Malformed config differs from password mismatch',async()=>{assert.equal(validPasswordHash('ADMIN_PASSWORD_HASH'),false);assert.equal(validPasswordHash('12012003'),false);assert.equal(validPasswordHash(hash),true)});
await test('Temporary admin requires active window and expires with it',async()=>{const until=new Date(Date.now()+60000).toISOString();const tmp={...admin,temporaryAdmin:true,exp:Date.parse(until)};const signed=await signSession(tmp,secret);assert.equal((await readSession(signed,secret,hash,until)).role,'admin');assert.equal(await readSession(signed,secret,hash),null);assert.equal(await readSession(signed,secret,hash,new Date(Date.now()-1).toISOString()),null);assert.equal(await readSession(await signSession({...tmp,exp:Date.parse(until)+1},secret),secret,hash,until),null)});
await test('Temporary mode off unless deadline is valid and future',async()=>{assert.equal(temporaryAdminDeadline(undefined),0);assert.equal(temporaryAdminDeadline('invalid'),0);assert.equal(temporaryAdminDeadline('2020-01-01'),0)});
console.log(count+' auth checks passed');


