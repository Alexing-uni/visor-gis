import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchRasterImage} from '../src/lib/rasterImage.ts';
test('Ráster reintenta HTTP503 una vez y decodifica la imagen recibida',async t=>{
 let calls=0;const original=globalThis.createImageBitmap;
 globalThis.createImageBitmap=async()=>({width:256,height:256});t.after(()=>{globalThis.createImageBitmap=original;});
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('',{status:503}):new Response(new Blob(['png'],{type:'image/png'})));
 const image=await fetchRasterImage('https://example.org/tile');assert.equal(image.width,256);assert.equal(calls,2);
});
test('Ráster no confunde XML de error WMS con una imagen ni reintenta parámetros inválidos',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('<ServiceException/>',{headers:{'content-type':'text/xml'}});});
 await assert.rejects(fetchRasterImage('https://example.org/tile'),/no devolvió una imagen/);assert.equal(calls,1);
});
test('Ráster cancelado no hace peticiones y errores persistentes quedan limitados',async t=>{
 const controller=new AbortController();controller.abort();let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:500});});
 await assert.rejects(fetchRasterImage('https://example.org/tile',controller.signal),{name:'AbortError'});assert.equal(calls,0);
 await assert.rejects(fetchRasterImage('https://example.org/tile'),/HTTP 500/);assert.equal(calls,2);
});
