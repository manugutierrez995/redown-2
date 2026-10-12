// An independent JS program imports only the portable package. No Redown/Chrome runtime.
import {VERSION,validateSubmission} from '../../packages/transfer-core/index.mjs';
const intent=validateSubmission({idempotencyKey:'independent-program-001',sourceUrl:'https://example.com/file.bin',
  destination:{accountId:'example',bucket:'assets',key:'files/file.bin'}});
console.log(JSON.stringify({version:VERSION,intent}));
