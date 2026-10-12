import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exportLessons} from '../remote/forever-lessons.mjs';
import {Model} from '../agent/semantic/vendor/forever-works-0.1/src/model.js';
test('optional unreviewed lessons pass pinned JS reference; published schema incompatibility remains explicit',()=>{
 const result=exportLessons();const paths=result.records.map(r=>r.id+'.json');
 const manifest={foreverVersion:'0.1',projectId:'redown-transfer-lessons',records:{invariants:paths}};
 assert.deepEqual(new Model(manifest,result.records).validate(),[]);
 const schema=JSON.parse(readFileSync('agent/semantic/vendor/forever-works-0.1/schemas/invariant.schema.json','utf8'));
 assert.equal(new RegExp(schema.properties.foreverVersion.pattern).test(result.foreverVersion),false);
 assert.equal(result.certified,false);for(const record of result.records)assert.equal(record.provenance.reviewStatus,'unreviewed');
 assert.throws(()=>exportLessons('1.0'),/UNSUPPORTED_FOREVER_VERSION/);
});
