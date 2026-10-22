import {temporaryAdminDeadline} from './auth-core';
type RuntimeAuth={SESSION_SECRET?:string;TEMP_ADMIN_NO_PASSWORD_UNTIL?:string;DB?:D1Database};
export async function signingSecret(e:RuntimeAuth){
 if(e.SESSION_SECRET&&e.SESSION_SECRET.length>=32)return e.SESSION_SECRET;
 if(!temporaryAdminDeadline(e.TEMP_ADMIN_NO_PASSWORD_UNTIL)||!e.DB)return null;
 const id='temporary-auth:'+e.TEMP_ADMIN_NO_PASSWORD_UNTIL;
 let row=await e.DB.prepare('SELECT data FROM warehouse WHERE id=?').bind(id).first<{data:string}>();
 if(!row){const key=Array.from(crypto.getRandomValues(new Uint8Array(48))).map(x=>x.toString(16).padStart(2,'0')).join('');await e.DB.prepare('INSERT OR IGNORE INTO warehouse(id,data,revision) VALUES(?,?,0)').bind(id,JSON.stringify({key})).run();row=await e.DB.prepare('SELECT data FROM warehouse WHERE id=?').bind(id).first<{data:string}>();}
 const key=row?JSON.parse(row.data).key:null;return typeof key==='string'&&key.length>=32?key:null;
}
