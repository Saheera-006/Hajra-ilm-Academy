import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = (await readFile(new URL('../src/services/portalApi.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'').replace("import.meta.env.VITE_API_BASE_URL ?? ''","''");
// Each scenario imports a distinct module and captures its own mock.
for(const [status,code,retry] of [[403,'CSRF_REJECTED',true],[403,'OTHER',false],[503,'OTHER',false]]){
 test(`${status} ${code}: retry=${retry}`,async()=>{
  let calls=[],tokens=0,writes=0;
  globalThis.__csrfMock=async(url,opts)=>{calls.push([url,opts]);if(url.endsWith('/csrf'))return Response.json({token:`token${++tokens}`});return ++writes===1?Response.json({code,message:'denied'},{status}):Response.json({ok:true});};
  const {portal}=await import('data:text/javascript;base64,'+Buffer.from(`const fetchWithTimeout=globalThis.__csrfMock; const fetchWithRecovery=fetchWithTimeout;\n${source}\n// ${status}-${code}`).toString('base64'));
  const request=portal('/auth/demo-checkout/prepare',{method:'POST',body:'{}'});
  if(retry) assert.deepEqual(await request,{ok:true});else await assert.rejects(request);
  assert.equal(writes,retry?2:1);assert.equal(tokens,retry?2:1);
  assert.equal(calls[1][1].headers['X-XSRF-TOKEN'],'token1');if(retry)assert.equal(calls[3][1].headers['X-XSRF-TOKEN'],'token2');
 });
}
