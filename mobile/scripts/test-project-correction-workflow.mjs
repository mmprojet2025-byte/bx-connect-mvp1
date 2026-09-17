import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/screens/ProjectsScreen.js', import.meta.url), 'utf8');

test('editing an existing member project uses PUT on its identifier', () => {
  assert.match(source, /if \(editingProject\)[\s\S]*?await api\.put\(updateUrl, payload\)/);
  assert.match(source, /: `\/projets\/\$\{editingProject\.id\}`/);
  assert.doesNotMatch(source, /if \(editingProject\)[\s\S]{0,300}?api\.post\('/);
});

test('correction states remain editable and submittable by the owner', () => {
  assert.match(source, /\['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'\]\.includes\(item\.statut\)/);
  assert.match(source, /canSubmit=[\s\S]*?'A_CORRIGER_REFERENT'[\s\S]*?'A_CORRIGER_ADMIN'[\s\S]*?item\.estPorteurConnecte/);
});
