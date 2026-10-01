import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('bxconnect_lang', 'fr');
  });

  await page.route('**/api/activites', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/api/projets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/api/groupes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, nom: 'Groupe public', description: 'Une communauté ouverte.' }]),
    });
  });
});

test('affiche correctement les éléments principaux de l’accueil public', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Bienvenue sur BX-Connect',
    }),
  ).toBeVisible();

  await expect(page.getByRole('navigation').getByRole('img', {
    name: 'BX-CONNECT',
    exact: true,
  })).toHaveCount(1);

  const createAccountLink = page
    .getByRole('link', { name: 'Créer un compte', exact: true })
    .first();

  const activitiesLink = page
    .getByRole('link', { name: 'Voir les activités', exact: true })
    .first();

  await expect(createAccountLink).toBeVisible();
  await expect(createAccountLink).toHaveAttribute('href', '/register');

  await expect(activitiesLink).toBeVisible();
  await expect(activitiesLink).toHaveAttribute('href', '/activites');

  const groupLink = page.locator('a[href="/groupes/1"]');
  await expect(page.getByText('Groupe public', { exact: true })).toBeVisible();
  await expect(groupLink).toHaveAttribute('href', '/groupes/1');
});
