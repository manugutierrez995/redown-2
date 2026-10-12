import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSemanticApi,ROOT} from './api.mjs';
import {digest,serialize} from './io.mjs';
const COMMAND=[process.execPath,'--test','--test-isolation=none','--test-reporter=tap','tests/upload-location-builder.test.mjs','tests/upload-request-context.test.mjs','tests/simple-menu-flat.test.mjs'];
export function runWorkflow({workflow='upload-isolation',authorization,signal}={}){
  const api=createSemanticApi();
  const plan=api.query('planVerification',{id:'redown.upload.destination.selection'});
  if(workflow!=='upload-isolation')return Promise.resolve({error:{code:'unsupported-workflow'}});
  if(!authorization||authorization.scope!=='execute-local-tests'||authorization.approved!==true)return Promise.resolve({status:'dry-run',plan,command:COMMAND.map((x,i)=>i===0?'node':x),browserStatus:'browser-unverified'});
  if(plan.error)return Promise.resolve({error:{code:'invalid-graph'}});
  if(signal?.aborted)return Promise.resolve({status:'cancelled',browserStatus:'browser-unverified'});
  // A test is trusted repository code, so execution consent is separate from read access.
  // No shell, caller-controlled arguments, remote operation, or arbitrary command is exposed.
  return new Promise(resolve=>{
    const startedAt=new Date().toISOString();let bytes=0,output='',finished=false,timedOut=false;
    const child=spawn(COMMAND[0],COMMAND.slice(1),{cwd:ROOT,shell:false,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH||'',NODE_NO_WARNINGS:'1'}});
    const cancel=()=>child.kill('SIGTERM');
    signal?.addEventListener('abort',cancel,{once:true});
    const timer=setTimeout(()=>{timedOut=true;cancel();},30000);
    const ingest=chunk=>{bytes+=chunk.length;if(bytes>128*1024){cancel();return;}output+=chunk.toString('utf8');};
    child.stdout.on('data',ingest);child.stderr.on('data',ingest);
    const finish=(exitCode,spawnError=false)=>{
      if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);
      const cancelled=signal?.aborted||timedOut||bytes>128*1024;
      const counts=Object.fromEntries(['tests','pass','fail'].map(key=>[key,Number(new RegExp('^# '+key+' ([0-9]+)$','m').exec(output)?.[1]||0)]));
      const observed=counts.tests>0 && counts.pass+counts.fail===counts.tests;
      resolve({workflowVersion:'0.1',status:cancelled?'cancelled':spawnError||!observed?'unavailable':exitCode===0&&counts.fail===0?'pass':'fail',exitCode,counts,startedAt,endedAt:new Date().toISOString(),environment:{runtime:process.version,platform:process.platform,arch:process.arch},command:COMMAND.map((x,i)=>i===0?'node':x),outputDigest:digest(output),outputBytes:bytes,proofScope:'local-fixtures-only',browserStatus:'browser-unverified',closure:'open',authority:'execute-local-tests',limits:['No installed Chrome, deployed Worker or live R2 observation.','Digest identifies captured output, not independently authenticated evidence.'],lesson:api.query('exportLesson',{id:'redown.lesson.request-context-freshness'}).data});
    };
    child.once('error',()=>finish(null,true));child.once('close',code=>finish(code));
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const flags=process.argv.slice(2);
  if(flags.some(x=>x!=='--execute-local-tests')||flags.length>1){console.log(serialize({error:{code:'invalid-request'}}));process.exitCode=2;}
  else{const result=await runWorkflow({authorization:flags.includes('--execute-local-tests')?{scope:'execute-local-tests',approved:true}:undefined});console.log(serialize(result));process.exitCode=result.error||['fail','unavailable','cancelled'].includes(result.status)?2:0;}
}
