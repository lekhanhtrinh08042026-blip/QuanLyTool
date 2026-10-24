import handler from 'vinext/server/fetch-handler';
import { mailCycle } from '../lib/mail';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const response=await handler.fetch(request,env,ctx);
  if(request.method==='POST'&&new URL(request.url).pathname==='/api/warehouse'&&response.ok)ctx.waitUntil(mailCycle(env).catch(()=>console.error('Mail background job failed')));
  return response;
 },
 scheduled(_controller:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(mailCycle(env,true).catch(()=>console.error('Mail scheduled job failed')));}
};
