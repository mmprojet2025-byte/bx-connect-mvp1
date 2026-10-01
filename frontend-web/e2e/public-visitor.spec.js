import { test, expect } from '@playwright/test';

const activity = {
  id: 1,
  titre: 'Atelier public',
  description: 'Une activité visible sans connexion.',
  statut: 'PUBLIEE',
  dateDebut: '2027-01-15T10:00:00Z',
  groupeNom: 'Groupe public',
};

const group = {
  id: 1,
  nom: 'Groupe public',
  description: 'Un groupe visible sans connexion.',
  referentPrenom: 'Prive',
  referentNom: 'Personne',
  nombreMembres: 7,
};

const project = {
  id: 1,
  titre: 'Projet public',
  description: 'Un projet visible sans connexion.',
  groupeNom: 'Groupe public',
  visibilite: 'PUBLIC',
  statut: 'BROUILLON',
  motifCorrection: 'Message interne',
  porteurPrenom: 'Amina',
  porteurNom: 'Privee',
  budgetDemande: 999,
  nombreParticipants: 5,
  nombreCommentaires: 2,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('bxconnect_lang', 'fr'));

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const { pathname } = new URL(route.request().url());
    const payload = pathname === '/api/activites/options-filtres' ? { categories: [], themes: [], lieux: [] }
      : pathname === '/api/activites' ? [activity]
      : pathname === '/api/groupes' ? [group]
        : pathname === '/api/projets' ? [project]
          : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
});

test('un visiteur accède aux activités publiques et est dirigé vers la connexion pour agir', async ({ page }) => {
  await page.goto('/activites');

  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/login"]')).not.toHaveCount(0);
});

test('un visiteur accède aux groupes publics sans voir les membres ni le référent', async ({ page }) => {
  await page.goto('/groupes');
  await expect(page.getByText('Groupe public')).toBeVisible();
  await expect(page.getByText('Prive Personne')).toHaveCount(0);
  await expect(page.getByText('7 membres')).toHaveCount(0);
  await expect(page.getByText('Messagerie', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Membres', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/groupes/1"]')).not.toHaveCount(0);

  await page.goto('/groupes/1?tab=membres');
  await expect(page.getByText('Groupe public')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Membres', exact: true })).toHaveCount(0);
  await expect(page.getByText('Prive Personne')).toHaveCount(0);
  await expect(page.locator('a[href="/login"]')).not.toHaveCount(0);
});

test('un visiteur accède aux projets publics sans voir le workflow ni les messages internes', async ({ page }) => {
  await page.goto('/projets/1');

  await expect(page.getByRole('heading', { name: 'Projet public', exact: true })).toBeVisible();
  await expect(page.getByText('Message interne')).toHaveCount(0);
  await expect(page.getByText('Amina Privee')).toHaveCount(0);
  await expect(page.getByText('Brouillon', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/login"]')).not.toHaveCount(0);
});
