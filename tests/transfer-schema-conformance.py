"""Validate actual production-path public ledger output and retained v1 independently."""
import json, pathlib, sys
from jsonschema import Draft202012Validator
root = pathlib.Path(__file__).resolve().parents[1]
schema = json.loads((root/'contracts/transfer-ledger/v2.schema.json').read_text())
log = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else root/'docs/transfer/verification/targeted-final.log')
records=[]
for line in log.read_text().splitlines():
    line=line.removeprefix('# ')
    if line.startswith('{'):
        record=json.loads(line)
        if 'ledger' in record: records.append(record['ledger'])
assert records, 'no actual transfer ledger evidence in log'
validator=Draft202012Validator(schema)
for record in records:
    validator.validate(record)
    bad=dict(record,sourceUrl='https://site.test/?signature=secret')
    assert list(validator.iter_errors(bad)), 'private URL permitted'
    bad=dict(record);bad.pop('verification')
    assert list(validator.iter_errors(bad)), 'verified without evidence permitted'
Draft202012Validator.check_schema(json.loads((root/'contracts/transfer-ledger/v1.schema.json').read_text()))
print(f'PASS: {len(records)} actual v2 ledger(s), private URL and false verification rejected; retained v1 schema valid')
