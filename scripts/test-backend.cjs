const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-backend-test-'));
  let child;
  try {
    fs.cpSync(process.env.AGENDA_BACKEND_DIR || path.resolve(__dirname, '../electron/backend'), directory, { recursive: true, dereference: true });
    const port = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => resolve(address.port));
      });
    });
    child = spawn(process.execPath, [path.join(directory, 'server.js')], {
      cwd: directory,
      env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), AGENDA_API_TOKEN: 'integration-test-token' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    child.stdout.on('data', (data) => { logs += data; });
    child.stderr.on('data', (data) => { logs += data; });
    child.on('error', (error) => { logs += error.message; });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (child.exitCode !== null) throw new Error(logs);
      try {
        const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok && (await response.json()).ok) { ready = true; break; }
      } catch { /* Wait for the backend to listen. */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, `Standalone backend did not start: ${logs}`);
    assert.equal((await fetch(`${base}/api/connection`)).status, 401);
    const connected = await fetch(`${base}/api/connection`, { headers: { 'X-Agenda-Token': 'integration-test-token' } });
    assert.equal(connected.status, 200);
    assert.equal((await connected.json()).service, 'Agenda+');
    const denied = await fetch(`${base}/api/parse-assignment`);
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('access-control-allow-origin'), '*');
    assert.equal((await fetch(`${base}/api/parse-assignment`, { headers: { 'X-Agenda-Token': 'integration-test-token' } })).status, 405);
    const jsonHeaders = {'Content-Type':'application/json', 'X-Agenda-Token':'integration-test-token'};
    const invalidTutor = await fetch(`${base}/api/tutor`, {method:'POST', headers:jsonHeaders, body:JSON.stringify({question:42})});
    assert.equal(invalidTutor.status,400);
    const invalidDiagnostic = await fetch(`${base}/api/diagnostic`, {method:'POST', headers:jsonHeaders, body:JSON.stringify({sources:[]})});
    assert.equal(invalidDiagnostic.status,400);
    const portal = await fetch(`${base}/api/parse-portal`, {method:'POST',headers:jsonHeaders,body:JSON.stringify({currentDate:'2026-10-24',portalText:'CSC262 Programming in Java\nAssignments\nAssignment 3: Arrays\nDue: October 28, 2026\nQuizzes\nQuiz 3: Methods\nDiscussions\nDiscussion 3: Inheritance\nExplain Java inheritance.'})});
    assert.equal(portal.status,200);
    const material=await portal.json();
    assert.equal(material.assignments.length,1);
    assert.equal(material.quizzes.length,1);
    assert.equal(material.discussions.length,1);
    assert.equal(material.quizzes[0].dueDate,null);
    assert.match(material.discussions[0].content,/inheritance/);
    console.log('Standalone backend starts outside checkout; API authentication, tutor/diagnostic validation and coursework extraction passed.');

  } finally {
    if (child && child.exitCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill(); });
    }
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
