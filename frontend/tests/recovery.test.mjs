import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/services/fetchWithRecovery.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'').replace('await delay(2500 * (attempt + 1));','await delay(0);');
let calls=0;
globalThis.__recoveryMock=async()=>new Response('',{status:++calls===1?503:200});
const {fetchWithRecovery}=await import('data:text/javascript;base64,'+Buffer.from('const fetchWithTimeout=globalThis.__recoveryMock;\n'+source).toString('base64'));
test('safe read retries transient failure',async()=>{calls=0;assert.equal((await fetchWithRecovery('/csrf')).status,200);assert.equal(calls,2);});
test('write is never automatically replayed',async()=>{calls=0;assert.equal((await fetchWithRecovery('/payment',{method:'POST'})).status,503);assert.equal(calls,1);});
