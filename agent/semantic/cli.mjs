#!/usr/bin/env node
import {createSemanticApi} from './api.mjs';
import {serialize} from './io.mjs';
export function cli(argv){
  let operation=argv[0]||'describe',input={},json=false,seenInput=false;
  try{
    for(let i=1;i<argv.length;i++){
      const flag=argv[i];if(flag==='--json'){if(json)throw Error();json=true;continue;}
      if(flag!=='--input'||seenInput||!argv[i+1])throw Error();
      seenInput=true;input=JSON.parse(argv[++i]);
    }
    const result=createSemanticApi().query(operation,input);
    process.stdout.write(json?serialize(result):`${operation}: ${result.error?.code||'inspect-only; behavior remains evidence-scoped'}\n${serialize(result)}`);
    return result.error||result.data?.valid===false?2:0;
  }catch{process.stdout.write(serialize(createSemanticApi().query('describe',{unexpectedArgument:true})));return 2;}
}
process.exitCode=cli(process.argv.slice(2));
