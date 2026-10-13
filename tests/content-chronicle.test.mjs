import test from "node:test";
import assert from "node:assert/strict";
import {capture,lookup,exportSnapshot,importSnapshot,toJSONL,fromJSONL,safeUrl} from "../packages/content-chronicle/index.mjs";
const mk=(id,patch={})=>capture({id,time:"2026-10-12T00:00:00Z",overUrl:"https://hitomi.la/galleries/123.html?utm_source=x",title:"Gallery",filename:"archive.zip",size:123,references:[{role:"clicked-url",url:"https://hitomi.la/download?token=secret"},{role:"asset-url",url:"https://cdn.example/image.jpg?signature=secret"}],...patch});
test("cheap capture preserves page, click and asset roles while redacting credentials",()=>{
 const e=mk("a");assert.equal(e.page.overUrl,"https://hitomi.la/galleries/123.html");assert.equal(e.references[0].url,"https://hitomi.la/download");assert.equal(e.references[1].url,"https://cdn.example/image.jpg");
 assert.ok(!JSON.stringify(e).includes("secret"));
});
test("recognition is hint only, not byte verification or deletion",()=>{
 const list=[mk("a"),mk("b",{filename:"different.zip"})];const x=lookup(list,{overUrl:"https://hitomi.la/galleries/123.html",filename:"archive.zip",size:123});assert.equal(x.count,2);assert.equal(x.status,"possible-match");assert.equal(list[0].integrity,"unknown");
});
test("portable JSON and JSONL round trips without browser or cloud APIs",()=>{
 const events=[mk("z"),mk("a")];const snap=exportSnapshot(events);assert.deepEqual(importSnapshot(snap),fromJSONL(toJSONL(events)));assert.equal(importSnapshot(snap)[0].id,"a");
});
test("reject incomplete journals, duplicate ids, future formats and unsafe URLs",()=>{
 assert.throws(()=>fromJSONL(JSON.stringify(mk("a"))),/incomplete/);
 assert.throws(()=>exportSnapshot([mk("a"),mk("a")]),/duplicate/);
 assert.throws(()=>importSnapshot('{"format":"future","complete":true,"events":[]}'),/unsupported/);
 assert.equal(safeUrl("blob:https://example.org/abc"),null);
 assert.equal(safeUrl("https://user:pass@example.org/"),null);
});
