// May be pasted into an authorized settings-page DevTools console after removing `export`.
// Does not read option labels/values, input contents, storage, network or Chrome APIs.
export function observeUploadDom(document,authorization){
  if(authorization?.scope!=='observe-dom-counts'||authorization.approved!==true)return {error:{code:'observation-not-authorized'}};
  if(!document||!document.querySelectorAll)return {error:{code:'dom-unavailable'}};
  const root=document.getElementById('local-location-builder');
  if(!root)return {error:{code:'upload-dom-unavailable'}};
  const rows=[...root.querySelectorAll('.upload-path-row')];
  if(rows.length>100)return {error:{code:'observation-budget-exceeded'}};
  return {observationVersion:'0.1',scope:'dom-structure-counts',capturedAt:new Date().toISOString(),rowCount:rows.length,rows:rows.map(row=>({optionCount:row.querySelector('select')?.options.length??0,creationInputPresent:Boolean(row.querySelector('.upload-path-input')),disabled:Boolean(row.querySelector('select')?.disabled)})),privacy:'counts-only',browserStatus:'observer-output-unverified',limits:['Does not establish bucket fidelity, option labels, creation-draft emptiness or R2 truth.','Caller is responsible for recording actual installed Chrome version and manual outcomes.']};
}
