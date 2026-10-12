// Deliberately read-only SQLite open: no job claims, HTTP, migrations or preparation.
import {DatabaseSync} from 'node:sqlite';
const [path,id]=process.argv.slice(2);if(!path)throw Error('Usage: node remote/diagnose.mjs /ledger.sqlite [job-id]');
const db=new DatabaseSync(path,{readOnly:true});
const query=id?db.prepare('SELECT record FROM jobs WHERE id=?').all(id):db.prepare('SELECT record FROM jobs ORDER BY id').all();
for(const row of query){const j=JSON.parse(row.record);console.log(JSON.stringify({jobId:j.jobId,state:j.state,attempt:j.attempt,
 bytes:j.bytes,errorCode:j.errorCode||null,assurance:j.verification?.assurance||'unverified',
 uncertainty:j.state==='verified'?'live object may change after observation':'completion and integrity are not established',
 recovery:j.state==='needs-auth'?'renew scoped service access; submit a new authorized job':j.state==='needs-browser'?'explicit browser access required':j.state==='retry-wait'?'executor retry pending':'inspect events; never delete a local original',
 events:db.prepare('SELECT record FROM events WHERE job=? ORDER BY seq').all(j.jobId).map(r=>JSON.parse(r.record))}));}
db.close();
