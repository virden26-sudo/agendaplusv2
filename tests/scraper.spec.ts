import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('D2L extraction reads shadow DOM topics and iframe content without dropping shorter titles', async ({page}) => {
  const source = fs.readFileSync('src/lib/scraper.ts','utf8') + '\nexportsForTest.extractD2LStructured = extractD2LStructured; exportsForTest.extractVisibleText = extractVisibleText;';
  const exportsForTest: Record<string, (...args:any[])=>Promise<string>> = {};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:{},exportsForTest,process,console,setTimeout,URL});
  await page.setContent('<h1>CSC262 Programming in Java</h1><div id="host"></div><iframe srcdoc="<p>Assignment details inside a frame</p>"></iframe>');
  await page.evaluate(() => {document.getElementById('host')!.attachShadow({mode:'open'}).innerHTML='<ul><li><a href="https://school.example/d2l/discussions/topic/1">OOP</a><p>Due: October 28, 2026</p><p>Explain encapsulation.</p></li></ul>';});
  const adapter = {evaluate:(script:string)=>page.evaluate(script),mainFrame:()=>page.mainFrame(),frames:()=>page.frames()};
  const structured = await exportsForTest.extractD2LStructured(adapter,'Discussions');
  expect(structured).toContain('OOP'); expect(structured).toContain('2026-10-28'); expect(structured).toContain('encapsulation');
  const text = await exportsForTest.extractVisibleText(adapter);
  expect(text).toContain('OOP'); expect(text).toContain('Assignment details inside a frame');
});
