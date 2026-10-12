import test from 'node:test';
import assert from 'node:assert/strict';
import {reproduceChildRace} from '../agent/semantic/reproduction.mjs';
test('DBG-003 child requests released after bucket switch cannot contaminate current shared cache',async()=>{
 const result=await reproduceChildRace();assert.equal(result.status,'pass',JSON.stringify(result));assert.deepEqual(result.cache,['videos']);assert.deepEqual(result.options,['','videos']);assert.equal(result.browserStatus,'browser-unverified');
});
