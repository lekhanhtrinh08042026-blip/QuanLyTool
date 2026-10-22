import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
const runtime=fileURLToPath(new URL('../.sites-runtime/',import.meta.url));mkdirSync(runtime,{recursive:true});
const childEnv={...process.env,WRANGLER_LOG_PATH:runtime+'build.log',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'};
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/vinext/dist/cli.js',import.meta.url)),'build'],{stdio:'inherit',env:childEnv});if(result.status!==0)process.exit(result.status||1);
