import { test, expect } from '@playwright/test';

test('first launch shows usable setup controls', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Agenda\+/);
  const setup = page.getByRole('dialog', { name: 'Welcome to Agenda+' });
  await expect(setup).toBeVisible();
  await expect(setup.getByLabel('Your Name')).toBeEditable();
  await expect(setup.getByRole('button', { name: 'Launch BUDD-IE' })).toBeDisabled();
  await setup.getByLabel('Your Name').fill('Release Test');
  await expect(setup.getByRole('button', { name: 'Launch BUDD-IE' })).toBeEnabled();
});

test('tasks survive reload and can be completed without an API backend', async ({ page, context }) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem('agendaUser')) {
      localStorage.setItem('agendaUser', JSON.stringify({ name: 'Release Test', avatarUrl: '' }));
      localStorage.setItem('studentPortalUrl', 'https://example.edu/d2l/home');
      localStorage.setItem('agendaAssignments', JSON.stringify([{
        id: 'test-assignment', title: 'Study Java', course: 'CSC262',
        dueDate: '2030-01-01T18:00:00.000Z', completed: false, priority: 'medium',
      }]));
    }
  });
  await context.route('**/api/**', route => route.abort());
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a New Task' });
  await dialog.getByLabel('Task Title').fill('Offline release check');
  await dialog.getByRole('button', { name: 'Add Task', exact: true }).click();
  let row = page.getByRole('row').filter({ hasText: 'Offline release check' });
  await expect(row).toBeVisible();
  await page.reload();
  row = page.getByRole('row').filter({ hasText: 'Offline release check' });
  await expect(row).toBeVisible();
  await row.getByRole('checkbox').check();
  await page.getByRole('tab', { name: 'Completed', exact: true }).click();
  await expect(row).toBeVisible();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await page.getByRole('tab', { name: 'Completed', exact: true }).click();
  await expect(row.getByRole('checkbox')).toBeChecked();
});


test('coursework import saves discussions and quizzes, and tutor diagnoses, teaches and remembers progress offline', async ({page,context}) => {
  await context.addInitScript(() => {
    localStorage.setItem('agendaUser', JSON.stringify({name:'Tutor Test', avatarUrl:''}));
    localStorage.setItem('studentPortalUrl','https://example.edu/d2l/home');
  });
  await context.route('**/api/**', route => route.abort());
  await page.goto('/portal');
  await page.getByLabel('Portal text or syllabus').fill(`CSC262 Programming in Java
Assignments
Assignment 3: Java arrays
Instructions: Use arrays and loops.
Due: October 27, 2026
Quizzes
Quiz 3: Java methods
Discussions
Discussion 3: Java inheritance
Explain Java inheritance.`);
  await page.getByRole('button',{name:'Extract coursework',exact:true}).click();
  await expect(page.getByRole('region',{name:'Extracted coursework'})).toContainText('Review 3 items');
  await page.getByRole('button',{name:'Confirm import'}).click();
  await expect(page.getByRole('status').filter({hasText:'Imported 3 coursework items'})).toBeVisible();
  const stored = await page.evaluate(() => ({assignments:JSON.parse(localStorage.getItem('agendaAssignments') || '[]'), quizzes:JSON.parse(localStorage.getItem('agendaQuizzes') || '[]'), discussions:JSON.parse(localStorage.getItem('agendaDiscussions') || '[]')}));
  expect(stored.quizzes).toHaveLength(1); expect(stored.discussions).toHaveLength(1);
  expect(stored.quizzes[0].dueDate).toBeUndefined();
  expect(stored.discussions[0].content).toContain('inheritance');
  await page.goto('/quizzes'); await expect(page.getByRole('cell',{name:'Unverified',exact:true})).toBeVisible();
  await page.goto('/tutor');
  await page.getByRole('button',{name:'Start diagnostic',exact:true}).click();
  let region = page.getByRole('region',{name:'Practice question'});
  await expect(region).toBeVisible();
  // Deliberately answer incorrectly to exercise remediation rather than only the happy path.
  await region.getByRole('radio').first().check();
  await region.getByRole('button',{name:'Check answer'}).click();
  await expect(region.getByRole('status')).toContainText('Let’s work through this');
  while (await page.getByRole('button',{name:'Next question',exact:true}).isVisible()) {
    await page.getByRole('button',{name:'Next question',exact:true}).click();
    await region.getByRole('radio').first().check();
    await region.getByRole('button',{name:'Check answer'}).click();
  }
  await page.getByRole('button',{name:'See results',exact:true}).click();
  await expect(page.getByRole('region',{name:'Diagnostic results'})).toContainText('Diagnostic complete');
  await page.getByRole('button',{name:'Retest missed concepts'}).click();
  await expect(region).toBeVisible();
  await expect(region.getByRole('button',{name:'Check answer'})).toBeDisabled();
  await page.reload();
  await expect(page.getByText('Saved learning progress', {exact:true})).toBeVisible();
});
