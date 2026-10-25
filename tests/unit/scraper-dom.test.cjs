const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {JSDOM}=require('jsdom');
function scraperFunctions() {
 const exportsForTest={};
 const source=fs.readFileSync('src/lib/scraper.ts','utf8')+'\nexportsForTest.extractD2LStructured=extractD2LStructured;exportsForTest.extractVisibleText=extractVisibleText;';
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:{},exportsForTest,process,console,setTimeout,URL});
 return exportsForTest;
}
test('scraper executes extraction against shadow-root discussion DOM and combines iframe text',async()=>{
 const scraper=scraperFunctions();
 const dom=new JSDOM('<h1>CSC262 Programming in Java</h1><div id="host"></div>',{url:'https://school.example/d2l/home/1',runScripts:'outside-only'});
 const frame=new JSDOM('<p>Assignment description inside a frame</p>',{runScripts:'outside-only'});
 dom.window.document.getElementById('host').attachShadow({mode:'open'}).innerHTML='<ul><li><a href="https://school.example/d2l/discussions/topic/1">OOP</a><p>Due: October 28, 2026</p><p>Explain encapsulation.</p></li></ul>';
 const main={isDetached:()=>false,evaluate:script=>dom.window.eval(script)};
 const inner={isDetached:()=>false,evaluate:script=>frame.window.eval(script)};
 const page={...main,frames:()=>[main,inner]};
 try {
  const block=await scraper.extractD2LStructured(page,'Discussions');
  const payload=JSON.parse(block.split('=== STRUCTURED: Discussions ===')[1]);
  assert.equal(payload.items.length,1);
  assert.equal(payload.items[0].task,'OOP');
  assert.equal(payload.items[0].dueDate,'2026-10-28');
  assert.match(payload.items[0].details,/encapsulation/);
  dom.window.document.querySelector('h1').textContent='Discussions';
  dom.window.document.title='Discussions - CSC262 Programming in Java';
  const titled=await scraper.extractD2LStructured(page,'Discussions','D2L course 1');
  assert.match(JSON.parse(titled.split('=== STRUCTURED: Discussions ===')[1]).course,/CSC262/);
  const text=await scraper.extractVisibleText(page);
  assert.match(text,/OOP/); assert.match(text,/Assignment description inside a frame/);
 } finally {dom.window.close();frame.window.close();}
});
