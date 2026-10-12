"""Independent Draft 2020-12 validation; never rewrites upstream schemas to obtain a pass."""
import json, subprocess
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads(p.read_text())
schema=read(ROOT/'agent/semantic/schemas/0.1/graph.schema.json')
for p in [ROOT/'agent/semantic/model.json',ROOT/'tests/fixtures/semantic/0.1/model.json']:
 errors=list(Draft202012Validator(schema).iter_errors(read(p)))
 assert not errors,[(str(e.json_path),e.message) for e in errors]
result_schema=read(ROOT/'agent/semantic/schemas/0.1/result.schema.json')
for args in [['describe','--json'],['describeEntity','--input','{"id":"missing.id"}','--json']]:
 result=subprocess.run(['node','agent/semantic/cli.mjs',*args],cwd=ROOT,capture_output=True,text=True)
 assert not list(Draft202012Validator(result_schema).iter_errors(json.loads(result.stdout)))
proposal=json.loads(subprocess.check_output(['node','agent/semantic/cli.mjs','exportLesson','--input','{"id":"redown.lesson.request-context-freshness"}','--json'],cwd=ROOT))['data']
schemas={p.name:read(p) for p in (ROOT/'agent/semantic/vendor/forever-works-0.1/schemas').glob('*.json')}
registry=Registry().with_resources([(s['$id'],Resource.from_contents(s)) for s in schemas.values()])
by_kind={'intent':'project-intent','capability':'capability','invariant':'invariant','implementation':'implementation','decision':'decision','evidence':'evidence'}
errors=[]
for e in Draft202012Validator(schemas['manifest.schema.json'],registry=registry).iter_errors(proposal['manifest']):errors.append({'record':'manifest','path':e.json_path,'validator':e.validator})
for path,record in proposal['files'].items():
 for e in Draft202012Validator(schemas[by_kind[record['kind']]+'.schema.json'],registry=registry).iter_errors(record):errors.append({'record':record['id'],'path':e.json_path,'validator':e.validator})
errors.sort(key=lambda e:(e['record'],e['path']))
assert errors and all(e['path']=='$.foreverVersion' and e['validator']=='pattern' for e in errors),errors
example=schemas['project-intent.schema.json']['examples'][0]
assert any(e.json_path=='$.foreverVersion' for e in Draft202012Validator(schemas['project-intent.schema.json'],registry=registry).iter_errors(example))
print(json.dumps({'semanticSchema':{'valid':True,'models':2},'foreverPublishedSchema':{'valid':False,'status':'blocked-by-upstream-version-pattern','errorCount':len(errors),'errors':errors},'upstreamCommit':proposal['upstreamCommit'],'authority':'proposed','certified':False},indent=2,sort_keys=True))
