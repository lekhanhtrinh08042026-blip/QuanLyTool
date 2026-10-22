import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { readSession,sessionName,temporaryAdminDeadline } from './auth-core';
export async function currentUser(){const e=env as Cloudflare.Env;if(!e.SESSION_SECRET||(!e.ADMIN_PASSWORD_HASH&&!temporaryAdminDeadline(e.TEMP_ADMIN_NO_PASSWORD_UNTIL)))return null;const jar=await cookies();const token=jar.get(sessionName)?.value;if(!token)return null;return readSession(token,e.SESSION_SECRET,e.ADMIN_PASSWORD_HASH||'',e.TEMP_ADMIN_NO_PASSWORD_UNTIL);}
