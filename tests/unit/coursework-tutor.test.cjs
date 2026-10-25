const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file,exports);
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(js, {exports, Date, console, require(id) {
    if (id.startsWith('@/')) return load('src/'+id.slice(2)+'.ts');
    if (id.startsWith('.')) return load(path.join(path.dirname(file),id)+'.ts');
    return require(id);
  }});
  return exports;
}
const parser = load('src/lib/portal-text-parser.ts');
const tutor = load('src/lib/tutor-engine.ts');
const fixture = `CSC262 Programming in Java
Assignments
Module 3 Assignment: Arrays
Instructions: Write a program using arrays and loops.
Due: October 27, 2026
Quizzes
Midterm Exam
Available October 22, 2026
Due: October 29, 2026
Discussions
Discussion 3: Inheritance
Explain inheritance and Java objects.
Due: October 28, 2026
CSC252 Programming in C
Assignments
Module 3 Assignment: Arrays
Due: October 30, 2026`;
test('all coursework types retain their own course, instructions and dates', () => {
 const r = parser.parsePortalTextHeuristically(fixture,'2026-10-24');
 assert.equal(r.assignments.length,2);
 assert.equal(r.quizzes.length,1);
 assert.equal(r.discussions.length,1);
 assert.equal(r.quizzes[0].dueDate,'2026-10-29');
 assert.equal(r.discussions[0].dueDate,'2026-10-28');
 assert.match(r.discussions[0].content,/inheritance/);
 assert.match(r.assignments[1].course,/CSC252/);
 assert.equal(r.assignments[1].dueDate,'2026-10-30');
});
test('structured payloads keep arbitrary short titles, dates unknown, and cross-course duplicates', () => {
 const text = ['CSC262','CSC252'].map(course => `=== STRUCTURED: Quizzes ===\n${JSON.stringify({course,items:[{task:'Quiz 1',dueDate:null},{task:'OOP',dueDate:'2026-11-01'}]})}`).join('\n');
 const r = parser.parsePortalTextHeuristically(text,'2026-10-24');
 assert.equal(r.quizzes.length,4);
 assert.equal(r.quizzes[0].dueDate,null);
 assert.equal(r.assignments.length,0);
});
test('missing or invalid deadlines remain unknown and availability never becomes due date', () => {
 const r = parser.parsePortalTextHeuristically('CSC262\nQuizzes\nQuiz 1\nAvailable October 25, 2026\nQuiz 2\nDue February 30, 2026','2026-10-24');
 assert.equal(r.quizzes.length,2);
 assert.equal(r.quizzes[0].dueDate,null);
 assert.equal(r.quizzes[1].dueDate,null);
});
test('repeated scrapes merge without duplicating discussion rows', () => {
 const r = parser.parsePortalTextHeuristically(fixture,'2026-10-24');
 assert.equal(parser.mergePortalParseResults(r,r).discussions.length,1);
});
test('diagnostics draw topics from discussions and quizzes, grade errors and prioritize weak topics', () => {
 const sources = [{id:'d',title:'Discussion: Java inheritance',course:'CSC262',kind:'Discussion'}, {id:'q',title:'Quiz: Java arrays',course:'CSC262',kind:'Quiz'}];
 const bank = tutor.buildDiagnostic(sources);
 assert.equal(bank.length,2);
 const q = bank[0];
 const wrong = (q.answer+1)%q.choices.length;
 let mastery = tutor.recordAnswer({},q,wrong);
 assert.equal(mastery[q.topic].correct,0);
 assert.equal(mastery[q.topic].attempts,1);
 mastery = tutor.recordAnswer(mastery,q,q.answer);
 assert.equal(mastery[q.topic].correct,1);
 assert.match(q.explanation,/Java|class|index/i);
 assert.ok(bank.every(q => sources.some(s => s.id === q.sourceId)));
});
test('titles with only deadlines cannot fabricate a diagnostic', () => {
 assert.equal(tutor.buildDiagnostic([{id:'x',title:'Midterm',course:'History',kind:'Quiz'}]).length,0);
});
test('generic notes support questions with source-backed answers', () => {
 const bank = tutor.buildDiagnostic([{id:'notes',title:'Biology',course:'BIO101',kind:'Notes',details:'Mitosis is the division of a cell into two identical cells. Osmosis is the movement of water across a membrane. Diffusion is the movement of particles down a concentration gradient.'}]);
 assert.equal(bank.length,3);
 assert.equal(bank[0].choices[bank[0].answer],'Mitosis');
});
test('retests ask a new application problem on the failed topic', () => {
 const q = tutor.buildDiagnostic([{id:'a',title:'Java arrays',course:'CSC262',kind:'Assignment'}])[0];
 const retry = tutor.buildRetest([q])[0];
 assert.equal(retry.topic,q.topic);
 assert.notEqual(retry.prompt,q.prompt);
 assert.equal(retry.choices[retry.answer],'a[a.length - 1]');
});
