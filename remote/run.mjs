import {readFileSync} from 'node:fs';
import {fromConfig} from './service.mjs';
process.umask(0o077);
const path=process.argv[2];if(!path)throw Error('Usage: node remote/run.mjs /permission-restricted/config.json');
const config=JSON.parse(readFileSync(path,'utf8'));
const service=fromConfig(config);
service.server.listen(config.port||8789,config.bind||'127.0.0.1');
const timer=setInterval(()=>service.tick().catch(e=>process.stderr.write(JSON.stringify({code:e.code||'EXECUTOR_FAILURE'})+'\n')),500);
process.on('SIGTERM',()=>{clearInterval(timer);service.server.close();});
