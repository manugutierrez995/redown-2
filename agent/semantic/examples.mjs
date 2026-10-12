// Working, offline library example. Results are data; no referenced code/command is executed.
import {createSemanticApi} from './api.mjs';
import {validateForeverProposal} from './validate-forever.mjs';
import {serialize} from './io.mjs';
const api=createSemanticApi();
const steps=[
 ['describe',{}],['projectOverview',{}],['listEntities',{kind:'capability',limit:100}],
 ['describeEntity',{id:'redown.upload.destination.selection',depth:2,limit:100}],
 ['traceDependencies',{id:'redown.upload.destination.selection',direction:'both',depth:3,limit:100}],
 ['traceEvidence',{id:'redown.incident.dbg-003',depth:1,limit:100}],
 ['explainChangeImpact',{changed:['redown.upload.destination.selection'],limit:100}],
 ['planVerification',{id:'redown.upload.destination.selection'}],
 ['exportLesson',{id:'redown.lesson.request-context-freshness'}],
 ['describeEntity',{id:'redown.simple.menu.flat',depth:2,limit:100}],
 ['traceEvidence',{id:'redown.simple.menu.flat',depth:2,polarity:'contradicts',limit:100}],
 ['getCoverage',{offset:0,limit:100}],['getCoverage',{offset:100,limit:100}],['validateSemanticGraph',{}]
];
const results=steps.map(([operation,input])=>({operation,input,result:api.query(operation,input)}));
const exported=results.find(x=>x.operation==='exportLesson').result.data;
process.stdout.write(serialize({exampleVersion:'0.1',mode:'library-inspection-only',steps:results,foreverReferenceValidation:validateForeverProposal(exported),browserStatus:'browser-unverified'}));
process.exitCode=results.some(x=>x.result.error||x.result.data?.valid===false)?2:0;
