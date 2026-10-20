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
