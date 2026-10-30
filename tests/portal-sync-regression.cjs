const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, filename);
const {parsePortalTextHeuristically: parse} = require('../src/lib/portal-text-parser.ts');
const block = (name, items, course='CSC262') => `\n=== STRUCTURED: ${name} ===\n${JSON.stringify({course,items})}\n`;
const rows = [1,2,3,4].map(n => ({task:`Week ${n} Assignment 1: Programming project`,dueDate:`2026-11-${String(n*7).padStart(2,'0')}`}));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
check('four weekly assignments remain four beside raw duplicates and other sections', () => {
 const text = block('Assignments',rows)+`\n=== SECTION: Assignments ===\nCSC262\n${rows.map(r=>r.task).join('\n')}\nAssignment 99: Navigation example`+block('Quizzes',[{task:'Week 1 Quiz: Programming basics'}])+`\n=== SECTION: Quizzes ===\nAssignment 88: Wrong section\n`;
 const r = parse(text,'2026-10-30'); assert.equal(r.assignments.length,4); assert.equal(r.quizzes.length,1); assert.deepEqual(r.assignments.map(r=>r.task),rows.map(r=>r.task));
});
check('authoritative empty list does not import navigation text',()=>assert.equal(parse(block('Quizzes',[])+`\n=== SECTION: Quizzes ===\nWeek 1 Quiz 1: Navigation noise`,'2026-10-30').quizzes.length,0));
check('raw section stops before next structured block',()=>assert.equal(parse('\n=== SECTION: Assignments ===\nCSC262\nWeek 1 Assignment 1: Programming project\n'+block('Quizzes',[{task:'Assignment 90: Not coursework'}]),'2026-10-30').assignments.length,1));
check('identical titles in different courses survive',()=>assert.equal(parse(block('Assignments',[rows[0]],'CSC262')+block('Assignments',[rows[0]],'CSC263'),'2026-10-30').assignments.length,2));
check('malformed JSON still allows isolated text parsing',()=>assert.equal(parse('\n=== STRUCTURED: Assignments ===\n{bad}\n=== SECTION: Assignments ===\nCSC262\nWeek 1 Assignment 1: Programming project\n','2026-10-30').assignments.length,1));
check('no assignments section never scans quiz text as assignments',()=>assert.equal(parse('\n=== SECTION: Quizzes ===\nAssignment 9: Wrong section','2026-10-30').assignments.length,0));
(async()=>{
 const config = require('../src/ai/ollama-config.ts');
 const originalFetch=global.fetch;
 try {
  global.fetch=async()=>({ok:true,json:async()=>({models:[{name:config.ollamaModelName+':latest'}]})});
  await config.requireOllamaModel(); checks++; console.log('PASS configured model accepts implicit latest tag');
  global.fetch=async()=>({ok:true,json:async()=>({models:[{name:'other:latest'}]})});
  await assert.rejects(config.requireOllamaModel(),/Set OLLAMA_MODEL.*other:latest/); checks++; console.log('PASS missing model produces actionable error');
 } finally {global.fetch=originalFetch;}
 let generations=0;
 const originalLoad=Module._load;
 Module._load=function(request,parent,...rest){
  if(request==='@/ai/genkit')return {ai:{defineFlow:(_config,fn)=>fn,generate:async()=>{generations++;throw Error('AI should not run');}}};
  return originalLoad.call(this,request,parent,...rest);
 };
 const {parsePortalData}=require('../src/ai/flows/portal-parser.ts');
 const result=await parsePortalData({portalText:block('Assignments',rows)+'\n=== UNAVAILABLE: Discussions ===\nAccess denied.\n',currentDate:'2026-10-30'});
 assert.equal(result.assignments.length,4); assert.equal(generations,0); assert.match(result.warnings.join(' '),/Discussions.*incomplete/); checks++; console.log('PASS partial structured sync skips AI and exposes unavailable section');
 const empty=await parsePortalData({portalText:block('Assignments',[])+block('Quizzes',[])+'\n=== SECTION: Assignments ===\n'+ 'Navigation content '.repeat(20),currentDate:'2026-10-30'});
 assert.equal(empty.assignments.length,0);assert.equal(generations,0);checks++;console.log('PASS empty structured sync skips AI');
 await assert.rejects(parsePortalData({portalText:'\n=== UNAVAILABLE: Assignments ===\n'+ 'Access denied '.repeat(30),currentDate:'2026-10-30'}),/sync incomplete/); checks++; console.log('PASS failed extraction cannot invoke AI or report success');
 Module._load=originalLoad;
 const puppeteer=require('puppeteer-core');
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.setRequestInterception(true);page.on('request',request=>request.respond({status:200,contentType:'text/html',body:'<html></html>'}));
  await page.goto('https://example.test/d2l/home/305168');
  const {extractD2LStructured}=require('../src/lib/scraper.ts');
  await page.setContent(`<h1>Assignments - CSC262</h1><nav><a href='/d2l/lms/dropbox/user/folders_list.d2l?ou=305168'>Assignment navigation</a><a href='/d2l/lms/quizzing/user/quizzes_list.d2l?ou=305168'>Quizzes menu</a></nav><table><thead><tr><th>Name</th><th>Due Date</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><a href='/d2l/lms/dropbox/user/folder_submit_files.d2l?ou=305168&db=${i+1}'>${r.task}</a><a href='/d2l/lms/dropbox/user/folder_submit_files.d2l?db=${i+1}&ou=305168'>Open assignment ${i+1}</a></td><td>${r.dueDate}</td></tr>`).join('')}</tbody></table>`);
  const extracted=await extractD2LStructured(page,'Assignments');
  assert.equal(parse(extracted,'2026-10-30').assignments.length,4);checks++;console.log('PASS real browser DOM extracts four item IDs and rejects menu/duplicate links');
  await page.setContent(`<h1>Quiz List - CSC262</h1><a href='/d2l/lms/quizzing/user/quizzes_list.d2l?ou=305168'>Practice quizzes navigation</a><table><tbody><tr><td><a href='/d2l/lms/quizzing/user/quiz_summary.d2l?ou=305168&qi=123'>Week 1 Quiz: Programming basics</a></td></tr></tbody></table>`);
  assert.equal(parse(await extractD2LStructured(page,'Quizzes'),'2026-10-30').quizzes.length,1);checks++;console.log('PASS real browser quiz extraction rejects tool list links');
  await page.setContent(`<h1>Discussions - CSC262</h1><a href='/d2l/le/forums/305168/'>Discussion navigation</a><a href='/d2l/lms/discussions/messageLists/frame.d2l?ou=305168&tid=17'>Week 1 Discussion: Programming basics</a>`);
  assert.equal(parse(await extractD2LStructured(page,'Discussions'),'2026-10-30').discussions.length,1);checks++;console.log('PASS real browser discussion topic extraction rejects forum navigation');
  await page.setContent(`<h1>Announcements - CSC262</h1><nav><li><a href='/d2l/home/305168'>Course navigation menu</a></li></nav><article><h2>Welcome to programming class</h2><p>Course begins Monday.</p></article>`);
  assert.equal(parse(await extractD2LStructured(page,'Announcements'),'2026-10-30').announcements.length,1);checks++;console.log('PASS real browser announcements exclude navigation');
  await page.setContent(`<h1>Grades - CSC262</h1><table><tr><td>Final Calculated Grade</td><td>95%</td></tr></table>`);
  assert.equal(parse(await extractD2LStructured(page,'Grades'),'2026-10-30').grades[0].grade,'95%');checks++;console.log('PASS real browser grade extraction');
  await page.setContent('<h1>Assignments - CSC262</h1>There are no assignments.');
  assert.match(await extractD2LStructured(page,'Assignments'),/"items":\[\]/);checks++;console.log('PASS scraper preserves explicit empty lists');
 }finally{await browser.close();}
 console.log(`${checks} regression checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
