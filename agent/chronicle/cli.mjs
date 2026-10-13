import {readFile} from 'node:fs/promises';
import {createChronicleApi} from './api.mjs';
const C=globalThis.RedownDiagnosticCore;
try{
 const args=process.argv.slice(2),op=args.shift()||'describeCapabilities';let file,input={};
 for(let i=0;i<args.length;i++){if(args[i]==='--bundle')file=args[++i];else if(args[i]==='--input')input=JSON.parse(args[++i]);else if(args[i]!=='--json')throw Error('INVALID_FLAG');}
 const bundle=file?C.importBundle(await readFile(file,'utf8')):null;
 const result=createChronicleApi({events:bundle?.events||[],health:bundle?.health||{}}).query(op,input);
 console.log(JSON.stringify(result,null,2));if(!result.ok||result.data?.valid===false)process.exitCode=2;
}catch{console.log(JSON.stringify({ok:false,apiVersion:1,error:{code:'INVALID_INPUT'}}));process.exitCode=2;}
