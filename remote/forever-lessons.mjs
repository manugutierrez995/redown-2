// Optional export only. The engine has no runtime dependency on Forever Works.
export function exportLessons(version='0.1') {
 if(version!=='0.1')throw Error('UNSUPPORTED_FOREVER_VERSION');
 const provenance={sourceType:'agent-proposed',confidence:1,reviewStatus:'unreviewed',sourceReference:'docs/transfer/OPERATIONS.md'};
 return {foreverVersion:version,certified:false,authority:'proposed',publishedSchemaCompatibility:'blocked-by-upstream-version-regex',records:[
  {foreverVersion:version,id:'redown.transfer.lesson.acceptance',kind:'invariant',name:'Persist before acknowledgment',severity:'critical',statement:'Durable acceptance precedes a client acknowledgment; replay reconciles one immutable idempotency key.',provenance},
  {foreverVersion:version,id:'redown.transfer.lesson.verification',kind:'invariant',name:'Observe exact destination bytes',severity:'critical',statement:'Neither size nor multipart ETags imply matching content. Independent SHA-256 readback at the exact destination is required before reporting verified.',provenance},
  {foreverVersion:version,id:'redown.transfer.lesson.recovery',kind:'invariant',name:'Recovery preserves uncertainty',severity:'critical',statement:'Leases fence canonical state; uncertain external writes require reconciliation, without exactly-once claims or local deletion.',provenance}
 ]};
}
