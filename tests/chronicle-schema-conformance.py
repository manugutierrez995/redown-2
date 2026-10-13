"""Independent JSON Schema validation; no browser/cloud dependencies."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
root = Path(__file__).resolve().parent.parent
for schema, fixture in [('contracts/chronicle/event-v1.schema.json','event.json'),('contracts/content-provenance/v1.schema.json','provenance.json'),('contracts/diagnostics/event-v1.schema.json','diagnostic-event.json'),('contracts/diagnostics/bundle-v1.schema.json','blocked-bundle.json')]:
    s=json.loads((root/schema).read_text()); Draft202012Validator.check_schema(s)
    validator=Draft202012Validator(s,format_checker=FormatChecker())
    event=json.loads((root/'tests/fixtures/chronicle'/fixture).read_text()); validator.validate(event)
    bad=dict(event); bad['schemaVersion']=999 if 'schemaVersion' in bad else None
    assert list(validator.iter_errors(bad)), 'future shape must fail'
    print(f'PASS {schema} {fixture} valid + future rejection')
