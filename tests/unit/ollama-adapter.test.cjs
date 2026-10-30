const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {z}=require('zod');
function adapter(fetch) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/ai/genkit.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require,fetch,AbortSignal,process:{env:{OLLAMA_BASE_URL:'http://127.0.0.1:11434',OLLAMA_MODEL:'test-model'}}});
 return exports;
}
test('Ollama adapter sends schema and validates structured output',async()=>{
 let sent;
 const ai=adapter(async(url,init)=>{sent={url,body:JSON.parse(init.body)};return {ok:true,json:async()=>({message:{content:'{"response":"Explain objects"}'}})};});
 const result=await ai.buddIEGenerate({system:'Tutor',prompt:'Teach Java',output:{schema:z.object({response:z.string()})}});
 assert.equal(result.output.response,'Explain objects');
 assert.equal(sent.url,'http://127.0.0.1:11434/api/chat');
 assert.equal(sent.body.stream,false);assert.equal(sent.body.model,'test-model');
 assert.equal(sent.body.format.type,'object');
});
test('Ollama adapter rejects invalid model output instead of silently claiming success',async()=>{
 const ai=adapter(async()=>({ok:true,json:async()=>({message:{content:'{"response":42}'}})}));
 await assert.rejects(ai.buddIEGenerate({prompt:'Teach Java',output:{schema:z.object({response:z.string()})}}));
});
test('flow validates dates restored from HTTP JSON',async()=>{
 const ai=adapter(()=>{}).ai;
 const flow=ai.defineFlow({name:'date',inputSchema:z.object({date:z.coerce.date()}),outputSchema:z.string()},async input=>input.date.toISOString());
 assert.equal(await flow({date:'2026-10-24'}),'2026-10-24T00:00:00.000Z');
});
