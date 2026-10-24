/// <reference types="@cloudflare/workers-types" />
declare namespace Cloudflare { interface Env { DB?:D1Database; MAIL_SECRET?:string; MAIL_WEBHOOK_URL?:string; BUCKET?:R2Bucket; SESSION_SECRET?:string; ADMIN_PASSWORD_HASH?:string; APP_AUTH_MODE?:string; TEMP_ADMIN_NO_PASSWORD_UNTIL?:string; } }
