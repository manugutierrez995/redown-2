// Explicit developer maintenance command: lists public artifacts without reading their contents.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ROOT} from './api.mjs';
import {safePath,serialize,compare} from './io.mjs';
const model=JSON.parse(readFileSync(resolve(ROOT,'agent/semantic/model.json'),'utf8'));
const paths=[];function walk(dir=''){for(const e of readdirSync(resolve(ROOT,dir),{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(!safePath(p)||e.name==='.wrangler')continue;if(e.isDirectory())walk(p);else if(e.isFile())paths.push(p);if(paths.length>5000)throw Error('inventory-too-large');}}walk();
function owner(p){
 if(p.startsWith('agent/semantic/')||p.includes('semantic'))return 'redown.component.semantic';
 if(p.startsWith('agent/debug/')||p.startsWith('debug/')||p.startsWith('docs/debug/'))return 'redown.component.debug';
 if(p.startsWith('agent/')||p.startsWith('docs/agent/')||p.includes('agent-api'))return 'redown.component.inspection';
 if(p.startsWith('windows/')||p==='build-windows.bat'||p==='wrangler.toml'||p==='package.json'||p==='package-lock.json')return 'redown.component.build';
 if(p.startsWith('worker/'))return 'redown.component.worker-standalone';
 if(p.startsWith('local/'))return 'redown.component.bridge';
 if(p.startsWith('github/'))return 'redown.component.github-ingest';
 const names={'background':'background','cloudflare-auth':'oauth','cloudflare-api':'provider','rfis-index':'rfis','nested-menu-editor':'nested-editor','nested-locations':'nested-model','popup':'popup','options':'settings'};
 if(p.startsWith('extension/')){const n=p.split('/').at(-1).split('.')[0];return 'redown.component.'+(names[n]||'settings-markup');}
 return 'redown.project';
}
model.artifacts=paths.sort(compare).map(path=>({path,owner:owner(path),coverage:'partial'}));
if(process.argv.slice(2).join(' ')==='--write')writeFileSync(resolve(ROOT,'agent/semantic/model.json'),serialize(model));else process.stdout.write(serialize(model.artifacts));
