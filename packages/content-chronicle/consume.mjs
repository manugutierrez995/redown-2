// Independent offline consumer: node packages/content-chronicle/consume.mjs history.json
import {readFile} from 'node:fs/promises';
import {importSnapshot,lookup} from './index.mjs';
const events=importSnapshot(await readFile(process.argv[2],'utf8'));
console.log(JSON.stringify({occurrences:events.length,integrity:'not-proven',sample:events.length?lookup(events,{overUrl:events[0].page.overUrl}):null},null,2));
