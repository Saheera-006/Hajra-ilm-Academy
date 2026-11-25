import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/services/fetchWithRecovery.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'').replace('await delay(retryDelay);', 'globalThis.__retryDelays.push(retryDelay);');
let calls=0;
let sequence;
globalThis.__retryDelays = [];
globalThis.__recoveryMock=async()=>{
  calls++;
  return sequence?.shift() ?? new Response('', { status: calls === 1 ? 503 : 200 });
};
const {fetchWithRecovery}=await import('data:text/javascript;base64,'+Buffer.from('const fetchWithTimeout=globalThis.__recoveryMock;\n'+source).toString('base64'));
test('safe read retries transient failure',async()=>{calls=0;assert.equal((await fetchWithRecovery('/csrf')).status,200);assert.equal(calls,2);});
test('write is never automatically replayed',async()=>{calls=0;assert.equal((await fetchWithRecovery('/payment',{method:'POST'})).status,503);assert.equal(calls,1);});

test('enrollment waits through a startup page and respects a rate limit', async () => {
  calls = 0;
  globalThis.__retryDelays.length = 0;
  sequence = [
    new Response('<html>Application loading</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('', { status: 429, headers: { 'Retry-After': '25' } }),
    Response.json({ id: 1 }),
  ];
  const response = await fetchWithRecovery('/batches/current', {}, undefined, true);
  assert.deepEqual(await response.json(), { id: 1 });
  assert.deepEqual(globalThis.__retryDelays, [10000, 25000]);
  assert.equal(calls, 3);
});

test('enrollment does not retry ahead of a longer rate limit', async () => {
  calls = 0;
  sequence = [new Response('', { status: 429, headers: { 'Retry-After': '60' } })];
  const response = await fetchWithRecovery('/batches/current', {}, undefined, true);
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
});
